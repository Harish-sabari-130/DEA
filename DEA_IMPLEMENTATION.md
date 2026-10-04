# DEA Implementation — Technical Reference

**Project:** Deterministic Epistemic Arbitration in Multi-Agent RAG  
**Version:** Phase 1 (Python DEA v1.0)  
**Status:** Research prototype — not clinically validated

---

## 1. Overview

The Deterministic Epistemic Arbitration (DEA) layer scores and ranks treatment evidence candidates retrieved from three independent silos (Clinical, Drug, Literature). Every component is deterministic: identical structured evidence input yields identical output on every run.

**No LLM is involved in DEA scoring.**  
**No random values are used.**  
**The formula, weights, and mappings are fixed and auditable.**

---

## 2. V_score Formula

```
V_score = (α × Q_grade) + (β × S_rel) + (γ × T_recent) − (δ × P_risk)
```

| Symbol    | Variable     | Meaning                                    | Weight |
|-----------|--------------|--------------------------------------------|--------|
| α (alpha) | `Q_grade`    | Evidence quality grade                     | 0.35   |
| β (beta)  | `S_rel`      | Semantic relevance (ChromaDB cosine)       | 0.30   |
| γ (gamma) | `T_recent`   | Temporal recency score                     | 0.15   |
| δ (delta) | `P_risk`     | Patient risk penalty                       | 0.20   |

All inputs are floats in `[0.0, 1.0]`.  
Results are rounded to **3 decimal places** for stable comparison.  
Tie-breaking uses alphabetical order on candidate text.

**Weights are NOT to be changed during Phase 1.** Weight optimization is a Phase 2 concern.

---

## 3. Q_grade — Evidence Quality Grade

Q_grade is derived from a **simplified Oxford Centre for Evidence-Based Medicine (OCEBM) Level-of-Evidence taxonomy**, adapted for the three biomedical source types used in this system.

### 3.1 Primary Mapping (source_type → Q_grade)

| `source_type`       | Q_grade | OCEBM proxy  | Source                      |
|---------------------|---------|---------------|-----------------------------|
| `systematic_review` | 0.92    | Level 1       | PubMed (meta-analysis)       |
| `meta_analysis`     | 0.92    | Level 1       | PubMed                       |
| `guideline`         | 0.82    | Level 1–2     | PubMed (guideline_only=True) |
| `rct`               | 0.78    | Level 2       | PubMed (keyword-detected)    |
| `drug_label`        | 0.75    | Level 3 proxy | DailyMed SPL                 |
| `clinical_trial`    | 0.65    | Level 3       | ClinicalTrials.gov           |
| `research_article`  | 0.55    | Level 4       | PubMed (default)             |
| `observational`     | 0.52    | Level 3–4     | PubMed (keyword-detected)    |
| `case_report`       | 0.38    | Level 5       | PubMed                       |
| `unknown`           | 0.50    | —             | Unclassified                 |

### 3.2 Secondary Refinement (keyword detection for `research_article`)

When `source_type == "research_article"`, the title and first 500 characters of the abstract are scanned for keywords:

| Keyword pattern                                   | Refined grade | Maps to           |
|---------------------------------------------------|---------------|-------------------|
| "systematic review", "meta-analy", "cochrane"     | 0.92          | systematic_review |
| "randomized", "randomised", "controlled trial", "RCT", "double-blind" | 0.78 | rct |
| "cohort", "retrospective", "observational", "case-control", "cross-sectional" | 0.52 | observational |
| (no match)                                        | 0.55          | research_article  |

**No LLM grading.** All values are assigned by deterministic lookup and regex matching.

### 3.3 Why drug_label = 0.75 (higher than clinical_trial)?

FDA/EMA-approved drug labels (DailyMed SPL) are based on the totality of evidence including completed clinical trials. They represent a regulatory synthesis of safety data. Regulatory approval constitutes a form of evidence grading that outranks a single registered-but-unpublished trial. This is an approximation — actual evidence quality of a label depends on the underlying trials.

---

## 4. P_risk — Patient Risk Penalty

P_risk is derived from **risk signals detected in the retrieved drug safety evidence text**.

### 4.1 Why this approach?

The previous implementation used hardcoded drug-specific heuristics (e.g., if `metformin` AND `renal` → `risk = 0.78`). This approach:
- Cannot generalise to unlisted drugs
- Is not traceable to retrieved evidence
- Assumes fixed clinical knowledge rather than using retrieved information

