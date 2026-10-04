"""Local DEA-MedRAG retrieval worker.

This process is intentionally small and protocol-driven so the existing TypeScript API
can keep its public contract while the retrieval implementation runs in the Python
ecosystem. It uses ChromaDB's persisted client and its real all-MiniLM-L6-v2 embedding
function. Every stdout response is one JSON object; diagnostics belong on stderr.
"""

from __future__ import annotations

import base64
import concurrent.futures
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.etree import ElementTree

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - PDF support is reported in status
    PdfReader = None


ROOT = Path(__file__).resolve().parent
DATA_ROOT = Path(os.environ.get("MEDRAG_DATA_ROOT", ROOT / "data"))
DB_ROOT = Path(os.environ.get("MEDRAG_CHROMA_PATH", DATA_ROOT / "chroma"))
COLLECTIONS = {
    "clinical": "clinical_guidelines",
    "drug": "drug_information",
    "literature": "clinical_literature",
}
DOMAIN_BY_COLLECTION = {value: key for key, value in COLLECTIONS.items()}
EMBEDDING_MODEL = "all-MiniLM-L6-v2 via Chroma DefaultEmbeddingFunction"
LIVE_EVIDENCE = os.environ.get("MEDRAG_LIVE_EVIDENCE", "1").lower() not in {"0", "false", "no"}
_client: chromadb.PersistentClient | None = None
_embedding = None


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def public_json(url: str, timeout: float = 10.0) -> dict[str, Any]:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "DEA-MedRAG/1.0 research prototype"})
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def public_text(url: str, timeout: float = 10.0) -> str:
    request = Request(url, headers={"Accept": "text/plain, text/xml, application/xml", "User-Agent": "DEA-MedRAG/1.0 research prototype"})
    with urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", "replace")


def year_from_text(value: str | None) -> int | None:
    match = re.search(r"\b(19|20)\d{2}\b", value or "")
    return int(match.group(0)) if match else None


def first_drug(patient_or_query: str) -> str:
    known = (
        "metformin", "apixaban", "lisinopril", "amlodipine", "warfarin",
        "insulin", "atorvastatin", "hydrochlorothiazide", "losartan",
    )
    lower = patient_or_query.lower()
    return next((drug for drug in known if drug in lower), "")


def is_synthetic_metadata(metadata: dict[str, Any]) -> bool:
    source = str(metadata.get("source", "")).lower()
    return bool(metadata.get("synthetic")) or "synthetic" in source or "demo" in source


def compact_search_query(query: str) -> str:
    known_terms = (
        "diabetes", "kidney", "chronic kidney disease", "renal", "hypertension",
        "hyperlipidemia", "atrial fibrillation", "rheumatoid arthritis",
        "metformin", "apixaban", "lisinopril", "amlodipine", "warfarin",
        "insulin", "atorvastatin", "heart failure", "polypharmacy",
    )
    lower = query.lower()
    selected = []
    for term in known_terms:
        if term in lower and term not in selected:
            selected.append(term)
    if selected:
        return " ".join(selected)
    words = re.findall(r"[A-Za-z0-9]+", query)
    stopwords = {"recent", "comparative", "literature", "clinical", "guideline", "treatment", "pathways", "for", "and", "the", "with", "patient", "profile"}
    return " ".join(word for word in words if word.lower() not in stopwords)[:120]


# ============================================================
# DEA MODULE — Deterministic Epistemic Arbitration v1.0
# All scoring is deterministic; no LLM input; no random values.
# ============================================================

# --- DEA weights (do NOT change without updating DEA_IMPLEMENTATION.md) ---
DEA_WEIGHTS: dict[str, float] = {
    "alpha": 0.35,   # Evidence-quality weight   (Q_grade)
    "beta":  0.30,   # Semantic-relevance weight  (S_rel)
    "gamma": 0.15,   # Temporal-recency weight    (T_recent)
    "delta": 0.20,   # Patient-risk-penalty weight (P_risk)
}

DEA_METHOD_NOTE = (
    "V = (α × Q_grade) + (β × S_rel) + (γ × T_recent) − (δ × P_risk). "
    "α=0.35 β=0.30 γ=0.15 δ=0.20. "
    "Python DEA v1.0 — deterministic, no LLM scoring. "
    "Q_grade derived from a simplified Oxford CEBM evidence-level taxonomy. "
    "P_risk derived from drug-safety evidence text signals (regex-based). "
    "Tie-breaking is alphabetical on candidate text for strict reproducibility."
)

# --- Q_grade mapping (simplified Oxford CEBM taxonomy) ---
# Values are pre-assigned per source-type; no LLM grading.
# Keyword-based subtype detection refines "research_article" entries.
# See DEA_IMPLEMENTATION.md for full rationale and OCEBM references.
EVIDENCE_GRADE_BY_SOURCE_TYPE: dict[str, float] = {
    "systematic_review": 0.92,   # OCEBM Level 1 — systematic review / meta-analysis
    "meta_analysis":     0.92,   # OCEBM Level 1
    "guideline":         0.82,   # OCEBM Level 1–2 — evidence-synthesised CPG
    "rct":               0.78,   # OCEBM Level 2 — randomised controlled trial
    "drug_label":        0.75,   # Regulatory SPL (DailyMed) — Level 3 proxy
    "clinical_trial":    0.65,   # Registered trial (ClinicalTrials.gov) — Level 3
    "research_article":  0.55,   # Default PubMed article — Level 4
    "observational":     0.52,   # Cohort / case-control — Level 3–4
    "case_report":       0.38,   # OCEBM Level 5
    "unknown":           0.50,   # Unclassified evidence
}

EVIDENCE_LEVEL_LABELS: dict[str, str] = {
    "systematic_review": "Systematic review / meta-analysis",
    "meta_analysis":     "Systematic review / meta-analysis",
    "guideline":         "Clinical practice guideline",
    "rct":               "Randomised controlled trial",
    "drug_label":        "Regulatory drug label (DailyMed SPL)",
    "clinical_trial":    "Registered clinical trial (ClinicalTrials.gov)",
    "research_article":  "Peer-reviewed research article",
    "observational":     "Observational study",
    "case_report":       "Case report / case series",
    "unknown":           "Unclassified evidence",
}

