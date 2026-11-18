import { Router, type IRouter } from "express";
import {
  AnalyzeCaseBody,
  ClinicalSignoffBody,
  EvaluateFrameworkBody,
  IngestDocumentBody,
  ReconcileMedicationsBody,
  VerifyAuditHashBody,
  WhatIfSimulationBody,
} from "@workspace/api-zod";
import {
  analyzePatient,
  evaluateFramework,
  getAuditHistoryList,
  getAuditReport,
  getDemoCases,
  getKnowledgeStats,
  ingestDocument,
  reconcileMedications,
  signoffClinicalDecision,
  verifyAuditReportHash,
  whatIfSimulation,
} from "../lib/medrag";

const router: IRouter = Router();

router.post("/analyze", (req, res): void => {
  const rawData = req.body && typeof req.body === "object" && "patient" in req.body
    ? { ...(req.body as any).patient, weights: (req.body as any).weights }
    : req.body;
  const parsed = AnalyzeCaseBody.safeParse(rawData);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid analysis profile");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  void analyzePatient(parsed.data)
    .then((report) => res.json(report))
    .catch((error: unknown) => {
      req.log.error({ err: error }, "Analysis pipeline failed");
      res.status(503).json({ error: error instanceof Error ? error.message : "Analysis pipeline failed" });
    });
});

router.get("/demo-cases", (_req, res): void => {
  res.json(getDemoCases());
});

router.post("/evaluate", (req, res): void => {
  const parsed = EvaluateFrameworkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  void evaluateFramework(parsed.data)
    .then((result) => res.json(result))
    .catch((error: unknown) => {
      req.log.error({ err: error }, "Evaluation pipeline failed");
      res.status(503).json({ error: error instanceof Error ? error.message : "Evaluation pipeline failed" });
    });
});

router.post("/reconcile", (req, res): void => {
  const parsed = ReconcileMedicationsBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid reconciliation input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  void reconcileMedications(parsed.data)
    .then((report) => res.json(report))
    .catch((error: unknown) => {
      req.log.error({ err: error }, "Medication reconciliation failed");
      res.status(503).json({ error: error instanceof Error ? error.message : "Medication reconciliation failed" });
    });
});

router.post("/what-if", (req, res): void => {
  const parsed = WhatIfSimulationBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid What-If simulation input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  void whatIfSimulation(parsed.data)
    .then((report) => res.json(report))
    .catch((error: unknown) => {
      req.log.error({ err: error }, "What-If simulation failed");
      res.status(503).json({ error: error instanceof Error ? error.message : "What-If simulation failed" });
    });
});

router.post("/ingest", (req, res): void => {
  const parsed = IngestDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  void ingestDocument(parsed.data)
    .then((receipt) => res.status(201).json(receipt))
    .catch((error: unknown) => {
      req.log.error({ err: error }, "Document ingestion failed");
      res.status(503).json({ error: error instanceof Error ? error.message : "Document ingestion failed" });
    });
});

router.get("/knowledge-stats", (_req, res): void => {
  void getKnowledgeStats()
    .then((stats) => res.json(stats))
    .catch((error: unknown) => {
      res.status(503).json({ error: error instanceof Error ? error.message : "Knowledge stats unavailable" });
    });
});

router.post("/clinical-signoff", (req, res): void => {
  const parsed = ClinicalSignoffBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid clinical sign-off input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  void signoffClinicalDecision(parsed.data)
    .then((result) => res.json(result))
    .catch((error: unknown) => {
      req.log.error({ err: error }, "Clinical sign-off recording failed");
      res.status(400).json({ error: error instanceof Error ? error.message : "Clinical sign-off recording failed" });
    });
});

router.get("/audit-history", (req, res): void => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  void getAuditHistoryList(limit)
    .then((history) => res.json(history))
    .catch((error: unknown) => {
      req.log.error({ err: error }, "Failed to fetch audit history");
      res.status(503).json({ error: error instanceof Error ? error.message : "Failed to fetch audit history" });
    });
});

router.get("/audit-report/:reportId", (req, res): void => {
  void getAuditReport(req.params.reportId)
    .then((report) => {
      if (!report) {
        res.status(404).json({ error: "Audit report not found" });
        return;
      }
      res.json(report);
    })
    .catch((error: unknown) => {
      req.log.error({ err: error }, "Failed to fetch audit report");
      res.status(503).json({ error: error instanceof Error ? error.message : "Failed to fetch audit report" });
    });
});

router.post("/verify-audit-hash", (req, res): void => {
  const parsed = VerifyAuditHashBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid audit hash verification payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  void Promise.resolve(verifyAuditReportHash(parsed.data))
    .then((verification) => res.json(verification))
    .catch((error: unknown) => {
      req.log.error({ err: error }, "Hash verification failed");
      res.status(503).json({ error: error instanceof Error ? error.message : "Hash verification failed" });
    });
});

export default router;