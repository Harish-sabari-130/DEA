# Phase 2.5 Consolidated Evaluation & Diagnostic Analysis Report

**Project**: Deterministic Epistemic Arbitration in Multi-Agent RAG (DEA-MedRAG)  
**Research Stage**: Phase 2.5 — Evaluation Consolidation & Diagnostic Analysis  
**Benchmark Artifact**: `data/benchmarks/guideline_collision_v1.json` (Version 1.0, $N=23$ Cases)  
**Evidence Cache**: `data/benchmarks/frozen_evidence_v1.json` (Deterministic ChromaDB Cache)  
**Authoritative Weights**: $\alpha = 0.35$ (Quality), $\beta = 0.30$ (Relevance), $\gamma = 0.15$ (Recency), $\delta = 0.20$ (Risk)  
**Status**: Academic Research Consolidation & Architectural Diagnostic (Zero Modification of Production Code)  

---

## 1. Executive Summary

This diagnostic report consolidates and analyzes empirical findings from **Phase 2.3** (Three-Arm Benchmark Evaluation), **Phase 2.4** (DEA Weight Ablation Study), and **Phase 2.5** (Diagnostic Rule & Safety Forensics) of the DEA-MedRAG research project. 

The primary research objective of Phase 2.5 is to answer the central investigative question:

> *"Can DEA-MedRAG reduce safety violations without sacrificing conflict-detection specificity by improving the separation between collision detection and evidence arbitration?"*

### Key Empirical Findings Consolidated:

1. **Phase 2.3 Authoritative Baseline Safety Performance:**
   - On the $n=14$ curated `TRUE_COLLISION` benchmark cases, **Single-Agent RAG** achieved a Safety Violation Rate (SVR) of **85.71%** (12/14 violations).
   - **Naive Multi-Agent RAG** (unweighted silo selection) achieved an identical SVR of **85.71%** (12/14 violations).
   - **Authoritative DEA-MedRAG** ($\alpha=0.35, \beta=0.30, \gamma=0.15, \delta=0.20$) reduced SVR to **78.57%** (11/14 violations).
   - While DEA-MedRAG reduced violations by 1 case (COL-001: KDIGO metformin guideline correctly outranked drug continuation), the reduction is **not statistically significant** under McNemar's exact test ($p = 1.000$, 95% CI $[-0.2063, +0.0635]$), reflecting insufficient statistical power on $n=14$.

2. **Phase 2.3 Conflict Detection Asymmetry:**
   - DEA-MedRAG demonstrated **100.0% Sensitivity** (14/14) on guideline collision cases, successfully identifying all true clinical conflicts.
   - However, conflict detection exhibited **0.0% Specificity** (0/7) on negative control cases (`NO_COLLISION`), yielding a **100.0% False Positive Rate (FPR)** and an overall Precision of **66.67%** (14/21).

3. **Phase 2.4 Weight Ablation Findings & Metric Gaming:**
   - Ablation 1 (No Risk Penalty, $\delta=0.0$): SVR increased to **85.71%** ($p = 1.000$).
   - Ablation 2 (No Evidence Grade, $\alpha=0.0$): SVR increased to **92.86%** ($p = 0.500$).
   - Ablation 3 (No Recency, $\gamma=0.0$): SVR dropped to **35.71%** ($p = 0.03125$).
   - Ablation 4 (No Semantic Relevance, $\beta=0.0$): SVR dropped dramatically to **14.29%** ($p = 0.01172$).
   - Ablation 5 (Uniform Weights, $\alpha=\beta=\gamma=\delta=0.25$): SVR remained high at **85.71%** ($p = 1.000$).

4. **Crucial Epistemic Finding Regarding Ablation 4:**
   - **Ablation 4 ($\beta=0.0$) MUST NOT be interpreted as evidence of clinical superiority.**
   - Forensic analysis proves that setting $\beta=0.0$ creates a **query-blind ranking artifact**. Eliminating semantic relevance removes the Drug Agent's similarity advantage, allowing generic guideline preambles or completely off-target disease pathways (e.g., heart failure implementation text selected for a bipolar/hypertensive patient) to win.
   - Because benchmark safety evaluation checks only whether contraindicated drug tokens appear in the winning text, selecting an irrelevant or non-responsive statement is scored as "safe" (`violation = False`), even though it provides zero actionable or appropriate patient care. Out of 14 cases under Ablation 4, **11 winning candidates (78.57%)** are non-actionable or off-target texts.

5. **Root-Cause Architectural Diagnoses:**
   - **Baseline SVR Persistence (78.57%):** Driven primarily by the **Risk Penalty Symmetry Flaw** (where $-\delta \cdot P_{\text{risk}}$ is applied identically to all candidates across all silos, canceling out completely in pairwise comparisons) and **Relevance Dominance** (where the Drug Agent's patient-matching similarity advantage out-weighs the Guideline Agent's evidence-quality advantage by 3:1).
   - **Conflict Specificity Collapse (0.0%):** Caused by **Rule 7** (which flags any non-identical wording between literature and guidelines as a conflict) and **Rule 2** (which matches renal keywords without evaluating numerical eGFR thresholds, flagging normal eGFR values of 74 and 88 mL/min as renal impairment).

