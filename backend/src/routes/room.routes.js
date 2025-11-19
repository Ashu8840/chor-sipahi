import express from "express";
import {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  deleteRoom,
} from "../controllers/room.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  roomValidation,
  validate,
} from "../middleware/validation.middleware.js";
import { roomCreationLimiter } from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  roomCreationLimiter,
  roomValidation,
  validate,
  createRoom
);

router.get("/", getRooms);

router.get("/:roomId", getRoom);

router.post("/:roomId/join", authenticate, joinRoom);

router.post("/:roomId/leave", authenticate, leaveRoom);

router.delete("/:roomId", authenticate, deleteRoom);

export default router;