# Title/abstract keyword hints — refine generic "research_article" entries
_SR_HINT_RE = re.compile(
    r"\b(systematic\s+review|meta.{0,5}analy|pooled\s+analy|cochrane)\b", re.I
)
_RCT_HINT_RE = re.compile(
    r"\b(random(is|iz)ed|randomis|randomiz|controlled\s+trial|RCT\b|double.{0,5}blind)\b", re.I
)
_OBS_HINT_RE = re.compile(
    r"\b(cohort|retrospective|prospective\s+study|observational|case.{0,5}control|cross.{0,5}section)\b",
    re.I,
)

# --- P_risk signal detection patterns (drug-safety evidence text) ---
# DailyMed SPL sections already pre-filtered for safety language in dailymed_records().
# These patterns scan that text to classify severity deterministically.
_CONTRAINDICATION_RE = re.compile(r"\bcontraindic", re.I)
_HIGH_RISK_RE = re.compile(
    r"\b(boxed?\s+warning|black.{0,5}box\s+warning|life.{0,10}threaten"
    r"|fatal(?:ity|ities)?|serious\s+adverse|severe\s+adverse)\b",
    re.I,
)
_MODERATE_RISK_RE = re.compile(
    r"\b(warning|precaution|caution|renal\s+impairment|hepatic\s+impairment"
    r"|dose\s+adjust|reduce\s+dose|not\s+recommended|avoid\s+in|avoid\s+with)\b",
    re.I,
)
_LOW_RISK_RE = re.compile(
    r"\b(monitor|adverse\s+reaction|side\s+effect|drug\s+interaction|concurrent\s+use)\b",
    re.I,
)

# Maps risk-severity label → P_risk float
P_RISK_BY_SEVERITY: dict[str, float] = {
    "contraindication": 0.90,
    "high":             0.75,
    "moderate":         0.55,
    "low":              0.30,
    "none":             0.10,
}
_SEVERITY_ORDER = ("none", "low", "moderate", "high", "contraindication")

# Default P_risk when no drug evidence is retrieved
DEFAULT_P_RISK_NO_EVIDENCE: float = 0.15


def compute_q_grade(source_type: str, title: str, text: str) -> float:
    """Return deterministic Q_grade ∈ [0, 1] from evidence source metadata.

    Primary lookup uses *source_type* against the OCEBM-derived table.
    For generic "research_article" entries a secondary keyword scan on
    *title* + first 500 chars of *text* refines the grade.

    No LLM is involved; the full mapping is documented in
    DEA_IMPLEMENTATION.md.
    """
    st = str(source_type or "unknown").lower().strip()
    if st == "research_article":
        combined = f"{title} {text[:500]}"
        if _SR_HINT_RE.search(combined):
            return EVIDENCE_GRADE_BY_SOURCE_TYPE["systematic_review"]
        if _RCT_HINT_RE.search(combined):
            return EVIDENCE_GRADE_BY_SOURCE_TYPE["rct"]
        if _OBS_HINT_RE.search(combined):
            return EVIDENCE_GRADE_BY_SOURCE_TYPE["observational"]
    return EVIDENCE_GRADE_BY_SOURCE_TYPE.get(st, EVIDENCE_GRADE_BY_SOURCE_TYPE["unknown"])


def extract_risk_severity(text: str) -> tuple[str, bool, bool]:
    """Classify risk severity from evidence text using ordered regex patterns.

    Returns:
        severity      – one of "none" | "low" | "moderate" | "high" | "contraindication"
        risk_flag     – True if any safety signal was detected
        contraindication – True only for explicit contraindication language
    """
    if _CONTRAINDICATION_RE.search(text):
        return "contraindication", True, True
    if _HIGH_RISK_RE.search(text):
        return "high", True, False
    if _MODERATE_RISK_RE.search(text):
        return "moderate", True, False
    if _LOW_RISK_RE.search(text):
        return "low", True, False
    return "none", False, False


def enrich_evidence_item(item: dict[str, Any], domain: str) -> dict[str, Any]:
    """Enrich a raw ChromaDB evidence dict with DEA-required structured fields.

    Adds:
    - ``evidence_grade`` – computed Q_grade (replaces stored 0.0)
    - ``evidence_level`` – human-readable OCEBM level label
    - ``source_type``    – from ChromaDB provenance metadata
    - ``identifier``     – PMID / NCT ID / DailyMed setid from metadata
    - ``url``            – source URL from metadata
    - ``agent``          – silo domain name
    - ``claim``          – first sentence of chunk (≤200 chars)
    - ``text``           – alias for chunk (structured evidence field)
    - ``risk_flag``      – True if any risk signal in text
    - ``risk_severity``  – "none"|"low"|"moderate"|"high"|"contraindication"
    - ``contraindication`` – True only when explicit contraindication found

    All pre-existing fields are preserved for backward compatibility.
    """
    metadata = item.get("metadata") or {}
    source_type = str(metadata.get("source_type") or "unknown").strip()
    identifier = metadata.get("identifier")
    url = metadata.get("url")
    title = str(item.get("title") or "")
    text = str(item.get("chunk") or item.get("excerpt") or "")

    q_grade = compute_q_grade(source_type, title, text)
    risk_severity, risk_flag, contraindication = extract_risk_severity(text)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    claim = sentences[0][:200].strip() if sentences else ""

    enriched = dict(item)
    enriched.update(
        {
            "source_type": source_type,
            "identifier": str(identifier) if identifier else None,
            "url": str(url) if url else None,
            "agent": domain,
            "claim": claim,
            "text": text,
            "evidence_level": EVIDENCE_LEVEL_LABELS.get(
                source_type, EVIDENCE_LEVEL_LABELS["unknown"]
            ),
            "evidence_grade": q_grade,       # replaces the stored 0.0
            "risk_flag": risk_flag,
            "risk_severity": risk_severity,
            "contraindication": contraindication,
        }
    )
    return enriched


def compute_p_risk_from_evidence(drug_evidence: list[dict[str, Any]]) -> float:
    """Compute P_risk from retrieved drug-safety evidence text signals.

    Algorithm:
      1. Scan all enriched drug evidence items for *risk_severity*.
      2. Take the maximum severity across all items.
      3. Map to a P_risk float via P_RISK_BY_SEVERITY.

    Returns float ∈ [0.0, 1.0].

    NOTE: This score reflects safety signals present in the *retrieved evidence*
    text, not a clinical determination of actual patient risk.  A qualified
    healthcare professional must review before any treatment decision.
    """
    if not drug_evidence:
        return DEFAULT_P_RISK_NO_EVIDENCE
    max_idx = 0
    for ev in drug_evidence:
        sev = str(ev.get("risk_severity", "none"))
        idx = _SEVERITY_ORDER.index(sev) if sev in _SEVERITY_ORDER else 0
        if idx > max_idx:
            max_idx = idx
    return P_RISK_BY_SEVERITY[_SEVERITY_ORDER[max_idx]]