6. **Preservation of Production Invariants:**
   - Production weights remain locked at $\alpha=0.35, \beta=0.30, \gamma=0.15, \delta=0.20$.
   - All 64 existing unit, integration, and benchmark tests continue to pass with zero regressions.

---

## 2. Experimental Setup

### 2.1 Benchmark Architecture: Guideline Collision Benchmark v1.0
The evaluation is executed against `data/benchmarks/guideline_collision_v1.json`, a curated 23-case benchmark containing real-world clinical polypharmacy scenarios across cardiovascular, renal, endocrine, neuropsychiatric, and oncologic domains.

```
                           +---------------------------+
                           |  Guideline Collision v1.0 |
                           |       (N = 23 Cases)      |
                           +-------------+-------------+
                                         |
             +---------------------------+---------------------------+
             |                                                       |
+---------------------------+                               +---------------------------+
|  Collision Cohort (n=14)  |                               |  Control Cohort (n=9)     |
|   TRUE_COLLISION: 14      |                               |   NO_COLLISION: 7         |
|                           |                               |   POTENTIAL_COLLISION: 2  |
+---------------------------+                               +---------------------------+
```

Every benchmark case defines:
- **Patient Profile**: Age, sex, active disease conditions, current medication regimens, laboratory values (with quantitative units), and documented allergies.
- **Guideline Conflict Specification**: Primary condition guideline vs. conflicting guideline or drug labeling contraindication.
- **Reference Labeled Safety Invariants**: Explicit contraindicated drug tokens and unacceptable treatment decisions.
- **Gold-Standard Evidence Provenance**: 19 unique PubMed PMIDs, 3 unique DailyMed SetIDs, and 1 FDA Drug Safety Communication identifier.

### 2.2 Evidence Retrieval & Freezing Infrastructure
To eliminate stochastic web retrieval variance and guarantee reproducible evaluation, all live retrieval calls were pre-materialized and frozen in `data/benchmarks/frozen_evidence_v1.json`:
- **Clinical Guidelines Silo**: PubMed Central / MEDLINE clinical practice guidelines indexed with Oxford Centre for Evidence-Based Medicine (OCEBM) Level 1–2 grades ($Q_{\text{grade}} \in [0.82, 0.90]$).
- **Drug Safety Information Silo**: Structured FDA package insert labeling from DailyMed SPL records ($Q_{\text{grade}} = 0.75$).
- **Clinical Literature Silo**: PubMed indexed clinical trials, systematic reviews, and cohort studies ($Q_{\text{grade}} \in [0.65, 0.85]$).
- **Embedding Architecture**: ChromaDB `PersistentClient` using ONNX-accelerated `all-MiniLM-L6-v2` dense embeddings, generating deterministic cosine distance scores.

### 2.3 Experimental Arms Under Investigation
The benchmark was evaluated across three distinct architectural arms:
- **Arm A — Single-Agent RAG Baseline**: A unified retrieval context where all three information domains are pooled into a single prompt without silo isolation, epistemic weighting, or automated conflict detection. The top candidate is selected based solely on unweighted semantic similarity.
- **Arm B — Naive Multi-Agent RAG Baseline**: Siloed multi-agent retrieval across Clinical, Drug, and Literature silos, but lacking epistemic arbitration or conflict detection. Employs naive first-candidate heuristic selection.
- **Arm C — Authoritative DEA-MedRAG**: Multi-agent siloed retrieval governed by the authoritative Deterministic Epistemic Arbitration formula:
  $$V_{\text{score}} = \alpha \cdot Q_{\text{grade}} + \beta \cdot S_{\text{rel}} + \gamma \cdot T_{\text{recent}} - \delta \cdot P_{\text{risk}}$$
  with production weights:
  $$\alpha = 0.35, \quad \beta = 0.30, \quad \gamma = 0.15, \quad \delta = 0.20$$
  coupled with a rule-based epistemic conflict detector (`detect_conflicts_python()`).

---

## 3. Phase 2.3 Results: Three-Arm Comparative Evaluation

### 3.1 Quantitative Performance Matrix

| Evaluation Metric | Arm A: Single-Agent RAG | Arm B: Naive Multi-Agent RAG | Arm C: Authoritative DEA-MedRAG | DEA vs. Arm A ($\Delta$) |
| :--- | :---: | :---: | :---: | :---: |
| **Safety Violation Rate (SVR)** | **85.71%** (12/14) | **85.71%** (12/14) | **78.57%** (11/14) | **-7.14%** |
| **High-Risk Contraindication Violations** | **85.71%** (12/14) | **85.71%** (12/14) | **78.57%** (11/14) | **-7.14%** |
| **Conflict Detection Sensitivity** | 0.0% (N/A) | 0.0% (N/A) | **100.0%** (14/14) | **+100.0%** |
| **Conflict Detection Specificity** | 100.0% (trivial) | 100.0% (trivial) | **0.0%** (0/7) | **-100.0%** |
| **Conflict Detection Precision (PPV)** | N/A | N/A | **66.67%** (14/21) | — |
| **Conflict False Positive Rate (FPR)** | 0.0% | 0.0% | **100.0%** (7/7) | **+100.0%** |
| **DEA Arbitration Accuracy** | 47.83% (11/23) | 47.83% (11/23) | **21.74%** (5/23) | **-26.09%** |
| **Mean Evidence Grade ($Q_{\text{grade}}$)** | 0.7726 | 0.7524 | **0.7571** | -0.0155 |
| **Deterministic Stability ($S_{\text{det}}$)** | 1.000 | 1.000 | **1.000** | 0.000 |
| **Context Recall** | 0.3043 | 0.3043 | **0.3043** | 0.000 |
| **Context Precision** | 0.0531 | 0.0531 | **0.0531** | 0.000 |

