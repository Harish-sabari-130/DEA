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
  ingestSyntheticDocument,
} from "../lib/medrag";

const router: IRouter = Router();

router.post("/analyze", (req, res): void => {
  const parsed = AnalyzeCaseBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid analysis profile");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const report = analyzePatient(parsed.data);
  res.json(report);
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
  res.status(201).json(ingestSyntheticDocument(parsed.data));
});

export default router;