import { Router, type IRouter } from "express";
import {
  AnalyzeCaseBody,
  EvaluateFrameworkBody,
  IngestDocumentBody,
} from "@workspace/api-zod";
import {
  analyzePatient,
  evaluateFramework,
  getDemoCases,
  getKnowledgeStats,
  ingestDocument,
} from "../lib/medrag";

const router: IRouter = Router();

router.post("/analyze", (req, res): void => {
  const parsed = AnalyzeCaseBody.safeParse(req.body);
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
  res.json(evaluateFramework(parsed.data));
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

export default router;