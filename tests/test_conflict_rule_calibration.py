#!/usr/bin/env python3
"""tests/test_conflict_rule_calibration.py

Phase 3.1: Comprehensive Unit and Regression Test Suite for Calibrated Conflict Detection.

Validates:
  1. LabInterval parser (explicit operators, boundary conditions, unit normalizations, malformed inputs).
  2. Conflicting measurements and metric mismatch handling.
  3. Rule 2: Decoupled renal/organ safety rules (Metformin, Dabigatran, Nitrofurantoin, Spironolactone, Allopurinol, Non-DHP CCBs, NSAIDs).
  4. Rule 3: Decoupled hepatic safety rules (Statins, transaminases ULN/fallback, decompensated cirrhosis).
  5. Rule 5: Pairwise drug-drug interaction matching with negation/boilerplate filtering.
  6. Cardiac Safety Rule: QTc prolongation, age-dose citalopram thresholds, evidence linkage.
  7. Rule 7: Tripartite cross-silo divergence with harm polarity.
  8. Preservation Invariants: DEA production weights (alpha=0.35, beta=0.30, gamma=0.15, delta=0.20) and benchmark integrity.
  9. Full benchmark regression across all 14 True Collisions, 7 Negative Controls, and 2 Ambiguous Cases.
"""

from __future__ import annotations

import json
import os
import sys
import unittest
from typing import Any

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

import rag_worker
from rag_worker import (
    DEA_WEIGHTS,
    LabInterval,
    build_patient_summary,
    check_cardiac_safety,
    classify_conflict_record,
    detect_conflicts_python,
    detect_pairwise_drug_interactions,
    evaluate_lab_measurements,
    find_evidence_chunk_match,
    is_provenance_complete,
    normalize_lab_unit,
    parse_lab_interval,
    satisfies_lower_bound,
    satisfies_upper_bound,
    summarize_conflict_categories,
)

VALID_PROVENANCE_SAMPLE = {
    "source_id": "dailymed_metformin_500",
    "chunk_id": "chunk_004",
    "source_title": "Metformin Hydrochloride PI",
    "relevant_excerpt": "Metformin is contraindicated in severe renal impairment (eGFR < 30 mL/min/1.73 m2).",
    "match_rationale": "Patient eGFR of 28 is below the contraindication threshold of 30.",
}

BENCHMARK_PATH = os.path.join(WORKSPACE_ROOT, "data", "benchmarks", "guideline_collision_v1.json")
FROZEN_EVIDENCE_PATH = os.path.join(WORKSPACE_ROOT, "data", "benchmarks", "frozen_evidence_v1.json")


class TestIntervalParser(unittest.TestCase):
    """Unit tests for LabInterval parser, operator semantics, and unit normalizations."""

    def test_explicit_equality_operator(self) -> None:
        interval_str = parse_lab_interval("eGFR", "= 34 mL/min/1.73m²")
        self.assertTrue(interval_str.is_valid)
        self.assertEqual(interval_str.operator, "=")
        self.assertEqual(interval_str.value, 34.0)
        self.assertEqual(interval_str.unit, "mL/min/1.73m2")
        self.assertEqual(interval_str.status, "PARSED")

        interval_num = parse_lab_interval("eGFR", 34)
        self.assertTrue(interval_num.is_valid)
        self.assertEqual(interval_num.operator, "=")
        self.assertEqual(interval_num.value, 34.0)

    def test_relational_operators(self) -> None:
        lt = parse_lab_interval("CrCl", "< 30 mL/min")
        self.assertTrue(lt.is_valid)
        self.assertEqual(lt.operator, "<")
        self.assertEqual(lt.value, 30.0)
        self.assertEqual(lt.unit, "mL/min")

        lte = parse_lab_interval("CrCl", "<= 15 mL/min")
        self.assertTrue(lte.is_valid)
        self.assertEqual(lte.operator, "<=")
        self.assertEqual(lte.value, 15.0)

        gt = parse_lab_interval("QTc", "> 500 ms")
        self.assertTrue(gt.is_valid)
        self.assertEqual(gt.operator, ">")
        self.assertEqual(gt.value, 500.0)
        self.assertEqual(gt.unit, "ms")

        gte = parse_lab_interval("eGFR", ">= 60 mL/min/1.73m2")
        self.assertTrue(gte.is_valid)
        self.assertEqual(gte.operator, ">=")
        self.assertEqual(gte.value, 60.0)

    def test_unit_normalization(self) -> None:
        self.assertEqual(normalize_lab_unit("ml/min/1.73m²"), "mL/min/1.73m2")
        self.assertEqual(normalize_lab_unit("ml/min/1.73 m²"), "mL/min/1.73m2")
        self.assertEqual(normalize_lab_unit("ml/min"), "mL/min")
        self.assertEqual(normalize_lab_unit("u/l"), "U/L")
        self.assertEqual(normalize_lab_unit("iu/l"), "U/L")
        self.assertEqual(normalize_lab_unit("msec"), "ms")

    def test_malformed_and_missing_inputs(self) -> None:
        missing_none = parse_lab_interval("eGFR", None)
        self.assertFalse(missing_none.is_valid)
        self.assertEqual(missing_none.status, "MISSING")

        missing_empty = parse_lab_interval("eGFR", "")
        self.assertFalse(missing_empty.is_valid)
        self.assertEqual(missing_empty.status, "MISSING")

        malformed_text = parse_lab_interval("eGFR", "pending results")
        self.assertFalse(malformed_text.is_valid)
        self.assertEqual(malformed_text.status, "MALFORMED")

        malformed_unclear = parse_lab_interval("ALT", "unclear")
        self.assertFalse(malformed_unclear.is_valid)
        self.assertEqual(malformed_unclear.status, "MALFORMED")

    def test_incompatible_unit_inputs(self) -> None:
        incomp_alt = parse_lab_interval("ALT", "150 mg/dL")
        self.assertFalse(incomp_alt.is_valid)
        self.assertEqual(incomp_alt.status, "INCOMPATIBLE_UNIT")

        incomp_qtc = parse_lab_interval("QTc", "520 mL/min")
        self.assertFalse(incomp_qtc.is_valid)
        self.assertEqual(incomp_qtc.status, "INCOMPATIBLE_UNIT")

        incomp_egfr = parse_lab_interval("eGFR", "25 U/L")
        self.assertFalse(incomp_egfr.is_valid)
        self.assertEqual(incomp_egfr.status, "INCOMPATIBLE_UNIT")

    def test_satisfies_upper_bound(self) -> None:
        # Strictly below: 22 < 30
        iv22 = parse_lab_interval("eGFR", "22 mL/min/1.73m²")
        sat, reason = satisfies_upper_bound(iv22, 30.0)
        self.assertTrue(sat)
        self.assertEqual(reason, "INTERVAL_BELOW")

        # Boundary value: = 30
        iv30 = parse_lab_interval("eGFR", "30 mL/min/1.73m²")
        sat, reason = satisfies_upper_bound(iv30, 30.0)
        self.assertFalse(sat)
        self.assertEqual(reason, "EXACT_BOUNDARY")

        # Boundary value with <= operator: <= 30
        iv_lte30 = parse_lab_interval("eGFR", "<= 30 mL/min/1.73m²")
        sat, reason = satisfies_upper_bound(iv_lte30, 30.0)
        self.assertFalse(sat)
        self.assertEqual(reason, "EXACT_BOUNDARY")

        # Upper bound with < operator: < 30
        iv_lt30 = parse_lab_interval("eGFR", "< 30 mL/min/1.73m²")
        sat, reason = satisfies_upper_bound(iv_lt30, 30.0)
        self.assertTrue(sat)
        self.assertEqual(reason, "INTERVAL_BELOW")

        # Uncertain bound: < 60 against 30 cannot guarantee < 30
        iv_lt60 = parse_lab_interval("eGFR", "< 60 mL/min/1.73m²")
        sat, reason = satisfies_upper_bound(iv_lt60, 30.0)
        self.assertFalse(sat)
        self.assertEqual(reason, "UNCERTAIN_BOUND")

        # Strictly above: 74 > 30
        iv74 = parse_lab_interval("eGFR", "74 mL/min/1.73m²")
        sat, reason = satisfies_upper_bound(iv74, 30.0)
        self.assertFalse(sat)
        self.assertEqual(reason, "INTERVAL_ABOVE")

    def test_satisfies_lower_bound(self) -> None:
        # Strictly above: 515 > 500
        iv515 = parse_lab_interval("QTc", "515 ms")
        sat, reason = satisfies_lower_bound(iv515, 500.0)
        self.assertTrue(sat)
        self.assertEqual(reason, "INTERVAL_ABOVE")

        # Boundary: = 500
        iv500 = parse_lab_interval("QTc", "500 ms")
        sat, reason = satisfies_lower_bound(iv500, 500.0)
        self.assertFalse(sat)
        self.assertEqual(reason, "EXACT_BOUNDARY")

        # Strictly below: 410 < 500
        iv410 = parse_lab_interval("QTc", "410 ms")
        sat, reason = satisfies_lower_bound(iv410, 500.0)
        self.assertFalse(sat)
        self.assertEqual(reason, "INTERVAL_BELOW")

    def test_conflicting_measurements_provenance(self) -> None:
        readings = ["480 ms", "515 ms"]
        intervals = evaluate_lab_measurements("QTc", readings)
        self.assertEqual(len(intervals), 2)
        self.assertEqual(intervals[0].value, 480.0)
        self.assertEqual(intervals[1].value, 515.0)
        self.assertTrue(intervals[0].is_valid)
        self.assertTrue(intervals[1].is_valid)


