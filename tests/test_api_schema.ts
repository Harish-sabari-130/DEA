import assert from "node:assert";
import { AnalyzeCaseResponse } from "../lib/api-zod/src/index";

console.log("Testing AnalyzeCaseResponse schema preservation...");

const basePayload = {
  id: "test-001",
  mode: "local-chroma-rag",
  patient_summary: "68-year-old female with Type 2 diabetes; 1 evidence-confirmed cross-silo conflict.",
  query_tasks: { clinical: "c", drug: "d", literature: "l" },
  agent_statuses: [],
  clinical: {
    agent: "Clinical reasoning",
    summary: "ok",
    claims: [],
    recommendations: [],
    evidence_grade: 1,
    relevance: 0.9,
    recency: 0.9,
    source: "s",
    year: 2024,
    evidence: [],
  },
  drug: {
    agent: "Drug safety",
    drug: "Metformin",
    contraindications: [],
    interactions: [],
    risk_level: "low",
    patient_specific_risk: 0.1,
    summary: "ok",
    evidence_grade: 1,
    relevance: 0.9,
    recency: 0.9,
    source: "s",
    year: 2024,
    evidence: [],
  },
  literature: {
    agent: "Literature retrieval",
    findings: [],
    alternative_treatments: [],
    summary: "ok",
    evidence_grade: 1,
    relevance: 0.9,
    recency: 0.9,
    source: "s",
    year: 2024,
    evidence: [],
  },
  dea: {
    weights: { alpha: 0.35, beta: 0.3, gamma: 0.15, delta: 0.2 },
    candidates: [],
    method_note: "DEA deterministic",
  },
  explanation: "DEA explanation note",
  limitations: [],
  disclaimer: "Disclaimer text",
  generated_at: new Date().toISOString(),
  retrieval_status: { database: "chroma", embedding_provider: "minilm", silo_isolation: true, top_k: 3, live_sources: {} },
};

// Test A: Preserves confirmed conflict fields
const parsedConfirmed = AnalyzeCaseResponse.parse({
  ...basePayload,
  conflicts: [
    {
      conflict_detected: true,
      conflict_type: "renal dosing limit",
      severity: "high",
      description: "Metformin contraindicated below eGFR 30",
      affected_treatment: "Metformin",
      risk_factor: "eGFR < 30 mL/min/1.73m²",
      status: "CONFIRMED_CONFLICT",
      evidence_linkage: "VERIFIED",
      engineering_assumption: "Standard package insert limit",
      heuristic_fallback: false,
      transaminase_evaluation_method: "STANDARD_INTERVAL",
    },
  ],
});

assert.strictEqual(parsedConfirmed.conflicts[0].status, "CONFIRMED_CONFLICT");
assert.strictEqual(parsedConfirmed.conflicts[0].evidence_linkage, "VERIFIED");
assert.strictEqual(parsedConfirmed.conflicts[0].engineering_assumption, "Standard package insert limit");
assert.strictEqual(parsedConfirmed.conflicts[0].heuristic_fallback, false);
assert.strictEqual(parsedConfirmed.conflicts[0].transaminase_evaluation_method, "STANDARD_INTERVAL");
console.log("✔ Test A Passed: All governance fields preserved on parsed confirmed conflict.");

// Test B: Preserves coverage-gap advisory fields
const parsedCoverageGap = AnalyzeCaseResponse.parse({
  ...basePayload,
  conflicts: [
    {
      conflict_detected: true,
      conflict_type: "cardiac safety advisory",
      severity: "moderate",
      description: "Citalopram QT advisory with missing QT-prolongation evidence chunk",
      affected_treatment: "Citalopram",
      risk_factor: "QTc > 500 ms",
      status: "RETRIEVAL_COVERAGE_GAP_ADVISORY",
      evidence_linkage: "COVERAGE_GAP",
    },
  ],
});
assert.strictEqual(parsedCoverageGap.conflicts[0].status, "RETRIEVAL_COVERAGE_GAP_ADVISORY");
assert.strictEqual(parsedCoverageGap.conflicts[0].evidence_linkage, "COVERAGE_GAP");
console.log("✔ Test B Passed: Coverage gap advisory fields preserved.");

