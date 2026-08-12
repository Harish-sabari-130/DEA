import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const respondHealthy = (_req: Request, res: Response): void => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
};

router.get("/healthz", respondHealthy);
router.get("/health", respondHealthy);

export default router;
