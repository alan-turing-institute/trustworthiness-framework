/**
 * Database Schema Definition
 *
 * Single source of truth for all database tables, types, and validation schemas.
 * Used by both client and server for type safety and validation.
 *
 * Schema hierarchy (framework structure):
 * - Pillars (6 top-level security categories)
 *   └─ Mechanisms (security controls)
 *      └─ Metrics (measurable items with boolean or percentage assessment type)
 *
 * Assessment data structure:
 * - Assessments (one per system being assessed)
 *   ├─ Assessment Responses (metric assessments: boolean yes/no or percentage 0-100)
 *   ├─ Assessment Metric Notes (optional text notes per metric)
 *   └─ Assessment Standards Compliance (claimed compliance with standards)
 *
 * User management:
 * - Users (with roles: admin, assessor, external)
 * - Sessions (for authentication)
 */

import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from 'drizzle-orm';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// AUTHENTICATION & SESSION TABLES
// ============================================

/**
 * Sessions Table
 *
 * Stores user session data for express-session with better-sqlite3 store.
 * Sessions expire after 7 days of inactivity (configurable in auth.ts).
 */
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(), // Session ID (cookie value)
    sess: text("sess", { mode: 'json' }).notNull(), // Session data (serialized JSON)
    expire: integer("expire", { mode: 'timestamp' }).notNull(), // Expiration timestamp
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire), // Index for efficient cleanup
  }),
);

/**
 * Users Table
 *
 * Stores user accounts with role-based access control.
 *
 * Roles:
 * - admin: Full access (manage users, frameworks, all assessments)
 * - assessor: Can create/edit own assessments, view public ones
 * - external: Read-only access to public assessments
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").unique().notNull(), // Login username
  email: text("email").unique(), // Optional email (for notifications)
  password: text("password").notNull(), // Scrypt hash with salt (format: "hash.salt")
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role", { enum: ["admin", "assessor", "external"] }).notNull().default("external"),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true), // Account enabled/disabled
  lastLogin: integer("last_login", { mode: 'timestamp' }), // Last successful login
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================
// FRAMEWORK STRUCTURE TABLES (Hierarchy: Pillar -> Mechanism -> Metric)
// ============================================

/**
 * Pillars Table
 *
 * Top-level security categories (e.g., "Access Control", "Data Protection").
 * Typically 6 pillars in the framework.
 */
export const pillars = sqliteTable("pillars", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(), // Unique code (e.g., "ACC", "DATA")
  name: text("name").notNull(), // Display name
  description: text("description"),
  icon: text("icon"), // Optional icon name for UI
  order: integer("order").notNull(), // Display order (1, 2, 3...)
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Mechanisms Table
 *
 * Mechanisms within each pillar.
 * Example: "Password Policy" under "Access Control" pillar.
 */
export const mechanisms = sqliteTable("mechanisms", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pillarId: text("pillar_id").notNull().references(() => pillars.id, { onDelete: "cascade" }), // Parent pillar
  code: text("code").notNull(), // Code (e.g., "ACC-MECH1")
  name: text("name").notNull(), // Display name
  description: text("description"),
  operationalWeight: real("operational_weight").notNull().default(1.0), // Weight for operational metrics (default: 1.0 for equal weighting)
  designWeight: real("design_weight").notNull().default(1.0), // Weight for design metrics (default: 1.0 for equal weighting)
  operationalConfigurations: text("operational_configurations", { mode: 'json' }).$type<Array<{ label: string; description: string }>>().default([]), // Configuration presets for operational metrics
  designConfigurations: text("design_configurations", { mode: 'json' }).$type<Array<{ label: string; description: string }>>().default([]), // Configuration presets for design metrics
  order: integer("order").notNull(), // Display order within pillar
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  // Ensure codes are unique within each pillar
  uniqueCodePerPillar: uniqueIndex("unique_code_per_pillar").on(table.pillarId, table.code),
}));

/**
 * Metrics Table
 *
 * Measurable security metrics within each mechanism.
 * Each metric has:
 * - Type: "operational" (runtime) or "design" (architecture)
 * - Standards: Array of compliance standards it maps to (e.g., ["ISO 27001", "NIST SP 800-53"])
 * - Caps: Maximum contribution to mechanism and pillar scores
 */
