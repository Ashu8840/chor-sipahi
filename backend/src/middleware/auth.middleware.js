import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import logger from "../config/logger.js";

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account has been banned" });
    }

    req.user = user;
    req.userId = user._id;
    req.token = token;

    user
      .updateLastSeen()
      .catch((err) => logger.error("Update lastSeen failed:", err));

    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (user && !user.isBanned) {
        req.user = user;
        req.userId = user._id;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

export const isAdmin = async (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
