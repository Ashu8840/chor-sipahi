import express from "express";
import {
  getLeaderboard,
  getRoleLeaderboard,
  getTopPlayers,
} from "../controllers/leaderboard.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", optionalAuth, getLeaderboard);

router.get("/role/:role", getRoleLeaderboard);

router.get("/top", getTopPlayers);

export default router;
