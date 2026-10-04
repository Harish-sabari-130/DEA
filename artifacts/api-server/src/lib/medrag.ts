import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  AnalyzeCaseBody,
  AnalyzeCaseResponse,
  EvaluateFrameworkBody,
  EvaluateFrameworkResponse,
  IngestDocumentBody,
  IngestDocumentResponse,
  ListDemoCasesResponse,
} from "@workspace/api-zod";
import { logger } from "./logger";

type PatientProfile = ReturnType<typeof AnalyzeCaseBody.parse>;
type WorkerEvidence = {
  id: string;
  title: string;
  source: string;
  year: number;
  domain: string;
  excerpt: string;
  chunk: string;
  page?: number | null;
  similarity: number;
  evidence_grade: number;
  risk_level: string;
  metadata?: Record<string, unknown>;
  // Phase 1 DEA enrichment fields (populated by enrich_evidence_item in Python)
  source_type?: string;
  identifier?: string | null;  // PMID / NCT ID / DailyMed setid
  url?: string | null;
  agent?: string;
  claim?: string;
  evidence_level?: string;
  risk_flag?: boolean;
  risk_severity?: string;
  contraindication?: boolean;
};
type WorkerAnalysis = {
  queries: { clinical: string; drug: string; literature: string };
  retrieval_status: {
    database: string;
    embedding_provider: string;
    silo_isolation: boolean;
    top_k: number;
  };
  clinical: {
    agent: string;
    claims: string[];
    recommendations: string[];
    evidence: WorkerEvidence[];
    evidence_grade: number;
    relevance: number;
    recency: number;
    source: string;
    year: number;
  };
  drug: {
    agent: string;
    drug: string;
    contraindications: string[];
    interactions: string[];
    risk_level: string;
    patient_specific_risk: number;
    evidence_grade: number;
    source: string;
    year: number;
    evidence: WorkerEvidence[];
  };
  literature: {
    agent: string;
    findings: string[];
    alternative_treatments: string[];
    evidence_grade: number;
    relevance: number;
    recency: number;
    source: string;
    year: number;
    evidence: WorkerEvidence[];
  };
  // Phase 1: Python DEA results — TypeScript is pass-through only
  conflicts: Array<{
    conflict_detected: boolean;
    conflict_type: string;
    severity: string;
    description: string;
    affected_treatment: string;
    risk_factor: string;
  }>;
  dea: {
    weights: { alpha: number; beta: number; gamma: number; delta: number };
    candidates: Array<{
      candidate: string;
      q_grade: number;
      s_rel: number;
      t_recent: number;
      p_risk: number;
      score: number;
      ranking: number;
      source: string;
    }>;
    method_note: string;
  };
  patient_summary: string;
  explanation: string;
};
type WorkerStats = {
  database: string;
  database_path: string;
  embedding_provider: string;
  silos: Array<{
    domain: string;
    collection: string;
    document_count: number;
    chunk_count: number;
    source_names: string[];
    status: string;
    embedding_model: string;
    last_indexed_at?: string | null;
  }>;
};

const DISCLAIMER =
  "This system is a research prototype for clinical decision-support research. It does not provide medical diagnosis or autonomous treatment decisions and must not replace qualified healthcare professionals.";
