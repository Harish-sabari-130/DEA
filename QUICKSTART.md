# DEA-MedRAG — Quickstart Guide

> **Deterministic Epistemic Arbitration in Multi-Agent Retrieval-Augmented Generation for Clinical Decision Support**  
> *Research Prototype — Academic and Clinical Evaluation Instrument*

---

## 1. System Overview

**DEA-MedRAG** is a multi-agent medical retrieval-augmented generation framework designed to resolve clinical guideline collisions deterministically. Unlike traditional LLM-based arbiters that suffer from stochastic jury drift, hallucinated compromises, and non-reproducible outputs, DEA evaluates treatment recommendations using a fixed, auditable mathematical formula over three isolated knowledge silos:

1. **Clinical Guidelines Silo** — Disease pathways, standard-of-care recommendations, diagnostic guidelines.
2. **Drug Information Silo** — DailyMed structured product labeling, contraindications, boxed warnings, renal/hepatic risk.
3. **Clinical Literature Silo** — PubMed trials, systematic reviews, meta-analyses, and observational studies.

```
                      ┌──────────────────────────────────────────────┐
                      │        DEA-MedRAG Web UI (React/Vite)        │
                      │   - Workspace (Case Analysis & Arbitration)  │
                      │   - Evaluation (Benchmark Comparison A/B/C)  │
                      │   - Knowledge Corpus (Silo Ingestion)        │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTP (port 5173 -> 3000/8090)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          Express API Server (Node.js)        │
                      │     artifacts/api-server/src/index.ts        │
                      └──────────────────────┬───────────────────────┘
                                             │ Subprocess (JSON stdin / stdout)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          RAG Worker (Python 3.12)            │
                      │               rag_worker.py                  │
                      ├──────────────────────┬───────────────────────┤
                      │  ChromaDB (Isolated) │  Deterministic DEA    │
                      │  - clinical_guidelines│  V_score Arbitration  │
                      │  - drug_information  │  OCEBM Q_grade Lookup │
                      │  - clinical_literature│  Regex P_risk Penalty │
                      └──────────────────────┴───────────────────────┘
```

---

## 2. Prerequisites

Ensure the following tools are installed on your machine:

| Component | Minimum Version | Recommended | Notes |
|:---|:---|:---|:---|
| **Python** | `3.12.x` | `3.12.10` | 64-bit with virtual environment support |
| **Node.js** | `>= 20.x` | `v20.19+` | Required for API server & frontend |
| **pnpm** | `>= 9.x` | `pnpm 9.15+` | Monorepo package manager (configured via `pnpm-workspace.yaml`) |
| **PowerShell / Bash** | Windows / Linux / macOS | Windows 10/11 or Ubuntu 22.04+ | Native OS shell |

---

## 3. Installation & Setup

Clone the repository and enter the primary project directory:

```powershell
cd c:\Users\2024\Downloads\Research-Prototype-Builder\Research-Prototype-Builder
```

### Step 3.1: Python Environment Setup

Create and activate a virtual environment, then install required dependencies:

```powershell
# Create virtual environment if not already present
python -m venv .venv

# Activate on Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Install core Python dependencies
pip install chromadb pypdf python-docx
```

*Note: ChromaDB will automatically download and cache the `all-MiniLM-L6-v2` embedding model locally on first run.*

### Step 3.2: Node.js & pnpm Monorepo Setup

Install workspace packages using `pnpm`:

```powershell
# Install all monorepo dependencies across artifacts and lib
pnpm install
```

---

## 4. Running the Application

To run the complete system locally, open two terminal windows from the `Research-Prototype-Builder` directory:

### Terminal 1: Backend API Server

The API server connects to the Python RAG engine and exposes the REST endpoints:

```powershell
cd artifacts/api-server

# Set port and start the server (PowerShell)
$env:PORT = "3000"
pnpm run dev
```

*On Linux/macOS:*
```bash
PORT=3000 pnpm run dev
```

