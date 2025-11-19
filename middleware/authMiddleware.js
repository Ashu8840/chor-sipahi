import jwt from "jsonwebtoken";
import User from "../models/User.js";

const buildCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const setAuthCookie = (res, token) => {
  res.cookie("token", token, buildCookieOptions());
};

export const clearAuthCookie = (res) => {
  res.cookie("token", "", { ...buildCookieOptions(), maxAge: 0 });
};

export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const verifySocketToken = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    return user;
  } catch (error) {
    return null;
  }
};
