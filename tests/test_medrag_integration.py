"""Black-box tests for the local Chroma-backed DEA-MedRAG pipeline.

Run against a temporary API process with:
  MEDRAG_TEST_URL=http://127.0.0.1:8090 python -m unittest tests.test_medrag_integration
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
PYTHON = os.environ.get("MEDRAG_PYTHON", os.path.join(ROOT, ".pythonlibs", "bin", "python"))
WORKER = os.path.join(ROOT, "rag_worker.py")


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
    "lab_values": {"eGFR": "34 mL/min/1.73m²", "creatinine": "1.7 mg/dL"},
    "allergies": ["Penicillin"],
    "conditions": ["Synthetic demonstration case 02"],
}


class MedRAGIntegrationTests(unittest.TestCase):
    def test_chroma_collections_and_live_counts(self) -> None:
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
        for domain, agent in [
            ("clinical", "clinical_guidelines"),
            ("drug", "drug_information"),
            ("literature", "clinical_literature"),
        ]:
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


if __name__ == "__main__":
    unittest.main()