*Expected Output:*
```text
[INFO] Server listening on port 3000
```

### Terminal 2: Frontend Web Interface

The frontend provides the interactive clinical dashboard, case arbitration view, benchmark comparison, and knowledge corpus management:

```powershell
cd artifacts/dea-medrag

# Set port and start Vite dev server (PowerShell)
$env:PORT = "5173"
$env:BASE_PATH = "/"
pnpm run dev
```

*On Linux/macOS:*
```bash
PORT=5173 BASE_PATH=/ pnpm run dev
```

Open your browser to:
👉 **`http://localhost:5173`**

---

## 3-Minute Live Presentation Script (For Evaluators & Judges)

This scripted walkthrough demonstrates all clinical decision support capabilities of **ClearDose DEA-MedRAG** within 3 minutes:

### Minute 1: High-Risk Case Ingestion, Decoupled Safety Banner & Smart Routing
1. **Open the Clinical Workspace**: Navigate to `http://localhost:5173`.
2. **Select Preset Benchmark Case**:
   - In the left sidebar under *Preset Benchmark Scenarios*, click **"Case 1: Severe CKD + T2D Guideline Collision (COL-001)"**.
   - Point out the **5-Second Patient Summary Card**:
     - Highlights Age 72, 6 active medications, abnormal eGFR of **22 mL/min/1.73m²** (in amber/red), and known conditions.
     - Displays the **Smart Routing Badge**: Automatically triaged to **High-Risk Deep Arbitration Path** with an unmissable pulsing **"NEEDS DOCTOR REVIEW"** tag.
3. **Inspect the Decoupled Red Safety Alert Banner**:
   - Notice the prominent, high-contrast Red Safety Banner rendered **above and separate from numerical scores**:
     - *Alert*: **Absolute Renal Contraindication Detected**
     - *Trigger*: Metformin with eGFR 22 mL/min (< 30 mL/min threshold).
     - *Clinical Hazard*: Fatal lactic acidosis risk due to severely impaired clearance.
     - *Authoritative Provenance*: DailyMed SPL SetID and KDIGO 2022 Guideline PMID `36272755`.
     - *Guaranteed Invariant*: Dangerous medications are **never buried** by high semantic similarity scores.

### Minute 2: DEA Math Breakdown & Live What-If Clinical Simulator
4. **Inspect the DEA Ranked Evidence Table**:
   - Explain the deterministic arbitration formula:
     $$V_{\text{score}} = (0.35 \times Q_{\text{grade}}) + (0.30 \times S_{\text{rel}}) + (0.15 \times T_{\text{recent}}) - (0.20 \times P_{\text{risk}})$$
   - Highlight Candidate #1: KDIGO 2022 Guideline Pathway ($V = 0.472$) — recommended because of high evidence quality ($Q=0.82$) and safe risk penalty ($P=0.10$).
   - Highlight Candidate #2: Metformin Continuation — flagged with `contraindicated_flag = True`, assigned $P_{\text{risk}} = 0.95$, and deterministically demoted below the safe guideline pathway.
5. **Test the Live What-If Simulator**:
   - In the right-hand **What-If Clinical Simulator** panel:
     - Change patient `eGFR` from `22` to `65` mL/min/1.73m² (simulating restored renal function).
     - Click **"Re-calculate Arbitration"** (or adjust the Risk Penalty slider $\delta$ to 0.40).
     - Watch the live update: the renal contraindication clears, the Red Safety Alert disappears, and Metformin is safely re-admitted to the viable treatment pathways.

### Minute 3: Medication Reconciler & 3-Arm Comparison Dashboard
6. **Medication List Reconciler**:
   - Open the **Medication Reconciler** view (or Drawer).
   - Show how the reconciler analyzes Outpatient vs Inpatient regimens:
     - Flags dose mismatches (e.g., Metformin 500 mg BID vs 1000 mg BID).
     - Identifies omitted discharge medications (e.g., Atorvastatin missing).
     - Highlights therapeutic duplications (e.g., concurrent NSAIDs or dual ACEi/ARB RAS blockade).
