import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";
import { eq, desc } from "drizzle-orm";

const { Pool } = pg;

export * from "./schema";

export let pool: pg.Pool | null = null;
export let db: NodePgDatabase<typeof schema> | null = null;

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  try {
    pool = new Pool({ connectionString: databaseUrl });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.warn("[Database] Failed to initialize PostgreSQL pool, falling back to local audit store:", err);
    pool = null;
    db = null;
  }
} else {
  // Graceful local development warning - no crash
  // console.info("[Database] DATABASE_URL not set; using local file-based audit store (data/clinical_audit_store.json)");
}

// ---------------------------------------------------------------------------
// Local JSON Storage Fallback (for offline dev and zero-config evaluations)
// ---------------------------------------------------------------------------

interface LocalAuditStore {
  clinical_cases: schema.ClinicalCase[];
  arbitration_reports: schema.ArbitrationReport[];
  doctor_decisions: schema.DoctorDecision[];
}

function getLocalStorePath(): string {
  const baseDir = process.env.MEDRAG_DATA_ROOT
    ? process.env.MEDRAG_DATA_ROOT
    : path.resolve(process.cwd(), "data");
  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch {
      // ignore
    }
  }
  return path.join(baseDir, "clinical_audit_store.json");
}

function readLocalStore(): LocalAuditStore {
  const storePath = getLocalStorePath();
  if (!fs.existsSync(storePath)) {
    return { clinical_cases: [], arbitration_reports: [], doctor_decisions: [] };
  }
  try {
    const raw = fs.readFileSync(storePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { clinical_cases: [], arbitration_reports: [], doctor_decisions: [] };
  }
}

function writeLocalStore(store: LocalAuditStore): void {
  const storePath = getLocalStorePath();
  try {
    const tmpPath = `${storePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), "utf-8");
    fs.renameSync(tmpPath, storePath);
  } catch (err) {
    console.error("[Database LocalStore] Failed to persist audit store:", err);
  }
}

// ---------------------------------------------------------------------------
// Unified Clinical Audit Trail Repository
// ---------------------------------------------------------------------------

export async function recordCaseAndReport(
  caseInput: schema.InsertClinicalCase,
  reportInput: schema.InsertArbitrationReport,
): Promise<{ caseId: string; reportId: string }> {
  const now = new Date();
  const cRecord: schema.ClinicalCase = {
    id: caseInput.id,
    patientProfileJson: caseInput.patientProfileJson,
    routingTier: caseInput.routingTier,
    complexityScore: caseInput.complexityScore,
    createdAt: caseInput.createdAt || now,
  };

  const rRecord: schema.ArbitrationReport = {
    id: reportInput.id,
    caseId: reportInput.caseId,
    deaWeightsJson: reportInput.deaWeightsJson,
    rankedCandidatesJson: reportInput.rankedCandidatesJson,
    conflictsJson: reportInput.conflictsJson,
    claimVerificationsJson: reportInput.claimVerificationsJson || null,
    reconciliationJson: reportInput.reconciliationJson || null,
    sha256IntegrityHash: reportInput.sha256IntegrityHash,
    createdAt: reportInput.createdAt || now,
  };

  if (db) {
    try {
      await db.insert(schema.clinicalCasesTable).values(cRecord).onConflictDoNothing();
      await db.insert(schema.arbitrationReportsTable).values(rRecord);
      return { caseId: cRecord.id, reportId: rRecord.id };
    } catch (pgErr) {
      console.warn("[Database] PG insert failed, persisting to local store fallback:", pgErr);
    }
  }

  // Fallback to local file store
  const store = readLocalStore();
  const existingCaseIdx = store.clinical_cases.findIndex((c) => c.id === cRecord.id);
  if (existingCaseIdx >= 0) {
    store.clinical_cases[existingCaseIdx] = cRecord;
  } else {
    store.clinical_cases.unshift(cRecord);
  }

  const existingReportIdx = store.arbitration_reports.findIndex((r) => r.id === rRecord.id);
  if (existingReportIdx >= 0) {
    store.arbitration_reports[existingReportIdx] = rRecord;
  } else {
    store.arbitration_reports.unshift(rRecord);
  }
  writeLocalStore(store);

  return { caseId: cRecord.id, reportId: rRecord.id };
}

export async function recordDoctorSignoff(
  decisionInput: schema.InsertDoctorDecision,
): Promise<schema.DoctorDecision> {
  const now = new Date();
  const dRecord: schema.DoctorDecision = {
    id: decisionInput.id || `DEC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reportId: decisionInput.reportId,
    clinicianName: decisionInput.clinicianName,
    selectedCandidate: decisionInput.selectedCandidate,
    actionTaken: decisionInput.actionTaken,
    overrideReason: decisionInput.overrideReason || null,
    signedAt: decisionInput.signedAt || now,
  };

  if (db) {
    try {
      await db.insert(schema.doctorDecisionsTable).values(dRecord);
      return dRecord;
    } catch (pgErr) {
      console.warn("[Database] PG insert decision failed, falling back to local store:", pgErr);
    }
  }

  // Local fallback
  const store = readLocalStore();
  const existingIdx = store.doctor_decisions.findIndex((d) => d.id === dRecord.id);
  if (existingIdx >= 0) {
    store.doctor_decisions[existingIdx] = dRecord;
  } else {
    store.doctor_decisions.unshift(dRecord);
  }
  writeLocalStore(store);
  return dRecord;
}

export interface AuditHistoryItem {
  case: schema.ClinicalCase;
  report: schema.ArbitrationReport;
  decision: schema.DoctorDecision | null;
}

export async function fetchAuditHistory(limit: number = 50): Promise<AuditHistoryItem[]> {
  if (db) {
    try {
      const reports = await db
        .select()
        .from(schema.arbitrationReportsTable)
        .orderBy(desc(schema.arbitrationReportsTable.createdAt))
        .limit(limit);

      const items: AuditHistoryItem[] = [];
      for (const rep of reports) {
        const caseRows = await db
          .select()
          .from(schema.clinicalCasesTable)
          .where(eq(schema.clinicalCasesTable.id, rep.caseId))
          .limit(1);

        const decRows = await db
          .select()
          .from(schema.doctorDecisionsTable)
          .where(eq(schema.doctorDecisionsTable.reportId, rep.id))
          .limit(1);

        if (caseRows[0]) {
          items.push({
            case: caseRows[0],
            report: rep,
            decision: decRows[0] || null,
          });
        }
      }
      return items;
    } catch (pgErr) {
      console.warn("[Database] PG fetch failed, falling back to local store:", pgErr);
    }
  }

  // Local fallback
  const store = readLocalStore();
  const items: AuditHistoryItem[] = [];
  for (const rep of store.arbitration_reports.slice(0, limit)) {
    const cCase = store.clinical_cases.find((c) => c.id === rep.caseId);
    if (cCase) {
      const dec = store.doctor_decisions.find((d) => d.reportId === rep.id) || null;
      items.push({
        case: cCase,
        report: rep,
        decision: dec,
      });
    }
  }
  return items;
}

export async function getAuditReportById(
  reportId: string,
): Promise<AuditHistoryItem | null> {
  if (db) {
    try {
      const repRows = await db
        .select()
        .from(schema.arbitrationReportsTable)
        .where(eq(schema.arbitrationReportsTable.id, reportId))
        .limit(1);
      if (repRows[0]) {
        const rep = repRows[0];
        const caseRows = await db
          .select()
          .from(schema.clinicalCasesTable)
          .where(eq(schema.clinicalCasesTable.id, rep.caseId))
          .limit(1);
        const decRows = await db
          .select()
          .from(schema.doctorDecisionsTable)
          .where(eq(schema.doctorDecisionsTable.reportId, rep.id))
          .limit(1);
        if (caseRows[0]) {
          return {
            case: caseRows[0],
            report: rep,
            decision: decRows[0] || null,
          };
        }
      }
    } catch (pgErr) {
      console.warn("[Database] PG getAuditReportById failed, falling back:", pgErr);
    }
  }

  const store = readLocalStore();
  const rep = store.arbitration_reports.find((r) => r.id === reportId);
  if (!rep) return null;
  const cCase = store.clinical_cases.find((c) => c.id === rep.caseId);
  if (!cCase) return null;
  const dec = store.doctor_decisions.find((d) => d.reportId === rep.id) || null;
  return {
    case: cCase,
    report: rep,
    decision: dec,
  };
}
