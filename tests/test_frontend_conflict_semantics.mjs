import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load production helper directly from artifacts/dea-medrag/src/lib/conflicts.ts using esbuild bundler
const esbuildPath = path.resolve(__dirname, "../artifacts/api-server/node_modules/esbuild/lib/main.js");
const { build } = await import(`file://${esbuildPath.replace(/\\/g, "/")}`);

const conflictsTsPath = path.resolve(__dirname, "../artifacts/dea-medrag/src/lib/conflicts.ts");

const bundleResult = await build({
  entryPoints: [conflictsTsPath],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});

const code = bundleResult.outputFiles[0].text;
const encoded = "data:text/javascript;base64," + Buffer.from(code).toString("base64");
const { getConflictCategory } = await import(encoded);

assert(typeof getConflictCategory === "function", "getConflictCategory must be exported from conflicts.ts");

console.log("Running Frontend Semantic Regression Tests using production getConflictCategory()...");

// 1. Confirmed status + verified linkage + complete provenance -> strictly verified conflict
const validProvenance = {
  source_id: "dailymed:e087ce3b-8d7f-43a3-8d20-54513da7617d",
  chunk_id: "dailymed:e087ce3b-8d7f-43a3-8d20-54513da7617d",
  source_title: "METFORMIN HYDROCHLORIDE SOLUTION [VISTAPHARM, LLC]",
  relevant_excerpt: "Metformin hydrochloride oral solution is contraindicated in patients with: Severe renal impairment (eGFR below 30 mL/min/1.73 m2)",
  match_rationale: "Contraindicated in severe renal impairment (eGFR < 30 mL/min)",
};

const case1 = {
  conflict_detected: true,
  status: "CONFIRMED_CONFLICT",
  evidence_linkage: "VERIFIED",
  provenance: validProvenance,
};
assert.strictEqual(getConflictCategory(case1), "CONFIRMED_CONFLICT");

// 1b. Confirmed status + verified linkage but MISSING provenance -> degrades to UNKNOWN_STATUS_CONFLICT
const case1MissingProv = {
  conflict_detected: true,
  status: "CONFIRMED_CONFLICT",
  evidence_linkage: "VERIFIED",
};
assert.strictEqual(getConflictCategory(case1MissingProv), "UNKNOWN_STATUS_CONFLICT");

// 1c. Confirmed status + verified linkage but NULL provenance -> degrades to UNKNOWN_STATUS_CONFLICT
const case1NullProv = {
  conflict_detected: true,
  status: "CONFIRMED_CONFLICT",
  evidence_linkage: "VERIFIED",
  provenance: null,
};
assert.strictEqual(getConflictCategory(case1NullProv), "UNKNOWN_STATUS_CONFLICT");

// 1d. Confirmed status + verified linkage but non-object provenance -> degrades to UNKNOWN_STATUS_CONFLICT
const case1StringProv = {
  conflict_detected: true,
  status: "CONFIRMED_CONFLICT",
  evidence_linkage: "VERIFIED",
  provenance: "invalid string provenance",
};
assert.strictEqual(getConflictCategory(case1StringProv), "UNKNOWN_STATUS_CONFLICT");

// 1e. Confirmed status + verified linkage with missing / empty / whitespace mandatory fields -> degrade to UNKNOWN_STATUS_CONFLICT
const mandatoryFields = ["source_id", "chunk_id", "source_title", "relevant_excerpt", "match_rationale"];
for (const field of mandatoryFields) {
  // Missing field
  const missingCopy = { ...validProvenance };
  delete missingCopy[field];
  assert.strictEqual(
    getConflictCategory({ conflict_detected: true, status: "CONFIRMED_CONFLICT", evidence_linkage: "VERIFIED", provenance: missingCopy }),
    "UNKNOWN_STATUS_CONFLICT",
    `Missing mandatory field ${field} must degrade to UNKNOWN_STATUS_CONFLICT`
  );

  // Empty string
  const emptyCopy = { ...validProvenance, [field]: "" };
  assert.strictEqual(
    getConflictCategory({ conflict_detected: true, status: "CONFIRMED_CONFLICT", evidence_linkage: "VERIFIED", provenance: emptyCopy }),
    "UNKNOWN_STATUS_CONFLICT",
    `Empty string for ${field} must degrade to UNKNOWN_STATUS_CONFLICT`
  );

  // Whitespace-only string
  const wsCopy = { ...validProvenance, [field]: "   \t\n  " };
  assert.strictEqual(
    getConflictCategory({ conflict_detected: true, status: "CONFIRMED_CONFLICT", evidence_linkage: "VERIFIED", provenance: wsCopy }),
    "UNKNOWN_STATUS_CONFLICT",
    `Whitespace string for ${field} must degrade to UNKNOWN_STATUS_CONFLICT`
  );

  // Non-string value
  const numCopy = { ...validProvenance, [field]: 12345 };
  assert.strictEqual(
    getConflictCategory({ conflict_detected: true, status: "CONFIRMED_CONFLICT", evidence_linkage: "VERIFIED", provenance: numCopy }),
    "UNKNOWN_STATUS_CONFLICT",
    `Non-string value for ${field} must degrade to UNKNOWN_STATUS_CONFLICT`
  );
}