// Test C: Legacy normalization simulation (medrag.ts behavior)
function normalizeLegacyConflicts(rawConflicts: any[]) {
  return rawConflicts.map((c) => {
    let status = c.status;
    let linkage = c.evidence_linkage;

    if (!status) {
      if (c.conflict_detected) {
        status = "UNKNOWN_STATUS_CONFLICT";
        linkage = linkage || "UNSPECIFIED";
      } else {
        status = "NO_CONFLICT_DETECTED_BY_RULE";
        linkage = linkage || "NOT_APPLICABLE";
      }
    }

    const s = String(status).trim().toUpperCase();
    const l = linkage ? String(linkage).trim().toUpperCase() : undefined;
    const rawProv = c.provenance;
    const isComplete =
      rawProv &&
      typeof rawProv === "object" &&
      !Array.isArray(rawProv) &&
      typeof rawProv.source_id === "string" && rawProv.source_id.trim().length > 0 &&
      typeof rawProv.chunk_id === "string" && rawProv.chunk_id.trim().length > 0 &&
      typeof rawProv.source_title === "string" && rawProv.source_title.trim().length > 0 &&
      typeof rawProv.relevant_excerpt === "string" && rawProv.relevant_excerpt.trim().length > 0 &&
      typeof rawProv.match_rationale === "string" && rawProv.match_rationale.trim().length > 0;

    if ((s === "CONFIRMED_CONFLICT" || s === "VERIFIED_CONFLICT") && l === "VERIFIED") {
      if (!isComplete) {
        status = "UNKNOWN_STATUS_CONFLICT";
      }
    }

    let safeProvenance: Record<string, string> | null | undefined = undefined;
    if (rawProv && typeof rawProv === "object" && !Array.isArray(rawProv)) {
      safeProvenance = {};
      const fields = ["source_id", "chunk_id", "source_title", "relevant_excerpt", "match_rationale", "section", "url"];
      for (const f of fields) {
        if (typeof rawProv[f] === "string") {
          safeProvenance[f] = rawProv[f];
        }
      }
    } else if (rawProv === null) {
      safeProvenance = null;
    }

    return {
      ...c,
      status,
      evidence_linkage: linkage,
      provenance: safeProvenance,
    };
  });
}

const legacyActive = [
  {
    conflict_detected: true,
    conflict_type: "legacy drug interaction",
    severity: "high",
    description: "Legacy alert lacking status field",
    affected_treatment: "Drug A",
    risk_factor: "Interaction",
  },
];
const normalizedActive = normalizeLegacyConflicts(legacyActive);
assert.strictEqual(normalizedActive[0].status, "UNKNOWN_STATUS_CONFLICT");
assert.strictEqual(normalizedActive[0].evidence_linkage, "UNSPECIFIED");
assert.notStrictEqual(normalizedActive[0].status, "CONFIRMED_CONFLICT");
assert.notStrictEqual(normalizedActive[0].status, "NO_CONFLICT_DETECTED_BY_RULE");

const parsedLegacy = AnalyzeCaseResponse.parse({
  ...basePayload,
  conflicts: normalizedActive,
});
assert.strictEqual(parsedLegacy.conflicts[0].status, "UNKNOWN_STATUS_CONFLICT");
console.log("✔ Test C Passed: Legacy active conflict correctly degrades to UNKNOWN_STATUS_CONFLICT and passes Zod validation.");

const legacyInactive = [
  {
    conflict_detected: false,
    conflict_type: "none",
    severity: "low",
    description: "Legacy safe check lacking status field",
    affected_treatment: "None",
    risk_factor: "None",
  },
];
const normalizedInactive = normalizeLegacyConflicts(legacyInactive);
assert.strictEqual(normalizedInactive[0].status, "NO_CONFLICT_DETECTED_BY_RULE");
assert.strictEqual(normalizedInactive[0].evidence_linkage, "NOT_APPLICABLE");
const parsedLegacyInactive = AnalyzeCaseResponse.parse({
  ...basePayload,
  conflicts: normalizedInactive,
});
assert.strictEqual(parsedLegacyInactive.conflicts[0].status, "NO_CONFLICT_DETECTED_BY_RULE");
console.log("✔ Test D Passed: Legacy negative check normalized to NO_CONFLICT_DETECTED_BY_RULE.");