7. **Navigate to the Benchmark Comparison Dashboard (`/evaluation`)**:
   - Click **"Evaluation"** in the top navigation bar.
   - Show the **Real 3-Arm Empirical Benchmark Matrix** across all 23 patient collision scenarios:
     - **Arm A (Single-Agent RAG)**: 85.7% Safety Violation Rate, 47.8% Accuracy.
     - **Arm B (Naive Multi-Agent RAG)**: 85.7% Safety Violation Rate, 47.8% Accuracy.
     - **Arm C (ClearDose DEA-MedRAG)**: **0.0% Safety Violation Rate**, **95.7% Accuracy**, **100% Conflict Sensitivity**, **100% Specificity**, **1.000 Deterministic Stability**.
   - Point out the **Interactive Recharts**:
     - *Bar Chart*: 0 Safety Violations Missed by DEA vs 12 missed by naive LLM RAG.
     - *Weight Ablation Chart*: Demonstrates how removing the Risk Penalty ($\delta = 0$) causes the Safety Violation Rate to spike back to 78.6%.
   - Click **"Load Case in Workspace"** next to `COL-002` or `COL-003` in the **23-Patient Collision Explorer** to show 1-click seamless case switching.

---

## 5. System Health Check & Verification

You can verify that all components are connected and operational using PowerShell:

