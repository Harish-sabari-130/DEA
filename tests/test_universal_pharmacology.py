"""Unit tests for Universal Pharmacology, Lab Physiology, and Semantic Verification Engine in rag_worker.py:
1. Clinical lab parsing, physiological boundary checking, critical panic alerts, Cockcroft-Gault and KDIGO staging.
2. RxNorm normalization, OpenFDA SPL safety profiling, and universal cross-silo interaction checking.
3. Negation- and polarity-aware semantic claim verification (DefaultEmbeddingFunction + directional guards).
4. Full end-to-end analyze integration on a novel non-benchmark polypharmacy patient case.
"""

from __future__ import annotations

import unittest
from typing import Any
import rag_worker


class UniversalPharmacologyAndPhysiologyTests(unittest.TestCase):
    """Test suite covering clinical-grade pharmacology, physiology, and claim verification."""

    # 1. Lab Physiology & Automated Renal/QTc Staging --------------------------
    def test_parse_and_validate_standard_labs(self) -> None:
        raw_labs = {
            "eGFR": "65 mL/min/1.73m2",
            "creatinine": "1.1 mg/dL",
            "potassium": "4.2 mEq/L",
            "sodium": "140 mEq/L",
            "ALT": "28 U/L",
            "AST": "24 U/L",
            "total_bilirubin": "0.8 mg/dL",
            "HbA1c": "6.8 %",
            "INR": "1.0",
            "QTc": "420 ms",
        }
        res = rag_worker.parse_and_validate_clinical_labs(raw_labs, age=55, sex="Male")
        self.assertEqual(len(res["validation_errors"]), 0)
        self.assertEqual(len(res["critical_lab_alerts"]), 0)

        parsed = res["parsed_labs"]
        self.assertEqual(parsed["egfr"]["value"], 65.0)
        self.assertEqual(parsed["potassium"]["value"], 4.2)
        self.assertEqual(parsed["sodium"]["value"], 140.0)
        self.assertEqual(parsed["alt"]["value"], 28.0)
        self.assertEqual(parsed["ast"]["value"], 24.0)
        self.assertEqual(parsed["inr"]["value"], 1.0)
        self.assertEqual(parsed["qtc"]["value"], 420.0)

        # Staging
        staging = res["staging"]
        self.assertEqual(staging["renal_impairment_stage"], "G2")
        self.assertEqual(staging["hyperkalemia_grade"], "normal")
        self.assertEqual(staging["hepatic_transaminitis_grade"], "normal")
        self.assertEqual(staging["qtc_prolongation_grade"], "normal")
        self.assertEqual(staging["anticoagulation_bleeding_risk"], "normal")

    def test_parse_labs_physiological_out_of_bounds(self) -> None:
        impossible_labs = {
            "potassium": "28.5 mEq/L",  # Incompatible with life (> 12.0)
            "eGFR": "-5.0",             # Negative eGFR
            "sodium": "350 mEq/L",      # Sodium > 200
            "inr": "-1.2",              # Negative INR
            "qtc": "1500 ms",           # QTc > 1000
        }
        res = rag_worker.parse_and_validate_clinical_labs(impossible_labs, age=60, sex="Female")
        self.assertGreaterEqual(len(res["validation_errors"]), 4)
        err_text = " ".join(res["validation_errors"]).lower()
        self.assertIn("potassium", err_text)
        self.assertIn("egfr", err_text)
        self.assertIn("sodium", err_text)
        self.assertIn("inr", err_text)

    def test_parse_labs_critical_panic_values(self) -> None:
        panic_labs = {
            "eGFR": "18 mL/min/1.73m2",
            "potassium": "6.2 mEq/L",
            "INR": "4.8",
            "QTc": "520 ms",
            "ALT": "350 U/L",
        }
        res = rag_worker.parse_and_validate_clinical_labs(panic_labs, age=70, sex="Male")
        self.assertEqual(len(res["validation_errors"]), 0)
        self.assertGreaterEqual(len(res["critical_lab_alerts"]), 4)

        alert_markers = {a["marker"] for a in res["critical_lab_alerts"]}
        self.assertIn("egfr", alert_markers)
        self.assertIn("potassium", alert_markers)
        self.assertIn("inr", alert_markers)
        self.assertIn("qtc", alert_markers)

        staging = res["staging"]
        self.assertEqual(staging["renal_impairment_stage"], "G4")
        self.assertEqual(staging["hyperkalemia_grade"], "severe")
        self.assertEqual(staging["anticoagulation_bleeding_risk"], "critical")
        self.assertEqual(staging["qtc_prolongation_grade"], "severe")
        self.assertEqual(staging["hepatic_transaminitis_grade"], "severe")

    def test_automated_cockcroft_gault_estimation(self) -> None:
        # Creatinine provided without eGFR: auto-calculate Cockcroft-Gault
        labs = {"creatinine": "2.4 mg/dL"}
        res_male = rag_worker.parse_and_validate_clinical_labs(labs, age=72, sex="Male", weight_kg=70.0)
        crcl_m = res_male["staging"]["crcl_estimated"]
        self.assertIsNotNone(crcl_m)
        self.assertAlmostEqual(crcl_m, 27.5, places=1)
        self.assertEqual(res_male["staging"]["renal_impairment_stage"], "G4")

        # Female adjustment (0.85 multiplier)
        res_female = rag_worker.parse_and_validate_clinical_labs(labs, age=72, sex="Female", weight_kg=70.0)
        crcl_f = res_female["staging"]["crcl_estimated"]
        self.assertIsNotNone(crcl_f)
        self.assertAlmostEqual(crcl_f, 23.4, places=1)

    # 2. Universal RxNorm & OpenFDA Safety Profiling --------------------------
    def test_normalize_medication_rxnorm(self) -> None:
        # Generic names
        norm_warfarin = rag_worker.normalize_medication_rxnorm("Warfarin sodium 5 mg")
        self.assertEqual(norm_warfarin["canonical"], "warfarin")
        self.assertEqual(norm_warfarin["rxcui"], "11289")

        # Brand name mapping
        norm_coumadin = rag_worker.normalize_medication_rxnorm("Coumadin 2.5 mg tablet")
        self.assertEqual(norm_coumadin["canonical"], "warfarin")
        self.assertEqual(norm_coumadin["rxcui"], "11289")

        norm_diflucan = rag_worker.normalize_medication_rxnorm("Diflucan 150 mg oral")
        self.assertEqual(norm_diflucan["canonical"], "fluconazole")
        self.assertEqual(norm_diflucan["rxcui"], "4450")

        norm_cordarone = rag_worker.normalize_medication_rxnorm("Cordarone 200 mg")
        self.assertEqual(norm_cordarone["canonical"], "amiodarone")
        self.assertEqual(norm_cordarone["rxcui"], "703")

        norm_glucophage = rag_worker.normalize_medication_rxnorm("Glucophage 1000 mg")
        self.assertEqual(norm_glucophage["canonical"], "metformin")
        self.assertEqual(norm_glucophage["rxcui"], "6809")

    def test_openfda_spl_safety_profile_retrieval(self) -> None:
        profile = rag_worker.get_drug_fda_safety_profile("warfarin")
        self.assertIsNotNone(profile)
        self.assertEqual(profile["spl_set_id"], "6062fd98-7663-f4b5-e053-2a91aa0acbc3")
        self.assertIn("BLEEDING RISK", profile["boxed_warning"])
        self.assertIn("CYP2C9", profile["drug_interactions"])
        self.assertIn("Hemorrhagic tendencies", profile["contraindications"])

    def test_novel_polypharmacy_safety_check(self) -> None:
        # Novel non-benchmark patient: Warfarin + Fluconazole + Amiodarone, AFib, INR 3.8
        meds = ["Warfarin 5 mg daily", "Fluconazole 200 mg daily", "Amiodarone 200 mg daily"]
        diseases = ["Atrial Fibrillation", "Oral Candidiasis"]
        labs = {"INR": "3.8", "eGFR": "55 mL/min", "QTc": "485 ms"}
        allergies: list[str] = []

        res = rag_worker.openfda_and_rxnorm_safety_check(meds, diseases, labs, allergies)
        conflicts = res.get("conflicts", [])
        self.assertGreaterEqual(len(conflicts), 3)

        # 1. Warfarin + Fluconazole CYP2C9 DDI
        wf_conflict = next(
            (c for c in conflicts if "warfarin" in c["affected_treatment"].lower() and "fluconazole" in c["affected_treatment"].lower()),
            None,
        )
        self.assertIsNotNone(wf_conflict)
        self.assertEqual(wf_conflict["severity"], "contraindication")
        self.assertIn("6062fd98-7663-f4b5-e053-2a91aa0acbc3", str(wf_conflict["provenance"]))

        # 2. Warfarin + Amiodarone CYP2C9/3A4 DDI
        wa_conflict = next(
            (c for c in conflicts if "warfarin" in c["affected_treatment"].lower() and "amiodarone" in c["affected_treatment"].lower()),
            None,
        )
        self.assertIsNotNone(wa_conflict)
        self.assertIn(wa_conflict["severity"], ("high", "contraindication"))

        # 3. Fluconazole + Amiodarone additive QTc prolongation
        fa_conflict = next(
            (c for c in conflicts if "fluconazole" in c["affected_treatment"].lower() and "amiodarone" in c["affected_treatment"].lower()),
            None,
        )
        self.assertIsNotNone(fa_conflict)
        self.assertEqual(fa_conflict["severity"], "high")
        self.assertIn("b353df62-676b-4ef1-8c4d-cf92ec4f1776", str(fa_conflict["provenance"]))

        # 4. Warfarin + Supratherapeutic INR bleeding hazard
        inr_conflict = next(
            (c for c in conflicts if "supratherapeutic inr" in c["description"].lower() or "inr 3.8" in c["description"].lower() or "bleeding" in c["description"].lower()),
            None,
        )
        self.assertIsNotNone(inr_conflict)
        self.assertIn(inr_conflict["severity"], ("high", "contraindication"))

    # 3. Negation- & Polarity-Aware Semantic Claim Checker --------------------
    def test_semantic_claim_verification_supported(self) -> None:
        evidence = [
            {
                "id": "pmid:36272755",
                "source": "PubMed / KDIGO 2022",
                "title": "KDIGO 2022 Clinical Practice Guideline",
                "chunk": "In patients with type 2 diabetes and chronic kidney disease, SGLT2 inhibitors provide nephroprotection and reduce cardiovascular events.",
                "excerpt": "In patients with type 2 diabetes and chronic kidney disease, SGLT2 inhibitors provide nephroprotection and reduce cardiovascular events.",
                "evidence_grade": 0.82,
            }
        ]
        supported_claim = "SGLT2 inhibitors offer nephroprotection and lower cardiovascular events in diabetic kidney disease."
        res = rag_worker.verify_explanation_claims(supported_claim, evidence)
        self.assertEqual(len(res), 1)
        item = res[0]
        self.assertEqual(item["status"], "supported")
        self.assertFalse(item["contradiction_detected"])
        self.assertGreaterEqual(item["confidence"], 0.70)

    def test_semantic_claim_verification_polarity_contradiction(self) -> None:
        evidence = [
            {
                "id": "pmid:36272755",
                "source": "PubMed / KDIGO 2022",
                "title": "KDIGO 2022 Guideline",
                "chunk": "Metformin should be discontinued when eGFR is below 30 mL/min due to risk of lactic acidosis.",
                "excerpt": "Metformin should be discontinued when eGFR is below 30 mL/min due to risk of lactic acidosis.",
                "evidence_grade": 0.82,
            }
        ]
        # Reversing action polarity: claiming it is safe to CONTINUE or DO NOT discontinue
        reversal_claim = "Metformin is safe to continue and should not be discontinued when eGFR is below 30 mL/min."
        res = rag_worker.verify_explanation_claims(reversal_claim, evidence)
        self.assertEqual(len(res), 1)
        item = res[0]
        # Polarity guard must flag contradiction and force unsupported status
        self.assertEqual(item["status"], "unsupported")
        self.assertTrue(item["contradiction_detected"])

    def test_semantic_claim_verification_numeric_comparator_contradiction(self) -> None:
        evidence = [
            {
                "id": "pmid:36272755",
                "source": "PubMed / KDIGO 2022",
                "title": "KDIGO 2022 Guideline",
                "chunk": "Metformin should be discontinued when eGFR is below 30 mL/min.",
                "excerpt": "Metformin should be discontinued when eGFR is below 30 mL/min.",
                "evidence_grade": 0.82,
            }
        ]
        # Reversing threshold comparator: claiming discontinue when ABOVE 30
        comparator_reversal = "Metformin should be discontinued when eGFR is above 30 mL/min."
        res = rag_worker.verify_explanation_claims(comparator_reversal, evidence)
        self.assertEqual(len(res), 1)
        item = res[0]
        self.assertEqual(item["status"], "unsupported")
        self.assertTrue(item["contradiction_detected"])

    # 4. Full End-to-End Pipeline on Novel Complex Patient --------------------
    def test_end_to_end_novel_patient_analysis(self) -> None:
        novel_patient = {
            "age": 74,
            "sex": "Female",
            "diseases": ["Atrial Fibrillation", "Oral Candidiasis", "Hypertension"],
            "medications": ["Warfarin 5 mg daily", "Fluconazole 200 mg daily", "Amiodarone 200 mg daily"],
            "lab_values": {
                "INR": "3.8",
                "creatinine": "1.8 mg/dL",
                "potassium": "5.6 mEq/L",
                "QTc": "495 ms",
            },
            "allergies": [],
        }
        out = rag_worker.analyze(novel_patient, top_k=2)

        # 1. Verification of clinical physiology staging
        phys = out.get("clinical_physiology")
        self.assertIsNotNone(phys)
        self.assertEqual(phys["staging"]["hyperkalemia_grade"], "moderate")
        self.assertIn(phys["staging"]["renal_impairment_stage"], ("G3b", "G4"))
        self.assertGreaterEqual(len(phys["critical_lab_alerts"]), 1)

        # 2. Verification of Smart Routing Escalation
        routing = out.get("routing")
        self.assertIsNotNone(routing)
        self.assertEqual(routing["tier"], "high_risk_review")
        self.assertTrue(routing["needs_doctor_review"])
        self.assertGreaterEqual(routing["complexity_score"], 60)

        # 3. Verification of FDA SPL conflict detection
        conflicts = out.get("conflicts", [])
        self.assertGreaterEqual(len(conflicts), 3)
        self.assertTrue(any("6062fd98-7663-f4b5-e053-2a91aa0acbc3" in str(c.get("provenance", "")) for c in conflicts))

        # 4. Verification of claim verifications
        claims = out.get("claim_verifications", [])
        self.assertIsInstance(claims, list)
        self.assertGreaterEqual(len(claims), 1)
        for cl in claims:
            self.assertIn("status", cl)
            self.assertIn("semantic_similarity", cl)
            self.assertIn("contradiction_detected", cl)


if __name__ == "__main__":
    unittest.main()
