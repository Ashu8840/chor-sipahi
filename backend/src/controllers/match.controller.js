import Match from "../models/Match.model.js";
import User from "../models/User.model.js";
import logger from "../config/logger.js";

export const getMyMatches = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const matches = await Match.find({
      "players.userId": req.userId,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("players.userId", "username displayName avatar");

    const total = await Match.countDocuments({
      "players.userId": req.userId,
      status: "completed",
    });

    res.json({
      success: true,
      matches: matches.map((match) => ({
        matchId: match.matchId,
        winner: match.winner,
        players: match.players,
        totalRounds: match.totalRounds,
        startedAt: match.startedAt,
        endedAt: match.endedAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get my matches error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching matches",
      error: error.message,
    });
  }
};

export const getMatch = async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findOne({ matchId }).populate(
      "players.userId",
      "username displayName avatar"
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    const isPlayer = match.players.some(
      (p) => p.userId._id.toString() === req.userId.toString()
    );

    if (!isPlayer && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      match: {
        matchId: match.matchId,
        winner: match.winner,
        players: match.players,
        rounds: match.rounds,
        totalRounds: match.totalRounds,
        status: match.status,
        startedAt: match.startedAt,
        endedAt: match.endedAt,
      },
    });
  } catch (error) {
    logger.error("Get match error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching match",
      error: error.message,
    });
  }
};

export const getDefeatedPlayers = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("defeated")
      .populate("defeated", "username displayName avatar stats");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      defeated: user.defeated.map((opponent) => ({
        userId: opponent._id,
        username: opponent.username,
        displayName: opponent.displayName,
        avatar: opponent.avatar,
        points: opponent.stats.totalPoints,
        wins: opponent.stats.wins,
      })),
    });
  } catch (error) {
    logger.error("Get defeated players error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching defeated players",
      error: error.message,
    });
  }
};

export const getDefeatedByPlayers = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("defeatedBy")
      .populate("defeatedBy", "username displayName avatar stats");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      defeatedBy: user.defeatedBy.map((opponent) => ({
        userId: opponent._id,
        username: opponent.username,
        displayName: opponent.displayName,
        avatar: opponent.avatar,
        points: opponent.stats.totalPoints,
        wins: opponent.stats.wins,
      })),
    });
  } catch (error) {
    logger.error("Get defeated by players error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching defeated by players",
      error: error.message,
    });
  }
};

export const getPlayerStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      "username displayName avatar stats createdAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const totalMatches = await Match.countDocuments({
      "players.userId": userId,
      status: "completed",
    });

    res.json({
      success: true,
      player: {
        userId: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        stats: {
          ...user.stats,
          totalMatches,
          winRate:
            totalMatches > 0
              ? ((user.stats.wins / totalMatches) * 100).toFixed(2)
              : 0,
        },
        memberSince: user.createdAt,
      },
    });
  } catch (error) {
    logger.error("Get player stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching player stats",
      error: error.message,
    });
  }
};
