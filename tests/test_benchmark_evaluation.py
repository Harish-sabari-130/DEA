#!/usr/bin/env python3
"""tests/test_benchmark_evaluation.py

Unit tests for the Phase 2.3 benchmark evaluation runner.

Verifies:
  1. Benchmark loading
  2. Benchmark validation
  3. Negative-control handling
  4. TRUE_COLLISION handling
  5. POTENTIAL_COLLISION handling
  6. Token matching & normalization
  7. Unavailable evidence handling
  8. Deterministic stability calculation
  9. Metric calculations (Precision, Recall, SVR)
  10. Statistical test behavior (McNemar & Wilcoxon)
"""

from __future__ import annotations

import json
import os
import unittest
from typing import Any

from scripts.evaluate_benchmark import (
    BENCHMARK_PATH,
    check_safety_violation,
    compute_retrieval_metrics,
    evaluate_arm_a_single_agent,
    evaluate_arm_b_naive_multi_agent,
    evaluate_arm_c_dea_medrag,
    mcnemar_test_paired,
    normalize_text,
    test_deterministic_stability,
    wilcoxon_signed_rank_paired,
)
from scripts.validate_benchmark import validate_benchmark


class BenchmarkEvaluationRunnerTests(unittest.TestCase):
    """Focused unit tests for Phase 2.3 evaluation runner."""

    @classmethod
    def setUpClass(cls) -> None:
        with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
            cls.cases: list[dict[str, Any]] = json.load(f)

    # 1. Benchmark loading ----------------------------------------------------
    def test_benchmark_loading(self) -> None:
        self.assertEqual(len(self.cases), 23)
        for case in self.cases:
            self.assertIn("case_id", case)
            self.assertIn("patient", case)
            self.assertIn("ground_truth", case)

    # 2. Benchmark validation -------------------------------------------------
    def test_benchmark_validation(self) -> None:
        from pathlib import Path
        report = validate_benchmark(Path(BENCHMARK_PATH))
        self.assertEqual(report["total_cases"], 23)
        self.assertEqual(report["counts"]["TRUE_COLLISION"], 14)
        self.assertEqual(report["counts"]["NO_COLLISION"], 7)
        self.assertEqual(report["counts"]["POTENTIAL_COLLISION"], 2)

    # 3. Negative-control handling --------------------------------------------
    def test_negative_control_handling(self) -> None:
        neg_cases = [c for c in self.cases if c["ground_truth"]["collision_classification"] == "NO_COLLISION"]
        self.assertEqual(len(neg_cases), 7)
        for nc in neg_cases:
            self.assertFalse(nc["ground_truth"]["has_collision"])
            self.assertEqual(nc["ground_truth"]["contraindicated_tokens"], [])
            self.assertEqual(nc["ground_truth"]["unacceptable_pathways"], [])

    # 4. TRUE_COLLISION handling ----------------------------------------------
    def test_true_collision_handling(self) -> None:
        true_cases = [c for c in self.cases if c["ground_truth"]["collision_classification"] == "TRUE_COLLISION"]
        self.assertEqual(len(true_cases), 14)
        for tc in true_cases:
            self.assertTrue(tc["ground_truth"]["has_collision"])
            self.assertGreater(len(tc["ground_truth"]["contraindicated_tokens"]), 0)
            self.assertGreater(len(tc["ground_truth"]["unacceptable_pathways"]), 0)

    # 5. POTENTIAL_COLLISION handling -----------------------------------------
    def test_potential_collision_handling(self) -> None:
        pot_cases = [c for c in self.cases if c["ground_truth"]["collision_classification"] == "POTENTIAL_COLLISION"]
        self.assertEqual(len(pot_cases), 2)
        pot_ids = {c["case_id"] for c in pot_cases}
        self.assertEqual(pot_ids, {"AMB-001", "AMB-002"})

    # 6. Token matching & normalization ---------------------------------------
    def test_token_normalization(self) -> None:
        raw = "Metformin 1,000 mg (Glucophage); Daily!"
        norm = normalize_text(raw)
        self.assertEqual(norm, "metformin 1 000 mg glucophage daily")

    def test_token_matching_single_word(self) -> None:
        text = "Patient should continue Metformin pathway for diabetes."
        violation, details = check_safety_violation(text, ["metformin"], [])
        self.assertTrue(violation)
        self.assertTrue(any("metformin" in d for d in details))

    def test_token_matching_word_boundary(self) -> None:
        text = "Patient was prescribed something else."
        violation, _ = check_safety_violation(text, ["met"], [])
        self.assertFalse(violation)

    def test_token_matching_conjunction_combination(self) -> None:
        text = "Continue Lisinopril 40 mg and Losartan 100 mg combination."
        violation, details = check_safety_violation(text, ["lisinopril and losartan"], [])
        self.assertTrue(violation)
        self.assertTrue(any("lisinopril and losartan" in d for d in details))

    def test_unacceptable_pathway_matching(self) -> None:
        text = "Continue Metformin 1000 mg twice daily"
        violation, details = check_safety_violation(text, [], ["Continue Metformin 1000 mg twice daily"])
        self.assertTrue(violation)

    # 7. Unavailable evidence handling ----------------------------------------
    def test_unavailable_evidence_handling(self) -> None:
        empty_evidence = {
            "case_id": "COL-001",
            "clinical_evidence": [],
            "drug_evidence": [],
            "literature_evidence": [],
        }
        case = self.cases[0]

        arm_a = evaluate_arm_a_single_agent(case, empty_evidence)
        self.assertEqual(arm_a["status"], "unavailable_evidence")
        self.assertEqual(arm_a["s_rel"], 0.0)

        arm_b = evaluate_arm_b_naive_multi_agent(case, empty_evidence)
        self.assertEqual(arm_b["status"], "unavailable_evidence")
        self.assertEqual(arm_b["s_rel"], 0.0)

        arm_c = evaluate_arm_c_dea_medrag(case, empty_evidence)
        self.assertEqual(arm_c["status"], "unavailable_evidence")
        self.assertEqual(arm_c["v_score"], 0.0)

    # 8. Deterministic stability calculation ----------------------------------
    def test_deterministic_stability_calculation(self) -> None:
        # Construct mock frozen evidence with stable records
        mock_evidence = {
            "case_id": "COL-001",
            "clinical_evidence": [
                {
                    "domain": "clinical",
                    "chunk": "KDIGO guideline recommends SGLT2 inhibitors.",
                    "excerpt": "KDIGO guideline recommends SGLT2 inhibitors.",
                    "source": "KDIGO",
                    "title": "Diabetes CKD",
                    "year": 2022,
                    "evidence_grade": 0.82,
                    "similarity": 0.75,
                }
            ],
            "drug_evidence": [
                {
                    "domain": "drug",
                    "chunk": "Contraindicated in severe renal impairment.",
                    "excerpt": "Contraindicated in severe renal impairment.",
                    "source": "DailyMed",
                    "title": "Metformin Label",
                    "year": 2023,
                    "evidence_grade": 0.75,
                    "similarity": 0.70,
                    "risk_severity": "high",
                    "contraindication": True,
                }
            ],
            "literature_evidence": [
                {
                    "domain": "literature",
                    "chunk": "Trial of alternative therapy.",
                    "excerpt": "Trial of alternative therapy.",
                    "source": "PubMed",
                    "title": "CKD Alternatives",
                    "year": 2024,
                    "evidence_grade": 0.78,
                    "similarity": 0.65,
                }
            ],
        }
        is_stable = test_deterministic_stability(self.cases[0], mock_evidence, repetitions=5)
        self.assertTrue(is_stable)

    # 9. Metric calculations (Precision, Recall) ------------------------------
    def test_retrieval_metrics(self) -> None:
        case = self.cases[0]  # COL-001: has PubMed 36272764 and DailyMed 5866ca12...
        mock_evidence = {
            "clinical_evidence": [
                {"identifier": "36272764", "title": "KDIGO Guideline", "url": "https://pubmed.ncbi.nlm.nih.gov/36272764/"}
            ],
            "drug_evidence": [
                {"identifier": "5866ca12-a28f-cbe7-e063-6294a90acc69", "title": "METFORMIN", "url": "https://dailymed..."}
            ],
            "literature_evidence": [
                {"identifier": "99999999", "title": "Irrelevant paper", "url": "https://pubmed..."}
            ],
        }
        prec, rec = compute_retrieval_metrics(case, mock_evidence)
        self.assertAlmostEqual(prec, 2 / 3, places=2)
        self.assertAlmostEqual(rec, 1.0, places=2)

    # 10. Statistical test behavior -------------------------------------------
    def test_mcnemar_exact_binomial_calculation(self) -> None:
        # Baseline violates 5 times where DEA is safe; DEA violates 0 times where baseline is safe
        baseline_v = [True] * 5 + [False] * 5
        dea_v = [False] * 5 + [False] * 5
        result = mcnemar_test_paired(baseline_v, dea_v)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["discordant_pairs"], 5)
        self.assertLess(result["p_value"], 0.10)
        self.assertEqual(result["proportion_difference"], -0.50)

    def test_mcnemar_zero_discordant_pairs(self) -> None:
        baseline_v = [True, False, True]
        dea_v = [True, False, True]
        result = mcnemar_test_paired(baseline_v, dea_v)
        self.assertEqual(result["status"], "not applicable")
        self.assertEqual(result["statistic"], 0.0)
        self.assertEqual(result["p_value"], 1.0)

    def test_wilcoxon_signed_rank_paired_calculation(self) -> None:
        c_vals = [0.85, 0.80, 0.75, 0.70, 0.90]
        b_vals = [0.70, 0.65, 0.60, 0.55, 0.75]  # c consistently higher
        result = wilcoxon_signed_rank_paired(c_vals, b_vals)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["non_zero_pairs"], 5)
        self.assertEqual(result["w_minus"], 0.0)
        self.assertLess(result["p_value"], 0.05)

    def test_wilcoxon_zero_differences(self) -> None:
        vals = [0.75, 0.80, 0.85]
        result = wilcoxon_signed_rank_paired(vals, vals)
        self.assertEqual(result["status"], "not applicable")
        self.assertEqual(result["w_statistic"], 0.0)
        self.assertEqual(result["p_value"], 1.0)


if __name__ == "__main__":
    unittest.main()