Phase 1 replaces this with regex-based pattern matching against the retrieved DailyMed SPL text. DailyMed records are already pre-filtered to safety-relevant sections (`contraindication|warning|precaution|interaction|renal|hepatic|dosage|adverse`), so the text reliably contains safety language when such language exists.

### 4.2 Severity Detection Patterns

Applied in order; first match wins:

| Severity          | Pattern examples                                             | P_risk |
|-------------------|--------------------------------------------------------------|--------|
| `contraindication`| "contraindic", "contraindicated in"                          | 0.90   |
| `high`            | "boxed warning", "black box warning", "life-threatening", "fatal", "serious adverse" | 0.75 |
| `moderate`        | "warning", "precaution", "caution", "renal impairment", "hepatic impairment", "dose adjust", "not recommended" | 0.55 |
| `low`             | "monitor", "adverse reaction", "side effect", "drug interaction" | 0.30 |
| `none`            | (no match)                                                   | 0.10   |
| (no evidence)     | No drug evidence retrieved                                   | 0.15   |

### 4.3 Aggregation Rule

When multiple drug evidence items are retrieved:
1. Classify each item individually using the pattern table above.
2. Take the **maximum severity** across all items.
3. Map to the corresponding P_risk float.

### 4.4 Important Limitation

P_risk represents the **risk signals present in the retrieved evidence text**, not a clinical determination of whether a specific risk applies to a specific patient. A human clinician must assess applicability. This is clearly stated in the system disclaimer.

---

## 5. T_recent — Temporal Recency

```
T_recent = min(1.0, max(0.0, (year − 2010) / 20))
```

- 2010 → 0.0 (minimum recency)
- 2030 → 1.0 (maximum recency)
- Publications before 2010 receive T_recent = 0.0
- Publications after 2030 would receive T_recent = 1.0 (capped)

---

## 6. S_rel — Semantic Relevance

S_rel is derived from ChromaDB's cosine distance score:

```
S_rel = max(0.0, 1.0 - cosine_distance)
```

ChromaDB uses the `all-MiniLM-L6-v2` sentence-transformer embedding. Values closer to 1.0 indicate higher semantic similarity between the evidence chunk and the patient query.

---

## 7. Conflict Detection — Seven Rules

Conflict detection is deterministic and rule-based. No LLM is involved.

| Rule | Conflict Type                                      | Trigger                                                  | Severity |
|------|----------------------------------------------------|----------------------------------------------------------|----------|
| 1    | clinical recommendation vs high-risk medication    | Clin recommendation matches drug keyword AND drug risk=high | high  |
| 2    | drug-disease conflict                              | Renal signal in profile AND renal-sensitive medication    | high/moderate |
| 3    | hepatic restriction                                | Hepatic signal in profile AND hepatically-cleared drug    | moderate |
| 4    | allergy conflict                                   | Patient allergy overlaps medication text                  | high     |
| 5    | drug-drug interaction review                       | >1 medication AND interaction signal in drug evidence     | moderate |
| 6    | high-risk medication vs fall/bleeding signal       | Fall/dizziness/bleeding in profile AND drug risk=high     | high     |
| 7    | conflicting treatment recommendations              | Literature alternatives ≠ clinical recommendations        | moderate |

If no rule fires, a single `conflict_detected: false` record is returned.

---

## 8. Authoritative Implementation Location

| Component           | Location                                |
|---------------------|-----------------------------------------|
| DEA weights         | `rag_worker.py` — `DEA_WEIGHTS` dict    |
| Q_grade mapping     | `rag_worker.py` — `EVIDENCE_GRADE_BY_SOURCE_TYPE` |
| `compute_q_grade()` | `rag_worker.py`                         |
| P_risk patterns     | `rag_worker.py` — `_CONTRAINDICATION_RE`, etc. |
| `extract_risk_severity()` | `rag_worker.py`                   |
| `compute_p_risk_from_evidence()` | `rag_worker.py`              |
| `calculate_dea_score()` | `rag_worker.py`                      |
| `build_dea_candidates()` | `rag_worker.py`                     |
| `detect_conflicts_python()` | `rag_worker.py`                  |
| `enrich_evidence_item()` | `rag_worker.py`                     |
| TypeScript (deprecated) | `artifacts/api-server/src/lib/medrag.ts` — `calculateDEAScore()`, `detectConflicts()`, `buildCandidates()` (marked @deprecated, NOT called in production path) |

---

## 9. Structured Evidence Schema

Each evidence item returned by `retrieve()` and `enrich_evidence_item()` contains:

