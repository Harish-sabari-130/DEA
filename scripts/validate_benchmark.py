#!/usr/bin/env python3
"""Validation suite for data/benchmarks/guideline_collision_v1.json.

Phase 2.2 - Step 2: Validate the materialized benchmark suite against
all methodological, clinical, schema, and safety invariants.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_PATH = ROOT / "data" / "benchmarks" / "guideline_collision_v1.json"

VALID_CLASSIFICATIONS = {"TRUE_COLLISION", "POTENTIAL_COLLISION", "NO_COLLISION", "INSUFFICIENT_EVIDENCE"}
VALID_COLLISION_TYPES = {"drug-disease", "drug-drug", "guideline-contraindication", "none"}
VALID_MECHANISMS = {
    "renal_clearance_failure",
    "fluid_retention_hemodynamic",
    "cyp_inhibition_accumulation",
    "p_gp_inhibition_toxicity",
    "hyperkalemic_cardiotoxicity",
    "prolonged_qt_arrhythmia",
    "bleeding_cascade_potentiation",
    "vasodilatory_hypotension",
    "bronchospasm_respiratory",
    "hepatic_injury",
    "negative_inotropic_decompensation",
    "none",
}
VALID_SAFETY_LEVELS = {"high", "moderate", "low"}
VALID_VERIFICATION_STATUSES = {"SOURCE_VERIFIED", "SOURCE_NOT_VERIFIED", "INSUFFICIENT_EVIDENCE"}
CASE_ID_PATTERN = re.compile(r"^(COL|NC|AMB)-[0-9]{3}$")

PATIENT_REQUIRED_FIELDS = ["age", "sex", "diseases", "medications", "symptoms", "lab_values", "allergies", "conditions"]
GROUND_TRUTH_REQUIRED_FIELDS = [
    "collision_classification",
    "has_collision",
    "collision_type",
    "collision_mechanism",
    "contraindicated_treatments",
    "contraindicated_tokens",
    "acceptable_pathways",
    "unacceptable_pathways",
    "target_safety_level",
    "clinical_rationale",
    "relevant_guideline_citations",
]
CITATION_REQUIRED_FIELDS = ["source", "identifier", "title", "url", "exact_evidence_section", "verification_status"]


class ValidationError(Exception):
    pass


def validate_case(case: dict[str, Any], index: int) -> None:
    case_id = case.get("case_id", f"INDEX_{index}")
    
    # 1. Top-level required keys
    for key in ["case_id", "category", "title", "clinical_scenario", "patient", "ground_truth"]:
        if key not in case:
            raise ValidationError(f"Case {case_id}: Missing top-level key '{key}'")
        if not case[key] and not isinstance(case[key], (int, bool)):
            raise ValidationError(f"Case {case_id}: Top-level key '{key}' is empty")

    # 2. Case ID format
    if not CASE_ID_PATTERN.match(case["case_id"]):
        raise ValidationError(f"Case {case_id}: Invalid case_id format '{case['case_id']}'")

    # 3. Patient profile
    patient = case["patient"]
    if not isinstance(patient, dict):
        raise ValidationError(f"Case {case_id}: 'patient' must be a dict")
    for field in PATIENT_REQUIRED_FIELDS:
        if field not in patient:
            raise ValidationError(f"Case {case_id}: Missing patient field '{field}'")
    if not isinstance(patient["age"], int) or not (18 <= patient["age"] <= 120):
        raise ValidationError(f"Case {case_id}: Invalid patient age '{patient.get('age')}'")
    if patient["sex"] not in {"Male", "Female"}:
        raise ValidationError(f"Case {case_id}: Invalid patient sex '{patient.get('sex')}'")
    if not isinstance(patient["diseases"], list) or len(patient["diseases"]) == 0:
        raise ValidationError(f"Case {case_id}: 'diseases' must be a non-empty list")
    if not isinstance(patient["medications"], list) or len(patient["medications"]) == 0:
        raise ValidationError(f"Case {case_id}: 'medications' must be a non-empty list")
    if not isinstance(patient["lab_values"], dict) or len(patient["lab_values"]) == 0:
        raise ValidationError(f"Case {case_id}: 'lab_values' must be a non-empty dict")

    # 4. Ground truth
    gt = case["ground_truth"]
    if not isinstance(gt, dict):
        raise ValidationError(f"Case {case_id}: 'ground_truth' must be a dict")
    for field in GROUND_TRUTH_REQUIRED_FIELDS:
        if field not in gt:
            raise ValidationError(f"Case {case_id}: Missing ground_truth field '{field}'")

    # Enums
    cls_status = gt["collision_classification"]
    if cls_status not in VALID_CLASSIFICATIONS:
        raise ValidationError(f"Case {case_id}: Invalid collision_classification '{cls_status}'")
    if gt["collision_type"] not in VALID_COLLISION_TYPES:
        raise ValidationError(f"Case {case_id}: Invalid collision_type '{gt['collision_type']}'")
    if gt["collision_mechanism"] not in VALID_MECHANISMS:
        raise ValidationError(f"Case {case_id}: Invalid collision_mechanism '{gt['collision_mechanism']}'")
    if gt["target_safety_level"] not in VALID_SAFETY_LEVELS:
        raise ValidationError(f"Case {case_id}: Invalid target_safety_level '{gt['target_safety_level']}'")

    # Class-specific invariants
    if cls_status == "TRUE_COLLISION":
        if not gt["has_collision"]:
            raise ValidationError(f"Case {case_id}: TRUE_COLLISION must have has_collision=True")
        if not gt["contraindicated_treatments"] or len(gt["contraindicated_treatments"]) == 0:
            raise ValidationError(f"Case {case_id}: TRUE_COLLISION must have non-empty contraindicated_treatments")
        if not gt["contraindicated_tokens"] or len(gt["contraindicated_tokens"]) == 0:
            raise ValidationError(f"Case {case_id}: TRUE_COLLISION must have non-empty contraindicated_tokens")
        if gt["target_safety_level"] != "high":
            raise ValidationError(f"Case {case_id}: TRUE_COLLISION must have target_safety_level='high'")
        if not gt["acceptable_pathways"] or len(gt["acceptable_pathways"]) == 0:
            raise ValidationError(f"Case {case_id}: TRUE_COLLISION must have non-empty acceptable_pathways")

    elif cls_status == "NO_COLLISION":
        if gt["has_collision"]:
            raise ValidationError(f"Case {case_id}: NO_COLLISION must have has_collision=False")
        if len(gt["contraindicated_treatments"]) != 0:
            raise ValidationError(f"Case {case_id}: NO_COLLISION must have empty contraindicated_treatments")
        if len(gt["contraindicated_tokens"]) != 0:
            raise ValidationError(f"Case {case_id}: NO_COLLISION must have empty contraindicated_tokens")
        if len(gt["unacceptable_pathways"]) != 0:
            raise ValidationError(f"Case {case_id}: NO_COLLISION must have empty unacceptable_pathways")
        if gt["collision_type"] != "none":
            raise ValidationError(f"Case {case_id}: NO_COLLISION must have collision_type='none'")
        if gt["collision_mechanism"] != "none":
            raise ValidationError(f"Case {case_id}: NO_COLLISION must have collision_mechanism='none'")
        if gt["target_safety_level"] != "low":
            raise ValidationError(f"Case {case_id}: NO_COLLISION must have target_safety_level='low'")

    elif cls_status == "POTENTIAL_COLLISION":
        if not gt["has_collision"]:
            raise ValidationError(f"Case {case_id}: POTENTIAL_COLLISION must have has_collision=True")
        if gt["target_safety_level"] != "moderate":
            raise ValidationError(f"Case {case_id}: POTENTIAL_COLLISION must have target_safety_level='moderate'")
        if not gt["acceptable_pathways"] or len(gt["acceptable_pathways"]) == 0:
            raise ValidationError(f"Case {case_id}: POTENTIAL_COLLISION must have non-empty acceptable_pathways")

    # 5. Citations verification
    citations = gt["relevant_guideline_citations"]
    if not isinstance(citations, list) or len(citations) == 0:
        raise ValidationError(f"Case {case_id}: Must have at least one citation")
    for cit in citations:
        for cfield in CITATION_REQUIRED_FIELDS:
            if cfield not in cit:
                raise ValidationError(f"Case {case_id}: Citation missing field '{cfield}'")
            if not cit[cfield]:
                raise ValidationError(f"Case {case_id}: Citation field '{cfield}' is empty")
        if cit["verification_status"] not in VALID_VERIFICATION_STATUSES:
            raise ValidationError(f"Case {case_id}: Invalid citation verification_status '{cit['verification_status']}'")
        if cit["verification_status"] != "SOURCE_VERIFIED":
            raise ValidationError(f"Case {case_id}: Citation is not SOURCE_VERIFIED ('{cit['identifier']}')")
        # Check against placeholder strings
        ident = cit["identifier"].lower()
        if any(bad in ident for bad in ["placeholder", "todo", "mock", "fake", "12345"]):
            raise ValidationError(f"Case {case_id}: Placeholder identifier detected: '{cit['identifier']}'")

    # 6. Content safety & copyright invariant: ensure no huge verbatim text dumps
    scenario_len = len(case["clinical_scenario"].split())
    if scenario_len > 300:
        raise ValidationError(f"Case {case_id}: Clinical scenario exceeds summary length ({scenario_len} words)")
    for text in [case["clinical_scenario"], gt["clinical_rationale"]]:
        if "synthetic demonstration" in text.lower() or "demo case" in text.lower():
            raise ValidationError(f"Case {case_id}: Synthetic demonstration text detected in ground truth")


def validate_benchmark(benchmark_path: Path) -> dict[str, Any]:
    print(f"Loading benchmark from: {benchmark_path}")
    if not benchmark_path.is_file():
        raise ValidationError(f"Benchmark file does not exist: {benchmark_path}")

    try:
        with open(benchmark_path, "r", encoding="utf-8") as f:
            cases = json.load(f)
    except Exception as e:
        raise ValidationError(f"JSON decoding error: {e}")

    if not isinstance(cases, list):
        raise ValidationError(f"Benchmark root must be a JSON array, got {type(cases).__name__}")

    total_cases = len(cases)
    if total_cases != 23:
        raise ValidationError(f"Expected exactly 23 cases, found {total_cases}")

    seen_ids: set[str] = set()
    counts = {
        "TRUE_COLLISION": 0,
        "POTENTIAL_COLLISION": 0,
        "NO_COLLISION": 0,
        "INSUFFICIENT_EVIDENCE": 0,
    }
    pubmed_identifiers: set[str] = set()
    dailymed_identifiers: set[str] = set()
    other_identifiers: set[str] = set()

    for idx, case in enumerate(cases):
        case_id = case.get("case_id")
        if not case_id:
            raise ValidationError(f"Index {idx}: Missing case_id")
        if case_id in seen_ids:
            raise ValidationError(f"Duplicate case_id found: '{case_id}'")
        seen_ids.add(case_id)

        validate_case(case, idx)
        classification = case["ground_truth"]["collision_classification"]
        counts[classification] += 1

        for cit in case["ground_truth"]["relevant_guideline_citations"]:
            source = cit["source"].lower()
            ident = cit["identifier"]
            if "pubmed" in source or ident.isdigit():
                pubmed_identifiers.add(ident)
            elif "daily" in source or re.match(r"^[0-9a-fA-F\-]{36}$", ident):
                dailymed_identifiers.add(ident)
            else:
                other_identifiers.add(ident)

    # Expected distributions
    if counts["TRUE_COLLISION"] != 14:
        raise ValidationError(f"Expected 14 TRUE_COLLISION cases, got {counts['TRUE_COLLISION']}")
    if counts["NO_COLLISION"] != 7:
        raise ValidationError(f"Expected 7 NO_COLLISION cases, got {counts['NO_COLLISION']}")
    if counts["POTENTIAL_COLLISION"] != 2:
        raise ValidationError(f"Expected 2 POTENTIAL_COLLISION cases, got {counts['POTENTIAL_COLLISION']}")
    if counts["INSUFFICIENT_EVIDENCE"] != 0:
        raise ValidationError(f"Expected 0 INSUFFICIENT_EVIDENCE cases, got {counts['INSUFFICIENT_EVIDENCE']}")

    results = {
        "total_cases": total_cases,
        "counts": counts,
        "unique_case_ids": len(seen_ids),
        "verified_pubmed_citations": sorted(pubmed_identifiers),
        "verified_pubmed_count": len(pubmed_identifiers),
        "verified_dailymed_citations": sorted(dailymed_identifiers),
        "verified_dailymed_count": len(dailymed_identifiers),
        "other_verified_citations": sorted(other_identifiers),
    }
    return results


def main() -> None:
    try:
        report = validate_benchmark(BENCHMARK_PATH)
        print("\n" + "=" * 60)
        print("[SUCCESS] BENCHMARK VALIDATION SUCCESSFUL")
        print("=" * 60)
        print(f"Total Cases Materialized: {report['total_cases']}")
        print(f"  * TRUE_COLLISION:      {report['counts']['TRUE_COLLISION']}")
        print(f"  * NO_COLLISION:        {report['counts']['NO_COLLISION']}")
        print(f"  * POTENTIAL_COLLISION: {report['counts']['POTENTIAL_COLLISION']}")
        print(f"  * INSUFFICIENT_EVIDENCE: {report['counts']['INSUFFICIENT_EVIDENCE']}")
        print(f"\nVerified Unique PubMed Identifiers ({report['verified_pubmed_count']}):")
        for pmid in report["verified_pubmed_citations"]:
            print(f"  - PMID: {pmid}")
        print(f"\nVerified Unique DailyMed Identifiers ({report['verified_dailymed_count']}):")
        for setid in report["verified_dailymed_citations"]:
            print(f"  - SetID: {setid}")
        if report["other_verified_citations"]:
            print(f"\nOther Verified Identifiers ({len(report['other_verified_citations'])}):")
            for oid in report["other_verified_citations"]:
                print(f"  - {oid}")
        print("\nAll schema and safety invariants verified.")
    except ValidationError as err:
        print(f"\n[VALIDATION ERROR]: {err}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