### Verify API Server & Python RAG Worker

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/knowledge-stats" -Method Get
```

*Expected JSON response:*
```json
{
  "database": "ChromaDB (persisted)",
  "embedding_provider": "all-MiniLM-L6-v2 via Chroma DefaultEmbeddingFunction",
  "silos": [
    { "domain": "clinical", "chunk_count": 12, "status": "operational" },
    { "domain": "drug", "chunk_count": 8, "status": "operational" },
    { "domain": "literature", "chunk_count": 15, "status": "operational" }
  ]
}
```

### Standalone Python Worker Test

You can also interact directly with `rag_worker.py` via standard input:

```powershell
# Run a quick stats query directly through Python
'{"action":"stats"}' | .venv\Scripts\python.exe rag_worker.py
```

---

## 6. Project Architecture & Directory Layout

```text
Research-Prototype-Builder/
├── artifacts/
│   ├── api-server/             # Express 5 REST API gateway
│   │   ├── src/index.ts        # Server entrypoint
│   │   └── src/lib/medrag.ts   # Subprocess bridge to Python RAG worker
│   └── dea-medrag/             # React 19 + Tailwind clinical web interface
│       ├── src/App.tsx         # Main UI (Workspace, Evaluation, Knowledge)
│       └── vite.config.ts      # Vite dev & proxy config (/api -> localhost:3000)
├── data/
│   ├── benchmarks/             # Ground-truth evaluation benchmarks (guideline_collision_v1.json)
│   └── chroma/                 # Persisted vector database collections
├── lib/
│   ├── api-client-react/       # Generated React Query hooks
│   ├── api-spec/               # OpenAPI 3.0 specification (`openapi.yaml`)
│   └── api-zod/                # Zod validation schemas for requests & responses
├── scripts/
│   ├── build_benchmark.py      # Benchmark generator
│   ├── evaluate_benchmark.py   # Multi-arm comparison runner (Arm A vs B vs C)
│   ├── run_weight_ablation.py  # DEA parameter sensitivity & ablation study
│   └── audit_conflict_rules.py # Conflict detection rule audit
├── tests/
│   ├── test_conflict_rule_audit.py  # Unit tests for rule calibration
│   └── test_medrag_integration.py   # Full integration suite
├── DEA_IMPLEMENTATION.md       # Complete mathematical specification of DEA
├── make_code_docx.py           # Automated Word (.docx) source portfolio generator
├── rag_worker.py               # Core Python retrieval & deterministic arbitration worker
└── QUICKSTART.md               # This guide
```

---

## 7. The DEA Scoring Formula

In the **Workspace** tab (`/`), clinical cases are evaluated by the deterministic arbitration formula:

$$V_{\text{score}} = (\alpha \times Q_{\text{grade}}) + (\beta \times S_{\text{rel}}) + (\gamma \times T_{\text{recent}}) - (\delta \times P_{\text{risk}})$$

| Symbol | Parameter | Meaning | Baseline Weight |
|:---:|:---|:---|:---:|
| $\alpha$ | `Q_grade` | OCEBM-derived Evidence Quality Grade (0.38 - 0.92) | **0.35** |
| $\beta$ | `S_rel` | ChromaDB Cosine Semantic Relevance | **0.30** |
| $\gamma$ | `T_recent` | Publication Recency Score ($(\text{year} - 2010)/20$) | **0.15** |
| $\delta$ | `P_risk` | Patient Safety Risk Penalty (Contraindications & Boxed Warnings) | **0.20** |

*All scores are rounded to 3 decimal places with deterministic alphabetical tie-breaking. Zero LLM calls are used during arbitration.*

---

## 8. Running Benchmarks & Diagnostics

To run the scientific validation and audit scripts:

### 1. Run Diagnostic Conflict Rule Audit
Verifies all 7 clinical conflict collision rules against the benchmark cases:
```powershell
python scripts/audit_conflict_rules.py
```

### 2. Run Benchmark Evaluation Suite
Evaluates Arm A (Single-Agent), Arm B (Naive Multi-Agent), and Arm C (DEA-MedRAG):
```powershell
python scripts/evaluate_benchmark.py
```

### 3. Run Weight Sensitivity & Ablation Study
```powershell
python scripts/run_weight_ablation.py
```

### 4. Run Automated Test Suite
```powershell
python -m unittest discover tests
```

---

## 9. Generating Source Code Documentation

To export the entire project source code into a clean, formatted Word document (`DEA_MedRAG_Source_Code.docx`):

```powershell
python make_code_docx.py
```

- Scans 240+ project files across TypeScript, Python, CSS, and Markdown.
- Automatically excludes `.git`, `node_modules`, `.venv`, and large binary caches.
- Sanitizes XML control characters to ensure valid Word formatting.

---

## 10. Environment Variables Reference

| Variable | Default Value | Description |
|:---|:---|:---|
| `PORT` | `3000` (API) / `5173` (Vite) | Port number for respective servers |
| `BASE_PATH` | `/` | Base URL path for the Vite frontend |
| `MEDRAG_PYTHON` | `.venv/Scripts/python.exe` | Explicit Python interpreter path for `medrag.ts` |
| `MEDRAG_WORKER_PATH`| `rag_worker.py` | Path to worker script |
| `MEDRAG_DATA_ROOT` | `data/` | Root directory for benchmark and reference files |
| `MEDRAG_CHROMA_PATH`| `data/chroma/` | Persisted ChromaDB storage directory |
| `MEDRAG_LIVE_EVIDENCE`| `1` | Enables live querying against PubMed and DailyMed SPL |

---

## 11. Troubleshooting

### 1. `Local Chroma RAG worker unavailable`
- Ensure `.venv` exists and dependencies are installed (`pip install chromadb pypdf`).
- Verify that `MEDRAG_PYTHON` points to `.venv/Scripts/python.exe` or that Python 3.12 is in your system `PATH`.

### 2. `All strings must be XML compatible`
- This has been resolved in `make_code_docx.py` via `clean_xml()`. If creating new documents, ensure no literal raw control codes (`\x00-\x1F`) are written.

### 3. Port Conflicts
- If port `3000` or `5173` is busy, specify an alternative port in PowerShell:
  ```powershell
  $env:PORT = "8090"; pnpm run dev
  ```
  *(Update `vite.config.ts` proxy target if changing the API server port).*
