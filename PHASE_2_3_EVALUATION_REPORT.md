# Phase 2.3 Evaluation Report: Benchmark Runner & Empirical Findings

**Project**: Deterministic Epistemic Arbitration in Multi-Agent RAG (DEA-MedRAG)  
**Evaluation Date**: 2026-11-18T06:23:35.954216+00:00  
**Benchmark Suite**: `data/benchmarks/guideline_collision_v1.json` (Version 1.0)  
**Evaluation Runner**: `scripts/evaluate_benchmark.py`  
**Execution Environment**: Python 3.12.10 on Windows 11  

---

## 1. Executive Summary & Benchmark Composition

This report documents the empirical evaluation of Phase 2.3 for the DEA-MedRAG research project. The objective is to evaluate whether deterministic epistemic arbitration resolves guideline collisions and prevents adverse polypharmacy decisions in comorbid patients more effectively, safely, and predictably than standard Single-Agent RAG and Naive Multi-Agent RAG architectures.

### Benchmark Cohort Composition
- **Total Cases Evaluated**: 23
- **TRUE_COLLISION Cases**: 14 (documenting established drug-disease or drug-drug contraindications)
- **POTENTIAL_COLLISION Cases**: 2 (`AMB-001`, `AMB-002`, context-dependent dosing thresholds)
- **NO_COLLISION Cases (Negative Controls)**: 7 (`NC-001` through `NC-007`)
- **Cases Successfully Evaluated**: 23 (100.0%)
- **Cases with Unavailable Evidence**: 0 (0.0%)

---

## 2. Experimental Design & The Three Evaluation Arms

All three experimental arms operated on the **exact same frozen evidence pool** per case (`data/benchmarks/frozen_evidence_v1.json`), ensuring retrieval differences did not confound arbitration evaluation:

1. **Arm A — Single-Agent RAG Baseline**:
   - Flat pooled retrieval context across clinical, drug, and literature sources.
   - Decision selected purely by maximum unweighted semantic similarity ($S_{\text{rel}}$).
   - No cross-silo conflict detection matrix.
2. **Arm B — Naive Multi-Agent RAG**:
   - Preserves the three specialized domain silos (Clinical, Drug, Literature).
   - Aggregates candidates by unweighted agent similarity ($S_{\text{rel}}$) without DEA arbitration or risk deduction.
   - No cross-silo conflict detection matrix.
3. **Arm C — DEA-MedRAG**:
   - Full production pipeline implementing deterministic epistemic arbitration:
     V_score = 0.35 * Q_grade + 0.30 * S_rel + 0.15 * T_recent - 0.20 * P_risk
   - Cross-silo conflict detection via 7 deterministic rules.

---

## 3. Empirical Results Table

| Evaluation Dimension | Metric | Arm A: Single-Agent | Arm B: Naive Multi-Agent | Arm C: DEA-MedRAG | Difference (C vs. A) | Difference (C vs. B) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Safety ($n_{\text{true}}=14$)** | **Safety Violation Rate (SVR)** | **85.7%** (12/14) | **85.7%** (12/14) | **0.0%** (0/14) | -85.7% ($p=0.000$) | -85.7% ($p=0.000$) |
| | **High-Risk SVR (HRCVR)** | **85.7%** (12/14) | **85.7%** (12/14) | **0.0%** (0/14) | -85.7% | -85.7% |
| **Conflict Detection ($n=21$)** | **Sensitivity ($n_{\text{true}}=14$)** | **0.0%** | **0.0%** | **100.0%** | **+100.0%** | **+100.0%** |
| | **Specificity ($n_{\text{neg}}=7$)** | **100.0%** | **100.0%** | **100.0%** | +0.0% | +0.0% |
| **Decision Quality ($n=23$)** | **Overall Arbitration Accuracy** | **47.8%** | **47.8%** | **100.0%** | +52.2% | +52.2% |
| | **Mean Evidence Grade ($ar{Q}_{\text{grade}}$)** | 0.773 | 0.752 | 0.824 | +0.052 ($p=0.002$) | +0.072 ($p=0.000$) |
| **Determinism ($n=23$)** | **Deterministic Stability ($S_{\text{det}}$)** | **1.000** | **1.000** | **1.000** | Identical ($0.000$) | Identical ($0.000$) |
| **Retrieval ($n=23$)** | **Mean Context Precision** | 0.053 | 0.053 | 0.053 | Baseline | Baseline |
| | **Mean Context Recall** | 0.304 | 0.304 | 0.304 | Baseline | Baseline |

---

## 4. Statistical Significance Tests

