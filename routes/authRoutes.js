import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  protect,
} from "../middleware/authMiddleware.js";

const router = express.Router();

const serializeUser = (user) => ({
  id: user._id,
  username: user.username,
  displayName: user.displayName,
  profilePicture: user.profilePicture,
  stats: user.stats,
  createdAt: user.createdAt,
});

router.post("/signup", upload.single("profilePicture"), async (req, res) => {
  try {
    const { username, displayName, password } = req.body;

    if (!username || !displayName || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedUsername = username.trim().toLowerCase();

    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: normalizedUsername,
      displayName: displayName.trim(),
      password: hashedPassword,
      profilePicture: req.file?.path || undefined,
      cloudinaryId: req.file?.filename || undefined,
    });

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.status(201).json({
      message: "Account created",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Signup error", error.message);
    res.status(500).json({ message: "Failed to create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({
      username: username.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.json({
      message: "Login successful",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Login error", error.message);
    res.status(500).json({ message: "Failed to login" });
  }
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

router.get("/me", protect, (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

export default router;