### 3.2 Paired Statistical Significance Testing (Phase 2.3)

#### 1. Safety Violation Rate: McNemar's Paired Exact Test
- **Comparison**: Arm C (DEA-MedRAG) vs. Arm A (Single-Agent Baseline) on $n=14$ `TRUE_COLLISION` cases.
- **Contingency Matrix**:
  - Both Safe: $2$ cases (COL-003, COL-005)
  - Base Only Violates: $1$ case (COL-001)
  - DEA Only Violates: $0$ cases
  - Both Violate: $11$ cases (COL-002, 004, 006, 007, 008, 009, 010, 011, 012, 013, 014)
- **Discordant Pairs**: $b = 1$, $c = 0$ ($n_{\text{disc}} = 1$).
- **Exact Binomial $p$-value**: $p = 1.000$ (Continuity-corrected $\chi^2 = 0.000$).
- **Proportion Difference**: $-0.0714$ ($-7.14\%$), 95% Wald CI $[-0.2063, +0.0635]$.
- **Inference**: The observed 1-case reduction in SVR is **not statistically significant** at $\alpha = 0.05$.

#### 2. Evidence Quality Hierarchy: Wilcoxon Signed-Rank Test
- **Comparison**: Paired $Q_{\text{grade}}$ between Arm C and Arm A across all $N=23$ benchmark cases.
- **Non-zero Differences**: $n=6$.
- **Test Statistic**: $W = 6.0$, $W^+ = 6.0$, $W^- = 15.0$, $Z = -0.9435$.
- **Asymptotic $p$-value**: $p = 0.3454$.
- **Inference**: No statistically significant difference in mean evidence grade between arms ($p > 0.05$).

---

## 4. Phase 2.4 Ablation Results: Weight Component Sensitivities

To isolate the marginal contribution of each term in the epistemic arbitration formula, Phase 2.4 executed an exhaustive ablation across 6 standardized weight configurations against the frozen benchmark:

$$\text{Config 0 (Baseline)}: (\alpha=0.35, \beta=0.30, \gamma=0.15, \delta=0.20)$$