| Field             | Type            | Source                    | Description                            |
|-------------------|-----------------|---------------------------|----------------------------------------|
| `id`              | str             | ChromaDB                  | Unique record identifier               |
| `source`          | str             | ChromaDB metadata         | Human-readable source name             |
| `source_type`     | str             | Provenance metadata       | Evidence type for Q_grade lookup       |
| `title`           | str             | ChromaDB metadata         | Document/article title                 |
| `identifier`      | str\|None       | Provenance metadata       | PMID / NCT ID / DailyMed setid         |
| `url`             | str\|None       | Provenance metadata       | Source URL                             |
| `domain`          | str             | ChromaDB metadata         | "clinical" / "drug" / "literature"     |
| `agent`           | str             | `enrich_evidence_item()`  | Silo domain name                       |
| `claim`           | str             | `enrich_evidence_item()`  | First sentence of chunk (≤200 chars)   |
| `text`            | str             | `enrich_evidence_item()`  | Full chunk text (alias for chunk)      |
| `chunk`           | str             | ChromaDB                  | Full chunk text                        |
| `excerpt`         | str             | ChromaDB                  | Full chunk text (backward compat)      |
| `page`            | int             | ChromaDB metadata         | Page/chunk index                       |
| `year`            | int             | ChromaDB metadata         | Publication year                       |
| `evidence_level`  | str             | `enrich_evidence_item()`  | Human-readable OCEBM level label       |
| `evidence_grade`  | float           | `compute_q_grade()`       | Q_grade ∈ [0,1] — replaces stored 0.0  |
| `similarity`      | float           | ChromaDB distance         | Cosine similarity ∈ [0,1]              |
| `risk_level`      | str             | ChromaDB metadata         | Stored risk level (original)           |
| `risk_flag`       | bool            | `extract_risk_severity()` | Any safety signal detected             |
| `risk_severity`   | str             | `extract_risk_severity()` | none/low/moderate/high/contraindication|
| `contraindication`| bool            | `extract_risk_severity()` | Explicit contraindication language     |
| `metadata`        | dict            | ChromaDB                  | Full raw ChromaDB metadata             |

---

## 10. Provenance Fields

For each biomedical source, the following identifiers are preserved:

| Source              | Identifier field  | Example value                     |
|---------------------|-------------------|------------------------------------|
| PubMed              | `identifier`      | `"12345678"` (PMID)                |
| ClinicalTrials.gov  | `identifier`      | `"NCT01234567"`                   |
| DailyMed            | `identifier`      | UUID setid                        |
| All sources         | `url`             | Full source URL                    |
| All sources         | `source_type`     | e.g., `"guideline"`, `"drug_label"`|

Identifiers are NOT fabricated. If no identifier is available, `null` is stored.

---

## 11. Determinism Guarantee

The DEA system guarantees deterministic output for identical input:

1. **`calculate_dea_score()`** — pure arithmetic with `round(value, 3)`; no state
2. **`compute_q_grade()`** — deterministic lookup and regex match; no state
3. **`extract_risk_severity()`** — deterministic ordered regex scan; no state
4. **`compute_p_risk_from_evidence()`** — deterministic max() over severity_order; no state
5. **`build_dea_candidates()`** — deterministic sort by (−score, candidate_text); no state
6. **`detect_conflicts_python()`** — deterministic rule evaluation; no state

No timestamps, random seeds, or LLM outputs are used in any scoring path.

---

## 12. Research Limitations and Safety Boundary

This system is a **research prototype** for studying deterministic arbitration of biomedical evidence in polypharmacy scenarios. It is NOT clinically validated and MUST NOT be used for actual treatment decisions.

1. **P_risk from evidence text does not equal patient risk.** The risk signal reflects language in the retrieved evidence, not a clinical assessment of applicability to a specific patient.
2. **Q_grade is a proxy.** The OCEBM-derived mapping is a reasonable approximation but cannot substitute for expert systematic review.
3. **DEA ranking is not a clinical recommendation.** It is a research tool for studying how to arbitrate between evidence sources.
4. **Conflict detection is rule-based and incomplete.** The seven rules do not cover all clinically relevant drug-disease or drug-drug interactions.
5. **A qualified healthcare professional must validate all interpretations.**

---

## 13. Changelog

| Version | Date       | Change                                               |
|---------|------------|------------------------------------------------------|
| 1.0     | 2026-10-04 | Phase 1: Python DEA v1.0 — Q_grade taxonomy, P_risk from evidence text, Python conflict detection, TypeScript pass-through |
| 0.x     | Pre-Phase1 | TypeScript DEA (deprecated, retained as reference)  |
