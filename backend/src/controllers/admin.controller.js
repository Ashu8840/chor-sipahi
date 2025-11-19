import User from "../models/User.model.js";
import Match from "../models/Match.model.js";
import Room from "../models/Room.model.js";
import Report from "../models/Report.model.js";
import logger from "../config/logger.js";

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { username: new RegExp(search, "i") },
          { displayName: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
        ],
      };
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Cannot ban admin users",
      });
    }

    user.isBanned = true;
    await user.save();

    logger.warn(`User ${user.username} banned by admin ${req.user.username}`);

    res.json({
      success: true,
      message: "User banned successfully",
    });
  } catch (error) {
    logger.error("Ban user error:", error);
    res.status(500).json({
      success: false,
      message: "Error banning user",
      error: error.message,
    });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBanned = false;
    await user.save();

    logger.info(`User ${user.username} unbanned by admin ${req.user.username}`);

    res.json({
      success: true,
      message: "User unbanned successfully",
    });
  } catch (error) {
    logger.error("Unban user error:", error);
    res.status(500).json({
      success: false,
      message: "Error unbanning user",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }

    await User.deleteOne({ _id: userId });

    logger.warn(`User ${user.username} deleted by admin ${req.user.username}`);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};

export const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const totalMatches = await Match.countDocuments();
    const activeRooms = await Room.countDocuments({ status: "waiting" });
    const pendingReports = await Report.countDocuments({ status: "pending" });

    const recentUsers = await User.find()
      .select("username createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalUsers,
        bannedUsers,
        totalMatches,
        activeRooms,
        pendingReports,
        recentUsers,
      },
    });
  } catch (error) {
    logger.error("Get admin stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching stats",
      error: error.message,
    });
  }
};

export const getAllRooms = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const rooms = await Room.find()
      .populate("host", "username displayName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Room.countDocuments();

    res.json({
      success: true,
      rooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get all rooms error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching rooms",
      error: error.message,
    });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    await Room.deleteOne({ roomId });

    logger.warn(`Room ${roomId} deleted by admin ${req.user.username}`);

    res.json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    logger.error("Delete room error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting room",
      error: error.message,
    });
  }
};