// 2. Confirmed status + unspecified linkage -> unverified / unknown alert (never verified conflict)
const case2 = {
  conflict_detected: true,
  status: "CONFIRMED_CONFLICT",
  evidence_linkage: "UNSPECIFIED",
};
assert.strictEqual(getConflictCategory(case2), "UNKNOWN_STATUS_CONFLICT");
assert.notStrictEqual(getConflictCategory(case2), "CONFIRMED_CONFLICT");
assert.notStrictEqual(getConflictCategory(case2), "RETRIEVAL_COVERAGE_GAP_ADVISORY");

// 3. Confirmed status + missing linkage -> unverified / unknown alert (never verified conflict)
const case3 = {
  conflict_detected: true,
  status: "CONFIRMED_CONFLICT",
};
assert.strictEqual(getConflictCategory(case3), "UNKNOWN_STATUS_CONFLICT");
assert.notStrictEqual(getConflictCategory(case3), "CONFIRMED_CONFLICT");
assert.notStrictEqual(getConflictCategory(case3), "RETRIEVAL_COVERAGE_GAP_ADVISORY");

// 4. Confirmed status + coverage-gap linkage -> retrieval coverage-gap advisory
const case4 = {
  conflict_detected: true,
  status: "CONFIRMED_CONFLICT",
  evidence_linkage: "COVERAGE_GAP",
};
assert.strictEqual(getConflictCategory(case4), "RETRIEVAL_COVERAGE_GAP_ADVISORY");

// 5. Missing status with an active legacy alert -> unverified / unknown alert (never verified, never safe)
const case5 = {
  conflict_detected: true,
  conflict_type: "legacy renal warning",
};
assert.strictEqual(getConflictCategory(case5), "UNKNOWN_STATUS_CONFLICT");
assert.notStrictEqual(getConflictCategory(case5), "CONFIRMED_CONFLICT");
assert.notStrictEqual(getConflictCategory(case5), "NO_CONFLICT_DETECTED_BY_RULE");

// 6. An unrecognized status string with conflict_detected: true -> unknown / unrecognized alert
const case6Active = {
  conflict_detected: true,
  status: "UNRECOGNIZED_CUSTOM_ALERT_STATUS",
};
assert.strictEqual(getConflictCategory(case6Active), "UNKNOWN_STATUS_CONFLICT");

const case6Inactive = {
  conflict_detected: false,
  status: "UNRECOGNIZED_STATUS_WITHOUT_ALERT",
};
assert.strictEqual(getConflictCategory(case6Inactive), "NO_CONFLICT_DETECTED_BY_RULE");

// 7. Data-quality advisory -> data-quality advisory
const case7 = {
  conflict_detected: true,
  status: "DATA_QUALITY_ADVISORY",
  evidence_linkage: "NOT_APPLICABLE",
};
assert.strictEqual(getConflictCategory(case7), "DATA_QUALITY_ADVISORY");

// 8. No-conflict status -> no conflict detected by rule
const case8Explicit = {
  conflict_detected: false,
  status: "NO_CONFLICT_DETECTED_BY_RULE",
  evidence_linkage: "NOT_APPLICABLE",
};
assert.strictEqual(getConflictCategory(case8Explicit), "NO_CONFLICT_DETECTED_BY_RULE");

const case8LegacySafe = {
  conflict_detected: false,
};
assert.strictEqual(getConflictCategory(case8LegacySafe), "NO_CONFLICT_DETECTED_BY_RULE");

// 9. Assertion that ONLY Case 1 counts as a verified conflict
const allTestCases = [case1, case2, case3, case4, case5, case6Active, case7, case8Explicit];
const verifiedOnly = allTestCases.filter(c => getConflictCategory(c) === "CONFIRMED_CONFLICT");
assert.strictEqual(verifiedOnly.length, 1, "ONLY Case 1 (confirmed + verified linkage) may count as confirmed");
assert.strictEqual(verifiedOnly[0], case1);

// 10. Aggregation metrics check simulating ReportView logic
const gapAdvisories = allTestCases.filter(c => getConflictCategory(c) === "RETRIEVAL_COVERAGE_GAP_ADVISORY");
const dqAdvisories = allTestCases.filter(c => getConflictCategory(c) === "DATA_QUALITY_ADVISORY");
const unknownAlerts = allTestCases.filter(c => getConflictCategory(c) === "UNKNOWN_STATUS_CONFLICT");
const noConflicts = allTestCases.filter(c => getConflictCategory(c) === "NO_CONFLICT_DETECTED_BY_RULE");

assert.strictEqual(gapAdvisories.length, 1, "Exactly 1 coverage gap advisory (case 4)");
assert.strictEqual(dqAdvisories.length, 1, "Exactly 1 data quality advisory (case 7)");
assert.strictEqual(unknownAlerts.length, 4, "Exactly 4 unknown / unverified alerts (cases 2, 3, 5, 6)");
assert.strictEqual(noConflicts.length, 1, "Exactly 1 no conflict (case 8)");

console.log("All Frontend Semantic Regression Tests Passed successfully against production helper!");