def calculate_dea_score(
    q_grade: float,
    s_rel: float,
    t_recent: float,
    p_risk: float,
    weights: dict[str, float] | None = None,
) -> float:
    """Authoritative Python DEA V_score formula.

    V = (α × Q_grade) + (β × S_rel) + (γ × T_recent) − (δ × P_risk)
    α=0.35  β=0.30  γ=0.15  δ=0.20

    All inputs must be floats ∈ [0.0, 1.0].
    Result is rounded to 3 decimal places for stable comparison.
    No LLM; no random values.
    """
    w = weights or DEA_WEIGHTS
    value = (
        w["alpha"] * float(q_grade)
        + w["beta"] * float(s_rel)
        + w["gamma"] * float(t_recent)
        - w["delta"] * float(p_risk)
    )
    return round(value, 3)


def dea_recency(year: int | float) -> float:
    """Normalise publication year to a recency score ∈ [0.0, 1.0].

    Score = min(1.0, max(0.0, (year − 2010) / 20)).
    A document published in 2010 scores 0.0; one in 2030 scores 1.0.
    """
    return round(min(1.0, max(0.0, (float(year) - 2010.0) / 20.0)), 3)


def _ev_avg(items: list[dict[str, Any]], key: str, default: float = 0.0) -> float:
    """Mean of *key* across *items*; returns *default* for empty lists."""
    vals = [float(item.get(key, default)) for item in items if item]
    return round(sum(vals) / len(vals), 3) if vals else default


def _ev_max_year(items: list[dict[str, Any]]) -> int:
    years = [int(item.get("year", 0)) for item in items if item]
    return max(years) if years else 0