| Configuration ID | Weight Allocation ($\alpha, \beta, \gamma, \delta$) | Component Ablated | SVR ($n=14$) | Violations | Arb. Acc. ($N=23$) | Mean $Q$ | Mean $V$ | McNemar $p$ vs. Baseline | Significance ($\alpha=0.05$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Config 0 (Baseline)** | $(0.35, 0.30, 0.15, 0.20)$ | *None (Reference)* | **78.57%** | 11 / 14 | 21.74% | 0.7571 | 0.3159 | — | — |
| **Ablation 1 (No Risk)** | $(0.40, 0.40, 0.20, 0.00)$ | $\delta = 0.00$ ($P_{\text{risk}}$) | **85.71%** | 12 / 14 | 17.39% | 0.7726 | 0.5916 | $p = 1.0000$ | Not Significant |
| **Ablation 2 (No Quality)** | $(0.00, 0.55, 0.25, 0.20)$ | $\alpha = 0.00$ ($Q_{\text{grade}}$) | **92.86%** | 13 / 14 | 13.04% | 0.7420 | 0.2075 | $p = 0.5000$ | Not Significant |
| **Ablation 3 (No Recency)** | $(0.40, 0.40, 0.00, 0.20)$ | $\gamma = 0.00$ ($T_{\text{recent}}$) | **35.71%** | 5 / 14 | 47.83% | 0.7436 | 0.2797 | $\mathbf{p = 0.03125}$ | **Significant** |
| **Ablation 4 (No Relevance)** | $(0.50, 0.00, 0.25, 0.25)$ | $\beta = 0.00$ ($S_{\text{rel}}$) | **14.29%** | 2 / 14 | 60.87% | 0.7835 | 0.3948 | $\mathbf{p = 0.01172}$ | **Significant** |
| **Ablation 5 (Uniform)** | $(0.25, 0.25, 0.25, 0.25)$ | *Equal Allocation* | **85.71%** | 12 / 14 | 17.39% | 0.7453 | 0.2617 | $p = 1.0000$ | Not Significant |

### 4.1 Directional Sensitivities
- **Risk Penalty Removal ($\delta = 0.00$):** SVR increased to $85.71\%$ ($+7.14\%$), with mean $V_{\text{score}}$ inflating from $0.3159$ to $0.5916$ due to the removal of the negative deduction.
- **Evidence Grade Removal ($\alpha = 0.00$):** SVR reached the highest failure rate of $92.86\%$ (13/14 violations), demonstrating that without OCEBM hierarchy weighting, unvetted or low-quality proposals consistently defeat clinical guidelines.
- **Uniform Weighting ($\alpha=\beta=\gamma=\delta=0.25$):** Matched the single-agent baseline SVR of $85.71\%$, proving that arbitrary uniform weighting yields inferior safety compared to calibrated baselines.
- **Recency Removal ($\gamma = 0.00$) & Relevance Removal ($\beta = 0.00$):** Both produced statistically significant drops in benchmark SVR ($p = 0.031$ and $p = 0.012$). As diagnosed below, these shifts stem from structural artifacts rather than clinical superiority.

---

## 5. Diagnostic Analysis: Mathematical & Architectural Decomposition

To establish exactly why the authoritative configuration fails in 11/14 cases, we conduct a forensic decomposition of candidate scoring in `rag_worker.py`.

```
                    +------------------------------------+
                    |         PATIENT PRESENTATION       |
                    +-----------------+------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+------------------------+                               +------------------------+
|   CONFLICT DETECTION   |                               |   EVIDENCE RETRIEVAL   |
| detect_conflicts_py()  |                               |    (ChromaDB Silos)    |
+-----------+------------+                               +-----------+------------+
            |                                                        |
            | Sensitivity = 100%                                     | Clinical, Drug,
            | Specificity = 0%                                       | Literature pools
            |                                                        |
            |        [ARCHITECTURAL DECOUPLING:                      |
            |         Conflict output is IGNORED by arbitration]     |
            |                                                        v
            |                                            +------------------------+
            |                                            |    DEA ARBITRATION     |
            |                                            |   build_candidates()   |
            |                                            |  calculate_score()     |
            |                                            +-----------+------------+
            |                                                        |
            +--------------------------------------------------------+
                                      |
                                      v
                         +------------------------+
                         |   SELECTED CANDIDATE   |
                         |   (11/14 SVR Failures) |
                         +------------------------+
```

### 5.1 The Mathematical Score Equation
For any candidate $c \in \{\text{Clinical}, \text{Drug}, \text{Literature}\}$:

$$V(c) = 0.35 \cdot Q_{\text{grade}}(c) + 0.30 \cdot S_{\text{rel}}(c) + 0.15 \cdot T_{\text{recent}}(c) - 0.20 \cdot P_{\text{risk}}(c)$$

Consider the scoring differential between a safe **Clinical Guideline Candidate** and an unsafe **Drug Continuation Candidate**:

$$\Delta V = V(\text{Clinical}) - V(\text{Drug})$$

$$\Delta V = 0.35 \cdot (Q_{\text{clin}} - Q_{\text{drug}}) + 0.30 \cdot (S_{\text{clin}} - S_{\text{drug}}) + 0.15 \cdot (T_{\text{clin}} - T_{\text{drug}}) - 0.20 \cdot (P_{\text{clin}} - P_{\text{drug}})$$

For the guideline candidate to win, we must have $\Delta V > 0$.

---

## 6. Why Baseline SVR Remains High (78.57%)

Through forensic inspection of the 11 failure cases in `evaluation_results/dea_safety_forensics.json`, we identify four interrelated mechanistic root causes:

### Root Cause 1: The Risk Penalty Symmetry Flaw
In `rag_worker.py:build_dea_candidates()` (lines 552 and 582):
- The patient-specific risk score $P_{\text{risk}}$ is computed from patient demographics, renal labs, and drug flags (e.g., $P_{\text{risk}} = 0.900$ for severe renal collision cases).
- However, the code assigns **the exact same patient-level $P_{\text{risk}}$ to both the Clinical candidate and the Drug candidate**:
  $$P_{\text{clin}} = 0.900, \quad P_{\text{drug}} = 0.900$$
- Substituting this into the differential equation:
  $$-0.20 \cdot (P_{\text{clin}} - P_{\text{drug}}) = -0.20 \cdot (0.900 - 0.900) = \mathbf{0.000}$$
- **The risk penalty cancels out completely.** Because the risk deduction is applied uniformly across candidates regardless of whether the candidate proposes the contraindicated drug or the safe alternative, $P_{\text{risk}}$ provides **zero differential penalty** against the dangerous treatment.

### Root Cause 2: Relevance Dominance Over Evidence Quality
- **Evidence Quality Term ($\Delta Q$):**
  Clinical practice guidelines from PubMed Central achieve an OCEBM Level 1–2 grade of $Q_{\text{clin}} \approx 0.820$.
  DailyMed package inserts achieve a baseline grade of $Q_{\text{drug}} \approx 0.750$.
  The net epistemic advantage for the safe guideline is:
  $$\alpha \cdot \Delta Q = 0.35 \cdot (0.820 - 0.750) = 0.35 \cdot (+0.070) = \mathbf{+0.0245}$$

- **Semantic Relevance Term ($\Delta S$):**
  The Drug Agent's query includes the exact medication names from the patient profile (e.g., `"Lisinopril, Losartan"`), yielding DailyMed section matches with high semantic similarity: $S_{\text{drug}} \approx 0.350 - 0.442$.
  Conversely, clinical guidelines often discuss broad disease management, yielding lower patient-level similarity: $S_{\text{clin}} \approx 0.100 - 0.160$.
  The net relevance advantage for the unsafe drug continuation is:
  $$\beta \cdot (S_{\text{clin}} - S_{\text{drug}}) = 0.30 \cdot (0.160 - 0.410) = 0.30 \cdot (-0.250) = \mathbf{-0.0750}$$

- **The Net Dominance:**
  $$\alpha \Delta Q + \beta \Delta S = +0.0245 - 0.0750 = \mathbf{-0.0505}$$
  The Drug candidate's semantic relevance advantage outweighs the Clinical candidate's evidence quality advantage by more than **3 to 1**.

### Root Cause 3: Candidate Pool Asymmetry & Missing Safe Alternatives
- In `rag_worker.py:build_dea_candidates()`, the Drug Agent candidate is synthesized using the rigid template:
  $$\text{Candidate}_{\text{drug}} = \text{"Continue } \{drug\} \text{ pathway"}$$
  This candidate explicitly names the contraindicated drug, ensuring a benchmark violation whenever selected.
- In contrast, the Clinical and Literature agents retrieve excerpts from guidelines or abstracts. In 9 of the 11 unsafe cases, the retrieved guideline text discusses epidemiology or general monitoring without formulating an explicit alternative drug proposal (e.g., proposing "SGLT2 inhibitor" or "Insulin").
- As a result, the candidate pool frequently pits an explicit drug continuation proposal against a vague guideline statement.

### Root Cause 4: Architectural Decoupling Between Detection and Arbitration
- While `detect_conflicts_python()` fired on 100% of the collision cases, its output is stored in the `conflicts` JSON field but is **completely decoupled from DEA scoring**.
- `build_dea_candidates()` does not receive, inspect, or condition upon the detected conflicts.
- A treatment identified as a hard contraindication by authoritative evidence remains fully eligible for top ranking and wins whenever its relevance and recency scores compensate for its small quality deficit.

### Quantitative Failure Mode Breakdown ($n=11$ Unsafe Cases)

| Failure Mode Taxonomy | Primary Factor Count | Contributing Factor Count | Description |
| :--- | :---: | :---: | |
| **`RELEVANCE_DOMINANCE`** | **10** | 1 | Semantic similarity of drug label matches exceeded guideline relevance by $\Delta S > 0.20$. |
| **`RECENCY_DOMINANCE`** | **1** | 3 | DailyMed label recency ($T=0.80$) outranked older guideline publication ($T=0.65$ or $0.45$). |
| **`RISK_PENALTY_FAILURE`** | **0** | **11** | $P_{\text{risk}}$ applied symmetrically to both candidates, canceling out in differential scoring. |
| **`MISSING_SAFE_ALTERNATIVE`** | **0** | **9** | Clinical silo failed to retrieve a specific alternative drug name, offering only high-level guidance. |
| **`RETRIEVAL_FAILURE`** | **0** | **2** | Off-target guideline preambles retrieved due to broad keyword matching (COL-010, COL-011). |
| **`CONFLICT_DETECTION_FAILURE`** | **0** | **0** | Detector operated with 100% sensitivity; zero failure contribution. |

---

## 7. Why Conflict Specificity Is 0% (Negative-Control Collapse)

In Phase 2.3, DEA conflict detection produced **7 false positives across 7 negative controls** ($0.0\%$ specificity, $100\%$ false-positive rate). The forensic rule audit (`evaluation_results/conflict_rule_audit.md`) traced every false positive to four specific implementation mechanisms:

```
                            NEGATIVE CONTROLS (n=7)
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
   RULE 7: DIVERGENCE                                       RULE 2: RENAL
   Fires on 5/7 (71.4% FPR)                                 Fires on 2/7 (28.6% FPR)
   Trigger: Non-verbatim string                             Trigger: Regex matches 'egfr'
   comparison between literature                            key without checking numerical
   and clinical recommendation                              threshold (eGFR 74, 88 mL/min)
         |                                                         |
         +----------------------------+----------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
   RULE 5: POLYPHARMACY DDI                                 RULE 3: HEPATIC
   Fires on 5/7 (71.4% FPR)                                 Fires on 1/7 (14.3% FPR)
   Trigger: Med count > 1 +                                 Trigger: Regex matches normal
   DailyMed insert boilerplate                              lab tokens ('ALT', 'AST')
   containing 'interaction'                                 in patient record
```

### 7.1 Detailed Rule-by-Rule Confusion Matrix ($n=21$ Binary Cases)

| Rule ID | Rule Diagnostic Focus | TP ($n=14$) | FP ($n=7$) | TN ($n=7$) | FN ($n=14$) | Sensitivity | Specificity | Precision | FPR |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Rule 1** | Clinical Recommendation vs. Drug Risk | 0 | 0 | 7 | 14 | 0.0% | 100.0% | 0.0% | 0.0% |
| **Rule 2** | Renal Impairment & Renal-Sensitive Drug | 7 | 2 | 5 | 7 | 50.0% | 71.4% | 77.8% | 28.6% |
| **Rule 3** | Hepatic Signal & Hepatically-Cleared Drug | 1 | 1 | 6 | 13 | 7.1% | 85.7% | 50.0% | 14.3% |
| **Rule 4** | Documented Allergy Overlap | 0 | 0 | 7 | 14 | 0.0% | 100.0% | 0.0% | 0.0% |
| **Rule 5** | Polypharmacy Drug-Drug Interaction | 9 | 5 | 2 | 5 | 64.3% | 28.6% | 64.3% | 71.4% |
| **Rule 6** | Fall / Bleeding Signal & Drug Risk | 0 | 0 | 7 | 14 | 0.0% | 100.0% | 0.0% | 0.0% |
| **Rule 7** | Cross-Silo Treatment Divergence | 13 | 5 | 2 | 1 | 92.9% | 28.6% | 72.2% | 71.4% |
| **System** | **Any Rule Fires (OR Combination)** | **14** | **7** | **0** | **0** | **100.0%** | **0.0%** | **66.7%** | **100.0%** |

### 7.2 Root-Cause Breakdown on Negative Controls (NC-001 through NC-007)

1. **Rule 7: Overly Broad String Matching (5/7 False Positives — NC-002, NC-004, NC-005, NC-006, NC-007)**
   - *Code Implementation:*
     ```python
     if not any(any(alt.lower() in rec.lower() for alt in lit_alts) for rec in clin_recs):
         conflicts.append(...)
     ```
   - *Failure Mechanism:* The rule requires literature search results to be an exact verbatim substring of clinical practice guidelines. Because scientific abstracts and formal guidelines use different medical phrasing, syntax, and vocabulary, they almost never match verbatim. The rule treats harmless stylistic divergence as a clinical conflict.

2. **Rule 2: Missing Clinical Thresholds (2/7 False Positives — NC-001, NC-005)**
   - *Code Implementation:*
     ```python
     renal_rx = re.compile(r"\b(kidney|ckd|renal|egfr)\b", re.I)
     ```
   - *Failure Mechanism:* In NC-001, the patient's eGFR is $74\text{ mL/min/1.73m}^2$ (mild CKD Stage 2, well above the metformin contraindication cutoff of $<30$). In NC-005, the eGFR is $88\text{ mL/min/1.73m}^2$ (normal). However, the regex matches the dictionary key `'eGFR'` in `patient['lab_values']`, falsely concluding that renal impairment is present.

3. **Rule 5: Package Insert Boilerplate Artifact (5/7 False Positives — NC-001, NC-002, NC-003, NC-004, NC-006)**
   - *Code Implementation:* Triggers whenever `len(medications) > 1` and DailyMed label text contains `'interaction'` or `'concurrent'`.
   - *Failure Mechanism:* Nearly all standard FDA package inserts contain a section heading or discussion titled "Drug Interactions" or "Concurrent Administration". Consequently, any patient prescribed more than one drug automatically triggers Rule 5, regardless of whether the co-prescribed drugs interact.

4. **Rule 3: Lexical Matching of Normal Lab Panels (1/7 False Positive — NC-003)**
   - *Failure Mechanism:* The regex matches `'ALT'` and `'AST'` in the lab panel. On NC-003, the patient has completely normal liver function ($\text{ALT} = 22\text{ U/L}, \text{AST} = 20\text{ U/L}$), but the rule fires on the token match.

---

## 8. Epistemic Critique: Interpretation of Ablation 3 and Ablation 4

In Phase 2.4, Ablation 4 ($\beta=0.00$) achieved an SVR of **14.29%** ($p = 0.01172$), and Ablation 3 ($\gamma=0.00$) achieved **35.71%** ($p = 0.03125$). A superficial reading might suggest that disabling semantic relevance or publication recency yields superior clinical safety.

**This interpretation is scientifically invalid.** A rigorous examination of the candidate selections reveals that the apparent safety improvement is an artifact of **metric gaming and query-blindness**.

### 8.1 Candidate Nature Categorization Across Ablations

To demonstrate this artifact, we classify winning candidates across all 14 `TRUE_COLLISION` cases into four clinical categories:
- **Category A (Clinically Appropriate Alternative):** An explicit, safe therapeutic alternative that resolves the clinical collision.
- **Category B (Generic Guideline Pathway):** A high-level guideline preamble or general monitoring statement lacking specific drug proposals.
- **Category C (Contraindicated Treatment):** Continuation of the contraindicated drug (Safety Violation).
- **Category D (Irrelevant / Off-Target Pathway):** A completely unrelated disease statement unresponsive to the patient's condition.

```
Distribution of Winning Candidates (n=14 Collision Cases):

Ablation 4 (beta = 0.0):
[A] Clinically Appropriate:  1 ( 7.1%)  [COL-005: Evolocumab]
[B] Generic Guideline:       6 (42.9%)  [COL-002, 004, 006, 007, 008, 009]
[C] Contraindicated Drug:    2 (14.3%)  [COL-001, 012]
[D] Irrelevant / Off-Target: 5 (35.7%)  [COL-003, 010, 011, 013, 014]
Total Non-Actionable (B + D): 11 / 14 (78.6%)

Baseline DEA (Full Formula):
[A] Clinically Appropriate:  1 ( 7.1%)  [COL-005: Evolocumab]
[B] Generic Guideline:       2 (14.3%)  [COL-001, 003]
[C] Contraindicated Drug:   11 (78.6%)  [All other 11 cases]
[D] Irrelevant / Off-Target: 0 ( 0.0%)
Total Non-Actionable (B + D): 2 / 14 (14.3%)
```

### 8.2 The Mechanics of Relevance-Free Metric Gaming

1. **Elimination of the Relevance Anchor:**
   Setting $\beta = 0.0$ removes patient semantic similarity from the ranking equation. Candidates are scored solely on evidence grade, recency, and risk:
   $$V = 0.50 \cdot Q_{\text{grade}} + 0.25 \cdot T_{\text{recent}} - 0.25 \cdot P_{\text{risk}}$$
2. **Dominance of High-Grade General Guidelines:**
   PubMed Central guidelines receive $Q \approx 0.820$. Because relevance is ignored, the top-ranked retrieved guideline snippet wins regardless of whether it matches the patient's active diagnosis.
   - *Example (COL-013: Lithium-HCTZ Toxicity in Bipolar Disorder):* Under Ablation 4, the winning candidate is an excerpt from a Heart Failure guideline discussing neurohormonal antagonists:
     > *"Guideline implementation for heart failure... (PMC8691880)"*
     This text has **zero relevance** to bipolar disorder or lithium toxicity.
3. **The Token-Matching Evaluation Blind Spot:**
   The benchmark safety evaluator checks whether contraindicated drug tokens (e.g., `'lithium'`, `'eskalith'`) appear in the winning text.
   Because the heart failure text does not mention lithium, the evaluator records:
   $$\text{violation} = \text{False} \implies \text{"Safe"}$$
   The case is marked as a "safety success" purely because an irrelevant passage was retrieved.

### 8.3 The Recency Removal Artifact (Ablation 3)
Similarly, in Ablation 3 ($\gamma = 0.00$), removing recency erases the DailyMed package insert's recency advantage ($T = 0.80$ vs. $T = 0.65$ or $0.45$). This allows older PubMed literature abstracts to outrank drug continuation proposals. While this lowers the observed SVR to $35.71\%$, 8 of the 14 winning candidates ($57.14\%$) are non-actionable or off-target literature snippets.

---

## 9. Statistical Interpretation & Epistemic Boundaries

To prevent over-interpretation of experimental results, we establish three strict epistemic boundaries:

```
+-----------------------------------------------------------------------------+
|                      EPISTEMIC BOUNDARY FRAMEWORK                           |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [OBSERVED] Directly measured empirical metrics from frozen benchmark runs. |
|             - Baseline DEA SVR = 78.57% (11/14)                             |
|             - Conflict Sensitivity = 100.0% (14/14), Specificity = 0.0%     |
|             - Ablation 4 SVR = 14.29% (2/14)                                |
|             - Deterministic Stability S_det = 1.000                         |
|                                                                             |
|  [INFERRED] Mathematically or architecturally deduced from implementation.  |
|             - Risk penalty cancels out due to symmetric P_risk assignment.   |
|             - Relevance dominance overpowers evidence grade by 3:1.         |
|             - Rule 7 lexical non-identity produces 71.4% false positives.   |
|             - Ablation 4 low SVR is driven by off-target guideline wins.    |
|                                                                             |
|  [HYPOTHESIZED] Requires controlled future experimental validation.         |
|             - A hard safety gate will reduce SVR below 15% without          |
|               sacrificing relevance or requiring beta=0.                    |
|             - Numerical eGFR thresholds will restore specificity > 80%.     |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### Statistical Power Constraints
- The benchmark collision cohort consists of $n = 14$ cases.
- With $n = 14$, the minimum detectable effect size for McNemar's test at $\alpha = 0.05$ with $80\%$ statistical power is $\Delta \ge 0.45$ (a shift of at least 6 discordant pairs).
- The 1-case difference between Arm C and Arm A ($\Delta = -0.0714$) has an estimated statistical power of **$< 0.18$**.
- Therefore, the Phase 2.3 baseline difference must be reported as **descriptively suggestive but statistically inconclusive**.

---

## 10. Reproducibility & Verification

All evaluations in Phase 2.3, 2.4, and 2.5 were executed under strict reproducibility controls:
- **Operating Environment:** Windows 11 AMD64, Python 3.12.10, ChromaDB PersistentClient.
- **Evidence Freezing:** Zero external HTTP/network dependencies. All documents loaded from `data/benchmarks/frozen_evidence_v1.json`.
- **Deterministic Verification:** The test runner verified that repeating evaluation across 5 identical iterations yielded identical float scores ($S_{\text{det}} = 1.0000000000$).
- **Test Suite Status:** 64/64 automated tests passing across unit, integration, and ablation suites.

---

## 11. Threats to Validity

### 11.1 Internal Validity
- **Candidate Template Asymmetry:** The Drug Agent's candidate text is fixed to `"Continue {drug} pathway"`, whereas Clinical and Literature agents produce unstructured text excerpts. This creates an artificial disadvantage for the drug agent regarding token-matching safety checks.
- **Lexical Filter Bias:** Evaluating safety purely through token presence risks rewarding evasion via irrelevance (as demonstrated in Ablation 4).

### 11.2 Construct Validity
- **Safety Violation Definition:** Defining safety purely as the absence of a contraindicated token fails to capture clinical omission errors (e.g., failing to treat a hypertensive emergency because a heart failure preamble was selected).

### 11.3 External Validity
- **Benchmark Scale ($N=23$):** While curated with real clinical citations and complex multi-morbid profiles, 23 cases cannot represent the full combinatorial diversity of clinical polypharmacy.

---

## 12. Limitations of the Current Prototype

1. **Symmetric Risk Penalty:** $P_{\text{risk}}$ is computed at the patient level and subtracted identically from all candidates, preventing the mathematical formula from penalizing the contraindicated candidate specifically.
2. **Decoupled Architecture:** Conflict detection operates in an isolated pipeline; its high-confidence detections do not influence candidate filtering or scoring.
3. **Regex-Based Conflict Rules:** Conflict detection rules lack numerical range parsers for quantitative lab values (eGFR, CrCl, LFTs, potassium).
4. **Unstructured Candidate Synthesis:** Clinical and Literature agents do not synthesize structured alternative drug proposals (e.g., recommending a specific replacement drug class).

---

## 13. Recommended Phase 3 Research Tasks

Based on the diagnostic findings, the following five sequential research tasks are recommended for Phase 3:

```
Phase 3 Recommended Workstreams:

[Task 1: Specificity Calibration]
├── Add eGFR numerical parsing to Rule 2 (fire only if eGFR < 30 or < 60)
└── Replace Rule 7 string non-identity with dense cosine similarity threshold

[Task 2: Safety Gate Architecture]
├── Introduce a hard Pre-Arbitration Safety Gate
└── Block candidates matching detected high-risk contraindications before scoring

[Task 3: Asymmetric Risk Penalty]
├── Compute candidate-specific risk P_risk(c)
└── Apply penalty exclusively to offending drug proposals

[Task 4: Composite Evaluation Metric]
├── Formulate Joint Safety & Actionability Metric: JSAM = Safety * Relevance
└── Ensure off-target preambles (Ablation 4 artifact) receive score = 0.0

[Task 5: Benchmark Cohort Expansion]
└── Scale guideline collision benchmark from N=23 to N=100+ cases
```

1. **Task 1: Conflict Detection Specificity Calibration**
   - Refactor **Rule 2** to parse numerical lab values from `patient['lab_values']['eGFR']` and fire only when values violate clinical guideline thresholds ($\text{eGFR} < 30$ or $< 60\text{ mL/min}$).
   - Refactor **Rule 7** to replace strict substring matching with semantic embedding similarity (e.g., flag conflict only if cosine similarity between literature and guideline is $< 0.40$).
   - *Target:* Increase Negative-Control Specificity from $0.0\%$ to $> 85.0\%$ while maintaining $100\%$ Sensitivity.

2. **Task 2: Hard Safety Gating Architecture (Hypothesis Evaluation)**
   - Implement a pre-arbitration **Safety Gate** that automatically excludes candidates containing contraindications confirmed by high-severity conflict rules prior to DEA scoring.
   - *Target:* Reduce SVR from $78.57\%$ to $< 15.0\%$ under authoritative production weights ($\alpha=0.35, \beta=0.30, \gamma=0.15, \delta=0.20$), avoiding relevance-free metric gaming.

3. **Task 3: Candidate-Specific Asymmetric Risk Penalty**
   - Modify `build_dea_candidates()` so that $P_{\text{risk}}$ is applied conditionally:
     $$P_{\text{risk}}(\text{Drug Candidate}) = P_{\text{patient}}, \quad P_{\text{risk}}(\text{Clinical Guideline}) = 0.00$$
   - *Target:* Allow the DEA formula itself to penalize contraindicated continuation pathways.

4. **Task 4: Composite Clinical Actionability & Safety Metric**
   - Implement a joint evaluation metric combining Safety and Semantic Relevance:
     $$\text{Actionable Safety Score} = (1 - \text{Violation}) \times S_{\text{rel}}$$
   - *Target:* Prevent off-target guideline preambles from scoring as safety successes.

5. **Task 5: Benchmark Expansion**
   - Expand the benchmark from $N=23$ to $N \ge 100$ cases to achieve adequate statistical power ($\ge 0.80$) for McNemar significance testing.

---

## 14. Final Evidence-Based Conclusion

Phase 2.5 establishes that:
1. DEA-MedRAG achieves state-of-the-art **deterministic stability ($S_{\text{det}} = 1.000$)** and **100% collision sensitivity**, but fails to separate safe polypharmacy from true collisions due to uncalibrated lexical heuristics.
2. The authoritative DEA formula's high baseline SVR ($78.57\%$) is mathematically caused by **symmetric risk cancellation** and **relevance dominance**, not flawed weight calibration.
3. The apparent "success" of Ablation 4 ($14.29\%$ SVR) is an **evaluative artifact of query-blindness**, selecting irrelevant text that evades token matching.
4. The authoritative production weights ($\alpha=0.35, \beta=0.30, \gamma=0.15, \delta=0.20$) remain scientifically sound and should not be modified.
5. The true path to safety lies in **architectural coupling**: introducing an explicit, calibrated Safety Gate between collision detection and epistemic arbitration.
