/**
 * Storage Layer Module
 *
 * Provides the data access layer for the entire application.
 * All database operations should go through this module to maintain separation of concerns.
 *
 * Main responsibilities:
 * - User management (CRUD, authentication)
 * - Framework structure (pillars, mechanisms, metrics)
 * - Assessments and metric responses (boolean or percentage)
 * - Standards compliance tracking
 * - Framework initialization and import
 */

import {
  users,
  pillars,
  mechanisms,
  metrics,
  assessments,
  assessmentResponses,
  assessmentMetricNotes,
  assessmentStandardsCompliance,
  type User,
  type UpsertUser,
  type InsertUser,
  type Pillar,
  type InsertPillar,
  type Mechanism,
  type InsertMechanism,
  type Metric,
  type InsertMetric,
  type Assessment,
  type InsertAssessment,
  type AssessmentResponse,
  type InsertAssessmentResponse,
  type AssessmentMetricNote,
  type InsertAssessmentMetricNote,
  type AssessmentStandardsCompliance,
  type InsertAssessmentStandardsCompliance,
  type AssessmentWithUser,
  type PillarWithMechanisms,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Storage Interface
 *
 * Defines all data access methods available in the application.
 * Implemented by DatabaseStorage class using Drizzle ORM and SQLite.
 */
export interface IStorage {
  // User operations (for username/password auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  resetUserPassword(id: string, hashedPassword: string): Promise<User>;
  
  // User management
  getAllUsers(): Promise<User[]>;
  
  // Framework structure
  getPillars(): Promise<Pillar[]>;
  getPillarsWithStructure(): Promise<PillarWithMechanisms[]>;
  initializeFramework(): Promise<void>;
  initializeDatabase(): Promise<void>;
  
  // Assessments
  getAssessment(id: string): Promise<Assessment | undefined>;
  getAssessments(userId?: string, isPublic?: boolean): Promise<AssessmentWithUser[]>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: string, assessment: Partial<InsertAssessment>): Promise<Assessment>;
  deleteAssessment(id: string): Promise<void>;
  
  // Assessment responses
  getAssessmentResponses(assessmentId: string): Promise<AssessmentResponse[]>;
  upsertAssessmentResponse(response: InsertAssessmentResponse): Promise<AssessmentResponse>;
  
  // Assessment metric notes
  getAssessmentMetricNotes(assessmentId: string): Promise<AssessmentMetricNote[]>;
  upsertAssessmentMetricNote(note: InsertAssessmentMetricNote): Promise<AssessmentMetricNote>;
  
  // Standards compliance
  getAssessmentStandardsCompliance(assessmentId: string): Promise<AssessmentStandardsCompliance[]>;
  getAvailableStandards(): Promise<string[]>;
  upsertAssessmentStandardsCompliance(assessmentId: string, standard: string, isCompliant: boolean): Promise<AssessmentStandardsCompliance>;
  setStandardCompliance(assessmentId: string, standard: string, isCompliant: boolean): Promise<void>;

  // Statistics
  getAssessmentStats(userId?: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    public: number;
  }>;
}

/**
 * DatabaseStorage Implementation
 *
 * Concrete implementation of IStorage using Drizzle ORM with SQLite.
 * All methods use prepared statements to prevent SQL injection.
 */
export class DatabaseStorage implements IStorage {
  // ============================================
  // USER OPERATIONS
  // ============================================

  /**
   * Retrieve a user by their ID
   * Used during session deserialization and user profile lookups
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Retrieve a user by their username
   * Used during login authentication
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  /**
   * Retrieve a user by their email address
   * Used to check for duplicate emails during registration
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  /**
   * Create a new user account
   * @param userData - User data including hashed password
   * @returns The newly created user object
   */
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  /**
   * Update an existing user's information
   * Automatically updates the updatedAt timestamp
   */
  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  /**
   * Update a user's last login timestamp
   * Called automatically after successful authentication
   */
  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  /**
   * Delete a user account
   * WARNING: This will cascade delete all assessments owned by the user
   */
  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  /**
   * Reset a user's password
   * @param hashedPassword - Already hashed password (use hashPassword from auth.ts)
   */
  async resetUserPassword(id: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  /**
   * Get all users in the system
   * Used in admin user management interface
   * @returns Users ordered by creation date (newest first)
   */
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }


  // ============================================
  // FRAMEWORK STRUCTURE
  // ============================================

  /**
   * Get all pillars (top-level security categories)
   * @returns Pillars ordered by their display order
   */
  async getPillars(): Promise<Pillar[]> {
    return await db.select().from(pillars).orderBy(pillars.order);
  }

  /**
   * Get complete framework hierarchy with all nested relationships
   *
   * Returns pillars with all their mechanisms and metrics nested.
   * Used by the assessment form to display the entire framework structure.
   *
   * Hierarchy: Pillar -> Mechanism -> Metric
   */
  async getPillarsWithStructure(): Promise<PillarWithMechanisms[]> {
    const result = await db.query.pillars.findMany({
      orderBy: [pillars.order],
      with: {
        mechanisms: {
          orderBy: [mechanisms.order],
          with: {
            metrics: {
              orderBy: [metrics.order],
            },
          },
        },
      },
    });
    return result;
  }

  /**
   * Initialize the framework structure from framework.json
   *
   * Loads the default framework data (pillars, mechanisms, metrics)
   * from the framework.json file and populates the database.
   *
   * This is called automatically on first startup when the database is empty.
   * Will skip initialization if framework already exists.
   *
   * Structure loaded:
   * - 6 security pillars (e.g., Access Control, Data Protection)
   * - Multiple mechanisms per pillar
   * - Metrics with standards mapping, caps, and metricType (boolean or percentage)
   */
  async initializeFramework(): Promise<void> {
    // Check if framework already exists - skip if so
    const existingPillars = await this.getPillars();
    if (existingPillars.length > 0) return;

    try {
      // Determine path to framework.json file (handles ES modules)
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const frameworkPath = join(__dirname, 'framework', 'framework.json');

      // Load and parse the framework JSON file
      const frameworkContent = readFileSync(frameworkPath, 'utf-8');
      const frameworkData = JSON.parse(frameworkContent);

      // Process each pillar from the JSON data
      for (const [pillarIndex, pillarData] of frameworkData.entries()) {
        // Insert the pillar and get the generated ID
        const [pillar] = await db.insert(pillars).values({
          code: pillarData.code,
          name: pillarData.name,
          description: pillarData.description,
          order: pillarIndex + 1, // Display order (1-indexed)
        }).returning();

        // Process mechanisms for this pillar
        for (const [mechIndex, mechData] of pillarData.mechanisms.entries()) {
          // Insert mechanism linked to the pillar
          const [mechanism] = await db.insert(mechanisms).values({
            pillarId: pillar.id, // Foreign key to parent pillar
            code: mechData.code,
            name: mechData.name,
            description: mechData.description,
            operationalWeight: mechData.operationalWeight || 1.0, // Default to equal weight
            designWeight: mechData.designWeight || 1.0, // Default to equal weight
            operationalConfigurations: mechData.operationalConfigurations || [], // Configuration presets for operational metrics
            designConfigurations: mechData.designConfigurations || [], // Configuration presets for design metrics
            order: mechIndex + 1,
          }).returning();

          // Process metrics for this mechanism
          for (const [metricIndex, metricData] of mechData.metrics.entries()) {
            // Insert metric with standards, cap values, metricType, and weight
            await db.insert(metrics).values({
              mechanismId: mechanism.id, // Foreign key to parent mechanism
              code: metricData.code,
              name: metricData.name,
              description: metricData.description,
              type: metricData.type, // "operational" or "design"
              metricType: metricData.metricType || "boolean", // "boolean" or "percentage"
              weight: metricData.weight || 1.0, // Weight for mechanism score calculation (default: 1.0 for equal weighting)
              standards: metricData.standards || [], // Array of compliance standards
              pillarCap: metricData.pillarCap || 100, // Max contribution to pillar score
              mechanismCap: metricData.mechanismCap || 100, // Max contribution to mechanism score
              percentageChoice0: metricData.percentageChoice0 ?? null, // Percentage value for configuration choice 0
              percentageChoice1: metricData.percentageChoice1 ?? null, // Percentage value for configuration choice 1
              percentageChoice2: metricData.percentageChoice2 ?? null, // Percentage value for configuration choice 2
              percentageChoice3: metricData.percentageChoice3 ?? null, // Percentage value for configuration choice 3
              percentageChoice4: metricData.percentageChoice4 ?? null, // Percentage value for configuration choice 4
              order: metricIndex + 1,
            }).returning();
          }
        }
      }

      console.log(`Successfully initialized framework with ${frameworkData.length} pillars from framework.json`);
    } catch (error) {
      console.error('Error loading framework from JSON file:', error);
      throw new Error('Failed to initialize framework from framework.json');
    }
  }