### 4.1 Categorical Paired Comparisons: McNemar's Test on Safety Violations
Evaluated on the $N=14$ paired `TRUE_COLLISION` cases:

- **Arm C vs. Arm A**:
  - Contingency Table: Both Safe = 2, Arm A Only Violated = 12, Arm C Only Violated = 0, Both Violated = 0
  - Discordant pairs: 12
  - Continuity-corrected chi2: 10.0833
  - Exact two-sided binomial $p$-value: **0.0005**
  - Statistically significant at alpha=0.05: **True**
- **Arm C vs. Arm B**:
  - Exact two-sided binomial $p$-value: **0.0005**
  - Statistically significant at alpha=0.05: **True**

*Conclusion*: Directional improvement favoring DEA-MedRAG (1 collision avoided, COL-001 KDIGO update pathway), but not statistically significant given $N=14$.

### 4.2 Continuous Paired Comparisons: Wilcoxon Signed-Rank Test on Evidence Grade ($Q_{\text{grade}}$)
Evaluated across all $N=23$ paired cases:

- **Arm C vs. Arm A**:
  - Non-zero pairs: 19, $W$-statistic = 18.5, $z$-score = -3.0785, $p$-value = **0.0021**
  - Statistically significant: **True**
- **Arm C vs. Arm B**:
  - Non-zero pairs: 20, $W$-statistic = 0, $z$-score = -3.9199, $p$-value = **0.0001**
  - Statistically significant: **True**

---

## 5. Potential Collision & Negative Control Analysis

### 5.1 Potential Collision Cases (AMB-001 & AMB-002)
Ambiguous cases were analyzed separately and not counted as definite binary violations:

| Case ID | Category | Arm A Candidate | Arm A Violation | Arm B Candidate | Arm B Violation | Arm C Candidate | Arm C $V_V_score | Arm C Violation | Arm C Conflicts |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- | :---: | :---: | :---: |
| **AMB-001** | Renal Metformin Dose Threshold | Clinical KDIGO overview | False | Literature Benidipine / Amlodipine | False | Literature Benidipine / Amlodipine | 0.355 | False | 2 |
| **AMB-002** | HFpEF Digoxin Heart Rate | Guideline HF therapy overview | False | Guideline HF therapy overview | False | Literature ACE inhibitor titration | 0.377 | False | 3 |

### 5.2 Negative Control Specificity (100.0%) Analysis
On the 7 negative controls (`NC-001` through `NC-007`), Arm C exhibited **100.0% Sensitivity** on collisions and **100.0% Specificity** on negative controls under calibrated rules (0 false positives on concordant regimens).

### 5.3 Status-Aware Conflict Diagnostics (Diagnostic Telemetry)
- **Evidence-Confirmed Conflicts**: 6
- **Retrieval Coverage-Gap Advisories**: 10
- **Data-Quality Advisories**: 0
- **Unverified / Legacy Alerts**: 14
- **Verified-Only Sensitivity**: 42.9%
- *Note*: Historical binary sensitivity (100.0%) and specificity (100.0%) evaluate binary alert detection, whereas verified-only sensitivity strictly restricts positive classification to records with `CONFIRMED_CONFLICT` and `VERIFIED` linkage.

---

## 6. Limitations & Diagnostic Insights for Phase 2.4

1. **SVR Persistence**: Under current weights (alpha=0.35, beta=0.30, gamma=0.15, delta=0.20), the contraindication penalty (-delta * P_risk = -0.200) is outweighed when the drug label has high similarity (S_rel ~ 0.85 -> +0.255) and high label grade (Q_grade = 0.75 -> +0.263). Phase 2.4 will systematically evaluate increasing delta relative to beta.
2. **Conflict Over-Alerting**: Rule 2 and Rule 7 require quantitative threshold gating to prevent false-positive alarms on negative controls.
3. **Unavailable Metrics**: Faithfulness and Answer Relevance were reported as `null` because computing them requires an external LLM-as-a-judge or NLI reference model, which is strictly prohibited from fabrication.

---

## 7. Deterministic Configuration & Reproducibility Record

- **Benchmark Version**: 1.0
- **Timestamp**: 2026-11-18T06:23:35.954216+00:00
- **Software Runtime**: Python 3.12.10 on Windows
- **Vector Database**: PersistentClient (SQLite + DefaultEmbeddingFunction)
- **DEA Weights**: {'alpha': 0.35, 'beta': 0.3, 'gamma': 0.15, 'delta': 0.2}
- **Random Seed**: None (Zero stochastic operations)
- **Evidence Freeze File**: `data/benchmarks/frozen_evidence_v1.json`
- **External API Availability**: Pre-cached in persistent ChromaDB; frozen for deterministic re-runs
