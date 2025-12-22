/**
 * API Routes Module
 *
 * Defines all API endpoints for the Distaf application.
 * All routes use the /api prefix.
 *
 * Route categories:
 * - Health check (/api/health)
 * - Authentication (/api/login, /api/logout, /api/register) - defined in auth.ts
 * - User management (/api/users) - admin only
 * - Framework structure (/api/framework, /api/pillars)
 * - Assessments (/api/assessments) - CRUD operations
 * - Assessment responses (/api/assessments/:id/responses)
 * - Assessment notes (/api/assessments/:id/metric-notes)
 * - Standards compliance (/api/assessments/:id/standards-compliance)
 * - PDF reports (/api/assessments/:id/pdf)
 *
 * Authorization:
 * - isAuthenticated: Requires logged-in user
 * - isAdmin: Requires admin role
 * - Permission checks: Users can only access/modify their own assessments (unless admin)
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, hashPassword, comparePasswords } from "./auth";
import { pdfService } from "./pdf-service";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  changePasswordSchema,
  loginUserSchema
} from "@shared/schema";
import { insertAssessmentSchema, insertAssessmentResponseSchema, insertAssessmentMetricNoteSchema, metrics, mechanisms, assessments, assessmentResponses } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { calculateResults } from "@shared/scoreCalculation";

/**
 * Helper function to calculate pillar scores for an assessment
 */
async function calculateAssessmentScores(assessmentId: string) {
  try {
    console.log(`[calculateAssessmentScores] Calculating scores for assessment ${assessmentId}`);

    const framework = await storage.getPillarsWithStructure();
    console.log(`[calculateAssessmentScores] Framework has ${framework.length} pillars with full structure`);

    const responses = await storage.getAssessmentResponses(assessmentId);
    console.log(`[calculateAssessmentScores] Found ${responses.length} responses`);

    const assessment = await storage.getAssessment(assessmentId);
    console.log(`[calculateAssessmentScores] Assessment status: ${assessment?.status}`);

    const excludedMechanismIds = new Set(assessment?.excludedMechanisms || []);
    const results = calculateResults(framework, responses, excludedMechanismIds);

    console.log(`[calculateAssessmentScores] Calculated ${results.pillars.length} pillar scores`);

    // Extract just the pillar scores
    const scores = results.pillars.map(pillar => ({
      id: pillar.id,
      name: pillar.name,
      code: pillar.code,
      operationalScore: Math.round(pillar.operationalScore),
      designScore: Math.round(pillar.designScore),
    }));

    console.log(`[calculateAssessmentScores] Returning scores:`, JSON.stringify(scores));
    return scores;
  } catch (error) {
    console.error(`[calculateAssessmentScores] Error calculating scores for assessment ${assessmentId}:`, error);
    return [];
  }
}

/**
 * Helper function to apply a mechanism configuration to all metrics of a specific type
 *
 * @param assessmentId - The assessment ID
 * @param mechanismId - The mechanism ID
 * @param metricType - The metric type ("operational" or "design")
 * @param choiceIndex - The configuration choice index (0-4)
 * @returns Number of metrics updated
 */
