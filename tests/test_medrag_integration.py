"""Black-box and unit tests for the local Chroma-backed DEA-MedRAG pipeline.

Run black-box tests against a temporary API process with:
  MEDRAG_TEST_URL=http://127.0.0.1:8090 python -m unittest tests.test_medrag_integration

Run DEA unit tests without a live API:
  python -m unittest tests.test_medrag_integration.DEAUnitTests
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import unittest
from urllib.request import Request, urlopen


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_URL = os.environ.get("MEDRAG_TEST_URL", "http://127.0.0.1:8090")
WORKER = os.path.join(ROOT, "rag_worker.py")


def _find_python() -> str:
    """Cross-platform Python interpreter discovery.

    Priority:
    1. MEDRAG_PYTHON environment variable (user override)
    2. .venv/Scripts/python.exe  (Windows virtual environment)
    3. .venv/bin/python           (Unix virtual environment)
    4. .pythonlibs/bin/python     (Replit legacy path)
    5. sys.executable             (current interpreter — last resort)
    """
    env_python = os.environ.get("MEDRAG_PYTHON")
    if env_python:
        return env_python
    candidates = [
        os.path.join(ROOT, ".venv", "Scripts", "python.exe"),  # Windows venv
        os.path.join(ROOT, ".venv", "bin", "python"),           # Unix venv
        os.path.join(ROOT, ".pythonlibs", "bin", "python"),     # Replit legacy
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return sys.executable  # current interpreter — last resort


PYTHON = _find_python()


def worker(payload: dict) -> dict:
    process = subprocess.run(
        [PYTHON, WORKER],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=True,
        timeout=120,
    )
    response = json.loads(process.stdout.strip().splitlines()[-1])
    assert response["ok"], response
    return response["result"]


def request(path: str, method: str = "GET", payload: dict | None = None) -> dict | list:
    data = json.dumps(payload).encode() if payload is not None else None
    req = Request(
        f"{API_URL}{path}",
        data=data,
        method=method,
        headers={"content-type": "application/json"} if data else {},
    )
    with urlopen(req, timeout=120) as response:
        return json.loads(response.read())


PATIENT = {
    "age": 68,
    "sex": "Female",
    "diseases": ["Type 2 diabetes", "Chronic kidney disease, stage 3"],
    "medications": ["Metformin 500 mg twice daily"],
    "symptoms": ["Persistent hyperglycemia"],
    "lab_values": {"eGFR": "34 mL/min/1.73m\u00b2", "creatinine": "1.7 mg/dL"},
    "allergies": ["Penicillin"],
    "conditions": ["Synthetic demonstration case 02"],
}


class MedRAGIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._api_available = False
        try:
            req = Request(f"{API_URL}/api/health", headers={"content-type": "application/json"})
            with urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read())
                cls._api_available = (resp.status == 200 and data.get("status") == "ok")
        except Exception:
            cls._api_available = False

    def _require_api(self) -> None:
        if not getattr(self, "_api_available", False):
            self.skipTest(f"Live API server not running at {API_URL} (run with MEDRAG_TEST_URL)")

    def test_chroma_collections_and_live_counts(self) -> None:
        self._require_api()
        stats = request("/api/knowledge-stats")
        self.assertEqual(stats["database"], "ChromaDB PersistentClient")
        self.assertIn("all-MiniLM-L6-v2", stats["embedding_provider"])
        self.assertEqual(
            {s["collection"] for s in stats["silos"]},
            {"clinical_guidelines", "drug_information", "clinical_literature"},
        )
        for silo in stats["silos"]:
            self.assertGreaterEqual(silo["document_count"], 1)
            self.assertGreaterEqual(silo["chunk_count"], 1)

    def test_silo_isolation(self) -> None:
        expected = {
            "clinical": "clinical_guidelines",
            "drug": "drug_information",
            "literature": "clinical_literature",
        }
        for domain, collection in expected.items():
            result = worker(
                {
                    "action": "retrieve",
                    "domain": domain,
                    "query": "kidney medication safety treatment alternatives",
                    "top_k": 3,
                }
            )
            self.assertEqual(result["collection"], collection)
            self.assertTrue(result["results"])
            self.assertTrue(all(item["domain"] == domain for item in result["results"]))
            self.assertTrue(all(item["metadata"]["domain"] == domain for item in result["results"]))

    def test_chunking_and_persistent_ingestion(self) -> None:
        receipt = worker(
            {
                "action": "ingest",
                "title": "Synthetic integration test document",
                "domain": "clinical",
                "source": "SYNTHETIC INTEGRATION TEST",
                "year": 2026,
                "evidence_grade": 0.7,
                "risk_level": "low",
                "content": (
                    "First synthetic paragraph about monitoring renal function. "
                    "It is intentionally labelled for testing.\n\n"
                    "Second synthetic paragraph about medication reconciliation. "
                    "It should be represented as a separate chunk."
                ),
            }
        )
        self.assertEqual(receipt["status"], "indexed in persistent ChromaDB")
        self.assertGreaterEqual(receipt["chunk_count"], 2)

    def test_api_analysis_conflicts_traceability_and_determinism(self) -> None:
        self._require_api()
        first = request("/api/analyze", "POST", PATIENT)
        second = request("/api/analyze", "POST", PATIENT)
        self.assertEqual(first["mode"], "local-chroma-rag")
        self.assertTrue(first["retrieval_status"]["silo_isolation"])
        self.assertTrue(any(c["conflict_detected"] for c in first["conflicts"]))
        self.assertEqual(
            [c["score"] for c in first["dea"]["candidates"]],
            [c["score"] for c in second["dea"]["candidates"]],
        )
        self.assertEqual(
            [c["candidate"] for c in first["dea"]["candidates"]],
            [c["candidate"] for c in second["dea"]["candidates"]],
        )
        for domain in ("clinical", "drug", "literature"):
            self.assertTrue(first[domain]["evidence"])
            for evidence in first[domain]["evidence"]:
                self.assertTrue(evidence["source"])
                self.assertTrue(evidence["title"])
                self.assertTrue(evidence["chunk"])
                self.assertIn("similarity", evidence)
                self.assertIn("evidence_grade", evidence)
                self.assertIn("year", evidence)
                self.assertEqual(evidence["domain"], domain)
                self.assertEqual(evidence["metadata"]["domain"], domain)

    def test_dea_formula_and_existing_routes(self) -> None:
        self._require_api()
        self.assertEqual(request("/api/healthz")["status"], "ok")
        self.assertEqual(request("/api/health")["status"], "ok")
        self.assertEqual(len(request("/api/demo-cases")), 3)
        result = request("/api/analyze", "POST", PATIENT)
        weights = result["dea"]["weights"]
        for candidate in result["dea"]["candidates"]:
            expected = round(
                weights["alpha"] * candidate["q_grade"]
                + weights["beta"] * candidate["s_rel"]
                + weights["gamma"] * candidate["t_recent"]
                - weights["delta"] * candidate["p_risk"],
                3,
            )
            self.assertEqual(candidate["score"], expected)
        evaluation = request("/api/evaluate", "POST", {"dataset_name": "synthetic-conflict-v1"})
        self.assertIn("pending", evaluation["benchmark_status"])

    def test_python_dea_method_note_present(self) -> None:
        """DEA method_note must confirm Python DEA v1.0 (not TypeScript)."""
        self._require_api()
        result = request("/api/analyze", "POST", PATIENT)
        note = result["dea"]["method_note"]
        self.assertIn("Python DEA", note, "method_note must reference Python DEA")
        self.assertIn("no LLM", note, "method_note must confirm no LLM scoring")


# ---------------------------------------------------------------------------
# DEA UNIT TESTS — run directly against rag_worker.py with no live API needed
# ---------------------------------------------------------------------------

def _import_worker():
    """Import rag_worker as a module from ROOT without running main()."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("rag_worker", WORKER)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


