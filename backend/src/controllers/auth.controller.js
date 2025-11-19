import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import logger from "../config/logger.js";

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

export const signup = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    logger.info(`Signup attempt for username: ${username}, email: ${email}`);

    const existingUser = await User.findOne({
      username: new RegExp(`^${username}$`, "i"),
    });

    if (existingUser) {
      logger.warn(`Signup failed: Username ${username} already exists`);
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      logger.warn(`Signup failed: Email ${email} already registered`);
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    logger.info(`Creating new user: ${username}`);

    const user = new User({
      username: username.toLowerCase(),
      email,
      password,
      displayName: displayName || username,
    });

    logger.info(`Saving user to database...`);
    await user.save();
    logger.info(`User saved successfully: ${username}`);

    const token = generateToken(user._id);

    logger.info(`New user registered: ${username}`);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        stats: user.stats,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    logger.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Account has been banned",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user._id);

    user.updateLastSeen();

    logger.info(`User logged in: ${user.username}`);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        stats: user.stats,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        stats: user.stats,
        isAdmin: user.isAdmin,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { displayName, email } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (displayName) user.displayName = displayName;
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
      user.email = email;
    }

    if (req.processedImage) {
      user.avatar = req.processedImage.url;
    }

    await user.save();

    logger.info(`User profile updated: ${user.username}`);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        stats: user.stats,
      },
    });
  } catch (error) {
    logger.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { lastSeen: Date.now() });

    logger.info(`User logged out: ${req.user.username}`);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging out",
      error: error.message,
    });
  }
};
