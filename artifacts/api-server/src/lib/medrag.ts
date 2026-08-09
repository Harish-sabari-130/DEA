import {
  AnalyzeCaseBody,
  AnalyzeCaseResponse,
  EvaluateFrameworkBody,
  EvaluateFrameworkResponse,
  IngestDocumentBody,
  IngestDocumentResponse,
  ListDemoCasesResponse,
} from "@workspace/api-zod";

type PatientProfile = ReturnType<typeof AnalyzeCaseBody.parse>;

const DISCLAIMER =
  "This system is a research prototype for clinical decision-support research. It does not provide medical diagnosis or autonomous treatment decisions and must not replace qualified healthcare professionals.";

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

function hasTerm(patient: PatientProfile, terms: string[]) {
  const haystack = JSON.stringify(patient).toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function score(
  candidate: string,
  q_grade: number,
  s_rel: number,
  t_recent: number,
  p_risk: number,
  source: string,
) {
  const value = 0.35 * q_grade + 0.3 * s_rel + 0.15 * t_recent - 0.2 * p_risk;
  return {
    candidate,
    q_grade,
    s_rel,
    t_recent,
    p_risk,
    score: Number(value.toFixed(3)),
    ranking: 0,
    source,
  };
}

export function getDemoCases() {
  return ListDemoCasesResponse.parse(DEMO_CASES);
}

export function analyzePatient(rawPatient: unknown) {
  const patient = AnalyzeCaseBody.parse(rawPatient);
  const caseThree = hasTerm(patient, ["demo-03", "recent fall", "polypharmacy"]);
  const caseOne = hasTerm(patient, ["demo-01", "routine medication review"]);
  const renalRisk = hasTerm(patient, ["kidney", "ckd", "egfr", "renal"]);
  const allergyRisk = patient.allergies.length > 0;

  const clinicalRecommendation = renalRisk
    ? "Consider an SGLT2-inhibitor pathway for cardio-renal benefit, subject to clinician review."
    : "Continue guideline-concordant blood-pressure control with periodic monitoring.";
  const drugUnderReview = caseThree ? "Apixaban" : renalRisk ? "Metformin" : "Lisinopril";
  const risk = caseOne ? 0.12 : renalRisk ? 0.78 : caseThree ? 0.86 : allergyRisk ? 0.58 : 0.2;

  const clinicalEvidence = {
    id: "clinical-synthetic-001",
    title: "Synthetic multimorbidity care pathway",
    source: "DEMO / synthetic clinical_guidelines",
    year: 2025,
    domain: "clinical_guidelines",
    excerpt:
      "Demonstration-only guidance prioritizes condition control while requiring patient-specific review before treatment changes.",
    evidence_grade: caseOne ? 0.86 : 0.91,
    relevance: caseOne ? 0.78 : 0.9,
    recency: 0.88,
    risk_level: "context-dependent",
    page: null,
  };

  const drugInteraction =
    drugUnderReview === "Metformin"
      ? "Synthetic safety flag: reduced renal clearance increases the need for a clinician-led dose and monitoring review."
      : drugUnderReview === "Apixaban"
        ? "Synthetic safety flag: renal impairment and fall history increase the modeled bleeding-risk signal."
        : "No major synthetic drug-disease conflict detected in this demonstration profile.";

  const clinical = {
    agent: "clinical",
    claims: [
      "The clinical silo retrieved a condition-management pathway independently of drug safety evidence.",
      clinicalRecommendation,
    ],
    recommendations: [
      clinicalRecommendation,
      "Review the full medication list, laboratory trend, and patient goals before any change.",
    ],
    evidence: [clinicalEvidence],
    evidence_grade: clinicalEvidence.evidence_grade,
    relevance: clinicalEvidence.relevance,
    recency: clinicalEvidence.recency,
    source: clinicalEvidence.source,
    year: clinicalEvidence.year,
  };

  const drug = {
    agent: "drug",
    drug: drugUnderReview,
    contraindications:
      caseOne
        ? ["No major synthetic contraindication identified."]
        : [
            renalRisk
              ? "Renal impairment is a patient-specific caution signal."
              : "No absolute synthetic contraindication identified.",
          ],
    interactions: [drugInteraction],
    risk_level: risk >= 0.75 ? "high" : risk >= 0.5 ? "moderate" : "low",
    patient_specific_risk: risk,
    evidence_grade: 0.9,
    source: "DEMO / synthetic drug_information",
    year: 2025,
  };

  const literature = {
    agent: "literature",
    findings: [
      "Synthetic literature retrieval surfaces newer comparative evidence for lower-risk alternatives.",
      "The literature silo is intentionally independent from the clinical and drug collections.",
    ],
    alternative_treatments: caseThree
      ? ["Dose-adjusted anticoagulation review", "Non-pharmacologic fall-risk intervention"]
      : renalRisk
        ? ["Renal-adjusted alternative pathway", "Structured laboratory monitoring"]
        : ["Lifestyle intervention plus monitored first-line therapy"],
    evidence_grade: 0.74,
    relevance: caseThree ? 0.89 : 0.71,
    recency: 0.96,
    source: "DEMO / synthetic clinical_literature",
    year: 2026,
  };

  const conflicts = caseOne
    ? [
        {
          conflict_detected: false,
          conflict_type: "none",
          severity: "none",
          description: "The synthetic evidence outputs are aligned for this demonstration case.",
          affected_treatment: "none",
          risk_factor: "none",
        },
      ]
    : [
        {
          conflict_detected: true,
          conflict_type: renalRisk ? "treatment vs renal impairment" : "high-risk medication vs patient condition",
          severity: risk >= 0.75 ? "high" : "moderate",
          description:
            "The clinical silo presents a treatment pathway while the drug-safety silo raises a patient-specific safety signal. DEA ranks the evidence but does not make an autonomous treatment decision.",
          affected_treatment: drugUnderReview,
          risk_factor: renalRisk ? "reduced renal function" : "patient-specific comorbidity and fall risk",
        },
        ...(caseThree
          ? [
              {
                conflict_detected: true,
                conflict_type: "conflicting treatment recommendations",
                severity: "moderate",
                description:
                  "The literature silo suggests alternatives whose recency and relevance differ from the clinical pathway.",
                affected_treatment: "alternative treatment set",
                risk_factor: "polypharmacy and recent fall",
              },
            ]
          : []),
      ];

  const rawCandidates = [
    score(
      clinicalRecommendation.split(",")[0],
      clinical.evidence_grade,
      clinical.relevance,
      clinical.recency,
      risk,
      clinical.source,
    ),
    score(
      literature.alternative_treatments[0],
      literature.evidence_grade,
      literature.relevance,
      literature.recency,
      caseOne ? 0.18 : 0.26,
      literature.source,
    ),
    score(
      `Continue ${drugUnderReview} pathway`,
      drug.evidence_grade,
      caseOne ? 0.82 : 0.56,
      0.84,
      risk,
      drug.source,
    ),
  ];
  const candidates = rawCandidates
    .sort((a, b) => b.score - a.score)
    .map((candidate, index) => ({ ...candidate, ranking: index + 1 }));

  const conflictCount = conflicts.filter((conflict) => conflict.conflict_detected).length;
  const patientSummary = `${patient.age}-year-old ${patient.sex.toLowerCase()} with ${patient.diseases.join(", ") || "no listed diseases"}; ${conflictCount} cross-silo conflict${conflictCount === 1 ? "" : "s"} detected.`;
  const explanation = caseOne
    ? "The three synthetic silos are aligned in this demonstration case. DEA still applies the same configured formula, making the highest-scoring pathway traceable without allowing a language model to override the result."
    : `DEA ranked “${candidates[0].candidate}” highest at ${candidates[0].score.toFixed(3)} because its combined evidence quality, patient relevance, recency, and modeled risk produced the strongest deterministic value. The conflict register remains visible because ranking evidence is not the same as authorizing treatment.`;

  return AnalyzeCaseResponse.parse({
    id: `analysis-${Date.now().toString(36)}`,
    mode: "synthetic-demonstration",
    patient_summary: patientSummary,
    query_tasks: {
      clinical: "What treatments are recommended for the patient's diseases?",
      drug: "Are candidate medications contraindicated or high-risk given the profile and laboratory values?",
      literature: "What recent synthetic evidence exists for safer alternatives?",
    },
    agent_statuses: [
      { agent: "Clinical reasoning", status: "complete", summary: "Retrieved from clinical_guidelines only." },
      { agent: "Drug safety", status: "complete", summary: "Retrieved from drug_information only." },
      { agent: "Literature retrieval", status: "complete", summary: "Retrieved from clinical_literature only." },
      { agent: "DEA arbitration", status: "complete", summary: "Deterministic ranking completed in the server." },
    ],
    clinical,
    drug,
    literature,
    conflicts,
    dea: {
      weights: { alpha: 0.35, beta: 0.3, gamma: 0.15, delta: 0.2 },
      candidates,
      method_note:
        "V = (0.35 × Q_grade) + (0.30 × S_rel) + (0.15 × T_recent) − (0.20 × P_risk). The server computes and ranks these values deterministically.",
    },
    explanation,
    safety_considerations: [
      "A qualified healthcare professional must validate any real-world interpretation.",
      "Synthetic sources are not clinical guidance and must not be treated as genuine citations.",
      "DEA reduces evidence conflict; it does not guarantee safety or replace clinical judgment.",
    ],
    limitations: [
      "This build uses clearly labelled synthetic evidence and in-memory collections for demonstration.",
      "No external medical documents, patient records, or clinical benchmark results are used.",
      "The explanation is generated from retrieved structured outputs and cannot override DEA scores.",
    ],
    disclaimer: DISCLAIMER,
    generated_at: new Date().toISOString(),
  });
}

export function evaluateFramework(rawInput: unknown) {
  const input = EvaluateFrameworkBody.parse(rawInput);
  return EvaluateFrameworkResponse.parse({
    dataset_name: input.dataset_name,
    benchmark_status: "pending — validated corpus required",
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

export function ingestSyntheticDocument(rawInput: unknown) {
  const input = IngestDocumentBody.parse(rawInput);
  const chunks = input.content
    .split(/\n\s*\n|(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const collection =
    input.domain === "drug"
      ? "drug_information"
      : input.domain === "literature"
        ? "clinical_literature"
        : "clinical_guidelines";
  return IngestDocumentResponse.parse({
    document_id: `doc-${Date.now().toString(36)}`,
    collection,
    chunk_count: Math.max(chunks.length, 1),
    status: "registered in synthetic in-memory index",
    synthetic_notice:
      "DEMONSTRATION/SYNTHETIC content only. This receipt is not a genuine medical citation.",
  });
}
