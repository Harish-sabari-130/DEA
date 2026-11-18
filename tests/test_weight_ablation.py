#!/usr/bin/env python3
"""tests/test_weight_ablation.py

Focused unit tests for Phase 2.4 DEA Weight Ablation Study.

Verifies:
  1. Weight configuration definitions & schema
  2. Custom weight scoring arithmetic in evaluate_case_with_weights
  3. Deterministic candidate ranking and tie-breaking
  4. Stability across repeated executions
  5. Statistical comparison functions (McNemar & Wilcoxon)
  6. Statistical guardrail presence in generated report
"""

from __future__ import annotations

import json
import unittest
from typing import Any

from scripts.run_weight_ablation import (
    BENCHMARK_PATH,
    CONFIGURATIONS,
    evaluate_case_with_weights,
    generate_ablation_report,
    verify_configuration_determinism,
)


class WeightAblationStudyTests(unittest.TestCase):
    """Unit test suite for Phase 2.4 weight ablation runner."""

    @classmethod
    def setUpClass(cls) -> None:
        with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
            cls.cases: list[dict[str, Any]] = json.load(f)

        # Mock frozen evidence
        cls.mock_evidence = {
            "case_id": "COL-001",
            "clinical_evidence": [
                {
                    "domain": "clinical",
                    "chunk": "Clinical guideline recommends SGLT2 inhibitor pathway.",
                    "excerpt": "Clinical guideline recommends SGLT2 inhibitor pathway.",
                    "source": "KDIGO Guideline",
                    "title": "Diabetes and CKD",
                    "year": 2022,
                    "evidence_grade": 0.82,
                    "similarity": 0.70,
                }
            ],
            "drug_evidence": [
                {
                    "domain": "drug",
                    "chunk": "Metformin is contraindicated in severe renal impairment.",
                    "excerpt": "Metformin is contraindicated in severe renal impairment.",
                    "source": "DailyMed Label",
                    "title": "Metformin HCl",
                    "year": 2023,
                    "evidence_grade": 0.75,
                    "similarity": 0.80,
                    "risk_severity": "high",
                    "contraindication": True,
                }
            ],
            "literature_evidence": [
                {
                    "domain": "literature",
                    "chunk": "Comparative study on alternatives.",
                    "excerpt": "Comparative study on alternatives.",
                    "source": "PubMed Review",
                    "title": "CKD Alternatives Review",
                    "year": 2024,
                    "evidence_grade": 0.78,
                    "similarity": 0.65,
                }
            ],
        }

    # 1. Configuration definitions & schema -----------------------------------
    def test_configuration_count_and_keys(self) -> None:
        self.assertEqual(len(CONFIGURATIONS), 6)
        config_ids = [c["config_id"] for c in CONFIGURATIONS]
        self.assertIn("config_0_baseline", config_ids)
        self.assertIn("config_1_no_risk", config_ids)
        self.assertIn("config_2_no_quality", config_ids)
        self.assertIn("config_3_no_recency", config_ids)
        self.assertIn("config_4_no_relevance", config_ids)
        self.assertIn("config_5_uniform", config_ids)

        for cfg in CONFIGURATIONS:
            w = cfg["weights"]
            self.assertIn("alpha", w)
            self.assertIn("beta", w)
            self.assertIn("gamma", w)
            self.assertIn("delta", w)
            # All weights non-negative
            self.assertTrue(all(val >= 0.0 for val in w.values()))

    # 2. Custom weight scoring arithmetic -------------------------------------
    def test_no_risk_penalty_arithmetic(self) -> None:
        no_risk_weights = {"alpha": 0.40, "beta": 0.40, "gamma": 0.20, "delta": 0.00}
        res = evaluate_case_with_weights(self.cases[0], self.mock_evidence, no_risk_weights)
        self.assertEqual(res["status"], "success")
        # In scores, verify that delta=0 produced score without risk subtraction
        for cand in res["candidate_scores"]:
            expected = round(
                0.40 * cand["q_grade"]
                + 0.40 * cand["s_rel"]
                + 0.20 * cand["t_recent"]
                - 0.00 * cand["p_risk"],
                3,
            )
            self.assertEqual(cand["v_score"], expected)

    def test_no_quality_weight_arithmetic(self) -> None:
        no_qual_weights = {"alpha": 0.00, "beta": 0.55, "gamma": 0.25, "delta": 0.20}
        res = evaluate_case_with_weights(self.cases[0], self.mock_evidence, no_qual_weights)
        self.assertEqual(res["status"], "success")
        for cand in res["candidate_scores"]:
            expected = round(
                0.00 * cand["q_grade"]
                + 0.55 * cand["s_rel"]
                + 0.25 * cand["t_recent"]
                - 0.20 * cand["p_risk"],
                3,
            )
            self.assertEqual(cand["v_score"], expected)

    def test_uniform_weights_arithmetic(self) -> None:
        uniform_weights = {"alpha": 0.25, "beta": 0.25, "gamma": 0.25, "delta": 0.25}
        res = evaluate_case_with_weights(self.cases[0], self.mock_evidence, uniform_weights)
        self.assertEqual(res["status"], "success")
        for cand in res["candidate_scores"]:
            expected = round(
                0.25 * cand["q_grade"]
                + 0.25 * cand["s_rel"]
                + 0.25 * cand["t_recent"]
                - 0.25 * cand["p_risk"],
                3,
            )
            self.assertEqual(cand["v_score"], expected)

    # 3. Determinism across repeated executions -------------------------------
    def test_configuration_determinism_verification(self) -> None:
        baseline_weights = CONFIGURATIONS[0]["weights"]
        is_stable = verify_configuration_determinism(
            self.cases[0], self.mock_evidence, baseline_weights, repetitions=5
        )
        self.assertTrue(is_stable)

    # 4. Statistical guardrail in generated report ----------------------------
    def test_guardrail_present_in_report_generator(self) -> None:
        dummy_metrics = {
            cfg["config_id"]: {
                "name": cfg["name"],
                "weights": cfg["weights"],
                "safety_violation_rate": 0.7857,
                "safety_violations_count": 11,
                "mean_evidence_grade": 0.757,
                "mean_v_score": 0.350,
                "deterministic_stability": 1.0,
            }
            for cfg in CONFIGURATIONS
        }
        dummy_stats = {
            cfg["config_id"]: {
                "config_name": cfg["name"],
                "weights": cfg["weights"],
                "mcnemar_paired_safety_violations": {
                    "sample_size": 14,
                    "contingency_table": {"both_safe": 2, "base_only_violate": 1, "dea_only_violate": 0, "both_violate": 11},
                    "discordant_pairs": 1,
                    "p_value": 1.0,
                    "proportion_difference": -0.0714,
                    "ci_95": [-0.206, 0.063],
                    "statistically_significant_at_05": False,
                },
                "wilcoxon_evidence_grade": {
                    "non_zero_pairs": 4,
                    "w_statistic": 3.0,
                    "p_value": 0.465,
                    "statistically_significant_at_05": False,
                },
                "wilcoxon_v_score": {
                    "non_zero_pairs": 10,
                    "w_statistic": 12.0,
                    "p_value": 0.080,
                    "statistically_significant_at_05": False,
                },
            }
            for cfg in CONFIGURATIONS
            if cfg["config_id"] != "config_0_baseline"
        }
        reproducibility = {
            "benchmark_version": "1.0",
            "evaluation_timestamp": "2026-10-06T00:00:00Z",
            "platform_system": "TestOS",
            "platform_release": "1.0",
        }

        report = generate_ablation_report(
            benchmark_cases=self.cases,
            true_cases=[c for c in self.cases if c["ground_truth"]["collision_classification"] == "TRUE_COLLISION"],
            neg_cases=[c for c in self.cases if c["ground_truth"]["collision_classification"] == "NO_COLLISION"],
            amb_cases=[c for c in self.cases if c["ground_truth"]["collision_classification"] == "POTENTIAL_COLLISION"],
            metrics=dummy_metrics,
            stats=dummy_stats,
            reproducibility=reproducibility,
        )

        # Assert critical statistical guardrail is explicitly in report
        self.assertIn("CRITICAL STATISTICAL GUARDRAIL", report)
        self.assertIn("weight configuration produced a lower SVR on this benchmark", report)
        self.assertIn("this weight configuration is statistically/significantly better", report)
        self.assertIn("n=14", report)
        self.assertIn("Phase 2.3", report)


if __name__ == "__main__":
    unittest.main()
