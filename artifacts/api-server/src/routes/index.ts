import { Router, type IRouter } from "express";
import healthRouter from "./health";
import medragRouter from "./medrag";

const router: IRouter = Router();

router.use(healthRouter);
router.use(medragRouter);

export default router;