def build_dea_candidates(
    clinical: dict[str, Any],
    drug: dict[str, Any],
    literature: dict[str, Any],
    p_risk: float,
    weights: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """Build and score DEA treatment candidates from agent evidence outputs.

    One candidate is generated per non-empty agent silo (up to 3).
    All inputs (q_grade, s_rel, t_recent, p_risk) are derived from
    structured retrieved evidence — no LLM scoring.

    Sorted by V_score descending; alphabetical candidate-text tie-breaking
    guarantees identical ranking for identical evidence.
    """
    candidates: list[dict[str, Any]] = []

    if clinical.get("evidence"):
        clin_recs = clinical.get("recommendations") or []
        candidates.append(
            {
                "candidate": (
                    clin_recs[0]
                    if clin_recs
                    else "Clinical pathway review required"
                ),
                "q_grade": _ev_avg(clinical["evidence"], "evidence_grade"),
                "s_rel":   _ev_avg(clinical["evidence"], "similarity"),
                "t_recent": dea_recency(_ev_max_year(clinical["evidence"])),
                "p_risk":  round(float(p_risk), 3),
                "source":  clinical.get("source", ""),
                "domain":  "clinical",
                "evidence_count": len(clinical["evidence"]),
            }
        )

    if literature.get("evidence") and literature.get("alternative_treatments"):
        alts = literature["alternative_treatments"]
        candidates.append(
            {
                "candidate": alts[0] if alts else "Alternative treatment review",
                "q_grade": _ev_avg(literature["evidence"], "evidence_grade"),
                "s_rel":   _ev_avg(literature["evidence"], "similarity"),
                "t_recent": dea_recency(_ev_max_year(literature["evidence"])),
                "p_risk":  round(min(1.0, float(p_risk) * 0.4), 3),
                "source":  literature.get("source", ""),
                "domain":  "literature",
                "evidence_count": len(literature["evidence"]),
            }
        )

    if drug.get("evidence"):
        drug_ev = drug["evidence"]
        candidates.append(
            {
                "candidate": f"Continue {drug.get('drug', 'current medication')} pathway",
                "q_grade": _ev_avg(drug_ev, "evidence_grade"),
                "s_rel":   float(drug_ev[0].get("similarity", 0.0)) if drug_ev else 0.0,
                "t_recent": dea_recency(drug.get("year") or 0),
                "p_risk":  round(float(p_risk), 3),
                "source":  drug.get("source", ""),
                "domain":  "drug",
                "evidence_count": len(drug_ev),
            }
        )

    # Score all candidates with the Python DEA formula
    for c in candidates:
        c["score"] = calculate_dea_score(
            c["q_grade"], c["s_rel"], c["t_recent"], c["p_risk"], weights
        )
        c["ranking"] = 0

    # Deterministic sort: V_score descending; alphabetical tie-breaking
    candidates.sort(key=lambda c: (-c["score"], c["candidate"]))
    for i, c in enumerate(candidates):
        c["ranking"] = i + 1
    return candidates


def detect_conflicts_python(
    patient: dict[str, Any],
    clinical: dict[str, Any],
    drug: dict[str, Any],
    literature: dict[str, Any],
) -> list[dict[str, Any]]:
    """Rule-based cross-silo conflict detection.  Deterministic; no LLM.

    Implements the same seven conflict-detection rules as the TypeScript
    ``detectConflicts()`` function, ported to Python and enriched with
    evidence-text risk signals from the Drug Agent.

    Returns a list with at least one entry; if no rule fires the list
    contains a single ``conflict_detected: False`` record.
    """
    disease_text   = " ".join(patient.get("diseases", [])).lower()
    medication_text = " ".join(patient.get("medications", [])).lower()
    symptom_text   = " ".join(
        [*patient.get("symptoms", []), *patient.get("conditions", [])]
    ).lower()
    labs_text = json.dumps(patient.get("lab_values", {})).lower()

    renal   = bool(re.search(r"\b(kidney|ckd|renal|egfr)\b",        f"{disease_text} {labs_text}"))
    hepatic = bool(re.search(r"\b(liver|hepatic|ast\b|alt\b|bilirubin)\b", f"{disease_text} {labs_text}"))
    fall    = bool(re.search(r"\b(fall|dizz|bleed)\b",               symptom_text))

    full_med = f"{medication_text} {disease_text}"
    drug_risk_level = drug.get("risk_level", "low")
    drug_name       = drug.get("drug", "medication regimen")

    # Evidence-text interaction signal from Drug Agent
    drug_ev_text = " ".join(
        str(e.get("chunk") or e.get("excerpt") or "")
        for e in drug.get("evidence", [])
    ).lower()
    interaction_signal = bool(
        re.search(r"\b(interaction|concurrent|other agents)\b", drug_ev_text)
    )

    conflicts: list[dict[str, Any]] = []

    # Rule 1 — clinical recommendation vs high drug risk
    clin_recs_text = " ".join(clinical.get("recommendations", []))
    if (
        re.search(r"\b(sglt2|metformin|anticoag|lisinopril|treatment pathway)\b", clin_recs_text, re.I)
        and drug_risk_level == "high"
    ):
        conflicts.append({
            "conflict_detected": True,
            "conflict_type": "clinical recommendation vs high-risk medication",
            "severity": "high",
            "description": (
                "The clinical silo produced a treatment pathway while the drug-safety silo "
                "independently marked the reviewed exposure as high risk."
            ),
            "affected_treatment": drug_name,
            "risk_factor": "high patient-specific medication risk",
        })

    # Rule 2 — renal impairment AND renal-sensitive medication
    if renal and re.search(r"\b(metformin|apixaban|lisinopril)\b", full_med):
        conflicts.append({
            "conflict_detected": True,
            "conflict_type": "drug-disease conflict",
            "severity": "high" if drug_risk_level == "high" else "moderate",
            "description": (
                "Renal impairment was found in the structured profile and the drug silo "
                "returned a renal safety signal for the medication under review."
            ),
            "affected_treatment": drug_name,
            "risk_factor": "reduced renal function",
        })

    # Rule 3 — hepatic signal AND hepatically-cleared medication
    if hepatic and re.search(r"\b(apixaban|statin|atorvastatin|acetaminophen)\b", full_med):
        conflicts.append({
            "conflict_detected": True,
            "conflict_type": "hepatic restriction",
            "severity": "moderate",
            "description": (
                "The profile contains a hepatic restriction signal that requires "
                "clinician-led review of the medication evidence."
            ),
            "affected_treatment": drug_name,
            "risk_factor": "hepatic laboratory or disease signal",
        })

    # Rule 4 — allergy overlap
    for allergy in patient.get("allergies", []):
        if allergy.lower() in medication_text:
            conflicts.append({
                "conflict_detected": True,
                "conflict_type": "allergy conflict",
                "severity": "high",
                "description": (
                    "A listed allergy overlaps with the current medication text "
                    "and must be reconciled before interpretation."
                ),
                "affected_treatment": drug_name,
                "risk_factor": allergy,
            })
            break

    # Rule 5 — polypharmacy interaction signal
    if len(patient.get("medications", [])) > 1 and interaction_signal:
        conflicts.append({
            "conflict_detected": True,
            "conflict_type": "drug-drug interaction review",
            "severity": "moderate",
            "description": (
                "More than one medication is present and the drug silo returned "
                "an interaction or concurrent-medication signal."
            ),
            "affected_treatment": "polypharmacy regimen",
            "risk_factor": "multiple current medications",
        })

    # Rule 6 — fall/bleed AND high drug risk
    if fall and drug_risk_level == "high":
        conflicts.append({
            "conflict_detected": True,
            "conflict_type": "high-risk medication vs fall/bleeding signal",
            "severity": "high",
            "description": (
                "The profile includes fall, dizziness, or bleeding language and "
                "the drug-safety silo independently returned high patient-specific risk."
            ),
            "affected_treatment": drug_name,
            "risk_factor": "fall, dizziness, or bleeding history",
        })

    # Rule 7 — cross-silo treatment divergence
    clin_recs  = clinical.get("recommendations", [])
    lit_alts   = literature.get("alternative_treatments", [])
    if lit_alts and clin_recs and not any(
        any(alt.lower() in rec.lower() for alt in lit_alts)
        for rec in clin_recs
    ):
        conflicts.append({
            "conflict_detected": True,
            "conflict_type": "conflicting treatment recommendations",
            "severity": "moderate",
            "description": (
                "The literature silo returned alternative treatment considerations "
                "that are not identical to the clinical pathway."
            ),
            "affected_treatment": "alternative treatment set",
            "risk_factor": "cross-silo recommendation divergence",
        })

    return conflicts or [
        {
            "conflict_detected": False,
            "conflict_type": "none",
            "severity": "none",
            "description": "No deterministic cross-silo conflict rule matched this profile.",
            "affected_treatment": "none",
            "risk_factor": "none",
        }
    ]


def pubmed_records(query: str, *, guideline_only: bool = False, limit: int = 4) -> list[dict[str, Any]]:
    compact_query = compact_search_query(query)
    # For guideline searches, use broad clinical terms without publication type filter
    # which can be too restrictive on NCBI's E-utilities API
    if guideline_only:
        term = f"({compact_query}) guideline clinical practice recommendation"
    else:
        term = compact_query
    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?" + urlencode(
        {"db": "pubmed", "term": term, "retmode": "json", "retmax": limit, "sort": "relevance"}
    )
    search = public_json(search_url)
    ids = search.get("esearchresult", {}).get("idlist", [])
    if not ids:
        return []
    fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?" + urlencode(
        {"db": "pubmed", "id": ",".join(ids), "retmode": "xml"}
    )
    root = ElementTree.fromstring(public_text(fetch_url))
    records = []
    for article in root.findall(".//PubmedArticle"):
        pmid = (article.findtext("./MedlineCitation/PMID") or "").strip()
        title_node = article.find("./MedlineCitation/Article/ArticleTitle")
        title = " ".join("".join(title_node.itertext()).split()) if title_node is not None else ""
        title = title or f"PubMed article {pmid}"
        abstract_parts = []
        for node in article.findall("./MedlineCitation/Article/Abstract/AbstractText"):
            text = "".join(node.itertext()).strip()
            label = node.attrib.get("Label")
            abstract_parts.append(f"{label}: {text}" if label else text)
        abstract = " ".join(abstract_parts).strip()
        journal = article.findtext("./MedlineCitation/Article/Journal/Title") or "PubMed"
        date_text = " ".join(
            filter(
                None,
                [
                    article.findtext("./MedlineCitation/Article/Journal/JournalIssue/PubDate/Year"),
                    article.findtext("./MedlineCitation/Article/Journal/JournalIssue/PubDate/MedlineDate"),
                ],
            )
        )
        year = year_from_text(date_text)
        if not pmid or not abstract:
            continue
        records.append(
            {
                "source_id": f"pmid:{pmid}",
                "source": "PubMed / NCBI",
                "source_type": "guideline" if guideline_only else "research_article",
                "title": title,
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                "identifier": pmid,
                "year": year or 0,
                "publication_date": date_text or None,
                "section": "Abstract",
                "content": abstract,
                "risk_level": "unknown",
                "evidence_grade_reported": False,
            }
        )
    return records


