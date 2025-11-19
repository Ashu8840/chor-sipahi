import User from "../models/User.model.js";
import logger from "../config/logger.js";

const getTimeFilter = (period) => {
  const now = new Date();
  switch (period) {
    case "weekly":
      return new Date(now.setDate(now.getDate() - 7));
    case "monthly":
      return new Date(now.setMonth(now.getMonth() - 1));
    case "all-time":
    default:
      return null;
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const { period = "all-time", page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    const timeFilter = getTimeFilter(period);

    if (timeFilter) {
      query.lastSeen = { $gte: timeFilter };
    }

    const leaderboard = await User.find(query)
      .select("username displayName avatar stats")
      .sort({ "stats.totalPoints": -1, "stats.wins": -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    let myRank = null;
    if (req.userId) {
      const myUser = await User.findById(req.userId).select("stats");
      if (myUser) {
        myRank =
          (await User.countDocuments({
            ...query,
            $or: [
              { "stats.totalPoints": { $gt: myUser.stats.totalPoints } },
              {
                "stats.totalPoints": myUser.stats.totalPoints,
                "stats.wins": { $gt: myUser.stats.wins },
              },
            ],
          })) + 1;
      }
    }

    res.json({
      success: true,
      period,
      leaderboard: leaderboard.map((user, index) => ({
        rank: skip + index + 1,
        userId: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        points: user.stats.totalPoints,
        wins: user.stats.wins,
        losses: user.stats.losses,
      })),
      myRank,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leaderboard",
      error: error.message,
    });
  }
};

export const getRoleLeaderboard = async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const validRoles = ["Raja", "Mantri", "Sipahi", "Chor"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const sortField = `stats.roles.${role}.timesPlayed`;
    const pointsField = `stats.roles.${role}.points`;

    const leaderboard = await User.find({ [sortField]: { $gt: 0 } })
      .select("username displayName avatar stats")
      .sort({ [pointsField]: -1, [sortField]: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ [sortField]: { $gt: 0 } });

    res.json({
      success: true,
      role,
      leaderboard: leaderboard.map((user, index) => ({
        rank: skip + index + 1,
        userId: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        timesPlayed: user.stats.roles[role].timesPlayed,
        points: user.stats.roles[role].points,
        winRate:
          user.stats.roles[role].timesPlayed > 0
            ? (
                (user.stats.roles[role].wins /
                  user.stats.roles[role].timesPlayed) *
                100
              ).toFixed(2)
            : 0,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get role leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching role leaderboard",
      error: error.message,
    });
  }
};

export const getTopPlayers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topPlayers = await User.find()
      .select("username displayName avatar stats")
      .sort({ "stats.totalPoints": -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      topPlayers: topPlayers.map((user, index) => ({
        rank: index + 1,
        userId: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        points: user.stats.totalPoints,
        wins: user.stats.wins,
      })),
    });
  } catch (error) {
    logger.error("Get top players error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching top players",
      error: error.message,
    });
  }
};