const COLLECTIONS = {
  clinical: "clinical_guidelines",
  drug: "drug_information",
  literature: "clinical_literature",
} as const;
const DEFAULT_WEIGHTS = { alpha: 0.35, beta: 0.3, gamma: 0.15, delta: 0.2 };
const DEMO_CASES = [
  {
    id: "demo-01",
    title: "01 / Stable dual therapy review",
    description:
      "A low-conflict profile used to show aligned evidence across the three independent silos.",
    conflict_profile: "no major conflict",
    patient: {
      age: 54,
      sex: "Male",
      diseases: ["Hypertension", "Hyperlipidemia"],
      medications: ["Lisinopril 10 mg daily"],
      symptoms: ["Routine medication review"],
      lab_values: { eGFR: "82 mL/min/1.73m²", potassium: "4.3 mmol/L" },
      allergies: [],
      conditions: ["Synthetic demonstration case 01"],
    },
  },
  {
    id: "demo-02",
    title: "02 / CKD safety collision",
    description:
      "The clinical silo surfaces an option that the drug-safety silo flags under renal impairment.",
    conflict_profile: "recommendation vs renal safety",
    patient: {
      age: 68,
      sex: "Female",
      diseases: ["Type 2 diabetes", "Chronic kidney disease, stage 3"],
      medications: ["Metformin 500 mg twice daily"],
      symptoms: ["Persistent hyperglycemia"],
      lab_values: { eGFR: "34 mL/min/1.73m²", creatinine: "1.7 mg/dL" },
      allergies: ["Penicillin"],
      conditions: ["Synthetic demonstration case 02"],
    },
  },
  {
    id: "demo-03",
    title: "03 / Polypharmacy arbitration",
    description:
      "Multiple candidate treatments create competing evidence paths and make the DEA ranking visible.",
    conflict_profile: "multiple treatment conflicts",
    patient: {
      age: 76,
      sex: "Female",
      diseases: ["Atrial fibrillation", "Chronic kidney disease", "Hypertension"],
      medications: ["Apixaban 5 mg twice daily", "Amlodipine 5 mg daily"],
      symptoms: ["Recent fall", "Dizziness"],
      lab_values: { eGFR: "29 mL/min/1.73m²", hemoglobin: "10.9 g/dL" },
      allergies: ["Sulfonamides"],
      conditions: ["Synthetic demonstration case 03", "Recent fall risk"],
    },
  },
] as const;

function workerPaths() {
  const cwd = process.cwd();
  const workspaceRoot =
    [cwd, resolve(cwd, ".."), resolve(cwd, "../..")].find((candidate) =>
      existsSync(resolve(candidate, "rag_worker.py")),
    ) ?? cwd;
  return {
    cwd: workspaceRoot,
    python:
      process.env.MEDRAG_PYTHON ??
      resolve(workspaceRoot, ".venv/Scripts/python.exe"),
    worker: process.env.MEDRAG_WORKER_PATH ?? resolve(workspaceRoot, "rag_worker.py"),
  };
}

async function runWorker<T>(request: Record<string, unknown>): Promise<T> {
  const paths = workerPaths();
  try {
    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        const child = spawn(paths.python, [paths.worker], {
          cwd: paths.cwd,
          env: { ...process.env, PYTHONUNBUFFERED: "1" },
          stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          stdout += chunk;
          if (stdout.length > 25 * 1024 * 1024) {
            child.kill();
            reject(new Error("RAG worker response exceeded the maximum size"));
          }
        });
        child.stderr.on("data", (chunk: string) => {
          stderr += chunk;
        });
        child.on("error", reject);
        child.on("close", (code) => {
          if (code === 0) resolve({ stdout, stderr });
          else reject(new Error(stderr || `RAG worker exited with code ${code}`));
        });
        child.stdin.end(JSON.stringify(request));
      },
    );
    const lines = stdout
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const response = JSON.parse(lines.at(-1) ?? "{}") as {
      ok?: boolean;
      result?: T;
      error?: string;
    };
    if (!response.ok || !response.result) {
      throw new Error(response.error ?? "RAG worker returned no result");
    }
    if (stderr.trim()) {
      logger.debug({ workerStderr: stderr.trim().slice(-1000) }, "RAG worker diagnostics");
    }
    return response.result;
  } catch (error) {
    logger.error({ err: error, ...paths }, "RAG worker request failed");
    throw new Error(
      `Local Chroma RAG worker unavailable. Expected ${paths.python} and ${paths.worker}.`,
    );
  }
}

function recency(year: number) {
  return Number(Math.min(1, Math.max(0, (year - 2010) / 20)).toFixed(3));
}

function toEvidence(item: WorkerEvidence) {
  return {
    id: item.id,
    title: item.title,
    source: item.source,
    year: item.year,
    domain: item.domain,
    excerpt: item.excerpt,
    evidence_grade: item.evidence_grade,
    relevance: item.similarity,
    recency: recency(item.year),
    risk_level: item.risk_level,
    page: item.page ?? null,
    chunk: item.chunk,
    similarity: item.similarity,
    metadata: item.metadata ?? {},
  };
}

