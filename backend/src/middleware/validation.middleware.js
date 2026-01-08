import { body, validationResult } from "express-validator";
import xss from "xss";
import logger from "../config/logger.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  logger.warn("Validation failed:", {
    body: req.body,
    errors: errors.array(),
  });

  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors.array(),
  });
};

export const sanitizeInput = (fields) => {
  return (req, res, next) => {
    fields.forEach((field) => {
      if (req.body[field]) {
        req.body[field] = xss(req.body[field]);
      }
    });
    next();
  };
};

export const signupValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be 3-20 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores")
    .toLowerCase(),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("displayName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage("Display name must be 2-30 characters"),
];

export const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

export const roomValidation = [
  body("name")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Room name must be 3-50 characters"),
  body("mode")
    .isIn(["chat", "video"])
    .withMessage("Mode must be either chat or video"),
  body("gameType")
    .optional()
    .isIn(["chor-sipahi", "bingo", "uno"])
    .withMessage("Invalid game type"),
  body("isPublic").optional().toBoolean(),
  body("passkey")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 4, max: 20 })
    .withMessage("Passkey must be 4-20 characters"),
  body("maxPlayers")
    .optional()
    .isInt({ min: 2, max: 10 })
    .withMessage("Max players must be between 2 and 10"),
  body("unoSettings.maxPlayers")
    .if(body("gameType").equals("uno"))
    .optional()
    .isInt({ min: 2, max: 10 })
    .withMessage("UNO max players must be between 2 and 10"),
];

export const reportValidation = [
  body("reportedId")
    .notEmpty()
    .withMessage("Reported user ID is required")
    .isMongoId()
    .withMessage("Invalid user ID"),
  body("reason")
    .isIn([
      "offensive-language",
      "cheating",
      "harassment",
      "inappropriate-behavior",
      "other",
    ])
    .withMessage("Invalid report reason"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters"),
];