  /**
   * Initialize the database on first startup
   *
   * Performs two key tasks:
   * 1. Loads framework structure from framework.json (if empty)
   * 2. Creates default admin user (if none exists)
   *
   * Called automatically when the server starts.
   */
  async initializeDatabase(): Promise<void> {
    // Initialize framework if not exists
    await this.initializeFramework();

    // Check if admin user already exists
    const existingAdmin = await this.getUserByUsername('admin');
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create default admin user with pre-hashed password
    console.log('Creating default admin user...');
    try {
      await this.createUser({
        username: 'admin',
        email: 'admin@example.com',
        // Pre-hashed password for 'admin123' (scrypt hash with salt)
        password: '3e70a0764d2390a24b8716240ef90a66058ba8991d0a21be585336780c9d72869ec1041495b2b0d8454015e73946fb06eff50e14b93699cdc8403a7cc048ef30.84c3a0a1d04ee5ee9d6a3c425f30a879',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true,
      });
      console.log('Default admin user created successfully');
      console.log('Login credentials: username="admin", password="admin123"');
      console.log('⚠️  Please change the admin password after first login!');
    } catch (error) {
      console.error('Failed to create admin user:', error);
    }
  }

  // ============================================
  // ASSESSMENTS
  // ============================================

  /**
   * Get a single assessment by ID
   * Note: This doesn't check permissions - caller must verify access
   */
  async getAssessment(id: string): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  /**
   * Get assessments with optional filtering
   *
   * @param userId - Filter by owner (optional)
   * @param isPublic - Filter by public/private status (optional)
   * @returns Assessments with user information, ordered by last update (newest first)
   *
   * Examples:
   * - getAssessments() - Get all assessments
   * - getAssessments(userId) - Get user's assessments
   * - getAssessments(undefined, true) - Get all public assessments
   */
  async getAssessments(userId?: string, isPublic?: boolean): Promise<AssessmentWithUser[]> {
    // Build query with join to get user information
    let query = db.select().from(assessments).innerJoin(users, eq(assessments.userId, users.id));

    // Build filter conditions dynamically
    const conditions = [];
    if (userId) {
      conditions.push(eq(assessments.userId, userId));
    }
    if (isPublic !== undefined) {
      conditions.push(eq(assessments.isPublic, isPublic));
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Execute query and order by last update
    const result = await query.orderBy(desc(assessments.updatedAt));

    // Transform result to include user object nested in assessment
    return result.map(row => ({
      ...row.assessments,
      user: row.users,
    }));
  }

  /**
   * Create a new assessment
   * @param assessment - Assessment data including system name, description, userId
   * @returns The newly created assessment
   */
  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const [newAssessment] = await db.insert(assessments).values(assessment as any).returning();
    return newAssessment;
  }

  /**
   * Update an existing assessment
   * Automatically updates the updatedAt timestamp
   */
  async updateAssessment(id: string, assessment: Partial<InsertAssessment>): Promise<Assessment> {
    const [updatedAssessment] = await db
      .update(assessments)
      .set({ ...assessment, updatedAt: new Date() } as any)
      .where(eq(assessments.id, id))
      .returning();
    return updatedAssessment;
  }

  /**
   * Delete an assessment
   * WARNING: Cascade deletes all responses, notes, and compliance data for this assessment
   */
  async deleteAssessment(id: string): Promise<void> {
    await db.delete(assessments).where(eq(assessments.id, id));
  }

  // ============================================
  // ASSESSMENT RESPONSES (Metric assessments: boolean or percentage)
  // ============================================

