"""Local DEA-MedRAG retrieval worker.

This process is intentionally small and protocol-driven so the existing TypeScript API
can keep its public contract while the retrieval implementation runs in the Python
ecosystem. It uses ChromaDB's persisted client and its real all-MiniLM-L6-v2 embedding
function. Every stdout response is one JSON object; diagnostics belong on stderr.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

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
_client: chromadb.PersistentClient | None = None
_embedding = None


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


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
) -> dict[str, Any]:
    return {
        "source": source,
        "title": title,
        "year": int(year),
        "domain": domain,
        "evidence_grade": float(evidence_grade),
        "risk_level": risk_level,
        "page": int(page or 1),
        "document_id": document_id,
    }


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


def ensure_seeded() -> None:
    for domain, collection_name in COLLECTIONS.items():
        collection = collection_for(domain)
        if collection.count() > 0:
            continue
        path = DATA_ROOT / domain / (
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
        documents = {item.get("document_id") for item in metadata if item}
        sources = sorted({str(item.get("source", "")) for item in metadata if item})
        silos.append(
            {
                "domain": domain,
                "collection": collection_name,
                "document_count": len(documents),
                "chunk_count": collection.count(),
                "source_names": sources,
                "status": "ready" if collection.count() else "empty",
                "embedding_model": EMBEDDING_MODEL,
                "last_indexed_at": now() if collection.count() else None,
            }
        )
    return {
        "database": "ChromaDB PersistentClient",
        "database_path": str(DB_ROOT),
        "embedding_provider": EMBEDDING_MODEL,
        "silos": silos,
    }


def retrieve(domain: str, query: str, top_k: int = 3) -> list[dict[str, Any]]:
    ensure_seeded()
    collection = collection_for(domain)
    if collection.count() == 0:
        return []
    result = collection.query(
        query_texts=[query],
        n_results=min(max(top_k, 1), collection.count()),
        include=["documents", "metadatas", "distances"],
    )
    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]
    found = []
    for index, document in enumerate(documents):
        metadata = metadatas[index] or {}
        distance = float(distances[index]) if index < len(distances) else 1.0
        found.append(
            {
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
        )
    return found


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


def analyze(patient: dict[str, Any], top_k: int = 3) -> dict[str, Any]:
    query_map = queries(patient)
    clinical_evidence = retrieve("clinical", query_map["clinical"], top_k)
    drug_evidence = retrieve("drug", query_map["drug"], top_k)
    literature_evidence = retrieve("literature", query_map["literature"], top_k)
    diseases = " ".join(patient.get("diseases", [])).lower()
    symptoms = " ".join(patient.get("symptoms", [])).lower()
    medications = " ".join(patient.get("medications", [])).lower()
    labs = json.dumps(patient.get("lab_values", {})).lower()
    renal = any(term in f"{diseases} {labs}" for term in ["kidney", "ckd", "renal", "egfr"])
    fall = any(term in f"{symptoms} {json.dumps(patient.get('conditions', [])).lower()}" for term in ["fall", "dizziness"])
    metformin = "metformin" in medications
    apixaban = "apixaban" in medications or "atrial fibrillation" in diseases
    clinical_recommendation = (
        "Consider an SGLT2-inhibitor cardio-renal pathway, subject to clinician review."
        if renal and ("diabetes" in diseases or "metformin" in medications)
        else "Continue guideline-concordant condition control with periodic monitoring and medication reconciliation."
    )
    drug_name = (
        "Apixaban" if "apixaban" in medications else
        "Metformin" if metformin else
        "Lisinopril" if "lisinopril" in medications else
        (patient.get("medications") or ["medication regimen"])[0].split()[0]
    )
    risk = 0.2
    if metformin and renal:
        risk = 0.78
    elif apixaban and (renal or fall):
        risk = 0.86
    elif patient.get("allergies"):
        risk = 0.58
    drug_flags = first_sentences(drug_evidence, 3)
    contraindications = []
    if renal and metformin:
        contraindications.append("Renal impairment is a patient-specific metformin safety signal.")
    if (renal or fall) and apixaban:
        contraindications.append("Renal impairment or recent fall history is a patient-specific bleeding-risk signal.")
    if not contraindications:
        contraindications.append("No rule-based contraindication was identified from the retrieved demonstration chunks.")
    alternatives = (
        ["Dose-adjusted anticoagulation review", "Non-pharmacologic fall-risk intervention"]
        if fall and apixaban
        else ["Renal-adjusted alternative pathway", "Structured laboratory monitoring"]
        if renal
        else ["Lifestyle intervention plus monitored first-line therapy"]
    )
    return {
        "queries": query_map,
        "retrieval_status": {
            "database": "ChromaDB PersistentClient",
            "embedding_provider": EMBEDDING_MODEL,
            "silo_isolation": True,
            "top_k": top_k,
        },
        "clinical": {
            "agent": "clinical",
            "claims": first_sentences(clinical_evidence) or ["No clinical chunks were retrieved."],
            "recommendations": [clinical_recommendation, "Review the full medication list, laboratory trend, and patient goals before any change."],
            "evidence": clinical_evidence,
            "evidence_grade": average(clinical_evidence, "evidence_grade", 0.0),
            "relevance": average(clinical_evidence, "similarity", 0.0),
            "recency": round(min(1.0, max(0.0, (max([r["year"] for r in clinical_evidence] or [0]) - 2010) / 20)), 3),
            "source": clinical_evidence[0]["source"] if clinical_evidence else "",
            "year": clinical_evidence[0]["year"] if clinical_evidence else 0,
        },
        "drug": {
            "agent": "drug",
            "drug": drug_name,
            "contraindications": contraindications,
            "interactions": drug_flags or ["No drug-safety chunks were retrieved."],
            "risk_level": "high" if risk >= 0.75 else "moderate" if risk >= 0.5 else "low",
            "patient_specific_risk": risk,
            "evidence_grade": average(drug_evidence, "evidence_grade", 0.0),
            "source": drug_evidence[0]["source"] if drug_evidence else "",
            "year": drug_evidence[0]["year"] if drug_evidence else 0,
            "evidence": drug_evidence,
        },
        "literature": {
            "agent": "literature",
            "findings": first_sentences(literature_evidence, 3) or ["No literature chunks were retrieved."],
            "alternative_treatments": alternatives,
            "evidence_grade": average(literature_evidence, "evidence_grade", 0.0),
            "relevance": average(literature_evidence, "similarity", 0.0),
            "recency": round(min(1.0, max(0.0, (max([r["year"] for r in literature_evidence] or [0]) - 2010) / 20)), 3),
            "source": literature_evidence[0]["source"] if literature_evidence else "",
            "year": literature_evidence[0]["year"] if literature_evidence else 0,
            "evidence": literature_evidence,
        },
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