export const metrics = sqliteTable("metrics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  mechanismId: text("mechanism_id").notNull().references(() => mechanisms.id, { onDelete: "cascade" }), // Parent mechanism
  code: text("code").notNull(), // Code (e.g., "ACC-MECH1-01")
  name: text("name").notNull(), // Display name
  description: text("description"),
  type: text("type", { enum: ["operational", "design"] }).notNull(), // Metric type
  metricType: text("metric_type", { enum: ["boolean", "percentage"] }).notNull().default("boolean"), // Assessment type: boolean (yes/no) or percentage (0-100)
  weight: real("weight").notNull().default(1.0), // Weight for this metric in mechanism score calculation (default: 1.0 for equal weighting)
  standards: text("standards", { mode: 'json' }).$type<string[]>(), // Array of standards (stored as JSON)
  mechanismCap: real("mechanism_cap").notNull().default(100.00), // Max % contribution to mechanism score
  pillarCap: real("pillar_cap").notNull().default(100.00), // Max % contribution to pillar score
  percentageChoice0: real("percentage_choice_0"), // Percentage value (0-100) for configuration choice 0
  percentageChoice1: real("percentage_choice_1"), // Percentage value (0-100) for configuration choice 1
  percentageChoice2: real("percentage_choice_2"), // Percentage value (0-100) for configuration choice 2
  percentageChoice3: real("percentage_choice_3"), // Percentage value (0-100) for configuration choice 3
  percentageChoice4: real("percentage_choice_4"), // Percentage value (0-100) for configuration choice 4
  order: integer("order").notNull(), // Display order within mechanism
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  // Ensure codes are unique within each mechanism
  uniqueCodePerMechanism: uniqueIndex("unique_code_per_mechanism").on(table.mechanismId, table.code),
}));

// ============================================
// ASSESSMENT TABLES
// ============================================

/**
 * Assessments Table
 *
 * Stores assessments of systems against the framework.
 * Each assessment evaluates one system across all pillars/mechanisms/metrics.
 *
 * Privacy:
 * - isPublic=false: Only owner and admins can view
 * - isPublic=true: All users can view
 *
 * Status:
 * - draft: Not started
 * - in_progress: Partially completed
 * - completed: All metrics answered
 */
export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Owner
  systemName: text("system_name").notNull(), // Name of system being assessed
  systemDescription: text("system_description"), // Optional description
  isPublic: integer("is_public", { mode: 'boolean' }).notNull().default(false), // Public vs private
  status: text("status", { enum: ["draft", "in_progress", "completed"] }).notNull().default("draft"),
  excludedMechanisms: text("excluded_mechanisms", { mode: 'json' }).$type<string[]>().default([]), // Array of mechanism IDs to exclude from scoring
  mechanismConfigurations: text("mechanism_configurations", { mode: 'json' }).$type<Record<string, { operational: number | null; design: number | null }>>().default({}), // Selected configuration choices per mechanism
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Assessment Responses Table
 *
 * Stores metric assessments for each assessment.
 * One row per assessment+metric combination.
 *
 * For boolean metrics: answer = true/false (converted to 100%/0% for scoring)
 * For percentage metrics: answerValue = 0-100 (direct score)
 *
 * Score calculation:
 * - Boolean metric: answer ? 100 : 0
 * - Percentage metric: answerValue
 * - Mechanism score: weighted avg of metric scores (respecting mechanismCap)
 * - Pillar score: weighted avg of mechanism scores (respecting pillarCap)
 */
export const assessmentResponses = sqliteTable("assessment_responses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  metricId: text("metric_id").notNull().references(() => metrics.id, { onDelete: "cascade" }),
  answer: integer("answer", { mode: 'boolean' }).notNull(), // For boolean metrics: true = Yes/Implemented, false = No/Not Implemented
  answerValue: real("answer_value"), // For percentage metrics: 0-100 value
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  // Ensure only one response per assessment+metric
  uniqueAssessmentMetricResponse: uniqueIndex("unique_assessment_metric_response_v2").on(table.assessmentId, table.metricId),
}));

/**
 * Assessment Metric Notes Table
 *
 * Optional text notes for each metric in an assessment.
 * Used to explain implementation details, exceptions, or context.
 * Included in PDF reports.
 */
export const assessmentMetricNotes = sqliteTable("assessment_metric_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  metricId: text("metric_id").notNull().references(() => metrics.id, { onDelete: "cascade" }),
  notes: text("notes"), // Free-form text notes
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  // Ensure only one note per assessment+metric
  uniqueAssessmentMetric: uniqueIndex("unique_assessment_metric").on(table.assessmentId, table.metricId),
}));

/**
 * Assessment Standards Compliance Table
 *
 * Records which compliance standards an assessment claims to meet.
 * When isCompliant=true for a standard, all related metrics are auto-answered "Yes".
 *
 * Standards examples: "ISO 27001", "NIST SP 800-53", "GDPR"
 * These are defined in metrics.standards arrays.
 */
export const assessmentStandardsCompliance = sqliteTable("assessment_standards_compliance", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  standard: text("standard").notNull(), // Standard name (e.g., "ISO 27001")
  isCompliant: integer("is_compliant", { mode: 'boolean' }).notNull().default(false), // Claims compliance
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  // Ensure only one compliance record per assessment+standard
  uniqueAssessmentStandard: uniqueIndex("unique_assessment_standard").on(table.assessmentId, table.standard),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assessments: many(assessments),
}));

