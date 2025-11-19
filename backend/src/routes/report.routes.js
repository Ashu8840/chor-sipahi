import express from "express";
import {
  createReport,
  getMyReports,
} from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  reportValidation,
  validate,
} from "../middleware/validation.middleware.js";
import { reportLimiter } from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  reportLimiter,
  reportValidation,
  validate,
  createReport
);

router.get("/my-reports", authenticate, getMyReports);

export default router;
