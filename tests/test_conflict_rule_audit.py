#!/usr/bin/env python3
"""tests/test_conflict_rule_audit.py

Unit tests for Phase 2.5 diagnostic audit tools:
  - scripts/audit_conflict_rules.py
  - scripts/audit_dea_safety.py
"""

from __future__ import annotations

import json
import os
import unittest

from scripts.audit_conflict_rules import (
    RULE_DEFINITIONS,
    audit_case_conflict_rules,
    compute_rule_metrics,
    compute_overall_conflict_metrics,
)
from scripts.audit_dea_safety import (
    CASE_FAILURE_MODES,
    run_dea_safety_forensics,
)

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BENCHMARK_PATH = os.path.join(WORKSPACE_ROOT, "data", "benchmarks", "guideline_collision_v1.json")
FROZEN_EVIDENCE_PATH = os.path.join(WORKSPACE_ROOT, "data", "benchmarks", "frozen_evidence_v1.json")


class ConflictRuleAuditTests(unittest.TestCase):
    """Test suite for Phase 2.5 conflict rule and safety forensic tools."""

    @classmethod
    def setUpClass(cls) -> None:
        with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
            cls.bench_cases = json.load(f)
        with open(FROZEN_EVIDENCE_PATH, "r", encoding="utf-8") as f:
            cls.frozen_ev = json.load(f)

    def test_rule_definitions_count(self) -> None:
        """Verify that exactly 7 conflict rules are tracked."""
        self.assertEqual(len(RULE_DEFINITIONS), 7)
        rule_ids = [r["rule_id"] for r in RULE_DEFINITIONS]
        for i in range(1, 8):
            self.assertIn(f"rule_{i}", rule_ids)

    def test_audit_single_case_execution(self) -> None:
        """Verify conflict rule audit on a single collision case."""
        case_0 = self.bench_cases[0]
        cid = case_0["case_id"]
        audit = audit_case_conflict_rules(case_0, self.frozen_ev[cid])
        self.assertEqual(audit["case_id"], cid)
        self.assertIn("rule_results", audit)
        self.assertEqual(len(audit["rule_results"]), 7)
        self.assertTrue(audit["overall_conflict_detected"])

    def test_rule_metric_calculation(self) -> None:
        """Verify 2x2 confusion matrix math in compute_rule_metrics."""
        mock_audits = [
            {"classification": "TRUE_COLLISION", "rule_results": {"rule_1": {"fired": True}}},
            {"classification": "TRUE_COLLISION", "rule_results": {"rule_1": {"fired": False}}},
            {"classification": "NO_COLLISION", "rule_results": {"rule_1": {"fired": True}}},
            {"classification": "NO_COLLISION", "rule_results": {"rule_1": {"fired": False}}},
        ]
        metrics = compute_rule_metrics("rule_1", mock_audits)
        self.assertEqual(metrics["true_positives"], 1)
        self.assertEqual(metrics["false_negatives"], 1)
        self.assertEqual(metrics["false_positives"], 1)
        self.assertEqual(metrics["true_negatives"], 1)
        self.assertAlmostEqual(metrics["sensitivity"], 0.5)
        self.assertAlmostEqual(metrics["specificity"], 0.5)

    def test_dea_safety_forensics_execution(self) -> None:
        """Verify DEA safety forensics runner outputs valid records."""
        payload = run_dea_safety_forensics()
        self.assertEqual(payload["total_true_collision_cases"], 14)
        self.assertIn("total_safety_violations", payload)
        self.assertEqual(payload["total_safety_violations"], 0)
        self.assertEqual(payload["total_safe_cases"], 14)
        self.assertEqual(len(payload["forensics_records"]), 14)
        for rec in payload["forensics_records"]:
            self.assertIn("score_decomposition", rec)
            self.assertIn("competing_candidates", rec)
            self.assertEqual(len(rec["competing_candidates"]), 3)


if __name__ == "__main__":
    unittest.main()