export const pillarsRelations = relations(pillars, ({ many }) => ({
  mechanisms: many(mechanisms),
}));

export const mechanismsRelations = relations(mechanisms, ({ one, many }) => ({
  pillar: one(pillars, {
    fields: [mechanisms.pillarId],
    references: [pillars.id],
  }),
  metrics: many(metrics),
}));

export const metricsRelations = relations(metrics, ({ one }) => ({
  mechanism: one(mechanisms, {
    fields: [metrics.mechanismId],
    references: [mechanisms.id],
  }),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  user: one(users, {
    fields: [assessments.userId],
    references: [users.id],
  }),
  responses: many(assessmentResponses),
  metricNotes: many(assessmentMetricNotes),
  standardsCompliance: many(assessmentStandardsCompliance),
}));

export const assessmentResponsesRelations = relations(assessmentResponses, ({ one }) => ({
  assessment: one(assessments, {
    fields: [assessmentResponses.assessmentId],
    references: [assessments.id],
  }),
  metric: one(metrics, {
    fields: [assessmentResponses.metricId],
    references: [metrics.id],
  }),
}));

export const assessmentMetricNotesRelations = relations(assessmentMetricNotes, ({ one }) => ({
  assessment: one(assessments, {
    fields: [assessmentMetricNotes.assessmentId],
    references: [assessments.id],
  }),
  metric: one(metrics, {
    fields: [assessmentMetricNotes.metricId],
    references: [metrics.id],
  }),
}));

export const assessmentStandardsComplianceRelations = relations(assessmentStandardsCompliance, ({ one }) => ({
  assessment: one(assessments, {
    fields: [assessmentStandardsCompliance.assessmentId],
    references: [assessments.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, lastLogin: true });
export const createUserSchema = insertUserSchema.omit({ password: true }).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export const updateUserSchema = insertUserSchema.partial().omit({ password: true });
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const insertPillarSchema = createInsertSchema(pillars).omit({ id: true, createdAt: true });
export const insertMechanismSchema = createInsertSchema(mechanisms).omit({ id: true, createdAt: true }).extend({
  operationalWeight: z.coerce.number().min(0).default(1.0),
  designWeight: z.coerce.number().min(0).default(1.0),
});
export const insertMetricSchema = createInsertSchema(metrics).omit({ id: true, createdAt: true }).extend({
  weight: z.coerce.number().min(0).default(1.0),
  mechanismCap: z.coerce.number().min(0).max(100).default(100),
  pillarCap: z.coerce.number().min(0).max(100).default(100),
  percentageChoice0: z.number().min(0).max(100).nullable().optional(),
  percentageChoice1: z.number().min(0).max(100).nullable().optional(),
  percentageChoice2: z.number().min(0).max(100).nullable().optional(),
  percentageChoice3: z.number().min(0).max(100).nullable().optional(),
  percentageChoice4: z.number().min(0).max(100).nullable().optional(),
});
export const insertAssessmentSchema = createInsertSchema(assessments).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  mechanismConfigurations: z.record(z.object({
    operational: z.number().min(0).max(4).nullable().optional(),
    design: z.number().min(0).max(4).nullable().optional(),
  })).optional(),
});
export const insertAssessmentResponseSchema = createInsertSchema(assessmentResponses).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  answerValue: z.number().min(0).max(100).nullable().optional(),
});
export const insertAssessmentMetricNoteSchema = createInsertSchema(assessmentMetricNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssessmentStandardsComplianceSchema = createInsertSchema(assessmentStandardsCompliance).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

export type Pillar = typeof pillars.$inferSelect;
export type InsertPillar = z.infer<typeof insertPillarSchema>;

export type Mechanism = typeof mechanisms.$inferSelect;
export type InsertMechanism = z.infer<typeof insertMechanismSchema>;

export type Metric = typeof metrics.$inferSelect;
export type InsertMetric = z.infer<typeof insertMetricSchema>;

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;

export type AssessmentResponse = typeof assessmentResponses.$inferSelect;
export type InsertAssessmentResponse = z.infer<typeof insertAssessmentResponseSchema>;

export type AssessmentMetricNote = typeof assessmentMetricNotes.$inferSelect;
export type InsertAssessmentMetricNote = z.infer<typeof insertAssessmentMetricNoteSchema>;

export type AssessmentStandardsCompliance = typeof assessmentStandardsCompliance.$inferSelect;
export type InsertAssessmentStandardsCompliance = z.infer<typeof insertAssessmentStandardsComplianceSchema>;

// Extended types for UI
export type AssessmentWithUser = Assessment & {
  user: User;
};

export type PillarWithMechanisms = Pillar & {
  mechanisms: (Mechanism & {
    metrics: Metric[];
  })[];
};