function terms(value: string[]) {
  return value.join(" ").toLowerCase();
}

/**
 * @deprecated Phase 1: DEA scoring has moved to the authoritative Python
 * implementation (calculate_dea_score in rag_worker.py).  This function is
 * retained for unit-test and reference purposes only.  It MUST NOT be called
 * in the analyzePatient() production path.
 */
export function calculateDEAScore(
  qGrade: number,
  relevance: number,
  recent: number,
  risk: number,
  weights = DEFAULT_WEIGHTS,
) {
  const value =
    weights.alpha * qGrade +
    weights.beta * relevance +
    weights.gamma * recent -
    weights.delta * risk;
  return Number(value.toFixed(3));
}

/**
 * @deprecated Phase 1: Conflict detection has moved to the authoritative Python
 * implementation (detect_conflicts_python in rag_worker.py).  This function is
 * retained for unit-test and reference purposes only.  It MUST NOT be called
 * in the analyzePatient() production path.
 */
export function detectConflicts(
  patient: PatientProfile,
  analysis: WorkerAnalysis,
) {
  const diseaseText = terms(patient.diseases);
  const medicationText = terms(patient.medications);
  const symptomText = terms([...patient.symptoms, ...patient.conditions]);
  const labsText = terms(Object.entries(patient.lab_values).map(([key, value]) => `${key} ${value}`));
  const allergyText = terms(patient.allergies);
  const fullMedicationText = `${medicationText} ${diseaseText}`;
  const conflicts: Array<{
    conflict_detected: boolean;
    conflict_type: string;
    severity: string;
    description: string;
    affected_treatment: string;
    risk_factor: string;
  }> = [];
  const renal = /kidney|ckd|renal|egfr/.test(`${diseaseText} ${labsText}`);
  const hepatic = /liver|hepatic|ast|alt|bilirubin/.test(`${diseaseText} ${labsText}`);
  const fall = /fall|dizz|bleed/.test(symptomText);

  if (
    analysis.clinical.recommendations.some((recommendation) =>
      /sglt2|metformin|anticoag|lisinopril|treatment pathway/i.test(recommendation),
    ) &&
    analysis.drug.risk_level === "high"
  ) {
    conflicts.push({
      conflict_detected: true,
      conflict_type: "clinical recommendation vs high-risk medication",
      severity: "high",
      description:
        "The clinical silo produced a treatment pathway while the drug-safety silo independently marked the reviewed exposure as high risk.",
      affected_treatment: analysis.drug.drug,
      risk_factor: "high patient-specific medication risk",
    });
  }
  if (renal && /metformin|apixaban|lisinopril/.test(fullMedicationText)) {
    conflicts.push({
      conflict_detected: true,
      conflict_type: "drug-disease conflict",
      severity: analysis.drug.risk_level === "high" ? "high" : "moderate",
      description:
        "Renal impairment was found in the structured profile and the drug silo returned a renal safety signal for the medication under review.",
      affected_treatment: analysis.drug.drug,
      risk_factor: "reduced renal function",
    });
  }
  if (hepatic && /apixaban|statin|acetaminophen/.test(fullMedicationText)) {
    conflicts.push({
      conflict_detected: true,
      conflict_type: "hepatic restriction",
      severity: "moderate",
      description:
        "The profile contains a hepatic restriction signal that requires clinician-led review of the medication evidence.",
      affected_treatment: analysis.drug.drug,
      risk_factor: "hepatic laboratory or disease signal",
    });
  }
  const allergyMatch = patient.allergies.find((allergy) =>
    medicationText.includes(allergy.toLowerCase()),
  );
  if (allergyMatch) {
    conflicts.push({
      conflict_detected: true,
      conflict_type: "allergy conflict",
      severity: "high",
      description:
        "A listed allergy overlaps with the current medication text and must be reconciled before interpretation.",
      affected_treatment: analysis.drug.drug,
      risk_factor: allergyMatch,
    });
  }
  if (patient.medications.length > 1 && /interaction|concurrent|other agents/i.test(analysis.drug.interactions.join(" "))) {
    conflicts.push({
      conflict_detected: true,
      conflict_type: "drug-drug interaction review",
      severity: "moderate",
      description:
        "More than one medication is present and the drug silo returned an interaction or concurrent-medication signal.",
      affected_treatment: "polypharmacy regimen",
      risk_factor: "multiple current medications",
    });
  }
  if (fall && analysis.drug.risk_level === "high") {
    conflicts.push({
      conflict_detected: true,
      conflict_type: "high-risk medication vs fall/bleeding signal",
      severity: "high",
      description:
        "The profile includes fall, dizziness, or bleeding language and the drug-safety silo independently returned high patient-specific risk.",
      affected_treatment: analysis.drug.drug,
      risk_factor: "fall, dizziness, or bleeding history",
    });
  }
  if (
    analysis.literature.alternative_treatments.length > 0 &&
    analysis.clinical.recommendations.length > 0 &&
    !analysis.clinical.recommendations.some((recommendation) =>
      analysis.literature.alternative_treatments.some((alternative) =>
        recommendation.toLowerCase().includes(alternative.toLowerCase()),
      ),
    )
  ) {
    conflicts.push({
      conflict_detected: true,
      conflict_type: "conflicting treatment recommendations",
      severity: "moderate",
      description:
        "The literature silo returned alternative treatment considerations that are not identical to the clinical pathway.",
      affected_treatment: "alternative treatment set",
      risk_factor: "cross-silo recommendation divergence",
    });
  }
  return conflicts.length
    ? conflicts
    : [
        {
          conflict_detected: false,
          conflict_type: "none",
          severity: "none",
          description: "No deterministic cross-silo conflict rule matched this profile.",
          affected_treatment: "none",
          risk_factor: "none",
        },
      ];
}