def dailymed_records(query: str, limit: int = 3) -> list[dict[str, Any]]:
    drug = first_drug(query)
    if not drug:
        return []
    listing_url = "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?" + urlencode(
        {"drug_name": drug, "page": 1, "pagesize": limit}
    )
    listing = public_json(listing_url)
    records = []
    for label in listing.get("data", [])[:limit]:
        setid = label.get("setid")
        if not setid:
            continue
        xml_url = f"https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/{setid}.xml"
        section_url = f"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid={setid}"
        try:
            label_root = ElementTree.fromstring(public_text(xml_url))
            sections = []
            for section in label_root.findall(".//{*}section"):
                heading = " ".join("".join((section.find("./{*}title") or section).itertext()).split())
                text = " ".join("".join(node.itertext()).split() for node in section.findall("./{*}text"))
                if heading and text and re.search(r"contraindication|warning|precaution|interaction|renal|hepatic|dosage|adverse", heading, re.I):
                    sections.append(f"{heading}: {text}")
            content = " ".join(sections)[:24000]
        except Exception:
            content = ""
        if not content:
            continue
        records.append(
            {
                "source_id": f"dailymed:{setid}",
                "source": "DailyMed / NLM",
                "source_type": "drug_label",
                "title": label.get("title") or f"{drug.title()} DailyMed label",
                "url": section_url,
                "identifier": setid,
                "year": year_from_text(label.get("published_date")) or 0,
                "publication_date": label.get("published_date"),
                "section": "Relevant SPL label sections",
                "content": content,
                "risk_level": "unknown",
                "evidence_grade_reported": False,
            }
        )
    return records


def clinical_trial_records(query: str, limit: int = 3) -> list[dict[str, Any]]:
    url = "https://clinicaltrials.gov/api/v2/studies?" + urlencode(
        {"query.term": query, "pageSize": limit, "format": "json"}
    )
    payload = public_json(url)
    records = []
    for study in payload.get("studies", [])[:limit]:
        protocol = study.get("protocolSection", {})
        ident = protocol.get("identificationModule", {})
        design = protocol.get("designModule", {})
        status = protocol.get("statusModule", {})
        nctid = ident.get("nctId")
        if not nctid:
            continue
        title = ident.get("briefTitle") or ident.get("officialTitle") or nctid
        description = protocol.get("descriptionModule", {}).get("briefSummary") or ""
        intervention_names = [
            item.get("name", "") for item in protocol.get("armsInterventionsModule", {}).get("interventions", [])
        ]
        content = " ".join(
            filter(
                None,
                [
                    f"Study status: {status.get('overallStatus') or 'not reported'}.",
                    f"Interventions: {', '.join(intervention_names)}." if intervention_names else "",
                    f"Phase: {', '.join(design.get('phases', []))}.",
                    description,
                ],
            )
        )
        records.append(
            {
                "source_id": f"clinicaltrials:{nctid}",
                "source": "ClinicalTrials.gov",
                "source_type": "clinical_trial",
                "title": title,
                "url": f"https://clinicaltrials.gov/study/{nctid}",
                "identifier": nctid,
                "year": year_from_text(status.get("studyFirstPostDateStruct", {}).get("date")) or 0,
                "publication_date": status.get("studyFirstPostDateStruct", {}).get("date"),
                "section": "Study overview",
                "content": content,
                "risk_level": "unknown",
                "evidence_grade_reported": False,
            }
        )
    return records


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\x00", " ")).strip()


def chunk_text(value: str, size: int = 700, overlap: int = 90) -> list[str]:
    """Split cleaned text on paragraph/sentence boundaries with bounded overlap."""
    text = clean_text(value)
    if not text:
        return []
    paragraphs = [clean_text(p) for p in re.split(r"\n{2,}", value) if clean_text(p)]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs or [text]:
        if current:
            chunks.append(current)
            current = ""
        sentences = re.split(r"(?<=[.!?])\s+", paragraph)
        for sentence in sentences:
            sentence = clean_text(sentence)
            if not sentence:
                continue
            if current and len(current) + len(sentence) + 1 > size:
                chunks.append(current)
                tail = current[-overlap:] if overlap else ""
                current = f"{tail} {sentence}".strip()
            else:
                current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current)
    return chunks or [text]


def client() -> chromadb.PersistentClient:
    global _client, _embedding
    if _client is None:
        DB_ROOT.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=str(DB_ROOT))
        _embedding = DefaultEmbeddingFunction()
    return _client


def collection_for(domain: str):
    normalized = domain.lower().strip()
    if normalized not in COLLECTIONS:
        raise ValueError(f"Unknown domain: {domain}")
    return client().get_or_create_collection(
        name=COLLECTIONS[normalized],
        embedding_function=_embedding,
        metadata={"domain": normalized, "embedding_model": EMBEDDING_MODEL},
    )


