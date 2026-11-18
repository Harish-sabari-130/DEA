import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Table 1: clinical_cases
 * Stores incoming patient profile, automated routing tier, and complexity score.
 */
export const clinicalCasesTable = pgTable("clinical_cases", {
  id: text("id").primaryKey(),
  patientProfileJson: jsonb("patient_profile_json").notNull(),
  routingTier: text("routing_tier").notNull(),
  complexityScore: integer("complexity_score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertClinicalCaseSchema = createInsertSchema(clinicalCasesTable);
export const selectClinicalCaseSchema = createSelectSchema(clinicalCasesTable);

export type ClinicalCase = typeof clinicalCasesTable.$inferSelect;
export type InsertClinicalCase = typeof clinicalCasesTable.$inferInsert;

/**
 * Table 2: arbitration_reports
 * Immutable record of DEA arbitration calculation, weights, ranked candidates,
 * detected cross-silo conflicts, claim verifications, and cryptographic SHA-256 hash.
 */
export const arbitrationReportsTable = pgTable("arbitration_reports", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => clinicalCasesTable.id),
  deaWeightsJson: jsonb("dea_weights_json").notNull(),
  rankedCandidatesJson: jsonb("ranked_candidates_json").notNull(),
  conflictsJson: jsonb("conflicts_json").notNull(),
  claimVerificationsJson: jsonb("claim_verifications_json"),
  reconciliationJson: jsonb("reconciliation_json"),
  sha256IntegrityHash: text("sha256_integrity_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertArbitrationReportSchema = createInsertSchema(arbitrationReportsTable);
export const selectArbitrationReportSchema = createSelectSchema(arbitrationReportsTable);

export type ArbitrationReport = typeof arbitrationReportsTable.$inferSelect;
export type InsertArbitrationReport = typeof arbitrationReportsTable.$inferInsert;

/**
 * Table 3: doctor_decisions
 * Attending clinician's final clinical sign-off, chosen treatment pathway,
 * action taken ("accepted_top_dea" | "clinical_override" | "deferred"),
 * and mandatory clinical justification if overriding a high-risk conflict.
 */
export const doctorDecisionsTable = pgTable("doctor_decisions", {
  id: text("id").primaryKey(),
  reportId: text("report_id")
    .notNull()
    .references(() => arbitrationReportsTable.id),
  clinicianName: text("clinician_name").notNull(),
  selectedCandidate: text("selected_candidate").notNull(),
  actionTaken: text("action_taken").notNull(), // "accepted_top_dea" | "clinical_override" | "deferred"
  overrideReason: text("override_reason"),
  signedAt: timestamp("signed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const actionTakenEnum = z.enum(["accepted_top_dea", "clinical_override", "deferred"]);
export type ActionTakenType = z.infer<typeof actionTakenEnum>;

export const insertDoctorDecisionSchema = createInsertSchema(doctorDecisionsTable);
export const selectDoctorDecisionSchema = createSelectSchema(doctorDecisionsTable);

export type DoctorDecision = typeof doctorDecisionsTable.$inferSelect;
export type InsertDoctorDecision = typeof doctorDecisionsTable.$inferInsert;