  /**
   * Get all responses for a specific assessment
   * @returns Array of metric responses with answer (boolean) and answerValue (percentage)
   */
  async getAssessmentResponses(assessmentId: string): Promise<AssessmentResponse[]> {
    return await db
      .select()
      .from(assessmentResponses)
      .where(eq(assessmentResponses.assessmentId, assessmentId));
  }

  /**
   * Create a new assessment response
   * Note: upsertAssessmentResponse is preferred as it handles updates
   */
  async createAssessmentResponse(response: InsertAssessmentResponse): Promise<AssessmentResponse> {
    const [newResponse] = await db
      .insert(assessmentResponses)
      .values(response)
      .returning();
    return newResponse;
  }

  /**
   * Insert or update an assessment response (upsert)
   *
   * If a response for this assessment + metric already exists, it updates the answer.
   * Otherwise, creates a new response.
   *
   * This is the preferred method for saving answers from the assessment form.
   *
   * @param response - Contains assessmentId, metricId, answer (boolean), and optionally answerValue (0-100 for percentage metrics)
   */
  async upsertAssessmentResponse(response: InsertAssessmentResponse): Promise<AssessmentResponse> {
    const [upsertedResponse] = await db
      .insert(assessmentResponses)
      .values(response)
      .onConflictDoUpdate({
        target: [assessmentResponses.assessmentId, assessmentResponses.metricId], // Unique constraint
        set: {
          answer: response.answer, // Update the answer if conflict
          answerValue: response.answerValue, // Update the percentage value if provided
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedResponse;
  }

  // ============================================
  // ASSESSMENT METRIC NOTES (Optional text notes per metric)
  // ============================================

  /**
   * Get all metric notes for a specific assessment
   * @returns Array of notes, each associated with a metric
   */
  async getAssessmentMetricNotes(assessmentId: string): Promise<AssessmentMetricNote[]> {
    return await db
      .select()
      .from(assessmentMetricNotes)
      .where(eq(assessmentMetricNotes.assessmentId, assessmentId));
  }

  /**
   * Create a new metric note
   * Note: upsertAssessmentMetricNote is preferred as it handles updates
   */
  async createAssessmentMetricNote(note: InsertAssessmentMetricNote): Promise<AssessmentMetricNote> {
    const [newNote] = await db
      .insert(assessmentMetricNotes)
      .values(note)
      .returning();
    return newNote;
  }

  /**
   * Insert or update a metric note (upsert)
   *
   * If a note for this assessment + metric already exists, it updates the text.
   * Otherwise, creates a new note.
   *
   * @param note - Contains assessmentId, metricId, and notes (text)
   */
  async upsertAssessmentMetricNote(note: InsertAssessmentMetricNote): Promise<AssessmentMetricNote> {
    const [upsertedNote] = await db
      .insert(assessmentMetricNotes)
      .values(note)
      .onConflictDoUpdate({
        target: [assessmentMetricNotes.assessmentId, assessmentMetricNotes.metricId], // Unique constraint
        set: {
          notes: note.notes, // Update the note text if conflict
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedNote;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get assessment statistics for a specific user or all assessments
   *
   * Calculates counts of assessments by status and visibility.
   * Used for dashboard display.
   *
   * @param userId - ID of the user to get stats for (optional - if undefined, returns all)
   * @returns Object with counts: total, completed, inProgress, public
   */
  async getAssessmentStats(userId?: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    public: number;
  }> {
    // Get assessments based on userId parameter
    const userAssessments = userId
      ? await db
          .select()
          .from(assessments)
          .where(eq(assessments.userId, userId))
      : await db.select().from(assessments); // Get all assessments if no userId

    // Calculate statistics by filtering the results
    return {
      total: userAssessments.length,
      completed: userAssessments.filter(a => a.status === "completed").length,
      inProgress: userAssessments.filter(a => a.status === "in_progress").length,
      public: userAssessments.filter(a => a.isPublic).length,
    };
  }

  // ============================================
  // STANDARDS COMPLIANCE
  // ============================================

  /**
   * Get all standards compliance records for an assessment
   *
   * Returns which standards the assessment claims compliance with.
   * @returns Array of compliance records (standard name + isCompliant boolean)
   */
  async getAssessmentStandardsCompliance(assessmentId: string): Promise<AssessmentStandardsCompliance[]> {
    return await db
      .select()
      .from(assessmentStandardsCompliance)
      .where(eq(assessmentStandardsCompliance.assessmentId, assessmentId));
  }

  /**
   * Get list of all available standards in the framework
   *
   * Extracts unique standard names from all metrics' standards arrays.
   * Used to populate the standards selection UI.
   *
   * @returns Sorted array of standard names (e.g., ["ISO 27001", "NIST SP 800-53"])
   */
  async getAvailableStandards(): Promise<string[]> {
    // Get standards arrays from all metrics
    const allMetrics = await db.select({ standards: metrics.standards }).from(metrics);
    const standardsSet = new Set<string>();

    // Flatten all standards into a single unique set
    allMetrics.forEach(metric => {
      if (metric.standards) {
        metric.standards.forEach(standard => standardsSet.add(standard));
      }
    });

    // Return as sorted array
    return Array.from(standardsSet).sort();
  }

  /**
   * Insert or update a standards compliance record
   *
   * Records whether an assessment claims compliance with a specific standard.
   *
   * @param assessmentId - Assessment ID
   * @param standard - Standard name (e.g., "ISO 27001")
   * @param isCompliant - Whether the assessment claims compliance
   */
  async upsertAssessmentStandardsCompliance(
    assessmentId: string,
    standard: string,
    isCompliant: boolean
  ): Promise<AssessmentStandardsCompliance> {
    const [compliance] = await db
      .insert(assessmentStandardsCompliance)
      .values({
        assessmentId,
        standard,
        isCompliant,
      })
      .onConflictDoUpdate({
        target: [assessmentStandardsCompliance.assessmentId, assessmentStandardsCompliance.standard],
        set: {
          isCompliant,
          updatedAt: new Date(),
        },
      })
      .returning();
    return compliance;
  }

  /**
   * Set standard compliance and auto-fill related metrics
   *
   * When an assessment claims compliance with a standard, this method:
   * 1. Records the compliance in assessment_standards_compliance table
   * 2. If isCompliant=true, automatically sets all related metrics to full compliance
   *
   * This auto-fill feature saves time when marking full compliance with a standard.
   *
   * How it works:
   * - Finds all metrics that list this standard in their standards array
   * - Sets boolean metrics to Yes/true
   * - Sets percentage metrics to 100%
   *
   * @param assessmentId - Assessment ID
   * @param standard - Standard name (e.g., "ISO 27001")
   * @param isCompliant - If true, auto-fills related metrics with full compliance
   */
  async setStandardCompliance(assessmentId: string, standard: string, isCompliant: boolean): Promise<void> {
    // First, record the compliance status
    await this.upsertAssessmentStandardsCompliance(assessmentId, standard, isCompliant);

    // If claiming compliance, auto-fill all related metrics
    if (isCompliant) {
      console.log(`Setting compliance for standard: ${standard}`);

      // Get all metrics in the framework
      const allMetrics = await db
        .select()
        .from(metrics);

      // Filter for metrics that reference this standard
      const metricsWithStandard = allMetrics.filter(metric => {
        const standards = metric.standards as string[] | null;
        return standards?.includes(standard);
      });

      console.log(`Found ${metricsWithStandard.length} metrics with standard ${standard}`);

      // For each matching metric, set it to full compliance
      for (const metric of metricsWithStandard) {
        console.log(`Processing metric: ${metric.name} (${metric.id})`);

        // Set metric response based on its type
        if (metric.metricType === "boolean") {
          await this.upsertAssessmentResponse({
            assessmentId,
            metricId: metric.id,
            answer: true, // Boolean metric: Yes/Implemented
            answerValue: null,
          });
        } else if (metric.metricType === "percentage") {
          await this.upsertAssessmentResponse({
            assessmentId,
            metricId: metric.id,
            answer: true, // Set answer to true when 100%
            answerValue: 100, // Percentage metric: 100% compliance
          });
        }
      }

      console.log(`Completed setting compliance for ${standard}`);
    }
  }
}

// Export a singleton instance of the storage layer
// All other modules import this instance to ensure consistent database access
export const storage = new DatabaseStorage();