def source_metadata(
    *,
    title: str,
    source: str,
    year: int,
    domain: str,
    evidence_grade: float,
    risk_level: str,
    page: int | None,
    document_id: str,
    provenance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    metadata = {
        "source": source,
        "title": title,
        "year": int(year),
        "domain": domain,
        "evidence_grade": float(evidence_grade),
        "risk_level": risk_level,
        "page": int(page or 1),
        "document_id": document_id,
        "synthetic": "synthetic" in source.lower() or "demo" in source.lower(),
    }
    if provenance:
        for key, value in provenance.items():
            if value is not None:
                metadata[key] = value
    return metadata


def ingest(
    *,
    title: str,
    domain: str,
    source: str,
    year: int,
    evidence_grade: float,
    risk_level: str,
    content: str,
    file_name: str | None = None,
    document_id: str | None = None,
    provenance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    document_id = document_id or f"doc-{hashlib.sha256(f'{title}|{source}|{content}'.encode()).hexdigest()[:16]}"
    chunks = chunk_text(content)
    if not chunks:
        raise ValueError("Document contains no extractable text")
    collection = collection_for(domain)
    ids = [f"{document_id}-chunk-{index + 1}" for index in range(len(chunks))]
    metadatas = [
        source_metadata(
            title=title,
            source=source,
            year=year,
            domain=domain,
            evidence_grade=evidence_grade,
            risk_level=risk_level,
            page=index + 1,
            document_id=document_id,
            provenance=provenance,
        )
        for index in range(len(chunks))
    ]
    collection.upsert(ids=ids, documents=chunks, metadatas=metadatas)
    return {
        "document_id": document_id,
        "collection": COLLECTIONS[domain],
        "chunk_count": len(chunks),
        "status": "indexed in persistent ChromaDB",
        "synthetic_notice": (
            "SYNTHETIC DEMONSTRATION content only. This receipt is not a genuine medical citation."
            if "synthetic" in source.lower() or "demo" in source.lower()
            else "Source indexed locally; verify licensing and provenance before research use."
        ),
        "indexed_at": now(),
    }


def extract_pdf(raw: bytes) -> str:
    if PdfReader is None:
        raise ValueError("PDF extraction is unavailable because pypdf is not installed")
    import io

    reader = PdfReader(io.BytesIO(raw))
    pages = [(page.extract_text() or "") for page in reader.pages]
    return "\n\n".join(pages)


def cache_live_records(domain: str, records: list[dict[str, Any]]) -> None:
    if not records:
        return
    collection = collection_for(domain)
    ids = []
    documents = []
    metadatas = []
    for record in records:
        content = clean_text(str(record.get("content", "")))
        if not content:
            continue
        source_id = str(record["source_id"])
        ids.append(source_id)
        documents.append(content)
        # Explicitly mark public source records as non-synthetic for proper filtering
        metadatas.append(
            source_metadata(
                title=str(record.get("title") or source_id),
                source=str(record.get("source") or "Public biomedical source"),
                year=int(record.get("year") or 0),
                domain=domain,
                evidence_grade=0.0,
                risk_level=str(record.get("risk_level") or "unknown"),
                page=None,
                document_id=source_id,
                provenance={
                    "source_id": source_id,
                    "source_type": record.get("source_type"),
                    "url": record.get("url"),
                    "identifier": record.get("identifier"),
                    "publication_date": record.get("publication_date"),
                    "retrieved_at": now(),
                    "section": record.get("section"),
                    "evidence_grade_reported": bool(record.get("evidence_grade_reported")),
                    "claim": content[:500],
                    "contraindication": False,
                    "synthetic": False,  # Explicitly mark public sources as real evidence
                },
            )
        )
    if ids:
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)


def live_retrieve(domain: str, query: str, top_k: int = 3) -> tuple[list[dict[str, Any]], str | None]:
    if not LIVE_EVIDENCE:
        return [], "live evidence disabled by MEDRAG_LIVE_EVIDENCE"
    try:
        errors = []
        if domain == "clinical":
            records = pubmed_records(query, guideline_only=True, limit=top_k)
        elif domain == "drug":
            records = dailymed_records(query, limit=top_k)
        elif domain == "literature":
            records = []
            for source_loader in (
                lambda: pubmed_records(query, limit=top_k),
                lambda: clinical_trial_records(query, limit=top_k),
            ):
                try:
                    records.extend(source_loader())
                except Exception as error:
                    errors.append(f"{type(error).__name__}: {error}")
        else:
            raise ValueError(f"Unknown domain: {domain}")
        cache_live_records(domain, records)
        if records:
            return records, None
        return [], "; ".join(errors) if errors else "public source returned no matching records"
    except Exception as error:
        return [], f"{type(error).__name__}: {error}"


def ensure_seeded() -> None:
    if LIVE_EVIDENCE and os.environ.get("MEDRAG_USE_SYNTHETIC", "0").lower() not in {"1", "true", "yes"}:
        return
    for domain, collection_name in COLLECTIONS.items():
        collection = collection_for(domain)
        if collection.count() > 0:
            continue
        path = DATA_ROOT / "synthetic" / domain / (
            "clinical-demo-guidance.txt"
            if domain == "clinical"
            else "drug-safety-demo.txt"
            if domain == "drug"
            else "literature-demo-review.txt"
        )
        if not path.exists():
            continue
        ingest(
            title=path.stem.replace("-", " ").title(),
            domain=domain,
            source=f"SYNTHETIC DEMONSTRATION / {collection_name}",
            year=2025 if domain != "literature" else 2026,
            evidence_grade=0.82 if domain == "clinical" else 0.78 if domain == "drug" else 0.72,
            risk_level="context-dependent",
            content=path.read_text(encoding="utf-8"),
            file_name=path.name,
            document_id=f"seed-{domain}",
        )


def stats() -> dict[str, Any]:
    ensure_seeded()
    silos = []
    for domain, collection_name in COLLECTIONS.items():
        collection = collection_for(domain)
        records = collection.get(include=["metadatas"])
        metadata = records.get("metadatas") or []
        visible_metadata = [item for item in metadata if item and not is_synthetic_metadata(item)]
        documents = {item.get("document_id") for item in visible_metadata if item}
        sources = sorted({str(item.get("source", "")) for item in visible_metadata if item})
        silos.append(
            {
                "domain": domain,
                "collection": collection_name,
                "document_count": len(documents),
                "chunk_count": len(visible_metadata),
                "source_names": sources,
                "status": "ready" if visible_metadata else "empty",
                "embedding_model": EMBEDDING_MODEL,
                "last_indexed_at": now() if visible_metadata else None,
            }
        )
    return {
        "database": "ChromaDB PersistentClient",
        "database_path": str(DB_ROOT),
        "embedding_provider": EMBEDDING_MODEL,
        "silos": silos,
    }


def retrieve(domain: str, query: str, top_k: int = 3) -> list[dict[str, Any]]:
    """Query the named ChromaDB silo and return enriched evidence items.

    Bug-fix: previously fetched *all* documents (n_results=collection.count());
    now fetches min(top_k*4, 20, count) to avoid full-collection scans on large
    collections while still filtering synthetic records to reach top_k real items.

    Each returned item is passed through enrich_evidence_item() so that
    evidence_grade (Q_grade), risk_severity, identifier, url, claim, and all
    other DEA-required structured fields are populated before the caller sees them.
    """
    ensure_seeded()
    collection = collection_for(domain)
    count = collection.count()
    if count == 0:
        return []
    # Fetch enough candidates to cover synthetic filtering, capped for efficiency
    fetch_n = min(max(top_k * 4, 20), count)
    result = collection.query(
        query_texts=[query],
        n_results=fetch_n,
        include=["documents", "metadatas", "distances"],
    )
    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]
    found = []
    for index, document in enumerate(documents):
        metadata = metadatas[index] or {}
        if is_synthetic_metadata(metadata):
            continue
        distance = float(distances[index]) if index < len(distances) else 1.0
        raw_item = {
            "id": (result.get("ids") or [[]])[0][index],
            "chunk": document,
            "excerpt": document,
            "source": metadata.get("source", ""),
            "title": metadata.get("title", ""),
            "page": metadata.get("page", 1),
            "year": metadata.get("year", 0),
            "domain": metadata.get("domain", domain),
            "evidence_grade": float(metadata.get("evidence_grade", 0.0)),
            "risk_level": metadata.get("risk_level", "unknown"),
            "similarity": round(max(0.0, 1.0 - distance), 4),
            "metadata": metadata,
        }
        # Enrich with Q_grade, risk signals, provenance — DEA-required fields
        found.append(enrich_evidence_item(raw_item, domain))
    return found[: max(top_k, 1)]