/**
 * @deprecated Phase 1: Candidate building and DEA scoring have moved to the
 * authoritative Python implementation (build_dea_candidates in rag_worker.py).
 * This function is retained for unit-test and reference purposes only.
 * It MUST NOT be called in the analyzePatient() production path.
 */
function buildCandidates(analysis: WorkerAnalysis) {
  const candidates = [];
  if (analysis.clinical.evidence.length) {
    candidates.push({
      candidate: analysis.clinical.recommendations[0],
      q_grade: analysis.clinical.evidence_grade,
      s_rel: analysis.clinical.relevance,
      t_recent: analysis.clinical.recency,
      p_risk: analysis.drug.patient_specific_risk,
      source: analysis.clinical.source,
    });
  }
  if (analysis.literature.evidence.length && analysis.literature.alternative_treatments[0]) {
    candidates.push({
      candidate: analysis.literature.alternative_treatments[0],
      q_grade: analysis.literature.evidence_grade,
      s_rel: analysis.literature.relevance,
      t_recent: analysis.literature.recency,
      p_risk: Math.min(1, analysis.drug.patient_specific_risk * 0.4),
      source: analysis.literature.source,
    });
  }
  if (analysis.drug.evidence.length) {
    candidates.push({
      candidate: `Continue ${analysis.drug.drug} pathway`,
      q_grade: analysis.drug.evidence_grade,
      s_rel: analysis.drug.evidence[0].similarity,
      t_recent: recency(analysis.drug.year),
      p_risk: analysis.drug.patient_specific_risk,
      source: analysis.drug.source,
    });
  }
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: calculateDEAScore(
        candidate.q_grade,
        candidate.s_rel,
        candidate.t_recent,
        candidate.p_risk,
      ),
      ranking: 0,
    }))
    .sort((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate))
    .map((candidate, index) => ({ ...candidate, ranking: index + 1 }));
}

export function getDemoCases() {
  return ListDemoCasesResponse.parse(DEMO_CASES);
}