async function applyMechanismConfiguration(
  assessmentId: string,
  mechanismId: string,
  metricType: 'operational' | 'design',
  choiceIndex: number
): Promise<number> {
  // Get all metrics for this mechanism with the specified type
  const mechanism = await db.query.mechanisms.findFirst({
    where: eq(mechanisms.id, mechanismId),
    with: {
      metrics: true
    }
  });

  if (!mechanism) {
    throw new Error('Mechanism not found');
  }

  // Filter metrics by type
  const metricsToUpdate = mechanism.metrics.filter(metric => metric.type === metricType);

  // Track how many metrics were updated
  let updatedCount = 0;

  // For each metric, apply the percentage choice
  for (const metric of metricsToUpdate) {
    const percentageField = `percentageChoice${choiceIndex}` as 'percentageChoice0' | 'percentageChoice1' | 'percentageChoice2' | 'percentageChoice3' | 'percentageChoice4';
    const percentageValue = metric[percentageField];

    if (percentageValue === null || percentageValue === undefined) {
      continue; // Skip metrics that don't have this choice defined
    }

    // Convert percentage to appropriate response format
    if (metric.metricType === 'boolean') {
      // Boolean metric: convert percentage to Yes/No (>50% = Yes)
      const boolValue = percentageValue > 50;
      await storage.upsertAssessmentResponse({
        assessmentId,
        metricId: metric.id,
        answer: boolValue,
        answerValue: null
      });
      updatedCount++;
    } else if (metric.metricType === 'percentage') {
      // Percentage metric: use the percentage value directly
      await storage.upsertAssessmentResponse({
        assessmentId,
        metricId: metric.id,
        answer: percentageValue === 100, // Just for consistency, not really used for percentage metrics
        answerValue: percentageValue
      });
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Register all routes and initialize the server
 *
 * @param app - Express application instance
 * @returns HTTP server instance
 */
export function registerRoutes(app: Express): Server {
  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * GET /api/health
   * Simple health check endpoint for monitoring
   */
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ============================================
  // AUTHENTICATION SETUP
  // ============================================

  // Configure Passport.js and define auth routes (login, logout, register)
  setupAuth(app);

  // Initialize database with default admin user and framework data
  storage.initializeDatabase().catch(console.error);

  // ============================================
  // USER MANAGEMENT ROUTES (Admin Only)
  // ============================================
  app.get("/api/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const parsed = createUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(parsed.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists (if provided)
      if (parsed.email) {
        const existingEmail = await storage.getUserByEmail(parsed.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      const hashedPassword = await hashPassword(parsed.password);
      const user = await storage.createUser({
        ...parsed,
        password: hashedPassword,
      });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user;

      // Only admins can update other users, users can update themselves
      if (userId !== currentUser.id && currentUser.role !== "admin") {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      const parsed = updateUserSchema.parse(req.body);

      // If changing role or isActive, must be admin
      if ((parsed.role !== undefined || parsed.isActive !== undefined) && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Only admins can change role or account status" });
      }

      // If deactivating a user or changing admin role, ensure at least one admin remains
      if (currentUser.role === "admin" && (parsed.isActive === false || (parsed.role && parsed.role !== "admin"))) {
        const targetUser = await storage.getUser(userId);
        if (targetUser?.role === "admin") {
          // Count active admins
          const allUsers = await storage.getAllUsers();
          const activeAdmins = allUsers.filter(u => u.role === "admin" && u.isActive && u.id !== userId);

          if (activeAdmins.length === 0) {
            return res.status(400).json({ message: "Cannot deactivate or change role of the last admin user" });
          }
        }
      }

      const updatedUser = await storage.updateUser(userId, parsed);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/users/:id/reset-password", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const parsed = resetPasswordSchema.parse(req.body);
      const hashedPassword = await hashPassword(parsed.newPassword);
      const updatedUser = await storage.resetUserPassword(req.params.id, hashedPassword);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/users/:id/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user;

      // Users can only change their own password
      if (userId !== currentUser.id) {
        return res.status(403).json({ message: "You can only change your own password" });
      }

      const parsed = changePasswordSchema.parse(req.body);

      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValidPassword = await comparePasswords(parsed.currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash and update new password
      const hashedPassword = await hashPassword(parsed.newPassword);
      const updatedUser = await storage.resetUserPassword(userId, hashedPassword);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Framework structure routes
  // ============================================
  // FRAMEWORK STRUCTURE ROUTES
  // ============================================

  /**
   * GET /api/framework
   * Returns the complete framework hierarchy (pillars -> mechanisms -> metrics)
   * Used by the assessment form to display all metrics
   */
  app.get("/api/framework", async (req, res) => {
    try {
      const framework = await storage.getPillarsWithStructure();
      res.json(framework);
    } catch (error) {
      console.error("Error fetching framework:", error);
      res.status(500).json({ message: "Failed to fetch framework" });
    }
  });

  // ============================================
  // ASSESSMENT ROUTES
  // ============================================

  /**
   * GET /api/assessments
   * List assessments based on user role:
   * - Admins: See all assessments
   * - Assessors: See all assessments
   * - External: See only completed and public assessments
   *
   * Now includes pillar scores for each assessment
   */
  app.get("/api/assessments", isAuthenticated, async (req: any, res) => {
    console.log('[GET /api/assessments] Endpoint called');
    try {
      const userId = req.user.id;
      const currentUser = req.user;

      let assessments;
      if (currentUser?.role === "external") {
        // External users can only see assessments that are both completed AND public
        const allAssessments = await storage.getAssessments();
        assessments = allAssessments.filter(a =>
          a.status === "completed" && a.isPublic === true
        );
      } else if (currentUser?.role === "admin" || currentUser?.role === "assessor") {
        // Admins and assessors can see all assessments
        assessments = await storage.getAssessments();
      } else {
        // Fallback: only see own assessments
        assessments = await storage.getAssessments(userId);
      }

      // Calculate and attach pillar scores for each assessment
      console.log(`[GET /api/assessments] Processing ${assessments.length} assessments`);

      const assessmentsWithScores = await Promise.all(
        assessments.map(async (assessment) => {
          console.log(`[GET /api/assessments] Calculating scores for ${assessment.id}`);
          const pillarScores = await calculateAssessmentScores(assessment.id);
          console.log(`[GET /api/assessments] Got ${pillarScores.length} pillar scores for ${assessment.id}`);
          return {
            ...assessment,
            pillarScores
          };
        })
      );

      console.log(`[GET /api/assessments] Returning ${assessmentsWithScores.length} assessments with scores`);
      res.json(assessmentsWithScores);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  app.get("/api/assessments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = req.user;
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Check access permissions
      const canAccess = 
        currentUser?.role === "admin" ||
        currentUser?.role === "assessor" ||
        assessment.userId === userId ||
        (assessment.isPublic && currentUser?.role !== undefined);
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(assessment);
    } catch (error) {
      console.error("Error fetching assessment:", error);
      res.status(500).json({ message: "Failed to fetch assessment" });
    }
  });

  app.post("/api/assessments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = req.user;
      
      if (currentUser?.role === "external") {
        return res.status(403).json({ message: "External users cannot create assessments" });
      }
      
      const validatedData = insertAssessmentSchema.parse({
        ...req.body,
        userId,
      });
      
      const assessment = await storage.createAssessment(validatedData);
      res.json(assessment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assessment data", errors: error.errors });
      }
      console.error("Error creating assessment:", error);
      res.status(500).json({ message: "Failed to create assessment" });
    }
  });

  app.patch("/api/assessments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Check edit permissions
      const canEdit = 
        currentUser?.role === "admin" ||
        (assessment.userId === userId && currentUser?.role !== "external");
      
      if (!canEdit) {
        return res.status(403).json({ message: "Cannot edit this assessment" });
      }
      
      const updatedAssessment = await storage.updateAssessment(req.params.id, req.body);
      res.json(updatedAssessment);
    } catch (error) {
      console.error("Error updating assessment:", error);
      res.status(500).json({ message: "Failed to update assessment" });
    }
  });

  app.delete("/api/assessments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Check delete permissions
      const canDelete = 
        currentUser?.role === "admin" ||
        (assessment.userId === userId && currentUser?.role !== "external");
      
      if (!canDelete) {
        return res.status(403).json({ message: "Cannot delete this assessment" });
      }
      
      await storage.deleteAssessment(req.params.id);
      res.json({ message: "Assessment deleted successfully" });
    } catch (error) {
      console.error("Error deleting assessment:", error);
      res.status(500).json({ message: "Failed to delete assessment" });
    }
  });

  app.post("/api/assessments/:id/clone", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const sourceAssessment = await storage.getAssessment(req.params.id);
      
      if (!sourceAssessment) {
        return res.status(404).json({ message: "Source assessment not found" });
      }
      
      // Check access permissions to source assessment
      const canAccess = 
        currentUser?.role === "admin" ||
        sourceAssessment.userId === userId ||
        (sourceAssessment.isPublic && currentUser?.role !== undefined);
      
      if (!canAccess) {
        return res.status(403).json({ message: "Cannot access source assessment" });
      }
      
      // Check create permissions for new assessment
      if (currentUser?.role === "external") {
        return res.status(403).json({ message: "External users cannot create assessments" });
      }
      
      // Get source assessment responses
      const sourceResponses = await storage.getAssessmentResponses(req.params.id);
      const sourceMetricNotes = await storage.getAssessmentMetricNotes(req.params.id);
      
      // Create new assessment with cloned data
      const newAssessmentData = insertAssessmentSchema.parse({
        systemName: `${sourceAssessment.systemName} (Copy)`,
        systemDescription: sourceAssessment.systemDescription,
        isPublic: false, // New assessment starts as private
        userId: userId,
        status: "draft"
      });
      
      const newAssessment = await storage.createAssessment(newAssessmentData);
      
      // Clone responses using direct insert (since these are new records)
      for (const response of sourceResponses) {
        const clonedResponse = insertAssessmentResponseSchema.parse({
          assessmentId: newAssessment.id,
          metricId: response.metricId,
          answer: response.answer,
          answerValue: response.answerValue
        });
        await storage.createAssessmentResponse(clonedResponse);
      }
      
      // Clone metric notes using direct insert (since these are new records)
      for (const note of sourceMetricNotes) {
        const clonedNote = insertAssessmentMetricNoteSchema.parse({
          assessmentId: newAssessment.id,
          metricId: note.metricId,
          notes: note.notes
        });
        await storage.createAssessmentMetricNote(clonedNote);
      }
      
      console.log('Sending cloned assessment response:', newAssessment);
      res.json(newAssessment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid clone data", errors: error.errors });
      }
      console.error("Error cloning assessment:", error);
      res.status(500).json({ message: "Failed to clone assessment" });
    }
  });

  // Assessment responses routes
  app.get("/api/assessments/:id/responses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Check access permissions
      const canAccess = 
        currentUser?.role === "admin" ||
        currentUser?.role === "assessor" ||
        assessment.userId === userId ||
        (assessment.isPublic && currentUser?.role !== undefined);
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const responses = await storage.getAssessmentResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching assessment responses:", error);
      res.status(500).json({ message: "Failed to fetch assessment responses" });
    }
  });

  app.post("/api/assessments/:id/responses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Check edit permissions
      const canEdit = 
        currentUser?.role === "admin" ||
        (assessment.userId === userId && currentUser?.role !== "external");
      
      if (!canEdit) {
        return res.status(403).json({ message: "Cannot edit this assessment" });
      }
      
      const validatedData = insertAssessmentResponseSchema.parse({
        ...req.body,
        assessmentId: req.params.id,
      });

      // Validate metric type matches data
      const [metric] = await db.select().from(metrics).where(eq(metrics.id, validatedData.metricId));

      if (!metric) {
        return res.status(400).json({ message: "Metric not found" });
      }

      if (metric.metricType === "boolean" && validatedData.answerValue != null) {
        return res.status(400).json({
          message: "Boolean metrics cannot have percentage values"
        });
      }

      if (metric.metricType === "percentage" && (validatedData.answerValue == null || validatedData.answerValue === undefined)) {
        return res.status(400).json({
          message: "Percentage metrics require a value between 0 and 100"
        });
      }

      const response = await storage.upsertAssessmentResponse(validatedData);
      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data", errors: error.errors });
      }
      console.error("Error saving assessment response:", error);
      res.status(500).json({ message: "Failed to save assessment response" });
    }
  });

  // Apply mechanism configuration endpoint
  app.post("/api/assessments/:id/apply-configuration", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Check edit permissions
      const canEdit =
        currentUser?.role === "admin" ||
        (assessment.userId === userId && currentUser?.role !== "external");

      if (!canEdit) {
        return res.status(403).json({ message: "Cannot edit this assessment" });
      }

      const { mechanismId, metricType, choiceIndex } = req.body;

      // Validate inputs
      if (!mechanismId || !metricType || choiceIndex === undefined) {
        return res.status(400).json({ message: "Missing required fields: mechanismId, metricType, choiceIndex" });
      }

      if (!['operational', 'design'].includes(metricType)) {
        return res.status(400).json({ message: "Invalid metric type. Must be 'operational' or 'design'" });
      }

      if (typeof choiceIndex !== 'number' || choiceIndex < 0 || choiceIndex > 4) {
        return res.status(400).json({ message: "Invalid choice index. Must be a number between 0 and 4" });
      }

      // Apply the configuration to all metrics
      const updatedCount = await applyMechanismConfiguration(
        req.params.id,
        mechanismId,
        metricType,
        choiceIndex
      );

      // Update the assessment's mechanismConfigurations field
      const currentConfigs = assessment.mechanismConfigurations || {};
      const mechanismConfig = currentConfigs[mechanismId] || { operational: null, design: null };
      if (metricType === 'operational') {
        mechanismConfig.operational = choiceIndex;
      } else {
        mechanismConfig.design = choiceIndex;
      }
      currentConfigs[mechanismId] = mechanismConfig;

      await db.update(assessments)
        .set({
          mechanismConfigurations: currentConfigs,
          updatedAt: new Date()
        })
        .where(eq(assessments.id, req.params.id));

      res.json({
        success: true,
        appliedCount: updatedCount,
        message: `Applied configuration to ${updatedCount} metrics`
      });
    } catch (error) {
      console.error("Error applying configuration:", error);
      res.status(500).json({ message: "Failed to apply configuration", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Assessment metric notes routes
  app.get("/api/assessments/:id/metric-notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Check access permissions
      const canAccess = 
        currentUser?.role === "admin" ||
        currentUser?.role === "assessor" ||
        assessment.userId === userId ||
        (assessment.isPublic && currentUser?.role !== undefined);
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const notes = await storage.getAssessmentMetricNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching assessment metric notes:", error);
      res.status(500).json({ message: "Failed to fetch metric notes" });
    }
  });

  app.post("/api/assessments/:id/metric-notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Check edit permissions
      const canEdit = 
        currentUser?.role === "admin" ||
        (assessment.userId === userId && currentUser?.role !== "external");
      
      if (!canEdit) {
        return res.status(403).json({ message: "Cannot edit this assessment" });
      }
      
      const validatedData = insertAssessmentMetricNoteSchema.parse({
        ...req.body,
        assessmentId: req.params.id,
      });
      
      const note = await storage.upsertAssessmentMetricNote(validatedData);
      res.json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      console.error("Error saving assessment metric note:", error);
      res.status(500).json({ message: "Failed to save metric note" });
    }
  });

  // Standards compliance routes
  app.get("/api/standards", isAuthenticated, async (req: any, res) => {
    try {
      const standards = await storage.getAvailableStandards();
      res.json(standards);
    } catch (error) {
      console.error("Error fetching available standards:", error);
      res.status(500).json({ message: "Failed to fetch available standards" });
    }
  });

  app.get("/api/assessments/:id/standards-compliance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Check access permissions
      const canAccess = 
        currentUser?.role === "admin" ||
        currentUser?.role === "assessor" ||
        assessment.userId === userId ||
        (assessment.isPublic && currentUser?.role !== undefined);
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const compliance = await storage.getAssessmentStandardsCompliance(req.params.id);
      res.json(compliance);
    } catch (error) {
      console.error("Error fetching assessment standards compliance:", error);
      res.status(500).json({ message: "Failed to fetch standards compliance" });
    }
  });

  app.post("/api/assessments/:id/standards-compliance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Check edit permissions
      const canEdit = 
        currentUser?.role === "admin" ||
        (assessment.userId === userId && currentUser?.role !== "external");
      
      if (!canEdit) {
        return res.status(403).json({ message: "Cannot edit this assessment" });
      }
      
      const { standard, isCompliant } = req.body;
      
      if (!standard || typeof isCompliant !== "boolean") {
        return res.status(400).json({ message: "Invalid request data" });
      }
      
      await storage.setStandardCompliance(req.params.id, standard, isCompliant);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting standards compliance:", error);
      res.status(500).json({ message: "Failed to set standards compliance" });
    }
  });

  // PDF Report generation
  app.get("/api/assessments/:id/report", isAuthenticated, async (req: any, res) => {
    try {
      console.log("=== PDF REPORT REQUEST ===");
      console.log("Assessment ID:", req.params.id);
      console.log("User ID:", req.user.id);

      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const assessment = await storage.getAssessment(req.params.id);

      if (!assessment) {
        console.log("Assessment not found");
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Check access permissions
      const canAccess =
        currentUser?.role === "admin" ||
        currentUser?.role === "assessor" ||
        assessment.userId === userId ||
        (assessment.isPublic && currentUser?.role !== undefined);

      if (!canAccess) {
        console.log("Access denied");
        return res.status(403).json({ message: "Access denied" });
      }

      // Fetch required data
      console.log("Fetching assessment data...");
      const responses = await storage.getAssessmentResponses(req.params.id);
      const framework = await storage.getPillarsWithStructure();
      const metricNotes = await storage.getAssessmentMetricNotes(req.params.id);

      console.log("Data fetched:", {
        responsesCount: responses?.length || 0,
        frameworkCount: framework?.length || 0,
        notesCount: metricNotes?.length || 0
      });

      const assessmentData = {
        assessment,
        responses,
        framework
      };

      // Generate PDF
      console.log("Generating PDF...");
      const pdfBuffer = await pdfService.generatePDF(assessmentData, metricNotes);
      console.log("PDF generated, size:", pdfBuffer.length);

      // Set response headers
      const fileName = `assessment-report-${assessment.systemName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      console.log("Sending PDF response...");
      res.send(pdfBuffer);
      console.log("=== PDF REPORT COMPLETE ===");
    } catch (error) {
      console.error("=== PDF REPORT ERROR ===");
      console.error("Error generating PDF report:", error);
      if (error instanceof Error) {
        console.error("Stack:", error.stack);
        res.status(500).json({ message: "Failed to generate PDF report", error: error.message });
      } else {
        res.status(500).json({ message: "Failed to generate PDF report", error: String(error) });
      }
    }
  });

  // PDF Comparison generation
  app.post("/api/assessments/compare", isAuthenticated, async (req: any, res) => {
    try {
      console.log("=== PDF COMPARISON REQUEST ===");
      const { assessmentIds } = req.body;
      console.log("Assessment IDs:", assessmentIds);

      // Validation
      if (!Array.isArray(assessmentIds) || assessmentIds.length !== 2) {
        console.log("Invalid assessment IDs:", assessmentIds);
        return res.status(400).json({ message: "Exactly 2 assessment IDs required" });
      }

      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);

      // Fetch both assessments
      const [assessment1, assessment2] = await Promise.all([
        storage.getAssessment(assessmentIds[0]),
        storage.getAssessment(assessmentIds[1])
      ]);

      if (!assessment1 || !assessment2) {
        console.log("One or both assessments not found");
        return res.status(404).json({ message: "One or both assessments not found" });
      }

      // Check access permissions for both assessments
      const canAccessAssessment = (assessment: any) => {
        return (
          currentUser?.role === "admin" ||
          currentUser?.role === "assessor" ||
          assessment.userId === userId ||
          (assessment.isPublic && currentUser?.role !== undefined)
        );
      };

      if (!canAccessAssessment(assessment1) || !canAccessAssessment(assessment2)) {
        console.log("Access denied to one or both assessments");
        return res.status(403).json({ message: "Access denied to one or both assessments" });
      }

      console.log("Fetching data for both assessments...");

      // Fetch all required data for both assessments
      const [responses1, responses2, framework, notes1, notes2] = await Promise.all([
        storage.getAssessmentResponses(assessmentIds[0]),
        storage.getAssessmentResponses(assessmentIds[1]),
        storage.getPillarsWithStructure(),
        storage.getAssessmentMetricNotes(assessmentIds[0]),
        storage.getAssessmentMetricNotes(assessmentIds[1])
      ]);

      console.log("Data fetched:", {
        responses1Count: responses1?.length || 0,
        responses2Count: responses2?.length || 0,
        frameworkCount: framework?.length || 0,
        notes1Count: notes1?.length || 0,
        notes2Count: notes2?.length || 0
      });

      const comparisonData = {
        assessment1,
        assessment2,
        responses1,
        responses2,
        framework,
        notes1,
        notes2
      };

      // Generate comparison PDF
      console.log("Generating comparison PDF...");
      const pdfBuffer = await pdfService.generateComparisonPDF(comparisonData);
      console.log("Comparison PDF generated, size:", pdfBuffer.length);

      // Set response headers
      const fileName = `comparison-${assessment1.systemName.replace(/[^a-zA-Z0-9]/g, '-')}-vs-${assessment2.systemName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      console.log("Sending comparison PDF response...");
      res.send(pdfBuffer);
      console.log("=== PDF COMPARISON COMPLETE ===");
    } catch (error) {
      console.error("=== PDF COMPARISON ERROR ===");
      console.error("Error generating comparison PDF:", error);
      if (error instanceof Error) {
        console.error("Stack:", error.stack);
        res.status(500).json({ message: "Failed to generate comparison PDF", error: error.message });
      } else {
        res.status(500).json({ message: "Failed to generate comparison PDF", error: String(error) });
      }
    }
  });

  // Statistics routes
  app.get("/api/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Admins and assessors see stats for all assessments, others see only their own
      const stats = await storage.getAssessmentStats(
        userRole === "admin" || userRole === "assessor" ? undefined : userId
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