def profile_text(patient: dict[str, Any]) -> str:
    labs = ", ".join(f"{key} {value}" for key, value in patient.get("lab_values", {}).items())
    return (
        f"age {patient.get('age')} sex {patient.get('sex')}; "
        f"diseases {', '.join(patient.get('diseases', []))}; "
        f"medications {', '.join(patient.get('medications', []))}; "
        f"symptoms {', '.join(patient.get('symptoms', []))}; "
        f"labs {labs}; allergies {', '.join(patient.get('allergies', []))}; "
        f"conditions {', '.join(patient.get('conditions', []))}"
    )


def queries(patient: dict[str, Any]) -> dict[str, str]:
    base = profile_text(patient)
    diseases = ", ".join(patient.get("diseases", [])) or "multimorbidity"
    medications = ", ".join(patient.get("medications", [])) or "current medications"
    symptoms = ", ".join(patient.get("symptoms", [])) or "medication review"
    labs = ", ".join(f"{k} {v}" for k, v in patient.get("lab_values", {}).items()) or "laboratory values"
    allergies = ", ".join(patient.get("allergies", [])) or "no listed allergies"
    return {
        "clinical": f"clinical guideline treatment pathways for {diseases}; symptoms {symptoms}; labs {labs}; age {patient.get('age')} sex {patient.get('sex')}",
        "drug": f"medication safety contraindications interactions renal hepatic restrictions and allergies for {medications}; diseases {diseases}; labs {labs}; allergies {allergies}",
        "literature": f"recent comparative literature and alternative treatments for {diseases}; medications {medications}; symptoms {symptoms}; patient profile {base}",
    }


def first_sentences(records: list[dict[str, Any]], limit: int = 2) -> list[str]:
    values = []
    for record in records:
        sentence = re.split(r"(?<=[.!?])\s+", record["excerpt"])[0].strip()
        if sentence and sentence not in values:
            values.append(sentence)
    return values[:limit]


def average(records: list[dict[str, Any]], key: str, default: float = 0.0) -> float:
    values = [float(record.get(key, default)) for record in records]
    return round(sum(values) / len(values), 3) if values else default