export async function analyzePatient(rawPatient: unknown) {
  const patient = AnalyzeCaseBody.parse(rawPatient);
  const analysis = await runWorker<WorkerAnalysis>({
    action: "analyze",
    patient,
    top_k: 3,
  });

  // Phase 1: DEA scoring, conflict detection, patient_summary, and explanation
  // are now computed by the authoritative Python DEA layer (rag_worker.py).
  // TypeScript is a pass-through validator only — it does NOT re-score.
  const conflicts  = analysis.conflicts;
  const candidates = analysis.dea.candidates;

  return AnalyzeCaseResponse.parse({
    id: `analysis-${Date.now().toString(36)}`,
    mode: "local-chroma-rag",
    patient_summary: analysis.patient_summary,
    query_tasks: analysis.queries,
    agent_statuses: [
      {
        agent: "Clinical reasoning",
        status: "complete",
        summary: `Retrieved ${analysis.clinical.evidence.length} chunk(s) from ${COLLECTIONS.clinical} only.`,
      },
      {
        agent: "Drug safety",
        status: "complete",
        summary: `Retrieved ${analysis.drug.evidence.length} chunk(s) from ${COLLECTIONS.drug} only.`,
      },
      {
        agent: "Literature retrieval",
        status: "complete",
        summary: `Retrieved ${analysis.literature.evidence.length} chunk(s) from ${COLLECTIONS.literature} only.`,
      },
      {
        agent: "DEA arbitration",
        status: "complete",
        summary: "Python DEA v1.0 — deterministic ranking; no LLM scoring.",
      },
    ],
    clinical: {
      ...analysis.clinical,
      evidence: analysis.clinical.evidence.map(toEvidence),
    },
    drug: {
      ...analysis.drug,
      evidence: analysis.drug.evidence.map(toEvidence),
    },
    literature: {
      ...analysis.literature,
      evidence: analysis.literature.evidence.map(toEvidence),
    },
    conflicts,
    dea: analysis.dea,
    explanation: analysis.explanation,
    safety_considerations: [
      "A qualified healthcare professional must validate any real-world interpretation.",
      "Synthetic seed documents are not clinical guidance and must not be treated as genuine citations.",
      "DEA reduces evidence conflict; it does not guarantee safety or replace clinical judgment.",
    ],
    limitations: [
      "The bundled seed corpus is synthetic and clearly labelled; verify provenance before using external documents.",
      "No external medical documents, patient records, or clinical benchmark results are used.",
      "The explanation is generated from retrieved structured outputs and cannot override conflicts, metadata, or DEA scores.",
    ],
    disclaimer: DISCLAIMER,
    generated_at: new Date().toISOString(),
    retrieval_status: analysis.retrieval_status,
  });
}

export async function getKnowledgeStats() {
  return runWorker<WorkerStats>({ action: "stats" });
}

export function evaluateFramework(rawInput: unknown) {
  const input = EvaluateFrameworkBody.parse(rawInput);
  return EvaluateFrameworkResponse.parse({
    dataset_name: input.dataset_name,
    benchmark_status: "pending — validated labelled corpus required",
    metrics: [
      {
        name: "Context Precision",
        description: "Share of retrieved context judged relevant to the query.",
        status: "pending",
        value: null,
      },
      {
        name: "Context Recall",
        description: "Share of relevant evidence retrieved from the intended silo.",
        status: "pending",
        value: null,
      },
      {
        name: "Faithfulness",
        description: "Whether explanations remain grounded in retrieved evidence.",
        status: "pending",
        value: null,
      },
      {
        name: "Answer Relevance",
        description: "Whether the report addresses the structured patient task.",
        status: "pending",
        value: null,
      },
      {
        name: "Conflict Detection Accuracy",
        description: "Accuracy against a labelled conflict set.",
        status: "pending",
        value: null,
      },
      {
        name: "High-risk contraindication violation rate",
        description: "Rate of high-risk safety flags missed by the system.",
        status: "pending",
        value: null,
      },
      {
        name: "DEA arbitration accuracy",
        description: "Agreement with an expert-labelled arbitration reference.",
        status: "pending",
        value: null,
      },
    ],
  });
}

export async function ingestDocument(rawInput: unknown) {
  const input = IngestDocumentBody.parse(rawInput);
  return IngestDocumentResponse.parse(
    await runWorker({
      action: "ingest",
      ...input,
    }),
  );
}