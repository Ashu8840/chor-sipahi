import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 100 : 5, // 100 in dev, 5 in production
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true,
});

export const roomCreationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: "Too many rooms created, please wait before creating another.",
});

export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many reports submitted, please try again later.",
});