// Test E: Complete provenance preserves CONFIRMED_CONFLICT
const validProvenance = {
  source_id: "dailymed_metformin_500",
  chunk_id: "chunk_004",
  source_title: "Metformin Hydrochloride PI",
  relevant_excerpt: "Metformin is contraindicated in severe renal impairment (eGFR < 30 mL/min/1.73 m2).",
  match_rationale: "Patient eGFR of 28 is below the contraindication threshold of 30.",
};

const normalizedConfirmedWithValidProv = normalizeLegacyConflicts([
  {
    conflict_detected: true,
    conflict_type: "renal dosing limit",
    severity: "high",
    description: "Metformin contraindicated below eGFR 30",
    affected_treatment: "Metformin",
    risk_factor: "eGFR < 30",
    status: "CONFIRMED_CONFLICT",
    evidence_linkage: "VERIFIED",
    provenance: validProvenance,
  },
]);
assert.strictEqual(normalizedConfirmedWithValidProv[0].status, "CONFIRMED_CONFLICT");
assert.deepStrictEqual(normalizedConfirmedWithValidProv[0].provenance, validProvenance);
const parsedValidProv = AnalyzeCaseResponse.parse({
  ...basePayload,
  conflicts: normalizedConfirmedWithValidProv,
});
assert.strictEqual(parsedValidProv.conflicts[0].status, "CONFIRMED_CONFLICT");
assert.strictEqual(parsedValidProv.conflicts[0].provenance?.source_id, "dailymed_metformin_500");
console.log("✔ Test E Passed: Valid complete provenance preserves CONFIRMED_CONFLICT across normalization and Zod parse.");

// Test F: Missing / incomplete provenance degrades CONFIRMED_CONFLICT to UNKNOWN_STATUS_CONFLICT
const incompleteVariants = [
  { name: "missing provenance", prov: undefined },
  { name: "null provenance", prov: null },
  { name: "empty object", prov: {} },
  { name: "missing source_id", prov: { ...validProvenance, source_id: undefined } },
  { name: "empty source_id", prov: { ...validProvenance, source_id: "" } },
  { name: "whitespace source_id", prov: { ...validProvenance, source_id: "   \t  " } },
  { name: "missing chunk_id", prov: { ...validProvenance, chunk_id: undefined } },
  { name: "whitespace chunk_id", prov: { ...validProvenance, chunk_id: "  " } },
  { name: "missing source_title", prov: { ...validProvenance, source_title: undefined } },
  { name: "whitespace source_title", prov: { ...validProvenance, source_title: "\n" } },
  { name: "missing relevant_excerpt", prov: { ...validProvenance, relevant_excerpt: undefined } },
  { name: "whitespace relevant_excerpt", prov: { ...validProvenance, relevant_excerpt: "   " } },
  { name: "missing match_rationale", prov: { ...validProvenance, match_rationale: undefined } },
  { name: "whitespace match_rationale", prov: { ...validProvenance, match_rationale: "   " } },
  { name: "non-string source_id", prov: { ...validProvenance, source_id: 12345 } },
  { name: "non-object provenance", prov: "some string" },
];

for (const variant of incompleteVariants) {
  const normalized = normalizeLegacyConflicts([
    {
      conflict_detected: true,
      conflict_type: "renal dosing limit",
      severity: "high",
      description: "Test incomplete provenance",
      affected_treatment: "Metformin",
      risk_factor: "eGFR < 30",
      status: "CONFIRMED_CONFLICT",
      evidence_linkage: "VERIFIED",
      provenance: variant.prov,
    },
  ]);
  assert.strictEqual(
    normalized[0].status,
    "UNKNOWN_STATUS_CONFLICT",
    `Variant ${variant.name} should degrade to UNKNOWN_STATUS_CONFLICT`
  );
  assert.strictEqual(
    normalized[0].conflict_detected,
    true,
    `Variant ${variant.name} must preserve active alert signal`
  );
  // Also verify that the normalized record parses via Zod without throwing
  const parsed = AnalyzeCaseResponse.parse({
    ...basePayload,
    conflicts: normalized,
  });
  assert.strictEqual(parsed.conflicts[0].status, "UNKNOWN_STATUS_CONFLICT");
}
console.log(`✔ Test F Passed: All ${incompleteVariants.length} incomplete provenance variants degrade to UNKNOWN_STATUS_CONFLICT and validate through Zod.`);

console.log("ALL API SCHEMA AND COMPATIBILITY TESTS PASSED SUCCESSFULLY.");

