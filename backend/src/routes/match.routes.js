import express from "express";
import {
  getMyMatches,
  getMatch,
  getDefeatedPlayers,
  getDefeatedByPlayers,
  getPlayerStats,
} from "../controllers/match.controller.js";
import { authenticate, optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/my-matches", authenticate, getMyMatches);

router.get("/defeated", authenticate, getDefeatedPlayers);

router.get("/defeated-by", authenticate, getDefeatedByPlayers);

router.get("/player/:userId", optionalAuth, getPlayerStats);

router.get("/:matchId", authenticate, getMatch);

export default router;