def analyze(patient: dict[str, Any], top_k: int = 3) -> dict[str, Any]:  # noqa: C901
    """Run the full multi-agent DEA pipeline for a patient profile.

    Pipeline:
      1. Concurrent live retrieval (PubMed, DailyMed, ClinicalTrials.gov)
      2. ChromaDB retrieval — evidence enriched with Q_grade + risk signals
      3. Evidence-based P_risk (replaces hardcoded drug heuristics)
      4. Assemble agent outputs (clinical / drug / literature)
      5. Python DEA — build_dea_candidates()  ← authoritative V_score
      6. Python conflict detection — detect_conflicts_python()
      7. Build patient_summary and explanation
      8. Return all DEA results to TypeScript (pass-through only)

    The TypeScript layer no longer computes DEA scores.
    """
    query_map = queries(patient)

    # --- Step 1: concurrent live retrieval (cached to ChromaDB) ---
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            "clinical":   executor.submit(live_retrieve, "clinical",   query_map["clinical"],   top_k),
            "drug":       executor.submit(live_retrieve, "drug",       query_map["drug"],       top_k),
            "literature": executor.submit(live_retrieve, "literature", query_map["literature"], top_k),
        }
        live_results = {domain: future.result() for domain, future in futures.items()}

    # --- Step 2: ChromaDB retrieval (enriched with Q_grade + risk signals) ---
    clinical_evidence   = retrieve("clinical",   query_map["clinical"],   top_k)
    drug_evidence       = retrieve("drug",       query_map["drug"],       top_k)
    literature_evidence = retrieve("literature", query_map["literature"], top_k)

    # --- Step 3: Evidence-based P_risk ---
    # Replaces the previous hardcoded heuristics (metformin+renal→0.78 etc.).
    # P_risk is now derived from risk signals in the retrieved DailyMed evidence text.
    p_risk = compute_p_risk_from_evidence(drug_evidence)
    risk_level = "high" if p_risk >= 0.75 else "moderate" if p_risk >= 0.5 else "low"

    # --- Step 4: Drug name extraction (for display; kept deterministic) ---
    medications = " ".join(patient.get("medications", [])).lower()
    drug_name = (
        "Apixaban"  if "apixaban"  in medications else
        "Metformin"  if "metformin" in medications else
        "Lisinopril" if "lisinopril" in medications else
        (patient.get("medications") or ["medication regimen"])[0].split()[0]
    )

    # --- Step 5: Contraindications from enriched evidence (evidence-based) ---
    contraindications: list[str] = []
    for ev in drug_evidence:
        if ev.get("contraindication"):
            contraindications.append(
                f"The retrieved evidence ({ev.get('title', 'drug label')}) contains a "
                f"contraindications section; review the cited source before interpretation."
            )
        elif ev.get("risk_severity") == "high":
            contraindications.append(
                f"The retrieved evidence ({ev.get('title', 'drug label')}) contains "
                f"high-risk safety language."
            )
    if not contraindications:
        contraindications.append(
            "No explicit contraindication was identified in the retrieved evidence text."
        )

    # --- Assemble agent output dicts ---
    clinical_recommendation = (
        first_sentences(clinical_evidence, 1)[0]
        if first_sentences(clinical_evidence, 1)
        else "No clinical recommendation was retrieved from the public guideline search."
    )
    alternatives = (
        first_sentences(literature_evidence, 2)
        or ["No alternative treatment statement was retrieved."]
    )

    clinical_out: dict[str, Any] = {
        "agent": "clinical",
        "claims": first_sentences(clinical_evidence) or ["No clinical guideline evidence was retrieved."],
        "recommendations": [
            clinical_recommendation,
            "Review the full medication list, laboratory trend, and patient goals before any change.",
        ],
        "evidence": clinical_evidence,
        "evidence_grade": _ev_avg(clinical_evidence, "evidence_grade"),
        "relevance":      _ev_avg(clinical_evidence, "similarity"),
        "recency":        dea_recency(_ev_max_year(clinical_evidence)),
        "source": clinical_evidence[0]["source"] if clinical_evidence else "",
        "year":   clinical_evidence[0]["year"]   if clinical_evidence else 0,
    }

    drug_out: dict[str, Any] = {
        "agent": "drug",
        "drug": drug_name,
        "contraindications": contraindications,
        "interactions": first_sentences(drug_evidence, 3) or ["No DailyMed label text was retrieved."],
        "risk_level": risk_level,
        "patient_specific_risk": p_risk,   # evidence-based; no longer hardcoded
        "evidence_grade": _ev_avg(drug_evidence, "evidence_grade"),
        "source": drug_evidence[0]["source"] if drug_evidence else "",
        "year":   drug_evidence[0]["year"]   if drug_evidence else 0,
        "evidence": drug_evidence,
    }

    literature_out: dict[str, Any] = {
        "agent": "literature",
        "findings": first_sentences(literature_evidence, 3) or ["No PubMed or ClinicalTrials.gov evidence was retrieved."],
        "alternative_treatments": alternatives,
        "evidence_grade": _ev_avg(literature_evidence, "evidence_grade"),
        "relevance":      _ev_avg(literature_evidence, "similarity"),
        "recency":        dea_recency(_ev_max_year(literature_evidence)),
        "source": literature_evidence[0]["source"] if literature_evidence else "",
        "year":   literature_evidence[0]["year"]   if literature_evidence else 0,
        "evidence": literature_evidence,
    }

    # --- Step 6: Python DEA — authoritative V_score ranking ---
    candidates = build_dea_candidates(clinical_out, drug_out, literature_out, p_risk)

    # --- Step 7: Python conflict detection ---
    conflicts = detect_conflicts_python(patient, clinical_out, drug_out, literature_out)

    # --- Step 8: Patient summary and explanation (deterministic templates) ---
    conflict_count = sum(1 for c in conflicts if c.get("conflict_detected"))
    diseases_str   = ", ".join(patient.get("diseases", [])) or "no listed diseases"
    s_suffix       = "" if conflict_count == 1 else "s"
    patient_summary = (
        f"{patient.get('age')}-year-old {str(patient.get('sex', '')).lower()} "
        f"with {diseases_str}; {conflict_count} cross-silo conflict{s_suffix} detected."
    )

    if candidates:
        top = candidates[0]
        explanation = (
            f'DEA ranked "{top["candidate"]}" highest at {top["score"]:.3f} '
            f'using retrieved evidence from {top["source"]} '
            f'(Q_grade={top["q_grade"]:.2f}, S_rel={top["s_rel"]:.2f}, '
            f'T_recent={top["t_recent"]:.2f}, P_risk={top["p_risk"]:.2f}). '
            f'The score is deterministic and does not authorise treatment; '
            f'the conflict register and source evidence remain the traceable basis for review.'
        )
    else:
        explanation = (
            "No evidence was retrieved, so the system produced no supported treatment candidate. "
            "This result must be reviewed by a qualified healthcare professional."
        )

    return {
        "queries": query_map,
        "retrieval_status": {
            "database": "ChromaDB PersistentClient",
            "embedding_provider": EMBEDDING_MODEL,
            "silo_isolation": True,
            "top_k": top_k,
            "live_sources": {
                domain: {"records": len(records), "error": error}
                for domain, (records, error) in live_results.items()
            },
        },
        "clinical":   clinical_out,
        "drug":       drug_out,
        "literature": literature_out,
        # --- Python DEA results (consumed by TypeScript as pass-through) ---
        "conflicts": conflicts,
        "dea": {
            "weights":     DEA_WEIGHTS,
            "candidates":  candidates,
            "method_note": DEA_METHOD_NOTE,
        },
        "patient_summary": patient_summary,
        "explanation":     explanation,
    }


def handle(request: dict[str, Any]) -> dict[str, Any]:
    action = request.get("action")
    if action == "analyze":
        return analyze(request["patient"], int(request.get("top_k", 3)))
    if action == "retrieve":
        return {
            "domain": request["domain"],
            "collection": COLLECTIONS[request["domain"]],
            "results": retrieve(request["domain"], request["query"], int(request.get("top_k", 3))),
        }
    if action == "stats":
        return stats()
    if action == "ingest":
        content = request.get("content", "")
        file_name = request.get("file_name")
        encoded = request.get("file_content_base64")
        if encoded:
            raw = base64.b64decode(encoded)
            content = extract_pdf(raw) if str(file_name or "").lower().endswith(".pdf") else raw.decode("utf-8")
        return ingest(
            title=request["title"],
            domain=request["domain"],
            source=request["source"],
            year=int(request["year"]),
            evidence_grade=float(request["evidence_grade"]),
            risk_level=request["risk_level"],
            content=content,
            file_name=file_name,
        )
    raise ValueError(f"Unknown worker action: {action}")


def main() -> None:
    try:
        request = json.loads(sys.stdin.read())
        print(json.dumps({"ok": True, "result": handle(request)}), flush=True)
    except Exception as error:
        print(json.dumps({"ok": False, "error": f"{type(error).__name__}: {error}"}), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()