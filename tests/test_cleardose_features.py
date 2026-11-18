"""Unit tests for ClearDose clinical features in rag_worker.py:
1. Sentence-level claim verification (verify_explanation_claims)
2. Medication list reconciliation (reconcile_medication_lists)
3. Smart routing and complexity scoring (compute_smart_routing)
4. Candidate-level contraindication gating and deterministic safety demotion
"""

import unittest
from typing import Any
import rag_worker


class ClearDoseFeatureTests(unittest.TestCase):

    def setUp(self) -> None:
        self.mock_evidence = [
            {
                "id": "pmid:36272755",
                "source_id": "pmid:36272755",
                "identifier": "36272755",
                "source": "PubMed / NCBI",
                "source_type": "guideline",
                "title": "KDIGO 2022 Clinical Practice Guideline for Diabetes Management in CKD",
                "chunk": "In patients with type 2 diabetes and chronic kidney disease, SGLT2 inhibitors provide nephroprotection and reduce cardiovascular events. Metformin should be discontinued when eGFR is below 30 mL/min.",
                "excerpt": "In patients with type 2 diabetes and chronic kidney disease, SGLT2 inhibitors provide nephroprotection and reduce cardiovascular events. Metformin should be discontinued when eGFR is below 30 mL/min.",
                "evidence_grade": 0.82,
                "similarity": 0.38,
            },
            {
                "id": "dailymed:metformin-spl",
                "source_id": "dailymed:metformin-spl",
                "identifier": "metformin-spl",
                "source": "DailyMed / NLM",
                "source_type": "drug_label",
                "title": "Metformin Hydrochloride DailyMed Label",
                "chunk": "Contraindicated in severe renal impairment with estimated glomerular filtration rate eGFR below 30 mL/min due to risk of lactic acidosis.",
                "excerpt": "Contraindicated in severe renal impairment with estimated glomerular filtration rate eGFR below 30 mL/min due to risk of lactic acidosis.",
                "evidence_grade": 0.75,
                "similarity": 0.42,
            },
        ]

    # 1. Claim Verification Tests ---------------------------------------------
    def test_verify_claims_supported(self) -> None:
        sentence = "Metformin should be discontinued when eGFR is below 30 mL/min."
        res = rag_worker.verify_explanation_claims(sentence, self.mock_evidence)
        self.assertEqual(len(res), 1)
        item = res[0]
        self.assertEqual(item["status"], "supported")
        self.assertGreaterEqual(item["overlap_score"], 0.65)
        self.assertIsNotNone(item["source_id"])
        self.assertIsNotNone(item["matched_excerpt"])

    def test_verify_claims_weak_and_unsupported(self) -> None:
        # Weak overlap sentence
        weak_sentence = "Patients with chronic kidney disease need regular monitoring."
        res_weak = rag_worker.verify_explanation_claims(weak_sentence, self.mock_evidence)
        self.assertEqual(len(res_weak), 1)
        self.assertIn(res_weak[0]["status"], ("weak", "supported"))

        # Completely ungrounded sentence
        unsupported_sentence = "Administer high-dose chemotherapy immediately for malignant lymphoma."
        res_un = rag_worker.verify_explanation_claims(unsupported_sentence, self.mock_evidence)
        self.assertEqual(len(res_un), 1)
        self.assertEqual(res_un[0]["status"], "unsupported")
        self.assertLess(res_un[0]["overlap_score"], 0.30)

    # 2. Medication List Reconciler Tests -------------------------------------
    def test_reconcile_medications_dose_mismatch(self) -> None:
        list_a = ["Metformin 500 mg BID", "Lisinopril 10 mg daily"]
        list_b = ["Metformin 1000 mg BID", "Lisinopril 10 mg daily"]
        rec = rag_worker.reconcile_medication_lists(list_a, list_b)
        self.assertEqual(len(rec["dose_discrepancies"]), 1)
        mismatch = rec["dose_discrepancies"][0]
        self.assertEqual(mismatch["medication"], "metformin")
        self.assertIn("500", mismatch["admission_dose"])
        self.assertIn("1000", mismatch["discharge_dose"])

    def test_reconcile_medications_missing_and_added(self) -> None:
        list_a = ["Metformin 500 mg daily", "Amlodipine 5 mg daily"]
        list_b = ["Metformin 500 mg daily", "Atorvastatin 20 mg daily"]
        rec = rag_worker.reconcile_medication_lists(list_a, list_b)
        self.assertEqual(len(rec["missing_in_discharge"]), 1)
        self.assertIn("Amlodipine", rec["missing_in_discharge"][0])
        self.assertEqual(len(rec["added_in_discharge"]), 1)
        self.assertIn("Atorvastatin", rec["added_in_discharge"][0])

    def test_reconcile_therapeutic_duplication(self) -> None:
        # Two NSAIDs
        list_a = ["Ibuprofen 400 mg TID", "Naproxen 500 mg BID"]
        rec = rag_worker.reconcile_medication_lists(list_a, list_a)
        self.assertTrue(len(rec["therapeutic_duplications"]) >= 1)
        dup = rec["therapeutic_duplications"][0]
        self.assertIn(dup["class"].lower(), ("nsaid", "nsaids"))
        self.assertIn("ibuprofen", dup["medications"])
        self.assertIn("naproxen", dup["medications"])

    # 3. Smart Routing Tests --------------------------------------------------
    def test_smart_routing_high_risk_renal_impairment(self) -> None:
        high_risk_patient = {
            "age": 72,
            "sex": "Female",
            "diseases": ["Type 2 Diabetes", "CKD Stage 4", "Hypertension"],
            "medications": ["Metformin 1000 mg", "Lisinopril 20 mg", "Amlodipine 10 mg", "Atorvastatin 40 mg", "Aspirin 81 mg"],
            "lab_values": {"eGFR": "22 mL/min/1.73m2", "potassium": "4.8 mEq/L"},
        }
        routing = rag_worker.compute_smart_routing(high_risk_patient, conflicts=[], dea_candidates=[])
        self.assertEqual(routing["tier"], "high_risk_review")
        self.assertTrue(routing["needs_doctor_review"])
        self.assertGreaterEqual(routing["complexity_score"], 50)
        self.assertTrue(any("renal impairment" in r.lower() or "egfr" in r.lower() for r in routing["routing_reasons"]))

    def test_smart_routing_fast_standard_path(self) -> None:
        low_risk_patient = {
            "age": 45,
            "sex": "Male",
            "diseases": ["Hypertension"],
            "medications": ["Amlodipine 5 mg"],
            "lab_values": {"eGFR": "95 mL/min/1.73m2", "potassium": "4.2 mEq/L"},
        }
        routing = rag_worker.compute_smart_routing(low_risk_patient, conflicts=[], dea_candidates=[])
        self.assertEqual(routing["tier"], "fast_standard")
        self.assertFalse(routing["needs_doctor_review"])
        self.assertLess(routing["complexity_score"], 50)

    # 4. Candidate Contraindication Gating & Safety Demotion -------------------
    def test_metformin_contraindicated_in_egfr_22(self) -> None:
        patient = {
            "age": 68,
            "diseases": ["Type 2 Diabetes", "CKD Stage 4"],
            "medications": ["Metformin 1000 mg BID"],
            "lab_values": {"eGFR": 22},
        }
        is_ci, reason = rag_worker.is_candidate_contraindicated("Continue Metformin pathway", patient=patient)
        self.assertTrue(is_ci)
        self.assertIn("eGFR < 30", reason)

        # In candidate arbitration, Metformin must receive p_risk=0.95 and be demoted below safe alternative
        clinical_out = {
            "agent": "clinical",
            "recommendations": ["Initiate insulin glargine or SGLT2i with dose adjustment"],
            "evidence": self.mock_evidence[:1],
            "source": "KDIGO 2022",
        }
        drug_out = {
            "agent": "drug",
            "drug": "Metformin",
            "evidence": self.mock_evidence[1:],
            "source": "DailyMed",
        }
        lit_out = {
            "agent": "literature",
            "alternative_treatments": ["Switch to Linagliptin or DPP-4 inhibitor safe in renal impairment"],
            "evidence": self.mock_evidence[:1],
            "source": "PubMed",
        }
        candidates = rag_worker.build_dea_candidates(clinical_out, drug_out, lit_out, patient=patient)
        metformin_cand = next(c for c in candidates if "metformin" in c["candidate"].lower())
        self.assertTrue(metformin_cand["contraindicated_flag"])
        self.assertEqual(metformin_cand["p_risk"], 0.95)
        # Winner must be a safe guideline or alternative candidate, not the contraindicated metformin
        winner = candidates[0]
        self.assertFalse(winner["contraindicated_flag"])
        self.assertNotIn("metformin", winner["candidate"].lower())

    def test_sildenafil_nitrates_contraindication(self) -> None:
        patient = {
            "age": 64,
            "diseases": ["Coronary Artery Disease", "Angina", "Erectile Dysfunction"],
            "medications": ["Nitroglycerin 0.4 mg SL PRN", "Isosorbide mononitrate 30 mg daily"],
            "lab_values": {"eGFR": 80},
        }
        conflicts = [
            {
                "conflict_detected": True,
                "severity": "contraindication",
                "conflict_type": "DRUG_DRUG_CONTRAINDICATION",
                "affected_treatment": "Sildenafil with Nitrates",
                "reason": "Severe fatal hypotension risk with concurrent PDE5 inhibitor and nitrate therapy.",
            }
        ]
        is_ci, reason = rag_worker.is_candidate_contraindicated("Initiate Sildenafil 50 mg PRN", patient=patient, conflicts=conflicts)
        self.assertTrue(is_ci)
        self.assertIn("Active high-severity conflict", reason)

    def test_spironolactone_hyperkalemia_contraindication(self) -> None:
        patient = {
            "age": 70,
            "diseases": ["Heart Failure with Reduced Ejection Fraction"],
            "medications": ["Lisinopril 20 mg daily"],
            "lab_values": {"potassium": "5.4 mEq/L", "eGFR": "45"},
        }
        is_ci, reason = rag_worker.is_candidate_contraindicated("Add Spironolactone 25 mg daily", patient=patient)
        self.assertTrue(is_ci)
        self.assertIn("5.0 mEq/L contraindication with spironolactone", reason)


if __name__ == "__main__":
    unittest.main()
