import express from "express";
import {
  signup,
  login,
  getMe,
  updateProfile,
  logout,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  signupValidation,
  loginValidation,
  validate,
} from "../middleware/validation.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.middleware.js";
import { upload, processImage } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/signup", authLimiter, signupValidation, validate, signup);

router.post("/login", authLimiter, loginValidation, validate, login);

router.get("/me", authenticate, getMe);

router.put(
  "/profile",
  authenticate,
  upload.single("avatar"),
  processImage,
  updateProfile
);

router.post("/logout", authenticate, logout);

export default router;
