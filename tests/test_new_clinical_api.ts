import assert from "node:assert";
import {
  getDemoCases,
  reconcileMedications,
  evaluateFramework,
  analyzePatient,
  whatIfSimulation,
} from "../artifacts/api-server/src/lib/medrag";

async function main() {
  console.log("1. Testing getDemoCases()...");
  const demoCases = getDemoCases();
  assert.strictEqual(demoCases.length, 6, `Expected 6 demo cases, got ${demoCases.length}`);
  console.log(`   ✔ Returned 6 demo cases: ${demoCases.map((c) => c.id).join(", ")}`);

  console.log("2. Testing reconcileMedications()...");
  const recon = await reconcileMedications({
    clinic_medications: ["Metformin 500 mg twice daily", "Lisinopril 10 mg daily"],
    discharge_medications: ["Metformin 1000 mg twice daily", "Losartan 50 mg daily", "Naproxen 500 mg twice daily"],
    patient: {
      age: 72,
      sex: "Male",
      diseases: ["Heart failure with reduced ejection fraction (HFrEF)", "CKD stage 3"],
      medications: ["Metformin 500 mg twice daily", "Lisinopril 10 mg daily"],
      symptoms: ["Dyspnea"],
      lab_values: { eGFR: "28 mL/min/1.73m²" },
      allergies: [],
      conditions: [],
    },
  });
  assert(recon.has_discrepancy, "Expected has_discrepancy to be true");
  assert(recon.discrepancies.length > 0, "Expected discrepancies to be populated");
  console.log(`   ✔ Reconciliation detected ${recon.discrepancies.length} discrepancies, safe_to_proceed: ${recon.safe_to_proceed}`);

  console.log("3. Testing evaluateFramework()...");
  const evaluation = await evaluateFramework({ dataset_name: "guideline_collision_v1" });
  assert.strictEqual(evaluation.cases_evaluated, 23);
  assert(evaluation.metrics.length >= 8, `Expected at least 8 metrics, got ${evaluation.metrics.length}`);
  const svrMetric = evaluation.metrics.find((m) => m.name.includes("Safety violation rate"));
  assert(svrMetric, "Expected SVR metric");
  console.log(`   ✔ Evaluation completed: 23 cases, Arm C SVR = ${svrMetric.dea_value}, status = ${svrMetric.status}`);

  console.log("4. Testing analyzePatient() with candidate contraindication and verified claims...");
  const patient = {
    age: 68,
    sex: "Female",
    diseases: ["Type 2 diabetes", "Chronic kidney disease, stage 4"],
    medications: ["Metformin 1000 mg twice daily"],
    secondary_medications: ["Empagliflozin 10 mg daily"],
    symptoms: ["Fatigue"],
    lab_values: { eGFR: "22 mL/min/1.73m²" },
    allergies: ["Penicillin"],
    conditions: ["CKD collision demo"],
  };
  const analysis = await analyzePatient(patient);
  assert(analysis.dea.candidates.length > 0, "Expected DEA candidates");
  const topCandidate = analysis.dea.candidates[0];
  console.log(`   ✔ Top candidate: ${topCandidate.candidate.slice(0, 50)}... Score: ${topCandidate.score}`);
  
  // Check contraindicated_flag
  const demoted = analysis.dea.candidates.find((c) => c.candidate.toLowerCase().includes("metformin"));
  if (demoted) {
    assert.strictEqual(demoted.contraindicated_flag, true, "Metformin candidate should have contraindicated_flag = true");
    console.log(`   ✔ Metformin candidate flagged contraindicated: score = ${demoted.score}`);
  }

  // Check claim_verifications
  assert(analysis.claim_verifications !== undefined, "Expected claim_verifications field");
  console.log(`   ✔ Claim verifications returned: ${analysis.claim_verifications?.length} claims verified`);

  // Check routing
  assert(analysis.routing !== undefined, "Expected routing field");
  assert.strictEqual(analysis.routing?.tier, "high_risk_review");
  console.log(`   ✔ Routing tier: ${analysis.routing?.tier}, recommended_model: ${analysis.routing?.recommended_model}`);

  // Check reconciliation
  assert(analysis.reconciliation !== undefined, "Expected reconciliation field");
  console.log(`   ✔ Reconciliation returned in analyze: missing = ${analysis.reconciliation?.missing_in_discharge?.length}`);

  // Check SHA-256 Audit Integrity Hash & Case/Report IDs
  assert(analysis.sha256_integrity_hash, "Expected sha256_integrity_hash in response");
  assert.strictEqual(analysis.sha256_integrity_hash.length, 64, "SHA-256 hash must be 64 characters");
  assert(analysis.case_id, "Expected case_id in response");
  assert(analysis.report_id, "Expected report_id in response");
  console.log(`   ✔ Cryptographic Audit Hash: ${analysis.sha256_integrity_hash} (Case: ${analysis.case_id}, Report: ${analysis.report_id})`);

  console.log("5. Testing whatIfSimulation()...");
  const whatIf = await whatIfSimulation({
    patient,
    weights: { alpha: 0.2, beta: 0.2, gamma: 0.1, delta: 0.5 },
  });
  assert(whatIf.dea.candidates.length > 0);
  console.log(`   ✔ What-If simulation with custom weights delta=0.5 completed: top score = ${whatIf.dea.candidates[0].score}`);

  console.log("6. Testing signoffClinicalDecision() and Audit Trail persistence...");
  const { signoffClinicalDecision, getAuditHistoryList, verifyAuditReportHash } = await import(
    "../artifacts/api-server/src/lib/medrag"
  );

  const signoffResult = await signoffClinicalDecision({
    report_id: analysis.report_id,
    clinician_name: "Dr. Meredith Grey, MD (Attending)",
    selected_candidate: topCandidate.candidate,
    action_taken: "accepted_top_dea",
    override_reason: undefined,
  });
  assert.strictEqual(signoffResult.success, true);
  assert.strictEqual(signoffResult.decision.clinician_name, "Dr. Meredith Grey, MD (Attending)");
  console.log(`   ✔ Doctor decision recorded: ID=${signoffResult.decision.id}, Action=${signoffResult.decision.action_taken}`);

  console.log("7. Testing getAuditHistoryList()...");
  const auditList = await getAuditHistoryList(10);
  assert(auditList.history.length >= 1, "Expected at least 1 audit history item");
  const matchingItem = auditList.history.find((h: any) => h.report.id === analysis.report_id);
  assert(matchingItem, "Expected to find report in audit history");
  assert.strictEqual(matchingItem.report.sha256IntegrityHash, analysis.sha256_integrity_hash);
  assert.strictEqual(matchingItem.decision?.clinicianName, "Dr. Meredith Grey, MD (Attending)");
  console.log(`   ✔ Audit history verified: Found report ${matchingItem.report.id} with verified SHA-256 hash and clinician sign-off`);

  console.log("8. Testing verifyAuditReportHash()...");
  const verification = await verifyAuditReportHash({
    patient,
    weights: analysis.dea.weights,
    ranked_candidates: analysis.dea.candidates,
    conflicts: analysis.conflicts,
    expected_hash: analysis.sha256_integrity_hash,
  });
  assert.strictEqual(verification.verified, true);
  assert.strictEqual(verification.match_percentage, 100);
  console.log(`   ✔ Hash Verification Result: ${verification.message}`);

  console.log("\nALL NEW CLINICAL API & AUDIT TRAIL TESTS PASSED SUCCESSFULLY.");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