class DEAUnitTests(unittest.TestCase):
    """Unit tests for the Python DEA engine (Phase 1).

    Synthetic evidence is used ONLY inside these isolated tests.
    The application retrieval path never uses synthetic evidence.
    """

    @classmethod
    def setUpClass(cls) -> None:
        cls.rw = _import_worker()

    # A: Q_grade computation ---------------------------------------------------

    def test_q_grade_A1_guideline(self) -> None:
        self.assertAlmostEqual(self.rw.compute_q_grade("guideline", "", ""), 0.82)

    def test_q_grade_A2_drug_label(self) -> None:
        self.assertAlmostEqual(self.rw.compute_q_grade("drug_label", "", ""), 0.75)

    def test_q_grade_A3_clinical_trial(self) -> None:
        self.assertAlmostEqual(self.rw.compute_q_grade("clinical_trial", "", ""), 0.65)

    def test_q_grade_A4_research_article_observational_hint(self) -> None:
        grade = self.rw.compute_q_grade("research_article", "Observational cohort study", "")
        self.assertAlmostEqual(grade, 0.52)

    def test_q_grade_A5_research_article_rct_hint(self) -> None:
        grade = self.rw.compute_q_grade(
            "research_article",
            "A randomized controlled trial of metformin in CKD",
            "",
        )
        self.assertAlmostEqual(grade, 0.78)

    def test_q_grade_A6_systematic_review_via_title(self) -> None:
        grade = self.rw.compute_q_grade(
            "research_article",
            "Systematic review of SGLT2 inhibitors in type 2 diabetes",
            "",
        )
        self.assertAlmostEqual(grade, 0.92)

    def test_q_grade_A7_unknown_defaults_to_0_50(self) -> None:
        self.assertAlmostEqual(self.rw.compute_q_grade("unknown", "", ""), 0.50)

    # B: P_risk extraction ------------------------------------------------------

    def test_p_risk_B1_contraindication_severity(self) -> None:
        sev, flag, contra = self.rw.extract_risk_severity(
            "Contraindications: this drug is contraindicated in severe renal impairment."
        )
        self.assertEqual(sev, "contraindication")
        self.assertTrue(flag)
        self.assertTrue(contra)

    def test_p_risk_B2_high_boxed_warning(self) -> None:
        sev, flag, contra = self.rw.extract_risk_severity(
            "BOXED WARNING: serious adverse events have been reported."
        )
        self.assertEqual(sev, "high")
        self.assertTrue(flag)
        self.assertFalse(contra)

    def test_p_risk_B3_moderate_warning(self) -> None:
        sev, flag, _ = self.rw.extract_risk_severity(
            "WARNING: use with caution in renal impairment."
        )
        self.assertEqual(sev, "moderate")
        self.assertTrue(flag)

    def test_p_risk_B4_low_monitor(self) -> None:
        sev, flag, _ = self.rw.extract_risk_severity(
            "Monitor renal function periodically during treatment."
        )
        self.assertEqual(sev, "low")
        self.assertTrue(flag)

    def test_p_risk_B5_none(self) -> None:
        sev, flag, _ = self.rw.extract_risk_severity(
            "This drug is effective for treatment of type 2 diabetes."
        )
        self.assertEqual(sev, "none")
        self.assertFalse(flag)

    def test_p_risk_B6_compute_contraindication_dominates(self) -> None:
        """Contraindication evidence must yield p_risk = 0.90 regardless of other signals."""
        drug_evidence = [
            {"risk_severity": "low"},
            {"risk_severity": "contraindication"},
            {"risk_severity": "moderate"},
        ]
        self.assertAlmostEqual(self.rw.compute_p_risk_from_evidence(drug_evidence), 0.90)

    def test_p_risk_B7_no_evidence_uses_default(self) -> None:
        p_risk = self.rw.compute_p_risk_from_evidence([])
        self.assertAlmostEqual(p_risk, self.rw.DEFAULT_P_RISK_NO_EVIDENCE)

    def test_p_risk_B8_moderate_evidence(self) -> None:
        self.assertAlmostEqual(
            self.rw.compute_p_risk_from_evidence([{"risk_severity": "low"}, {"risk_severity": "moderate"}]),
            0.55,
        )

    # C: V_score formula --------------------------------------------------------

    def test_v_score_C1_exact_formula(self) -> None:
        q, s, t, p = 0.82, 0.75, 0.70, 0.55
        expected = round(0.35 * q + 0.30 * s + 0.15 * t - 0.20 * p, 3)
        self.assertEqual(self.rw.calculate_dea_score(q, s, t, p), expected)

    def test_v_score_C2_weights_unchanged(self) -> None:
        w = self.rw.DEA_WEIGHTS
        self.assertAlmostEqual(w["alpha"], 0.35)
        self.assertAlmostEqual(w["beta"],  0.30)
        self.assertAlmostEqual(w["gamma"], 0.15)
        self.assertAlmostEqual(w["delta"], 0.20)

    # D: Ranking ----------------------------------------------------------------

    def test_ranking_D1_sorted_by_score_descending(self) -> None:
        clinical = {
            "evidence": [{"evidence_grade": 0.82, "similarity": 0.70, "year": 2022}],
            "recommendations": ["Candidate A"],
            "source": "PubMed",
        }
        drug = {
            "evidence": [{"evidence_grade": 0.75, "similarity": 0.65, "year": 2021}],
            "drug": "Metformin", "source": "DailyMed", "year": 2021,
        }
        literature = {
            "evidence": [{"evidence_grade": 0.65, "similarity": 0.55, "year": 2020}],
            "alternative_treatments": ["Candidate B"],
            "source": "ClinicalTrials.gov",
        }
        candidates = self.rw.build_dea_candidates(clinical, drug, literature, p_risk=0.55)
        scores = [c["score"] for c in candidates]
        self.assertEqual(scores, sorted(scores, reverse=True), "Candidates must be sorted by score desc")
        self.assertEqual([c["ranking"] for c in candidates], list(range(1, len(candidates) + 1)))

    # E: Conflict handling ------------------------------------------------------

    def test_conflicts_E1_renal_drug_conflict_detected(self) -> None:
        patient = {
            "age": 68, "sex": "Female",
            "diseases": ["Type 2 diabetes", "Chronic kidney disease"],
            "medications": ["Metformin 500 mg"],
            "symptoms": [], "lab_values": {"eGFR": "34"}, "allergies": [], "conditions": [],
        }
        clinical = {"recommendations": ["Continue metformin"], "evidence": []}
        drug = {"drug": "Metformin", "risk_level": "moderate", "evidence": [], "interactions": []}
        literature = {"alternative_treatments": ["SGLT2 option"], "recommendations": []}
        conflicts = self.rw.detect_conflicts_python(patient, clinical, drug, literature)
        types = [c["conflict_type"] for c in conflicts]
        self.assertIn("drug-disease conflict", types)

    # F: Deterministic repeated execution ---------------------------------------

    def test_determinism_F1_repeated_dea_score(self) -> None:
        """Identical inputs must yield identical V_score on repeated calls (5x)."""
        for q, s, t, p in [(0.82, 0.71, 0.80, 0.55), (0.75, 0.60, 0.65, 0.90)]:
            scores = {self.rw.calculate_dea_score(q, s, t, p) for _ in range(5)}
            self.assertEqual(len(scores), 1, f"Non-deterministic V_score for ({q},{s},{t},{p})")

    def test_determinism_F2_candidate_order_stable(self) -> None:
        clinical = {
            "evidence": [{"evidence_grade": 0.82, "similarity": 0.70, "year": 2022}],
            "recommendations": ["Candidate stable"], "source": "PubMed",
        }
        drug = {
            "evidence": [{"evidence_grade": 0.75, "similarity": 0.65, "year": 2021}],
            "drug": "DrugX", "source": "DailyMed", "year": 2021,
        }
        literature = {"evidence": [], "alternative_treatments": []}
        first  = self.rw.build_dea_candidates(clinical, drug, literature, p_risk=0.30)
        second = self.rw.build_dea_candidates(clinical, drug, literature, p_risk=0.30)
        self.assertEqual(first, second)

    # G: Provenance preservation ------------------------------------------------

    def test_provenance_G1_enrich_promotes_identifier_url(self) -> None:
        raw = {
            "id": "pmid:12345678", "chunk": "Safe drug text.",
            "excerpt": "Safe drug text.", "source": "PubMed / NCBI",
            "title": "Test article", "page": 1, "year": 2022,
            "domain": "clinical", "evidence_grade": 0.0,
            "risk_level": "unknown", "similarity": 0.85,
            "metadata": {
                "source_type": "research_article",
                "identifier": "12345678",
                "url": "https://pubmed.ncbi.nlm.nih.gov/12345678/",
                "domain": "clinical",
            },
        }
        enriched = self.rw.enrich_evidence_item(raw, "clinical")
        self.assertEqual(enriched["identifier"], "12345678")
        self.assertEqual(enriched["url"], "https://pubmed.ncbi.nlm.nih.gov/12345678/")
        self.assertEqual(enriched["source_type"], "research_article")
        self.assertEqual(enriched["agent"], "clinical")
        self.assertTrue(enriched["claim"])
        self.assertLessEqual(len(enriched["claim"]), 200)

    def test_provenance_G2_q_grade_replaces_stored_zero(self) -> None:
        """evidence_grade=0.0 in stored metadata must be replaced by computed Q_grade."""
        raw = {
            "id": "test-01", "chunk": "Clinical guideline text.", "excerpt": "Clinical guideline text.",
            "source": "PubMed", "title": "Title", "page": 1, "year": 2021,
            "domain": "clinical", "evidence_grade": 0.0,
            "risk_level": "unknown", "similarity": 0.75,
            "metadata": {"source_type": "guideline", "domain": "clinical"},
        }
        enriched = self.rw.enrich_evidence_item(raw, "clinical")
        self.assertAlmostEqual(enriched["evidence_grade"], 0.82,
            msg="Guideline Q_grade must be 0.82, not the stored 0.0")

    # H: High-risk contraindication case ----------------------------------------

    def test_high_risk_H1_contraindication_penalty(self) -> None:
        """Contraindication p_risk (0.90) must produce a lower V_score than safe (0.10)."""
        q, s, t = 0.82, 0.70, 0.75
        score_safe   = self.rw.calculate_dea_score(q, s, t, p_risk=0.10)
        score_contra = self.rw.calculate_dea_score(q, s, t, p_risk=0.90)
        self.assertGreater(score_safe, score_contra)
        # Penalty = δ × (0.90 − 0.10) = 0.20 × 0.80 = 0.16
        self.assertAlmostEqual(round(score_safe - score_contra, 3), round(0.20 * 0.80, 3), places=3)

    def test_high_risk_H2_contraindication_sets_risk_flag(self) -> None:
        text = "CONTRAINDICATIONS: Do not use in patients with severe renal failure."
        sev, flag, contra = self.rw.extract_risk_severity(text)
        self.assertEqual(sev, "contraindication")
        self.assertTrue(flag)
        self.assertTrue(contra)