class TestRenalRuleDecoupling(unittest.TestCase):
    """Unit tests for Rule 2: Decoupled organ impairment & medication safety screening."""

    def test_metformin_severe_renal_contraindication(self) -> None:
        # eGFR 22 (COL-001) -> Contraindication
        patient = {
            "diseases": ["Type 2 diabetes", "Chronic kidney disease, stage 4"],
            "medications": ["Metformin 1000 mg twice daily"],
            "lab_values": {"eGFR": "22 mL/min/1.73m²"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("drug-disease conflict", types)
        sev = next(c["severity"] for c in conflicts if c["conflict_type"] == "drug-disease conflict")
        self.assertEqual(sev, "high")

    def test_metformin_boundary_29(self) -> None:
        patient = {
            "diseases": ["Type 2 diabetes"],
            "medications": ["Metformin 500 mg"],
            "lab_values": {"eGFR": "29 mL/min/1.73m²"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        matched = [c for c in conflicts if c.get("conflict_detected") and c["conflict_type"] == "drug-disease conflict"]
        self.assertTrue(len(matched) > 0)
        self.assertEqual(matched[0]["severity"], "high")

    def test_metformin_moderate_renal_advisory_30_to_44(self) -> None:
        # eGFR 34 (test_conflicts_E1) -> Moderate advisory band
        for egfr_val in ["30 mL/min/1.73m²", "34 mL/min/1.73m²", "44 mL/min/1.73m²"]:
            patient = {
                "diseases": ["Type 2 diabetes"],
                "medications": ["Metformin 500 mg twice daily"],
                "lab_values": {"eGFR": egfr_val},
            }
            conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
            matched = [c for c in conflicts if c.get("conflict_detected") and c["conflict_type"] == "drug-disease conflict"]
            self.assertTrue(len(matched) > 0, f"Expected advisory conflict for eGFR {egfr_val}")
            self.assertEqual(matched[0]["severity"], "moderate")

    def test_metformin_mild_and_normal_renal_safe(self) -> None:
        # eGFR 45, 74 (NC-001), 88 (NC-005) -> Safe
        for egfr_val in ["45 mL/min/1.73m²", "74 mL/min/1.73m²", "88 mL/min/1.73m²"]:
            patient = {
                "diseases": ["Type 2 diabetes"],
                "medications": ["Metformin 500 mg twice daily"],
                "lab_values": {"eGFR": egfr_val},
            }
            conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
            matched = [c for c in conflicts if c.get("conflict_detected")]
            self.assertEqual(len(matched), 0, f"eGFR {egfr_val} should not trigger conflict")

    def test_metformin_missing_egfr_with_stage4_narrative(self) -> None:
        patient = {
            "diseases": ["Type 2 diabetes", "Chronic kidney disease, stage 4"],
            "medications": ["Metformin 500 mg twice daily"],
            "lab_values": {},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("drug-disease conflict", types)

    def test_dabigatran_esrd_hemodialysis(self) -> None:
        # CrCl 12 (COL-003) -> High severity contraindication
        patient = {
            "diseases": ["Non-valvular atrial fibrillation", "End-stage renal disease on hemodialysis"],
            "medications": ["Dabigatran etexilate 150 mg twice daily"],
            "lab_values": {"CrCl": "12 mL/min"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("drug-disease conflict", types)

    def test_dabigatran_normal_renal_safe(self) -> None:
        # CrCl 88 (NC-003) -> Safe
        patient = {
            "diseases": ["Non-valvular atrial fibrillation"],
            "medications": ["Dabigatran 150 mg twice daily"],
            "lab_values": {"CrCl": "88 mL/min"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        detected = [c for c in conflicts if c.get("conflict_detected")]
        self.assertEqual(len(detected), 0)

    def test_nitrofurantoin_renal_contraindication(self) -> None:
        # CrCl 24 (COL-007) -> Contraindication
        patient = {
            "diseases": ["Acute uncomplicated cystitis", "Chronic kidney disease, stage 4"],
            "medications": ["Nitrofurantoin 100 mg twice daily"],
            "lab_values": {"CrCl": "24 mL/min"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("drug-disease conflict", types)

    def test_spironolactone_hyperkalemia(self) -> None:
        # K+ 5.4, eGFR 28 (COL-008) -> Contraindication
        patient = {
            "diseases": ["Heart failure with reduced ejection fraction"],
            "medications": ["Spironolactone 25 mg daily"],
            "lab_values": {"potassium": "5.4 mEq/L", "eGFR": "28 mL/min/1.73m²"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("drug-disease conflict", types)

    def test_spironolactone_concordant_safe(self) -> None:
        # K+ 4.2, eGFR 58 (NC-002) -> Safe
        patient = {
            "diseases": ["Heart failure with reduced ejection fraction"],
            "medications": ["Spironolactone 25 mg daily"],
            "lab_values": {"potassium": "4.2 mEq/L", "eGFR": "58 mL/min/1.73m²"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        detected = [c for c in conflicts if c.get("conflict_detected")]
        self.assertEqual(len(detected), 0)

    def test_allopurinol_severe_renal(self) -> None:
        # eGFR 24 (COL-006) -> Advisory conflict
        patient = {
            "diseases": ["Gout", "Chronic kidney disease, stage 4"],
            "medications": ["Allopurinol 100 mg daily"],
            "lab_values": {"eGFR": "24 mL/min/1.73m²"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("drug-disease conflict", types)

    def test_non_dhp_ccb_in_hfref(self) -> None:
        # Diltiazem with LVEF 22% (COL-014) -> Contraindication
        patient = {
            "diseases": ["Heart failure with reduced ejection fraction"],
            "medications": ["Diltiazem CD 240 mg daily"],
            "lab_values": {"LVEF": "22%"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("drug-disease conflict", types)

    def test_nsaid_in_hfref(self) -> None:
        # Naproxen with LVEF 28% (COL-002) -> Contraindication
        patient = {
            "diseases": ["Heart failure with reduced ejection fraction"],
            "medications": ["Naproxen 500 mg twice daily"],
            "lab_values": {"LVEF": "28%"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("drug-disease conflict", types)


class TestHepaticRuleDecoupling(unittest.TestCase):
    """Unit tests for Rule 3: Decoupled hepatic screening logic."""

    def test_atorvastatin_decompensated_cirrhosis(self) -> None:
        # COL-005: Decompensated cirrhosis, ALT 142, AST 168
        patient = {
            "diseases": ["Decompensated liver cirrhosis", "Severe mixed hyperlipidemia"],
            "medications": ["Atorvastatin 40 mg daily"],
            "lab_values": {"ALT": "142 U/L", "AST": "168 U/L"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("hepatic restriction", types)

    def test_atorvastatin_normal_transaminases_safe(self) -> None:
        # NC-003: ALT 22, AST 20, no cirrhosis -> Safe
        patient = {
            "diseases": ["Primary hyperlipidemia"],
            "medications": ["Atorvastatin 40 mg daily"],
            "lab_values": {"ALT": "22 U/L", "AST": "20 U/L"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        detected = [c for c in conflicts if c.get("conflict_detected")]
        self.assertEqual(len(detected), 0)

    def test_atorvastatin_elevated_transaminases_fallback(self) -> None:
        # ALT 110 U/L (> 100 U/L engineering heuristic) without cirrhosis
        patient = {
            "diseases": ["Hyperlipidemia"],
            "medications": ["Atorvastatin 20 mg daily"],
            "lab_values": {"ALT": "110 U/L", "AST": "95 U/L"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        types = [c["conflict_type"] for c in conflicts if c.get("conflict_detected")]
        self.assertIn("hepatic restriction", types)

    def test_alt_ast_with_different_lab_specific_ulns(self) -> None:
        # Patient with Atorvastatin: ALT 120 with ULN 35 (3.4x > 3x) -> triggers by ALT
        # AST 80 with ULN 50 (1.6x <= 3x) -> does not trigger by AST
        patient = {
            "diseases": ["Primary hyperlipidemia"],
            "medications": ["Atorvastatin 40 mg daily"],
            "lab_values": {"ALT": "120 U/L", "ALT_ULN": "35 U/L", "AST": "80 U/L", "AST_ULN": "50 U/L"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        detected = [c for c in conflicts if c.get("conflict_detected") and c.get("conflict_type") == "hepatic restriction"]
        self.assertEqual(len(detected), 1)
        c = detected[0]
        self.assertEqual(c["transaminase_evaluation_method"], "LAB_SPECIFIC_ULN_RATIO")
        self.assertFalse(c["heuristic_fallback"])
        self.assertIn("3.4x laboratory ULN", c["description"])

        # Reverse: ALT 90 with ULN 35 (2.6x <= 3x), AST 160 with ULN 40 (4.0x > 3x) -> triggers by AST
        patient2 = {
            "diseases": ["Primary hyperlipidemia"],
            "medications": ["Atorvastatin 40 mg daily"],
            "lab_values": {"ALT": "90 U/L", "ALT_ULN": "35 U/L", "AST": "160 U/L", "AST_ULN": "40 U/L"},
        }
        conflicts2 = detect_conflicts_python(patient2, {}, {"evidence": []}, {})
        detected2 = [c for c in conflicts2 if c.get("conflict_detected") and c.get("conflict_type") == "hepatic restriction"]
        self.assertEqual(len(detected2), 1)
        self.assertEqual(detected2[0]["transaminase_evaluation_method"], "LAB_SPECIFIC_ULN_RATIO")
        self.assertIn("4.0x laboratory ULN", detected2[0]["description"])

    def test_uln_present_vs_fallback_used(self) -> None:
        # Without ULN: uses fallback 100 U/L
        patient_no_uln = {
            "diseases": ["Primary hyperlipidemia"],
            "medications": ["Atorvastatin 40 mg daily"],
            "lab_values": {"ALT": "115 U/L", "AST": "90 U/L"},
        }
        conflicts = detect_conflicts_python(patient_no_uln, {}, {"evidence": []}, {})
        c = next(c for c in conflicts if c.get("conflict_type") == "hepatic restriction")
        self.assertEqual(c["transaminase_evaluation_method"], "FALLBACK_THRESHOLD_100_UL")
        self.assertTrue(c["heuristic_fallback"])
        self.assertIn("Unverified engineering heuristic", c["engineering_assumption"])

        # With ULN: ALT 115 with ULN 45 (2.56x <= 3x) -> Safe! Fallback is NOT used when ULN present
        patient_with_uln = {
            "diseases": ["Primary hyperlipidemia"],
            "medications": ["Atorvastatin 40 mg daily"],
            "lab_values": {"ALT": "115 U/L", "ALT_ULN": "45 U/L", "AST": "90 U/L", "AST_ULN": "45 U/L"},
        }
        conflicts_with_uln = detect_conflicts_python(patient_with_uln, {}, {"evidence": []}, {})
        detected = [c for c in conflicts_with_uln if c.get("conflict_detected") and c.get("conflict_type") == "hepatic restriction"]
        self.assertEqual(len(detected), 0)

    def test_fallback_governance_metadata(self) -> None:
        patient = {
            "diseases": ["Primary hyperlipidemia"],
            "medications": ["Atorvastatin 20 mg daily"],
            "lab_values": {"ALT": "125 U/L"},
        }
        conflicts = detect_conflicts_python(patient, {}, {"evidence": []}, {})
        c = next(c for c in conflicts if c.get("conflict_type") == "hepatic restriction")
        self.assertIn("engineering_assumption", c)
        self.assertIn("heuristic_fallback", c)
        self.assertTrue(c["heuristic_fallback"])
        self.assertEqual(c["transaminase_evaluation_method"], "FALLBACK_THRESHOLD_100_UL")

    def test_missing_malformed_and_incompatible_unit_hepatic_labs(self) -> None:
        # Incompatible unit: ALT "150 mg/dL" with statin -> DATA_QUALITY_ADVISORY
        patient_incomp = {
            "diseases": ["Hyperlipidemia"],
            "medications": ["Atorvastatin 20 mg daily"],
            "lab_values": {"ALT": "150 mg/dL"},
        }
        conflicts_incomp = detect_conflicts_python(patient_incomp, {}, {"evidence": []}, {})
        c_incomp = next(c for c in conflicts_incomp if c.get("conflict_type") == "hepatic restriction")
        self.assertEqual(c_incomp["status"], "DATA_QUALITY_ADVISORY")
        self.assertEqual(c_incomp["severity"], "moderate")
        self.assertEqual(c_incomp["transaminase_evaluation_method"], "DATA_QUALITY_GUARDRAIL")

        # Malformed: ALT "error" with statin -> DATA_QUALITY_ADVISORY
        patient_malformed = {
            "diseases": ["Hyperlipidemia"],
            "medications": ["Atorvastatin 20 mg daily"],
            "lab_values": {"ALT": "lab error"},
        }
        conflicts_mal = detect_conflicts_python(patient_malformed, {}, {"evidence": []}, {})
        c_mal = next(c for c in conflicts_mal if c.get("conflict_type") == "hepatic restriction")
        self.assertEqual(c_mal["status"], "DATA_QUALITY_ADVISORY")

        # Missing completely (no ALT or AST key) without cirrhosis -> No false conflict
        patient_missing = {
            "diseases": ["Hyperlipidemia"],
            "medications": ["Atorvastatin 20 mg daily"],
            "lab_values": {},
        }
        conflicts_miss = detect_conflicts_python(patient_missing, {}, {"evidence": []}, {})
        detected = [c for c in conflicts_miss if c.get("conflict_detected")]
        self.assertEqual(len(detected), 0)


class TestPairwiseDrugInteractions(unittest.TestCase):
    """Unit tests for Rule 5: Specific adverse mechanism pairwise drug-drug matching."""

    def test_dual_ras_blockade(self) -> None:
        # Lisinopril + Losartan (COL-004)
        meds = ["lisinopril", "losartan"]
        conflicts = detect_pairwise_drug_interactions(meds, [])
        self.assertTrue(len(conflicts) > 0)
        self.assertEqual(conflicts[0]["conflict_type"], "drug-drug interaction review")
        self.assertIn("dual RAS blockade", conflicts[0]["risk_factor"])

    def test_pde5i_plus_nitrate(self) -> None:
        # Sildenafil + Isosorbide (COL-013)
        meds = ["sildenafil", "isosorbide mononitrate"]
        conflicts = detect_pairwise_drug_interactions(meds, [])
        self.assertTrue(len(conflicts) > 0)
        self.assertIn("vasodilatory hypotension", conflicts[0]["risk_factor"])

    def test_lithium_plus_acei(self) -> None:
        # Lithium + Lisinopril (COL-011)
        meds = ["lithium", "lisinopril"]
        conflicts = detect_pairwise_drug_interactions(meds, [])
        self.assertTrue(len(conflicts) > 0)
        self.assertIn("renal clearance of lithium", conflicts[0]["risk_factor"])

    def test_clopidogrel_plus_omeprazole(self) -> None:
        # Clopidogrel + Omeprazole (COL-012)
        meds = ["clopidogrel", "omeprazole"]
        conflicts = detect_pairwise_drug_interactions(meds, [])
        self.assertTrue(len(conflicts) > 0)
        self.assertIn("CYP2C19", conflicts[0]["risk_factor"])

    def test_colchicine_plus_clarithromycin(self) -> None:
        # Colchicine + Clarithromycin (COL-006)
        meds = ["colchicine", "clarithromycin"]
        conflicts = detect_pairwise_drug_interactions(meds, [])
        self.assertTrue(len(conflicts) > 0)
        self.assertIn("colchicine accumulation", conflicts[0]["risk_factor"])

    def test_triple_antithrombotic_therapy(self) -> None:
        # Apixaban + Aspirin + Clopidogrel (COL-009)
        meds = ["apixaban", "aspirin", "clopidogrel"]
        conflicts = detect_pairwise_drug_interactions(meds, [])
        self.assertTrue(len(conflicts) > 0)
        self.assertIn("bleeding cascade potentiation", conflicts[0]["risk_factor"])

    def test_concordant_metformin_lisinopril_nc001_safe(self) -> None:
        # Metformin + Lisinopril (NC-001) -> Safe
        meds = ["metformin", "lisinopril"]
        evidence = [{"title": "LISINOPRIL TABLET", "chunk": "Lisinopril is indicated for hypertension."}]
        conflicts = detect_pairwise_drug_interactions(meds, evidence)
        self.assertEqual(len(conflicts), 0)

    def test_concordant_quadruple_gdmt_nc002_safe(self) -> None:
        # Sacubitril + Carvedilol + Dapagliflozin + Spironolactone (NC-002) -> Safe
        meds = ["sacubitril", "carvedilol", "dapagliflozin", "spironolactone"]
        conflicts = detect_pairwise_drug_interactions(meds, [])
        self.assertEqual(len(conflicts), 0)

    def test_negation_filtering(self) -> None:
        meds = ["drug_a", "drug_b"]
        ev = [{
            "title": "DRUG A",
            "chunk": "Concomitant use with drug_b showed no clinically significant interaction and was well tolerated."
        }]
        conflicts = detect_pairwise_drug_interactions(meds, ev)
        self.assertEqual(len(conflicts), 0)


class TestCardiacSafetyRule(unittest.TestCase):
    """Unit tests for Cardiac Safety screening (QTc prolongation, citalopram age/dose ceiling)."""

    def test_citalopram_age_dose_and_qtc_col010(self) -> None:
        # COL-010: Age 66, Citalopram 40 mg, QTc 515 ms
        patient = {
            "age": 66,
            "diseases": ["Major depressive disorder", "Acquired QTc prolongation"],
            "medications": ["Citalopram 40 mg daily"],
            "lab_values": {"QTc": "515 ms"},
        }
        ev = [{"chunk": "Dosages above 40 mg once daily are not recommended due to QT prolongation. Max dose for age > 60 is 20 mg."}]
        conflict = check_cardiac_safety(patient, ev, "Citalopram")
        self.assertIsNotNone(conflict)
        self.assertTrue(conflict["conflict_detected"])
        self.assertEqual(conflict["conflict_type"], "drug-disease conflict")
        self.assertIn("exceeds 20 mg/day limit for age > 60", conflict["description"])
        self.assertIn("exceeds 500 ms", conflict["description"])

    def test_citalopram_age_dose_alone_triggers(self) -> None:
        # Age 66, Citalopram 40 mg, missing QTc
        patient = {
            "age": 66,
            "diseases": ["Major depressive disorder"],
            "medications": ["Citalopram 40 mg daily"],
            "lab_values": {},
        }
        ev = [{"chunk": "QT prolongation warnings."}]
        conflict = check_cardiac_safety(patient, ev, "Citalopram")
        self.assertIsNotNone(conflict)
        self.assertIn("exceeds 20 mg/day limit for age > 60", conflict["description"])

    def test_citalopram_safe_younger_low_dose(self) -> None:
        # Age 35, Citalopram 20 mg, QTc 410 ms -> Safe
        patient = {
            "age": 35,
            "diseases": ["Major depressive disorder"],
            "medications": ["Citalopram 20 mg daily"],
            "lab_values": {"QTc": "410 ms"},
        }
        ev = [{"chunk": "QT prolongation warnings."}]
        conflict = check_cardiac_safety(patient, ev, "Citalopram")
        self.assertIsNone(conflict)

    def test_escitalopram_safe_nc005(self) -> None:
        # NC-005: Age 49, Escitalopram 10 mg, QTc 410 ms -> Safe
        patient = {
            "age": 49,
            "diseases": ["Major depressive disorder"],
            "medications": ["Escitalopram 10 mg daily"],
            "lab_values": {"QTc": "410 ms"},
        }
        ev = [{"chunk": "General precautions."}]
        conflict = check_cardiac_safety(patient, ev, "Escitalopram")
        self.assertIsNone(conflict)

    def test_qtc_above_threshold_with_matching_qt_evidence(self) -> None:
        # Citalopram, QTc 520 ms, with DailyMed QT warning chunk -> CONFIRMED_CONFLICT
        patient = {
            "age": 55,
            "diseases": ["Major depressive disorder"],
            "medications": ["Citalopram 20 mg daily"],
            "lab_values": {"QTc": "520 ms"},
        }
        ev = [{"chunk": "DailyMed Warning: Citalopram causes dose-dependent QT interval prolongation and torsades de pointes."}]
        conflict = check_cardiac_safety(patient, ev, "Citalopram")
        self.assertIsNotNone(conflict)
        self.assertEqual(conflict["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(conflict["severity"], "high")
        self.assertEqual(conflict["evidence_linkage"], "VERIFIED")

    def test_qtc_above_threshold_with_missing_qt_evidence(self) -> None:
        # Citalopram, QTc 520 ms, but retrieved evidence lacks QT warning chunk -> RETRIEVAL_COVERAGE_GAP_ADVISORY
        patient = {
            "age": 55,
            "diseases": ["Major depressive disorder"],
            "medications": ["Citalopram 20 mg daily"],
            "lab_values": {"QTc": "520 ms"},
        }
        ev_no_qt = [{"chunk": "Pharmacokinetics: Citalopram is absorbed well following oral administration."}]
        conflict = check_cardiac_safety(patient, ev_no_qt, "Citalopram")
        self.assertIsNotNone(conflict)
        self.assertEqual(conflict["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertEqual(conflict["severity"], "moderate")
        self.assertEqual(conflict["evidence_linkage"], "COVERAGE_GAP")
        self.assertTrue(conflict["conflict_detected"])

    def test_non_qt_risk_medication_with_prolonged_qtc(self) -> None:
        # Metformin ONLY, QTc 530 ms -> Must NOT trigger cardiac conflict
        patient = {
            "age": 60,
            "diseases": ["Type 2 diabetes mellitus"],
            "medications": ["Metformin 1000 mg twice daily"],
            "lab_values": {"QTc": "530 ms", "eGFR": "75 mL/min/1.73m²"},
        }
        ev = [{"chunk": "Metformin information: renal clearance and glycemic control."}]
        conflict = check_cardiac_safety(patient, ev, "Metformin")
        self.assertIsNone(conflict)

        # In full detect_conflicts_python
        conflicts = detect_conflicts_python(patient, {}, {"evidence": ev}, {})
        cardiac_conflicts = [c for c in conflicts if c.get("risk_factor") and "qtc" in c.get("risk_factor", "").lower()]
        self.assertEqual(len(cardiac_conflicts), 0)

    def test_missing_medication_or_measurements_cardiac(self) -> None:
        # Empty medications
        patient_no_meds = {
            "age": 65,
            "diseases": ["Depression"],
            "medications": [],
            "lab_values": {"QTc": "520 ms"},
        }
        self.assertIsNone(check_cardiac_safety(patient_no_meds, [], "none"))

        # Citalopram with missing age, dose, and QTc
        patient_missing_all = {
            "diseases": ["Depression"],
            "medications": ["Citalopram"],
            "lab_values": {},
        }
        self.assertIsNone(check_cardiac_safety(patient_missing_all, [], "Citalopram"))


class TestInvariantsAndBenchmarkRegression(unittest.TestCase):
    """Regression test verifying DEA production weights and full 23-case benchmark execution."""

    @classmethod
    def setUpClass(cls) -> None:
        with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
            cls.bench_cases = json.load(f)
        with open(FROZEN_EVIDENCE_PATH, "r", encoding="utf-8") as f:
            cls.frozen_ev = json.load(f)

    def test_dea_weights_invariant(self) -> None:
        """PRESERVATION INVARIANT: Verify alpha=0.35, beta=0.30, gamma=0.15, delta=0.20 strictly unchanged."""
        self.assertEqual(DEA_WEIGHTS["alpha"], 0.35)
        self.assertEqual(DEA_WEIGHTS["beta"], 0.30)
        self.assertEqual(DEA_WEIGHTS["gamma"], 0.15)
        self.assertEqual(DEA_WEIGHTS["delta"], 0.20)

    def test_no_conflict_status_scoped(self) -> None:
        """Verify unconflicted cases return NO_CONFLICT_DETECTED_BY_RULE."""
        patient = {
            "diseases": ["Hypertension"],
            "medications": ["Amlodipine 5 mg daily"],
            "lab_values": {"eGFR": "95 mL/min/1.73m²"},
        }
        conflicts = detect_conflicts_python(patient, {}, {}, {})
        self.assertEqual(len(conflicts), 1)
        self.assertFalse(conflicts[0]["conflict_detected"])
        self.assertEqual(conflicts[0]["status"], "NO_CONFLICT_DETECTED_BY_RULE")

    def test_all_14_true_collisions_detected(self) -> None:
        """Verify 100% sensitivity on all 14 guideline collisions."""
        import scripts.audit_conflict_rules as acr
        for case in self.bench_cases[:14]:
            cid = case["case_id"]
            res = acr.audit_case_conflict_rules(case, self.frozen_ev[cid])
            self.assertTrue(
                res["overall_conflict_detected"],
                f"True collision {cid} missed by calibrated conflict rules!"
            )
            self.assertFalse(res["false_negative"])

    def test_all_7_negative_controls_unconflicted(self) -> None:
        """Verify 100% specificity (0 false positives) on all 7 negative controls."""
        import scripts.audit_conflict_rules as acr
        for case in self.bench_cases[14:21]:
            cid = case["case_id"]
            res = acr.audit_case_conflict_rules(case, self.frozen_ev[cid])
            self.assertFalse(
                res["overall_conflict_detected"],
                f"Negative control {cid} triggered false-positive alert: {res['all_detected_conflicts']}"
            )
            self.assertFalse(res["false_positive"])

    def test_case_col002_nsaid_hfref(self) -> None:
        """COL-002: NSAID-Induced Decompensation Collision in HFrEF."""
        case_002 = next(c for c in self.bench_cases if c["case_id"] == "COL-002")
        self.assertEqual(case_002["title"], "NSAID-Induced Decompensation Collision in HFrEF")
        import scripts.audit_conflict_rules as acr
        res = acr.audit_case_conflict_rules(case_002, self.frozen_ev["COL-002"])
        self.assertTrue(res["overall_conflict_detected"])
        self.assertTrue(res["rule_results"]["rule_2"]["fired"])
        self.assertTrue(res["rule_results"]["rule_5"]["fired"])

    def test_case_col003_dabigatran_esrd(self) -> None:
        """COL-003: Dabigatran Clearance Collision in ESRD Hemodialysis."""
        case_003 = next(c for c in self.bench_cases if c["case_id"] == "COL-003")
        self.assertEqual(case_003["title"], "Dabigatran Clearance Collision in ESRD Hemodialysis")
        import scripts.audit_conflict_rules as acr
        res = acr.audit_case_conflict_rules(case_003, self.frozen_ev["COL-003"])
        self.assertTrue(res["overall_conflict_detected"])
        self.assertTrue(res["rule_results"]["rule_2"]["fired"])

    def test_case_col004_dual_ras_blockade(self) -> None:
        """COL-004: Dual RAS Blockade Collision in Diabetic Nephropathy."""
        case_004 = next(c for c in self.bench_cases if c["case_id"] == "COL-004")
        self.assertEqual(case_004["title"], "Dual RAS Blockade Collision in Diabetic Nephropathy")
        import scripts.audit_conflict_rules as acr
        res = acr.audit_case_conflict_rules(case_004, self.frozen_ev["COL-004"])
        self.assertTrue(res["overall_conflict_detected"])
        self.assertTrue(res["rule_results"]["rule_5"]["fired"])

    def test_case_col007_nitrofurantoin_ckd(self) -> None:
        """COL-007: Nitrofurantoin Neuro-Pulmonary Toxicity Collision in Advanced CKD."""
        case_007 = next(c for c in self.bench_cases if c["case_id"] == "COL-007")
        self.assertEqual(case_007["title"], "Nitrofurantoin Neuro-Pulmonary Toxicity Collision in Advanced CKD")
        import scripts.audit_conflict_rules as acr
        res = acr.audit_case_conflict_rules(case_007, self.frozen_ev["COL-007"])
        self.assertTrue(res["overall_conflict_detected"])
        self.assertTrue(res["rule_results"]["rule_2"]["fired"])

    def test_case_col010_citalopram_long_qt(self) -> None:
        """COL-010: High-Dose Citalopram Collision with Baseline Long QT Syndrome."""
        case_010 = next(c for c in self.bench_cases if c["case_id"] == "COL-010")
        self.assertEqual(case_010["title"], "High-Dose Citalopram Collision with Baseline Long QT Syndrome")
        import scripts.audit_conflict_rules as acr
        res = acr.audit_case_conflict_rules(case_010, self.frozen_ev["COL-010"])
        self.assertTrue(res["overall_conflict_detected"])
        self.assertTrue(res["rule_results"]["rule_2"]["fired"])

    def test_ambiguous_cases_evaluated_separately(self) -> None:
        """AMB-001 (Metformin eGFR 38) advisory vs AMB-002 (Digoxin HFpEF) safe."""
        import scripts.audit_conflict_rules as acr
        case_amb1 = next(c for c in self.bench_cases if c["case_id"] == "AMB-001")
        res_amb1 = acr.audit_case_conflict_rules(case_amb1, self.frozen_ev["AMB-001"])
        self.assertTrue(res_amb1["overall_conflict_detected"])
        self.assertEqual(res_amb1["all_detected_conflicts"][0]["severity"], "moderate")

        case_amb2 = next(c for c in self.bench_cases if c["case_id"] == "AMB-002")
        res_amb2 = acr.audit_case_conflict_rules(case_amb2, self.frozen_ev["AMB-002"])
        self.assertFalse(res_amb2["overall_conflict_detected"])


class TestSynthesisAndConflictSemantics(unittest.TestCase):
    """Stage 1 tests: synthesis wording, classification, and legacy payload compatibility."""

    def test_classify_confirmed_conflict(self) -> None:
        record = {
            "conflict_detected": True,
            "status": "CONFIRMED_CONFLICT",
            "evidence_linkage": "VERIFIED",
            "provenance": VALID_PROVENANCE_SAMPLE,
        }
        self.assertEqual(classify_conflict_record(record), "CONFIRMED_CONFLICT")

    def test_classify_coverage_gap_advisory(self) -> None:
        record = {
            "conflict_detected": True,
            "status": "RETRIEVAL_COVERAGE_GAP_ADVISORY",
            "evidence_linkage": "COVERAGE_GAP",
        }
        self.assertEqual(classify_conflict_record(record), "RETRIEVAL_COVERAGE_GAP_ADVISORY")

    def test_classify_degraded_confirmed_with_coverage_gap_linkage(self) -> None:
        # If marked CONFIRMED_CONFLICT but linkage is COVERAGE_GAP, degrade
        record = {
            "conflict_detected": True,
            "status": "CONFIRMED_CONFLICT",
            "evidence_linkage": "COVERAGE_GAP",
        }
        self.assertEqual(classify_conflict_record(record), "RETRIEVAL_COVERAGE_GAP_ADVISORY")

    def test_classify_data_quality_advisory(self) -> None:
        record = {
            "conflict_detected": True,
            "status": "DATA_QUALITY_ADVISORY",
            "evidence_linkage": "NOT_APPLICABLE",
        }
        self.assertEqual(classify_conflict_record(record), "DATA_QUALITY_ADVISORY")

    def test_classify_no_conflict_detected_by_rule(self) -> None:
        record = {
            "conflict_detected": False,
            "status": "NO_CONFLICT_DETECTED_BY_RULE",
            "evidence_linkage": "NOT_APPLICABLE",
        }
        self.assertEqual(classify_conflict_record(record), "NO_CONFLICT_DETECTED_BY_RULE")

    def test_classify_legacy_payload_missing_status(self) -> None:
        # Legacy record with conflict_detected=True, missing status
        legacy_active = {
            "conflict_detected": True,
            "conflict_type": "legacy drug interaction",
            "severity": "high",
        }
        # MUST be classified as UNKNOWN_STATUS_CONFLICT - never verified, never safe!
        cat = classify_conflict_record(legacy_active)
        self.assertEqual(cat, "UNKNOWN_STATUS_CONFLICT")
        self.assertNotEqual(cat, "CONFIRMED_CONFLICT")
        self.assertNotEqual(cat, "NO_CONFLICT_DETECTED_BY_RULE")

        # Legacy record with conflict_detected=False, missing status
        legacy_inactive = {
            "conflict_detected": False,
            "conflict_type": "none",
        }
        self.assertEqual(classify_conflict_record(legacy_inactive), "NO_CONFLICT_DETECTED_BY_RULE")

    def test_patient_summary_wording_confirmed_conflict(self) -> None:
        patient = {"age": 68, "sex": "Female", "diseases": ["Type 2 diabetes", "CKD stage 3"]}
        conflicts = [{
            "conflict_detected": True,
            "status": "CONFIRMED_CONFLICT",
            "evidence_linkage": "VERIFIED",
            "provenance": VALID_PROVENANCE_SAMPLE,
        }]
        summary = build_patient_summary(patient, conflicts)
        self.assertIn("1 evidence-confirmed cross-silo conflict", summary)
        self.assertNotIn("retrieval coverage-gap", summary)
        self.assertNotIn("data-quality", summary)
        self.assertNotIn("0 cross-silo conflicts", summary)

    def test_patient_summary_wording_plural_confirmed_conflicts(self) -> None:
        patient = {"age": 68, "sex": "Female", "diseases": ["Type 2 diabetes"]}
        conflicts = [
            {"conflict_detected": True, "status": "CONFIRMED_CONFLICT", "evidence_linkage": "VERIFIED", "provenance": VALID_PROVENANCE_SAMPLE},
            {"conflict_detected": True, "status": "CONFIRMED_CONFLICT", "evidence_linkage": "VERIFIED", "provenance": VALID_PROVENANCE_SAMPLE},
        ]
        summary = build_patient_summary(patient, conflicts)
        self.assertIn("2 evidence-confirmed cross-silo conflicts", summary)

    def test_patient_summary_wording_coverage_gap_advisory(self) -> None:
        patient = {"age": 71, "sex": "Female", "diseases": ["Major depressive disorder", "AFib"]}
        conflicts = [{
            "conflict_detected": True,
            "status": "RETRIEVAL_COVERAGE_GAP_ADVISORY",
            "evidence_linkage": "COVERAGE_GAP",
        }]
        summary = build_patient_summary(patient, conflicts)
        self.assertIn("1 retrieval coverage-gap advisory", summary)
        self.assertNotIn("evidence-confirmed", summary)
        self.assertNotIn("0 cross-silo conflicts", summary)

    def test_patient_summary_wording_data_quality_advisory(self) -> None:
        patient = {"age": 55, "sex": "Male", "diseases": ["Hyperlipidemia"]}
        conflicts = [{
            "conflict_detected": True,
            "status": "DATA_QUALITY_ADVISORY",
            "evidence_linkage": "NOT_APPLICABLE",
        }]
        summary = build_patient_summary(patient, conflicts)
        self.assertIn("1 data-quality advisory", summary)
        self.assertNotIn("evidence-confirmed", summary)
        self.assertNotIn("0 cross-silo conflicts", summary)

    def test_patient_summary_wording_no_conflict_detected(self) -> None:
        patient = {"age": 62, "sex": "Male", "diseases": ["Type 2 diabetes"]}
        conflicts = [{
            "conflict_detected": False,
            "status": "NO_CONFLICT_DETECTED_BY_RULE",
            "evidence_linkage": "NOT_APPLICABLE",
        }]
        summary = build_patient_summary(patient, conflicts)
        self.assertIn("0 cross-silo conflicts detected under available evidence.", summary)
        self.assertNotIn("evidence-confirmed", summary)
        self.assertNotIn("advisory", summary)
        # Invariant: Must not claim patient is globally safe
        self.assertNotIn("patient is safe", summary.lower())
        self.assertNotIn("clinically validated safe", summary.lower())

    def test_patient_summary_wording_legacy_unverified_alert(self) -> None:
        patient = {"age": 60, "sex": "Male", "diseases": ["Heart failure"]}
        conflicts = [{
            "conflict_detected": True,
            "conflict_type": "legacy unclassified alert",
        }]
        summary = build_patient_summary(patient, conflicts)
        self.assertIn("1 unverified/legacy conflict alert", summary)
        self.assertNotIn("evidence-confirmed", summary)
        self.assertNotIn("0 cross-silo conflicts", summary)

    def test_patient_summary_wording_mixed_findings(self) -> None:
        patient = {"age": 75, "sex": "Female", "diseases": ["Hypertension", "CKD"]}
        conflicts = [
            {"conflict_detected": True, "status": "CONFIRMED_CONFLICT", "evidence_linkage": "VERIFIED", "provenance": VALID_PROVENANCE_SAMPLE},
            {"conflict_detected": True, "status": "RETRIEVAL_COVERAGE_GAP_ADVISORY", "evidence_linkage": "COVERAGE_GAP"},
        ]
        summary = build_patient_summary(patient, conflicts)
        self.assertIn("1 evidence-confirmed cross-silo conflict", summary)
        self.assertIn("1 retrieval coverage-gap advisory", summary)


class TestStrictConflictClassification(unittest.TestCase):
    """Targeted regression tests for Phase 3.2 strict evidence linkage classification."""

    def test_case_1_confirmed_status_verified_linkage(self) -> None:
        rec = {"conflict_detected": True, "status": "CONFIRMED_CONFLICT", "evidence_linkage": "VERIFIED", "provenance": VALID_PROVENANCE_SAMPLE}
        self.assertEqual(classify_conflict_record(rec), "CONFIRMED_CONFLICT")

    def test_case_2_confirmed_status_unspecified_linkage(self) -> None:
        rec = {"conflict_detected": True, "status": "CONFIRMED_CONFLICT", "evidence_linkage": "UNSPECIFIED"}
        self.assertEqual(classify_conflict_record(rec), "UNKNOWN_STATUS_CONFLICT")
        self.assertNotEqual(classify_conflict_record(rec), "CONFIRMED_CONFLICT")
        self.assertNotEqual(classify_conflict_record(rec), "RETRIEVAL_COVERAGE_GAP_ADVISORY")

    def test_case_3_confirmed_status_missing_linkage(self) -> None:
        rec = {"conflict_detected": True, "status": "CONFIRMED_CONFLICT"}
        self.assertEqual(classify_conflict_record(rec), "UNKNOWN_STATUS_CONFLICT")
        self.assertNotEqual(classify_conflict_record(rec), "CONFIRMED_CONFLICT")
        self.assertNotEqual(classify_conflict_record(rec), "RETRIEVAL_COVERAGE_GAP_ADVISORY")

    def test_case_4_confirmed_status_coverage_gap_linkage(self) -> None:
        rec = {"conflict_detected": True, "status": "CONFIRMED_CONFLICT", "evidence_linkage": "COVERAGE_GAP"}
        self.assertEqual(classify_conflict_record(rec), "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertNotEqual(classify_conflict_record(rec), "CONFIRMED_CONFLICT")

    def test_case_5_missing_status_active_legacy_alert(self) -> None:
        rec = {"conflict_detected": True, "conflict_type": "legacy alert"}
        self.assertEqual(classify_conflict_record(rec), "UNKNOWN_STATUS_CONFLICT")
        self.assertNotEqual(classify_conflict_record(rec), "CONFIRMED_CONFLICT")
        self.assertNotEqual(classify_conflict_record(rec), "NO_CONFLICT_DETECTED_BY_RULE")

    def test_case_6_unrecognized_status_string(self) -> None:
        rec_active = {"conflict_detected": True, "status": "RANDOM_UNRECOGNIZED_STATUS"}
        self.assertEqual(classify_conflict_record(rec_active), "UNKNOWN_STATUS_CONFLICT")
        rec_inactive = {"conflict_detected": False, "status": "RANDOM_UNRECOGNIZED_STATUS"}
        self.assertEqual(classify_conflict_record(rec_inactive), "NO_CONFLICT_DETECTED_BY_RULE")

    def test_case_7_data_quality_advisory(self) -> None:
        rec = {"conflict_detected": True, "status": "DATA_QUALITY_ADVISORY", "evidence_linkage": "NOT_APPLICABLE"}
        self.assertEqual(classify_conflict_record(rec), "DATA_QUALITY_ADVISORY")

    def test_case_8_no_conflict_status(self) -> None:
        rec_explicit = {"conflict_detected": False, "status": "NO_CONFLICT_DETECTED_BY_RULE"}
        self.assertEqual(classify_conflict_record(rec_explicit), "NO_CONFLICT_DETECTED_BY_RULE")
        rec_legacy = {"conflict_detected": False}
        self.assertEqual(classify_conflict_record(rec_legacy), "NO_CONFLICT_DETECTED_BY_RULE")

    def test_case_9_verified_only_exclusivity(self) -> None:
        records = [
            {"conflict_detected": True, "status": "CONFIRMED_CONFLICT", "evidence_linkage": "VERIFIED", "provenance": VALID_PROVENANCE_SAMPLE},
            {"conflict_detected": True, "status": "CONFIRMED_CONFLICT", "evidence_linkage": "UNSPECIFIED"},
            {"conflict_detected": True, "status": "CONFIRMED_CONFLICT"},
            {"conflict_detected": True, "status": "CONFIRMED_CONFLICT", "evidence_linkage": "COVERAGE_GAP"},
            {"conflict_detected": True, "conflict_type": "legacy"},
            {"conflict_detected": True, "status": "CUSTOM_ALERT"},
            {"conflict_detected": True, "status": "DATA_QUALITY_ADVISORY"},
            {"conflict_detected": False, "status": "NO_CONFLICT_DETECTED_BY_RULE"},
        ]
        verified_records = [r for r in records if classify_conflict_record(r) == "CONFIRMED_CONFLICT"]
        self.assertEqual(len(verified_records), 1, "Only record 1 with VERIFIED linkage and complete provenance may be confirmed")
        self.assertEqual(verified_records[0]["evidence_linkage"], "VERIFIED")

    def test_case_10_dynamic_specificity_report_format(self) -> None:
        import scripts.evaluate_benchmark as eval_script
        agg_a = {"reference_labeled_metrics": {"safety_violation_rate": 0.857, "safety_violations_count": 12, "high_risk_contraindication_violation_rate": 0.857, "high_risk_violations_count": 12, "conflict_detection_sensitivity": 0.0, "conflict_detection_specificity": 1.0, "arbitration_accuracy": 0.478, "context_precision": 0.053, "context_recall": 0.304}, "automated_telemetry_metrics": {"mean_evidence_grade": 0.773, "deterministic_stability": 1.0}}
        agg_b = {"reference_labeled_metrics": {"safety_violation_rate": 0.857, "safety_violations_count": 12, "high_risk_contraindication_violation_rate": 0.857, "high_risk_violations_count": 12, "conflict_detection_sensitivity": 0.0, "conflict_detection_specificity": 1.0, "arbitration_accuracy": 0.478, "context_precision": 0.053, "context_recall": 0.304}, "automated_telemetry_metrics": {"mean_evidence_grade": 0.752, "deterministic_stability": 1.0}}
        agg_c = {"reference_labeled_metrics": {"safety_violation_rate": 0.786, "safety_violations_count": 11, "high_risk_contraindication_violation_rate": 0.786, "high_risk_violations_count": 11, "conflict_detection_sensitivity": 1.0, "conflict_detection_specificity": 1.0, "arbitration_accuracy": 0.478, "context_precision": 0.053, "context_recall": 0.304}, "automated_telemetry_metrics": {"mean_evidence_grade": 0.757, "deterministic_stability": 1.0}, "status_aware_conflict_diagnostics": {"total_verified_conflicts_fired": 2, "total_coverage_gap_advisories_fired": 0, "total_data_quality_advisories_fired": 0, "total_unknown_alerts_fired": 21, "verified_only_sensitivity": 0.1429}}
        stats_path = os.path.join(WORKSPACE_ROOT, "evaluation_results", "statistical_analysis.json")
        if os.path.exists(stats_path):
            with open(stats_path, "r", encoding="utf-8") as f:
                stats = json.load(f)
        else:
            stats = {
                "dea_medrag_vs_single_agent": {
                    "mcnemar_safety_violations": {
                        "contingency_table": {"both_safe": 2, "base_only_violate": 1, "dea_only_violate": 0, "both_violate": 11},
                        "discordant_pairs": 1,
                        "p_value": 1.0,
                        "statistically_significant_at_05": False,
                    },
                    "wilcoxon_evidence_grade": {"non_zero_pairs": 6, "w_statistic": 6.0, "z_statistic": -0.9435, "p_value": 0.3454, "statistically_significant_at_05": False},
                },
                "dea_medrag_vs_naive_multi_agent": {
                    "mcnemar_safety_violations": {
                        "contingency_table": {"both_safe": 2, "base_only_violate": 1, "dea_only_violate": 0, "both_violate": 11},
                        "discordant_pairs": 1,
                        "p_value": 1.0,
                        "statistically_significant_at_05": False,
                    },
                    "wilcoxon_evidence_grade": {"non_zero_pairs": 4, "w_statistic": 3.0, "z_statistic": -0.7303, "p_value": 0.4652, "statistically_significant_at_05": False},
                },
            }
        bench = [{"case_id": f"C-{i}", "ground_truth": {"collision_classification": "TRUE_COLLISION"}} for i in range(14)] + [{"case_id": f"NC-{i}", "ground_truth": {"collision_classification": "NO_COLLISION"}} for i in range(7)] + [{"case_id": "AMB-1", "ground_truth": {"collision_classification": "POTENTIAL_COLLISION"}}, {"case_id": "AMB-2", "ground_truth": {"collision_classification": "POTENTIAL_COLLISION"}}]
        true_cases = [c for c in bench if c["ground_truth"]["collision_classification"] == "TRUE_COLLISION"]
        neg_cases = [c for c in bench if c["ground_truth"]["collision_classification"] == "NO_COLLISION"]
        pot_cases = [c for c in bench if c["ground_truth"]["collision_classification"] == "POTENTIAL_COLLISION"]
        report_md = eval_script.generate_markdown_report(bench, true_cases, pot_cases, neg_cases, agg_a, agg_b, agg_c, stats, [], {"evaluation_timestamp": "2026-10-09", "benchmark_version": "1.0", "platform_system": "Windows", "platform_release": "11", "chromadb_backend": "test", "dea_weights_active": DEA_WEIGHTS, "random_seed": None, "evidence_freeze_mechanism": "test", "external_api_status": "test"})
        self.assertIn("Negative Control Specificity (100.0%) Analysis", report_md)
        self.assertNotIn("Negative Control Specificity (0.0%) Analysis", report_md)
        self.assertIn("**100.0% Specificity** on negative controls", report_md)


class TestStrictProvenanceEnforcement(unittest.TestCase):
    """Phase 3.3 Stage 1 unit tests: strict 5-field provenance validation and classification."""

    def test_is_provenance_complete_valid(self) -> None:
        rec = {"provenance": VALID_PROVENANCE_SAMPLE}
        self.assertTrue(is_provenance_complete(rec))

    def test_is_provenance_complete_with_optional_fields(self) -> None:
        extended_prov = {
            **VALID_PROVENANCE_SAMPLE,
            "section": "Contraindications and Warnings",
            "url": "https://dailymed.nlm.nih.gov/lookup/123",
        }
        self.assertTrue(is_provenance_complete({"provenance": extended_prov}))

    def test_is_provenance_complete_missing_fields(self) -> None:
        for field in ["source_id", "chunk_id", "source_title", "relevant_excerpt", "match_rationale"]:
            bad_prov = dict(VALID_PROVENANCE_SAMPLE)
            del bad_prov[field]
            self.assertFalse(is_provenance_complete({"provenance": bad_prov}), f"Expected False when {field} is missing")

    def test_is_provenance_complete_empty_strings(self) -> None:
        for field in ["source_id", "chunk_id", "source_title", "relevant_excerpt", "match_rationale"]:
            bad_prov = dict(VALID_PROVENANCE_SAMPLE)
            bad_prov[field] = ""
            self.assertFalse(is_provenance_complete({"provenance": bad_prov}), f"Expected False when {field} is empty string")

    def test_is_provenance_complete_whitespace_strings(self) -> None:
        for field in ["source_id", "chunk_id", "source_title", "relevant_excerpt", "match_rationale"]:
            bad_prov = dict(VALID_PROVENANCE_SAMPLE)
            bad_prov[field] = "   \t\n  "
            self.assertFalse(is_provenance_complete({"provenance": bad_prov}), f"Expected False when {field} is whitespace")

    def test_is_provenance_complete_non_string_fields(self) -> None:
        for val in [123, 45.6, True, None, ["chunk_1"], {"nested": "value"}]:
            bad_prov = dict(VALID_PROVENANCE_SAMPLE)
            bad_prov["chunk_id"] = val  # type: ignore[assignment]
            self.assertFalse(is_provenance_complete({"provenance": bad_prov}), f"Expected False when chunk_id is {type(val)}")

    def test_is_provenance_complete_malformed_provenance_object(self) -> None:
        self.assertFalse(is_provenance_complete({"provenance": None}))
        self.assertFalse(is_provenance_complete({"provenance": ""}))
        self.assertFalse(is_provenance_complete({"provenance": "string_provenance"}))
        self.assertFalse(is_provenance_complete({"provenance": 12345}))
        self.assertFalse(is_provenance_complete({"provenance": []}))
        self.assertFalse(is_provenance_complete({"provenance": {}}))
        self.assertFalse(is_provenance_complete({}))

    def test_classify_confirmed_conflict_requires_all_provenance_fields(self) -> None:
        for field in ["source_id", "chunk_id", "source_title", "relevant_excerpt", "match_rationale"]:
            bad_prov = dict(VALID_PROVENANCE_SAMPLE)
            del bad_prov[field]
            rec = {
                "conflict_detected": True,
                "status": "CONFIRMED_CONFLICT",
                "evidence_linkage": "VERIFIED",
                "conflict_type": "renal dosing limit",
                "provenance": bad_prov,
            }
            cat = classify_conflict_record(rec)
            self.assertEqual(cat, "UNKNOWN_STATUS_CONFLICT", f"Missing {field} must degrade to UNKNOWN_STATUS_CONFLICT")
            self.assertNotEqual(cat, "CONFIRMED_CONFLICT")
            self.assertNotEqual(cat, "NO_CONFLICT_DETECTED_BY_RULE")
            # Preserve original alert signal
            self.assertTrue(rec["conflict_detected"])

    def test_classify_confirmed_conflict_whitespace_provenance_degrades(self) -> None:
        bad_prov = dict(VALID_PROVENANCE_SAMPLE)
        bad_prov["relevant_excerpt"] = "   "
        rec = {
            "conflict_detected": True,
            "status": "CONFIRMED_CONFLICT",
            "evidence_linkage": "VERIFIED",
            "provenance": bad_prov,
        }
        self.assertEqual(classify_conflict_record(rec), "UNKNOWN_STATUS_CONFLICT")

    def test_classify_confirmed_conflict_null_or_missing_provenance_degrades(self) -> None:
        rec_missing = {
            "conflict_detected": True,
            "status": "CONFIRMED_CONFLICT",
            "evidence_linkage": "VERIFIED",
        }
        self.assertEqual(classify_conflict_record(rec_missing), "UNKNOWN_STATUS_CONFLICT")

        rec_null = {
            "conflict_detected": True,
            "status": "CONFIRMED_CONFLICT",
            "evidence_linkage": "VERIFIED",
            "provenance": None,
        }
        self.assertEqual(classify_conflict_record(rec_null), "UNKNOWN_STATUS_CONFLICT")

    def test_classify_confirmed_conflict_valid_complete_provenance_confirmed(self) -> None:
        rec = {
            "conflict_detected": True,
            "status": "CONFIRMED_CONFLICT",
            "evidence_linkage": "VERIFIED",
            "provenance": VALID_PROVENANCE_SAMPLE,
        }
        self.assertEqual(classify_conflict_record(rec), "CONFIRMED_CONFLICT")

    def test_legacy_active_alert_lacking_status_and_provenance(self) -> None:
        legacy = {
            "conflict_detected": True,
            "conflict_type": "legacy drug interaction",
            "severity": "high",
            "description": "Legacy alert without status or provenance",
        }
        cat = classify_conflict_record(legacy)
        self.assertEqual(cat, "UNKNOWN_STATUS_CONFLICT")
        self.assertNotEqual(cat, "CONFIRMED_CONFLICT")
        self.assertNotEqual(cat, "NO_CONFLICT_DETECTED_BY_RULE")
        self.assertTrue(legacy["conflict_detected"])


class TestRelationalMatcher(unittest.TestCase):
    """Positive, negative, negation, sentence-boundary, and unrelated-drug tests
    against the actual production find_evidence_chunk_match helper.
    """

    def test_positive_same_sentence_match(self) -> None:
        evidence = [{
            "chunk_id": "chunk_01",
            "title": "DailyMed Label",
            "chunk": "Concomitant administration of clarithromycin and colchicine is contraindicated in patients with renal impairment.",
        }]
        res = find_evidence_chunk_match(
            evidence,
            medication_terms=["colchicine"],
            hazard_terms=["clarithromycin"],
            relational_terms=["contraindicated"],
        )
        self.assertIsNotNone(res)
        chunk, excerpt = res
        self.assertEqual(chunk["chunk_id"], "chunk_01")
        self.assertIn("contraindicated", excerpt)
        self.assertIn("colchicine", excerpt)
        self.assertIn("clarithromycin", excerpt)

    def test_positive_bounded_window_match(self) -> None:
        evidence = [{
            "chunk_id": "chunk_win",
            "title": "Label Warning",
            "chunk": "Citalopram may cause dose-dependent QT prolongation. The maximum recommended dosage for patients greater than 60 years of age is 20 mg once daily.",
        }]
        res = find_evidence_chunk_match(
            evidence,
            medication_terms=["citalopram"],
            hazard_terms=["qt prolongation", "greater than 60 years of age", "20 mg once daily"],
            relational_terms=["not recommended", "warning", "maximum recommended"],
        )
        self.assertIsNotNone(res)
        _, excerpt = res
        self.assertIn("citalopram", excerpt.lower())
        self.assertIn("20 mg once daily", excerpt)

    def test_negative_no_hazard(self) -> None:
        evidence = [{
            "chunk_id": "chunk_02",
            "title": "DailyMed Label",
            "chunk": "Colchicine is indicated for prophylaxis of gout flares.",
        }]
        res = find_evidence_chunk_match(
            evidence,
            medication_terms=["colchicine"],
            hazard_terms=["clarithromycin"],
        )
        self.assertIsNone(res)

    def test_negative_no_relational_term(self) -> None:
        evidence = [{
            "chunk_id": "chunk_03",
            "title": "DailyMed Label",
            "chunk": "Patients took both colchicine and clarithromycin in the survey without other details.",
        }]
        res = find_evidence_chunk_match(
            evidence,
            medication_terms=["colchicine"],
            hazard_terms=["clarithromycin"],
        )
        self.assertIsNone(res)

    def test_negation_phrase_exclusion(self) -> None:
        for neg_phrase in [
            "was not associated with",
            "did not increase",
            "without risk of",
            "not contraindicated",
            "no clinically significant",
            "no evidence of",
        ]:
            evidence = [{
                "chunk_id": "chunk_neg",
                "title": "Label",
                "chunk": f"Concomitant therapy of drug_a and drug_b {neg_phrase} fatal toxicity or adverse interaction.",
            }]
            res = find_evidence_chunk_match(
                evidence,
                medication_terms=["drug_a"],
                hazard_terms=["drug_b"],
                relational_terms=["fatal", "adverse interaction", "toxicity"],
            )
            self.assertIsNone(res, f"Failed to filter out negation phrase: '{neg_phrase}'")

    def test_sentence_boundary_rejection(self) -> None:
        filler = "The patient was evaluated in the outpatient clinic on regular follow-up visits. " * 6
        evidence = [{
            "chunk_id": "chunk_distant",
            "title": "Clinical Summary",
            "chunk": f"The patient was prescribed colchicine 0.6 mg daily. {filler} Clarithromycin therapy is contraindicated with strong inhibitors.",
        }]
        res = find_evidence_chunk_match(
            evidence,
            medication_terms=["colchicine"],
            hazard_terms=["clarithromycin"],
            relational_terms=["contraindicated"],
        )
        self.assertIsNone(res, "Must not link across distant sentences without bounded window")

    def test_unrelated_comparator_drug_rejection(self) -> None:
        evidence = [{
            "chunk_id": "chunk_unrelated",
            "title": "Clarithromycin Label",
            "chunk": "Hypoglycemia and cardiac arrhythmias (e.g., torsades de pointes) have been observed with disopyramide.",
        }]
        res = find_evidence_chunk_match(
            evidence,
            medication_terms=["colchicine"],
            hazard_terms=["torsades de pointes", "arrhythmias"],
        )
        self.assertIsNone(res, "Must not verify hazard when target medication is absent from warning candidate")


class TestPhase33Stage2EvidenceGrounding(unittest.TestCase):
    """Acceptance tests for Phase 3.3 Stage 2 Evidence-Grounding Calibration.
    Validates Rules 2, 3, and 5 under verified vs coverage-gap evidence conditions.
    """

    @classmethod
    def setUpClass(cls) -> None:
        with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
            cls.benchmark_cases = {c["case_id"]: c for c in json.load(f)}
        with open(FROZEN_EVIDENCE_PATH, "r", encoding="utf-8") as f:
            cls.frozen_evidence = json.load(f)

    def test_col010_citalopram_exact_grounding(self) -> None:
        case = self.benchmark_cases["COL-010"]
        ev = self.frozen_evidence["COL-010"]["drug_evidence"]
        conflict = check_cardiac_safety(case["patient"], ev, "Citalopram")
        self.assertIsNotNone(conflict)
        self.assertEqual(conflict["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(conflict["evidence_linkage"], "VERIFIED")
        self.assertTrue(is_provenance_complete(conflict))
        prov = conflict["provenance"]
        self.assertIn("citalopram", prov["relevant_excerpt"].lower())
        self.assertIn("20 mg once daily", prov["relevant_excerpt"])
        # QTc > 500 ms treated as screening heuristic, not falsely attributed to label
        self.assertNotIn("500", prov["relevant_excerpt"])

        # Degradation to coverage gap when evidence is empty
        conflict_gap = check_cardiac_safety(case["patient"], [], "Citalopram")
        self.assertIsNotNone(conflict_gap)
        self.assertEqual(conflict_gap["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertEqual(conflict_gap["evidence_linkage"], "COVERAGE_GAP")
        self.assertIsNone(conflict_gap["provenance"])
        self.assertTrue(conflict_gap["conflict_detected"])

    def test_col006_colchicine_clarithromycin_exact_grounding(self) -> None:
        case = self.benchmark_cases["COL-006"]
        ev = self.frozen_evidence["COL-006"]["drug_evidence"]
        extracted_meds = rag_worker.extract_medications(case["patient"]["medications"])
        ddi_conflicts = detect_pairwise_drug_interactions(extracted_meds, ev)
        colchicine_ddi = next((c for c in ddi_conflicts if "Colchicine" in c.get("affected_treatment", "")), None)
        self.assertIsNotNone(colchicine_ddi)
        self.assertEqual(colchicine_ddi["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(colchicine_ddi["evidence_linkage"], "VERIFIED")
        self.assertTrue(is_provenance_complete(colchicine_ddi))
        prov = colchicine_ddi["provenance"]
        self.assertEqual(prov["source_id"], "dailymed:d5be5f12-6392-4d7d-ab23-ebc205ac1a85")
        self.assertIn("Life-threatening and fatal drug interactions", prov["relevant_excerpt"])

        # Degradation to coverage gap when evidence is empty
        ddi_gap = detect_pairwise_drug_interactions(extracted_meds, [])
        colchicine_gap = next((c for c in ddi_gap if "Colchicine" in c.get("affected_treatment", "")), None)
        self.assertIsNotNone(colchicine_gap)
        self.assertEqual(colchicine_gap["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertEqual(colchicine_gap["evidence_linkage"], "COVERAGE_GAP")
        self.assertIsNone(colchicine_gap["provenance"])

    def test_col013_nitrate_sildenafil_exact_grounding(self) -> None:
        case = self.benchmark_cases["COL-013"]
        ev = self.frozen_evidence["COL-013"]["drug_evidence"]
        extracted_meds = rag_worker.extract_medications(case["patient"]["medications"])
        ddi_conflicts = detect_pairwise_drug_interactions(extracted_meds, ev)
        pde5_ddi = next((c for c in ddi_conflicts if "PDE5" in c.get("affected_treatment", "")), None)
        self.assertIsNotNone(pde5_ddi)
        self.assertEqual(pde5_ddi["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(pde5_ddi["evidence_linkage"], "VERIFIED")
        self.assertTrue(is_provenance_complete(pde5_ddi))
        prov = pde5_ddi["provenance"]
        self.assertEqual(prov["source_id"], "dailymed:6a582db5-eb45-4320-98c1-55517d7d8c38")
        self.assertIn("Amplification of the vasodilatory effects", prov["relevant_excerpt"])

        # Degradation to coverage gap when evidence is empty
        ddi_gap = detect_pairwise_drug_interactions(extracted_meds, [])
        pde5_gap = next((c for c in ddi_gap if "PDE5" in c.get("affected_treatment", "")), None)
        self.assertIsNotNone(pde5_gap)
        self.assertEqual(pde5_gap["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertEqual(pde5_gap["evidence_linkage"], "COVERAGE_GAP")
        self.assertIsNone(pde5_gap["provenance"])

    def test_stage2_coverage_gap_cases_preserved(self) -> None:
        coverage_gap_cases = ["COL-004", "COL-005", "COL-009", "COL-011", "COL-012"]
        for cid in coverage_gap_cases:
            case = self.benchmark_cases[cid]
            ev = self.frozen_evidence[cid]["drug_evidence"]
            conflicts = detect_conflicts_python(
                case["patient"],
                {"recommendations": []},
                {"evidence": ev, "risk_level": "low"},
                {"alternative_treatments": [], "findings": []},
            )
            # Must preserve at least one active alert
            active_alerts = [c for c in conflicts if c.get("conflict_detected")]
            self.assertGreater(len(active_alerts), 0, f"Case {cid} lost its active alert")

            # In Stage 2 rules (DDI, Hepatic), the alert is RETRIEVAL_COVERAGE_GAP_ADVISORY
            gap_alerts = [
                c for c in active_alerts
                if c.get("status") == "RETRIEVAL_COVERAGE_GAP_ADVISORY"
                and c.get("evidence_linkage") == "COVERAGE_GAP"
            ]
            self.assertGreater(
                len(gap_alerts), 0,
                f"Case {cid} expected RETRIEVAL_COVERAGE_GAP_ADVISORY but found: {[c.get('status') for c in active_alerts]}",
            )
            for g in gap_alerts:
                self.assertEqual(classify_conflict_record(g), "RETRIEVAL_COVERAGE_GAP_ADVISORY")
                self.assertIsNone(g.get("provenance"))

    def test_stage2_isolated_verified_cases(self) -> None:
        """Verify that Stage 2 verified cases remain verified."""
        for cid in ["COL-006", "COL-010", "COL-013"]:
            case = self.benchmark_cases[cid]
            ev = self.frozen_evidence[cid]["drug_evidence"]
            conflicts = detect_conflicts_python(
                case["patient"],
                {"recommendations": []},
                {"evidence": ev, "risk_level": "low"},
                {"alternative_treatments": [], "findings": []},
            )
            verified = [c for c in conflicts if classify_conflict_record(c) == "CONFIRMED_CONFLICT"]
            self.assertGreater(len(verified), 0, f"Stage 2 case {cid} lost its verified status")

    def test_all_seven_negative_controls_clean(self) -> None:
        for i in range(1, 8):
            cid = f"NC-{i:03d}"
            case = self.benchmark_cases[cid]
            ev = self.frozen_evidence[cid]["drug_evidence"]
            conflicts = detect_conflicts_python(
                case["patient"],
                {"recommendations": []},
                {"evidence": ev, "risk_level": "low"},
                {"alternative_treatments": [], "findings": []},
            )
            self.assertEqual(len(conflicts), 1)
            rec = conflicts[0]
            self.assertFalse(rec.get("conflict_detected"))
            self.assertEqual(rec.get("status"), "NO_CONFLICT_DETECTED_BY_RULE")
            self.assertEqual(rec.get("evidence_linkage"), "NONE")
            self.assertEqual(classify_conflict_record(rec), "NO_CONFLICT_DETECTED_BY_RULE")

    def test_data_quality_advisory_separate_from_coverage_gap(self) -> None:
        patient_bad_alt = {
            "age": 60,
            "diseases": ["Hyperlipidemia"],
            "medications": ["Atorvastatin 40 mg daily"],
            "lab_values": {"ALT": "invalid_alt_text"},
        }
        conflicts = detect_conflicts_python(patient_bad_alt, {}, {"evidence": []}, {})
        dq_conflicts = [c for c in conflicts if c.get("conflict_type") == "hepatic restriction"]
        self.assertEqual(len(dq_conflicts), 1)
        dq = dq_conflicts[0]
        self.assertEqual(dq["status"], "DATA_QUALITY_ADVISORY")
        self.assertEqual(dq["evidence_linkage"], "DATA_QUALITY_GUARDRAIL")
        self.assertEqual(classify_conflict_record(dq), "DATA_QUALITY_ADVISORY")

    def test_preservation_invariants_strict(self) -> None:
        import hashlib
        with open(BENCHMARK_PATH, "rb") as f:
            bm_hash = hashlib.sha256(f.read()).hexdigest().upper()
        self.assertEqual(
            bm_hash,
            "230512E8BD3F4715DCA2F115D61FF66C8B5F1CDD8F985D990BFA6F8680CE1537",
            "Benchmark hash changed!",
        )

        with open(FROZEN_EVIDENCE_PATH, "rb") as f:
            fe_hash = hashlib.sha256(f.read()).hexdigest().upper()
        self.assertEqual(
            fe_hash,
            "FA0BDA48712510D81FA1228610994CECD09CEC4280C9F178A3DF26D49CC6AB15",
            "Frozen evidence hash changed!",
        )

        self.assertEqual(DEA_WEIGHTS, {"alpha": 0.35, "beta": 0.30, "gamma": 0.15, "delta": 0.20})


class TestPhase33Stage3RenalOrganCalibration(unittest.TestCase):
    """Exhaustive calibration, boundary, data quality, and provenance test suite for Stage 3."""

    @classmethod
    def setUpClass(cls) -> None:
        with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
            cls.cases_list = json.load(f)
        cls.cases = {c["case_id"]: c for c in cls.cases_list}
        with open(FROZEN_EVIDENCE_PATH, "r", encoding="utf-8") as f:
            cls.frozen = json.load(f)

    def _eval(self, case_id: str, drug_ev: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
        c = self.cases[case_id]
        ev = drug_ev if drug_ev is not None else self.frozen[case_id]["drug_evidence"]
        return detect_conflicts_python(
            c["patient"],
            {"recommendations": []},
            {"evidence": ev, "risk_level": "low"},
            {"alternative_treatments": [], "findings": []},
        )

    # ---------------------------------------------------------
    # COL-001: Metformin and severe renal impairment
    # ---------------------------------------------------------
    def test_col001_metformin_verified_exact_grounding(self) -> None:
        conflicts = self._eval("COL-001")
        met = next((c for c in conflicts if c.get("affected_treatment") == "metformin"), None)
        self.assertIsNotNone(met, "Metformin conflict must be generated")
        self.assertEqual(met["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(met["evidence_linkage"], "VERIFIED")
        self.assertEqual(met["severity"], "high")
        self.assertEqual(classify_conflict_record(met), "CONFIRMED_CONFLICT")
        self.assertTrue(is_provenance_complete(met))

        prov = met["provenance"]
        self.assertTrue(isinstance(prov, dict))
        self.assertIn("dailymed", prov["source_id"].lower())
        self.assertTrue(any(term in prov["relevant_excerpt"].lower() for term in ["30", "severe renal", "lactic acidosis"]))
        self.assertEqual(met["clinical_governance_status"], "ESTABLISHED_FDA_CONTRAINDICATION")

    def test_col001_metformin_boundaries(self) -> None:
        base_patient = self.cases["COL-001"]["patient"]
        ev = self.frozen["COL-001"]["drug_evidence"]

        # eGFR 29: severe contraindication boundary
        p29 = dict(base_patient, lab_values={"eGFR": "29 mL/min/1.73m²"})
        confs29 = detect_conflicts_python(p29, {}, {"evidence": ev}, {})
        c29 = next((c for c in confs29 if c.get("affected_treatment") == "metformin"), None)
        self.assertIsNotNone(c29)
        self.assertEqual(c29["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(c29["severity"], "high")

        # eGFR 30: moderate advisory lower boundary (without stage 4 CKD narrative)
        p30 = dict(base_patient, diseases=["Type 2 diabetes mellitus"], lab_values={"eGFR": "30 mL/min/1.73m²"})
        confs30 = detect_conflicts_python(p30, {}, {"evidence": ev}, {})
        c30 = next((c for c in confs30 if c.get("affected_treatment") == "metformin"), None)
        self.assertIsNotNone(c30)
        self.assertEqual(c30["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(c30["severity"], "moderate")
        self.assertEqual(c30["clinical_governance_status"], "CLINICAL_GUIDELINE_MONITORING_BAND")

        # eGFR 44: moderate advisory upper boundary
        p44 = dict(base_patient, diseases=["Type 2 diabetes mellitus"], lab_values={"eGFR": "44 mL/min/1.73m²"})
        confs44 = detect_conflicts_python(p44, {}, {"evidence": ev}, {})
        c44 = next((c for c in confs44 if c.get("affected_treatment") == "metformin"), None)
        self.assertIsNotNone(c44)
        self.assertEqual(c44["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(c44["severity"], "moderate")

        # eGFR 45: safe threshold, no metformin conflict
        p45 = dict(base_patient, diseases=["Type 2 diabetes mellitus"], lab_values={"eGFR": "45 mL/min/1.73m²"})
        confs45 = detect_conflicts_python(p45, {}, {"evidence": ev}, {})
        c45 = [c for c in confs45 if c.get("affected_treatment") == "metformin" and c.get("conflict_detected")]
        self.assertEqual(len(c45), 0)

    def test_col001_metformin_missing_evidence_coverage_gap(self) -> None:
        conflicts = self._eval("COL-001", drug_ev=[])
        met = next((c for c in conflicts if c.get("affected_treatment") == "metformin"), None)
        self.assertIsNotNone(met)
        self.assertEqual(met["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertEqual(met["evidence_linkage"], "COVERAGE_GAP")
        self.assertIsNone(met["provenance"])
        self.assertEqual(classify_conflict_record(met), "RETRIEVAL_COVERAGE_GAP_ADVISORY")

    def test_col001_metformin_data_quality_guardrail(self) -> None:
        base_patient = self.cases["COL-001"]["patient"]
        ev = self.frozen["COL-001"]["drug_evidence"]

        # Malformed eGFR string
        p_malformed = dict(base_patient, lab_values={"eGFR": "stage four impairment"})
        confs_mal = detect_conflicts_python(p_malformed, {}, {"evidence": ev}, {})
        dq_mal = next((c for c in confs_mal if c.get("affected_treatment") == "metformin"), None)
        self.assertIsNotNone(dq_mal)
        self.assertEqual(dq_mal["status"], "DATA_QUALITY_ADVISORY")
        self.assertEqual(dq_mal["evidence_linkage"], "DATA_QUALITY_GUARDRAIL")
        self.assertEqual(classify_conflict_record(dq_mal), "DATA_QUALITY_ADVISORY")

        # Incompatible units (e.g. U/L instead of mL/min/1.73m2)
        p_incomp = dict(base_patient, lab_values={"eGFR": "22 U/L"})
        confs_inc = detect_conflicts_python(p_incomp, {}, {"evidence": ev}, {})
        dq_inc = next((c for c in confs_inc if c.get("affected_treatment") == "metformin"), None)
        self.assertIsNotNone(dq_inc)
        self.assertEqual(dq_inc["status"], "DATA_QUALITY_ADVISORY")
        self.assertEqual(dq_inc["evidence_linkage"], "DATA_QUALITY_GUARDRAIL")

    # ---------------------------------------------------------
    # COL-007: Nitrofurantoin in renal impairment
    # ---------------------------------------------------------
    def test_col007_nitrofurantoin_verified_exact_grounding(self) -> None:
        conflicts = self._eval("COL-007")
        nitro = next((c for c in conflicts if c.get("affected_treatment") == "nitrofurantoin"), None)
        self.assertIsNotNone(nitro, "Nitrofurantoin conflict must be generated")
        self.assertEqual(nitro["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(nitro["evidence_linkage"], "VERIFIED")
        self.assertEqual(nitro["severity"], "high")
        self.assertEqual(classify_conflict_record(nitro), "CONFIRMED_CONFLICT")
        self.assertTrue(is_provenance_complete(nitro))

        prov = nitro["provenance"]
        self.assertTrue(isinstance(prov, dict))
        self.assertIn("creatinine clearance under 60", prov["relevant_excerpt"].lower())
        self.assertEqual(nitro["label_threshold"], "CrCl < 60 mL/min")
        self.assertEqual(nitro["guideline_threshold"], "CrCl < 30 mL/min")
        self.assertEqual(nitro["clinical_governance_status"], "FDA_LABEL_CRCL_60_AND_BEERS_CRCL_30_CONSENSUS")

    def test_col007_nitrofurantoin_boundaries(self) -> None:
        base_patient = self.cases["COL-007"]["patient"]
        ev = self.frozen["COL-007"]["drug_evidence"]

        # CrCl 29: high severity under both Beers and FDA label
        p29 = dict(base_patient, diseases=["Acute cystitis"], lab_values={"CrCl": "29 mL/min"})
        confs29 = detect_conflicts_python(p29, {}, {"evidence": ev}, {})
        c29 = next((c for c in confs29 if c.get("affected_treatment") == "nitrofurantoin"), None)
        self.assertIsNotNone(c29)
        self.assertEqual(c29["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(c29["severity"], "high")

        # CrCl 30: moderate severity advisory (FDA label restriction, Beers exception)
        p30 = dict(base_patient, diseases=["Acute cystitis"], lab_values={"CrCl": "30 mL/min"})
        confs30 = detect_conflicts_python(p30, {}, {"evidence": ev}, {})
        c30 = next((c for c in confs30 if c.get("affected_treatment") == "nitrofurantoin"), None)
        self.assertIsNotNone(c30)
        self.assertEqual(c30["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(c30["severity"], "moderate")
        self.assertEqual(c30["clinical_governance_status"], "FDA_LABEL_RESTRICTION_WITH_GUIDELINE_EXCEPTION")

        # CrCl 59: moderate severity advisory
        p59 = dict(base_patient, diseases=["Acute cystitis"], lab_values={"CrCl": "59 mL/min"})
        confs59 = detect_conflicts_python(p59, {}, {"evidence": ev}, {})
        c59 = next((c for c in confs59 if c.get("affected_treatment") == "nitrofurantoin"), None)
        self.assertIsNotNone(c59)
        self.assertEqual(c59["severity"], "moderate")

        # CrCl 60: normal clearance, safe
        p60 = dict(base_patient, diseases=["Acute cystitis"], lab_values={"CrCl": "60 mL/min"})
        confs60 = detect_conflicts_python(p60, {}, {"evidence": ev}, {})
        c60 = [c for c in confs60 if c.get("affected_treatment") == "nitrofurantoin" and c.get("conflict_detected")]
        self.assertEqual(len(c60), 0)

    def test_col007_nitrofurantoin_data_quality_guardrail(self) -> None:
        base_patient = self.cases["COL-007"]["patient"]
        ev = self.frozen["COL-007"]["drug_evidence"]

        p_bad = dict(base_patient, lab_values={"CrCl": "unmeasured clearance"})
        confs = detect_conflicts_python(p_bad, {}, {"evidence": ev}, {})
        dq = next((c for c in confs if c.get("affected_treatment") == "nitrofurantoin"), None)
        self.assertIsNotNone(dq)
        self.assertEqual(dq["status"], "DATA_QUALITY_ADVISORY")
        self.assertEqual(dq["evidence_linkage"], "DATA_QUALITY_GUARDRAIL")

    # ---------------------------------------------------------
    # COL-008: Spironolactone with baseline hyperkalemia
    # ---------------------------------------------------------
    def test_col008_spironolactone_verified_exact_grounding(self) -> None:
        conflicts = self._eval("COL-008")
        spiro = next((c for c in conflicts if c.get("affected_treatment") == "spironolactone"), None)
        self.assertIsNotNone(spiro, "Spironolactone conflict must be generated")
        self.assertEqual(spiro["status"], "CONFIRMED_CONFLICT")
        self.assertEqual(spiro["evidence_linkage"], "VERIFIED")
        self.assertEqual(spiro["severity"], "high")
        self.assertEqual(classify_conflict_record(spiro), "CONFIRMED_CONFLICT")
        self.assertTrue(is_provenance_complete(spiro))

        prov = spiro["provenance"]
        self.assertTrue(isinstance(prov, dict))
        self.assertIn("hyperkalemia", prov["relevant_excerpt"].lower())
        self.assertEqual(spiro["label_criterion"], "Qualitative hyperkalemia contraindication (DailyMed Section 4)")
        self.assertIn("K+ > 5.0 mEq/L", spiro["guideline_threshold"])
        self.assertEqual(spiro["clinical_governance_status"], "FDA_LABEL_CONTRAINDICATION_WITH_GUIDELINE_THRESHOLD")

    def test_col008_spironolactone_boundaries(self) -> None:
        base_patient = self.cases["COL-008"]["patient"]
        ev = self.frozen["COL-008"]["drug_evidence"]

        # K+ 5.1 with eGFR 58 (normal renal): triggers strictly on potassium
        p51 = dict(base_patient, diseases=["Heart failure with reduced ejection fraction"], lab_values={"potassium": "5.1 mEq/L", "eGFR": "58 mL/min/1.73m²"})
        confs51 = detect_conflicts_python(p51, {}, {"evidence": ev}, {})
        c51 = next((c for c in confs51 if c.get("affected_treatment") == "spironolactone"), None)
        self.assertIsNotNone(c51)
        self.assertEqual(c51["status"], "CONFIRMED_CONFLICT")
        self.assertIn("potassium > 5.0", c51["description"])

        # K+ 5.0 with normal renal: boundary, does NOT exceed 5.0
        p50 = dict(base_patient, diseases=["Heart failure with reduced ejection fraction"], lab_values={"potassium": "5.0 mEq/L", "eGFR": "58 mL/min/1.73m²"})
        confs50 = detect_conflicts_python(p50, {}, {"evidence": ev}, {})
        c50 = [c for c in confs50 if c.get("affected_treatment") == "spironolactone" and c.get("conflict_detected")]
        self.assertEqual(len(c50), 0)

        # K+ 4.2 with eGFR 58 (NC-002 profile): safe concordant
        p42 = dict(base_patient, diseases=["Heart failure with reduced ejection fraction"], lab_values={"potassium": "4.2 mEq/L", "eGFR": "58 mL/min/1.73m²"})
        confs42 = detect_conflicts_python(p42, {}, {"evidence": ev}, {})
        c42 = [c for c in confs42 if c.get("affected_treatment") == "spironolactone" and c.get("conflict_detected")]
        self.assertEqual(len(c42), 0)

    def test_col008_spironolactone_data_quality_guardrail(self) -> None:
        base_patient = self.cases["COL-008"]["patient"]
        ev = self.frozen["COL-008"]["drug_evidence"]

        # Incompatible units for potassium (e.g. mg/dL instead of mEq/L)
        p_incomp = dict(base_patient, lab_values={"potassium": "5.4 mg/dL", "eGFR": "28 mL/min/1.73m²"})
        confs = detect_conflicts_python(p_incomp, {}, {"evidence": ev}, {})
        dq = next((c for c in confs if c.get("affected_treatment") == "spironolactone"), None)
        self.assertIsNotNone(dq)
        self.assertEqual(dq["status"], "DATA_QUALITY_ADVISORY")
        self.assertEqual(dq["evidence_linkage"], "DATA_QUALITY_GUARDRAIL")

    # ---------------------------------------------------------
    # COL-002: Naproxen in HFrEF (Coverage Gap Preservation)
    # ---------------------------------------------------------
    def test_col002_naproxen_coverage_gap_preserved(self) -> None:
        conflicts = self._eval("COL-002")
        nsaid = next((c for c in conflicts if c.get("affected_treatment") == "naproxen"), None)
        self.assertIsNotNone(nsaid, "Naproxen alert must be preserved")
        self.assertEqual(nsaid["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertEqual(nsaid["evidence_linkage"], "COVERAGE_GAP")
        self.assertIsNone(nsaid["provenance"])
        self.assertEqual(classify_conflict_record(nsaid), "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertIn("prescribing information monograph is absent", nsaid["missing_evidence_reason"])

    # ---------------------------------------------------------
    # COL-003: Dabigatran in ESRD/Hemodialysis (Coverage Gap Preservation)
    # ---------------------------------------------------------
    def test_col003_dabigatran_coverage_gap_preserved(self) -> None:
        conflicts = self._eval("COL-003")
        dabi = next((c for c in conflicts if c.get("affected_treatment") == "dabigatran"), None)
        self.assertIsNotNone(dabi, "Dabigatran alert must be preserved")
        self.assertEqual(dabi["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertEqual(dabi["evidence_linkage"], "COVERAGE_GAP")
        self.assertIsNone(dabi["provenance"])
        self.assertEqual(classify_conflict_record(dabi), "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertIn("prescribing information monograph is absent", dabi["missing_evidence_reason"])

    def test_col003_dabigatran_boundaries(self) -> None:
        base_patient = self.cases["COL-003"]["patient"]
        ev = self.frozen["COL-003"]["drug_evidence"]

        # CrCl 14: severe clearance failure contraindication
        p14 = dict(base_patient, diseases=["Non-valvular atrial fibrillation"], lab_values={"CrCl": "14 mL/min"})
        confs14 = detect_conflicts_python(p14, {}, {"evidence": ev}, {})
        c14 = next((c for c in confs14 if c.get("affected_treatment") == "dabigatran"), None)
        self.assertIsNotNone(c14)
        self.assertEqual(c14["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")

        # CrCl 15: boundary, safe from absolute CrCl < 15 contraindication
        p15 = dict(base_patient, diseases=["Non-valvular atrial fibrillation"], lab_values={"CrCl": "15 mL/min"})
        confs15 = detect_conflicts_python(p15, {}, {"evidence": ev}, {})
        c15 = [c for c in confs15 if c.get("affected_treatment") == "dabigatran" and c.get("conflict_detected")]
        self.assertEqual(len(c15), 0)

    # ---------------------------------------------------------
    # COL-014: Diltiazem in HFrEF (Coverage Gap Preservation)
    # ---------------------------------------------------------
    def test_col014_diltiazem_coverage_gap_preserved(self) -> None:
        conflicts = self._eval("COL-014")
        ccb = next((c for c in conflicts if c.get("affected_treatment") == "diltiazem"), None)
        self.assertIsNotNone(ccb, "Diltiazem alert must be preserved")
        self.assertEqual(ccb["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertEqual(ccb["evidence_linkage"], "COVERAGE_GAP")
        self.assertIsNone(ccb["provenance"])
        self.assertEqual(classify_conflict_record(ccb), "RETRIEVAL_COVERAGE_GAP_ADVISORY")
        self.assertIn("prescribing information monograph is absent", ccb["missing_evidence_reason"])

    def test_col014_diltiazem_boundaries(self) -> None:
        base_patient = self.cases["COL-014"]["patient"]
        ev = self.frozen["COL-014"]["drug_evidence"]

        # LVEF 39%: HFrEF contraindication (< 40%)
        p39 = dict(base_patient, diseases=["Atrial fibrillation"], lab_values={"LVEF": "39%"})
        confs39 = detect_conflicts_python(p39, {}, {"evidence": ev}, {})
        c39 = next((c for c in confs39 if c.get("affected_treatment") == "diltiazem"), None)
        self.assertIsNotNone(c39)
        self.assertEqual(c39["status"], "RETRIEVAL_COVERAGE_GAP_ADVISORY")

        # LVEF 40%: preserved ejection fraction, safe
        p40 = dict(base_patient, diseases=["Atrial fibrillation"], lab_values={"LVEF": "40%"})
        confs40 = detect_conflicts_python(p40, {}, {"evidence": ev}, {})
        c40 = [c for c in confs40 if c.get("affected_treatment") == "diltiazem" and c.get("conflict_detected")]
        self.assertEqual(len(c40), 0)

    def test_col014_diltiazem_data_quality_guardrail(self) -> None:
        base_patient = self.cases["COL-014"]["patient"]
        ev = self.frozen["COL-014"]["drug_evidence"]

        p_bad = dict(base_patient, lab_values={"LVEF": "22 mL/min"})
        confs = detect_conflicts_python(p_bad, {}, {"evidence": ev}, {})
        dq = next((c for c in confs if c.get("affected_treatment") == "diltiazem"), None)
        self.assertIsNotNone(dq)
        self.assertEqual(dq["status"], "DATA_QUALITY_ADVISORY")
        self.assertEqual(dq["evidence_linkage"], "DATA_QUALITY_GUARDRAIL")

    # ---------------------------------------------------------
    # Negative Controls (NC-001 through NC-007)
    # ---------------------------------------------------------
    def test_all_negative_controls_remain_100_percent_clean(self) -> None:
        for i in range(1, 8):
            cid = f"NC-{i:03d}"
            case = self.cases[cid]
            ev = self.frozen[cid]["drug_evidence"]
            confs = detect_conflicts_python(
                case["patient"],
                {"recommendations": []},
                {"evidence": ev, "risk_level": "low"},
                {"alternative_treatments": [], "findings": []},
            )
            self.assertEqual(len(confs), 1, f"Expected 1 record for {cid}, got {len(confs)}")
            r = confs[0]
            self.assertFalse(r.get("conflict_detected"), f"Negative control {cid} triggered a conflict")
            self.assertEqual(r.get("status"), "NO_CONFLICT_DETECTED_BY_RULE")
            self.assertEqual(r.get("evidence_linkage"), "NONE")
            self.assertEqual(classify_conflict_record(r), "NO_CONFLICT_DETECTED_BY_RULE")


if __name__ == "__main__":
    unittest.main()