class MedicationExtractionTests(unittest.TestCase):
    """Unit and integration tests for general deterministic medication extraction & DailyMed retrieval."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.rw = _import_worker()

    def test_extract_01_one_medication(self) -> None:
        """Extract a single medication cleanly."""
        res = self.rw.extract_medications(["Metformin 500 mg twice daily"])
        self.assertEqual(res, ["metformin"])

    def test_extract_02_multiple_medications(self) -> None:
        """Extract multiple medications preserving order and deduplication."""
        res = self.rw.extract_medications([
            "Metformin 500 mg twice daily",
            "Lisinopril 10 mg daily",
            "Atorvastatin 20 mg",
        ])
        self.assertEqual(res, ["metformin", "lisinopril", "atorvastatin"])

    def test_extract_03_medication_with_dosage(self) -> None:
        """Normalize strength notations such as 500 mg, 10-20 mg, 5mg."""
        self.assertEqual(self.rw.extract_medications("Atorvastatin 20 mg"), ["atorvastatin"])
        self.assertEqual(self.rw.extract_medications("Lisinopril 10-20 mg"), ["lisinopril"])
        self.assertEqual(self.rw.extract_medications("Amlodipine besylate 5mg"), ["amlodipine"])

    def test_extract_04_medication_with_frequency(self) -> None:
        """Normalize dosing frequency: twice daily, BID, once daily, at bedtime."""
        self.assertEqual(self.rw.extract_medications("Apixaban 5 mg twice daily"), ["apixaban"])
        self.assertEqual(self.rw.extract_medications("Gabapentin 300 mg TID"), ["gabapentin"])
        self.assertEqual(self.rw.extract_medications("Insulin glargine 20 units at bedtime"), ["insulin glargine"])

    def test_extract_05_unknown_medication(self) -> None:
        """Uncertain, unidentifiable or placeholder text must return empty list."""
        self.assertEqual(self.rw.extract_medications("unknown medication"), [])
        self.assertEqual(self.rw.extract_medications("none reported"), [])
        self.assertEqual(self.rw.extract_medications("N/A"), [])

    def test_extract_06_no_medication_present(self) -> None:
        """Empty input or disease-only profile must return empty list and NEVER infer drugs."""
        self.assertEqual(self.rw.extract_medications([]), [])
        self.assertEqual(self.rw.extract_medications(""), [])
        # CRITICAL SAFETY: 'Patient has CKD and diabetes' must NEVER produce 'metformin'
        self.assertEqual(self.rw.extract_medications("Patient has CKD and diabetes"), [])
        self.assertEqual(
            self.rw.extract_medications({
                "diseases": ["Chronic kidney disease stage 4", "Type 2 diabetes"],
                "medications": [],
            }),
            [],
        )

    def test_extract_07_duplicate_medication_names(self) -> None:
        """Duplicate medication names in regimen must be deduplicated."""
        input_meds = ["Metformin 500 mg twice daily", "Metformin 1000 mg ER", "lisinopril 10 mg"]
        self.assertEqual(self.rw.extract_medications(input_meds), ["metformin", "lisinopril"])

    def test_extract_08_outside_nine_drug_whitelist(self) -> None:
        """Medications not in the legacy 9-drug whitelist must be extracted properly."""
        self.assertEqual(self.rw.extract_medications(["Empagliflozin 10 mg daily"]), ["empagliflozin"])
        self.assertEqual(self.rw.extract_medications(["Furosemide 40 mg PO daily"]), ["furosemide"])
        self.assertEqual(self.rw.extract_medications(["Dapagliflozin 10 mg"]), ["dapagliflozin"])

    def test_extract_09_multi_drug_narrative_and_profile(self) -> None:
        """Full multi-drug clinical narrative example from research specification."""
        narrative = (
            "65-year-old patient with diabetes and CKD stage 4. "
            "Current medications: metformin 500 mg twice daily, lisinopril 10 mg daily, atorvastatin 20 mg."
        )
        self.assertEqual(
            self.rw.extract_medications(narrative),
            ["metformin", "lisinopril", "atorvastatin"],
        )

    def test_extract_10_brand_generic_normalization(self) -> None:
        """Brand names and brand-parenthesized generic names are normalized."""
        self.assertEqual(self.rw.extract_medications("Glucophage (metformin) 500 mg"), ["metformin"])
        self.assertEqual(self.rw.extract_medications("Lipitor 20 mg"), ["lipitor"])

    def test_extract_11_first_drug_backward_compatibility(self) -> None:
        """first_drug helper returns first extracted drug dynamically without hardcoded list."""
        self.assertEqual(self.rw.first_drug("Empagliflozin 10 mg"), "empagliflozin")
        self.assertEqual(self.rw.first_drug("Patient has CKD and diabetes"), "")

    def test_dailymed_multi_drug_integration(self) -> None:
        """Multiple medications must independently retrieve multiple DailyMed records.

        Real biomedical evidence is retrieved from DailyMed NLM without synthetic data.
        """
        records = self.rw.dailymed_records(
            ["Metformin 500 mg twice daily", "Lisinopril 10 mg daily"],
            limit=2,
        )
        self.assertGreaterEqual(len(records), 2, "Expected at least 2 DailyMed records for 2 medications")
        titles = " ".join(r.get("title", "") for r in records).lower()
        self.assertIn("metformin", titles, "Expected metformin DailyMed evidence in records")
        self.assertIn("lisinopril", titles, "Expected lisinopril DailyMed evidence in records")
        for rec in records:
            self.assertEqual(rec["source"], "DailyMed / NLM")
            self.assertEqual(rec["source_type"], "drug_label")
            self.assertTrue(rec["identifier"], "Record must have DailyMed setid identifier")
            self.assertTrue(rec["url"].startswith("https://dailymed.nlm.nih.gov/"), "Record must have valid DailyMed URL")
            self.assertFalse(rec.get("synthetic", False), "Evidence must not be marked synthetic")
            self.assertTrue(rec.get("content"), "DailyMed record must contain extracted label text")


if __name__ == "__main__":
    unittest.main()