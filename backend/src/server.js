import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/database.js";
import logger from "./config/logger.js";
import { apiLimiter } from "./middleware/rateLimiter.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import matchRoutes from "./routes/match.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import reportRoutes from "./routes/report.routes.js";
import initializeSocket from "./socket/socketHandler.js";
import roomCleanupService from "./services/roomCleanup.service.js";

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with performance optimizations
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:8081",
      "http://10.118.140.93:8081",
      "https://chor-sipahi.vercel.app",
      "https://chor-sipahi-br9m.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  // Performance optimizations for 200+ concurrent users
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 60000, // 60s
  pingInterval: 25000, // 25s
  upgradeTimeout: 10000, // 10s
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024, // Compress only messages > 1KB
  },
  httpCompression: {
    threshold: 1024,
  },
  // Connection limits
  connectTimeout: 45000,
  // Enable long polling fallback
  allowEIO3: true,
});

// Connect to MongoDB
connectDB().then(async () => {
  // Delete all existing rooms on startup
  await roomCleanupService.deleteAllRooms();
  
  // Start automatic cleanup job (runs every 5 minutes)
  roomCleanupService.startAutomaticCleanup();
  
  logger.info("✅ Room cleanup service initialized");
}).catch((error) => {
  logger.error("Database connection failed:", error);
  process.exit(1);
});

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS - Remove trailing slash to fix CORS error
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8081",
  "http://10.118.140.93:8081",
  "https://chor-sipahi.vercel.app",
  "https://chor-sipahi-br9m.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      // Remove trailing slash from origin if present
      const normalizedOrigin = origin.replace(/\/$/, "");

      if (
        allowedOrigins.some((allowed) => {
          const normalizedAllowed = allowed.replace(/\/$/, "");
          return normalizedAllowed === normalizedOrigin;
        })
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use("/api", apiLimiter);

// Static files
app.use("/uploads", express.static("uploads"));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);

// Initialize Socket.IO
initializeSocket(io);

// Error handling
app.use((err, req, res, next) => {
  logger.error("Server error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Import cleanup utilities (at top of file for proper ES module syntax)
import memoryManager from "./utils/memoryManager.js";
import performanceMonitor from "./utils/performanceMonitor.js";
import socketRateLimiter from "./middleware/socketRateLimiter.js";
import { EventEmitter } from "events";

// Performance optimizations for Node.js process
// Increase max listeners to handle 200+ socket connections
EventEmitter.defaultMaxListeners = 100;

// Optimize garbage collection (use --max-old-space-size=4096 in production)
if (process.env.NODE_ENV === "production") {
  logger.info("🔧 Production optimizations enabled");
}

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`🎮 Socket.IO initialized for high concurrency`);
  logger.info(`⚡ Max connections: Optimized for 200+ users`);
  logger.info(
    `💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
  );
});

// Graceful shutdown with cleanup
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info("🔒 HTTP server closed");

    try {
      // Cleanup resources
      roomCleanupService.stopAutomaticCleanup();
      memoryManager.destroy();
      performanceMonitor.destroy();
      socketRateLimiter.destroy();

      // Close database connection
      const mongoose = await import("mongoose");
      await mongoose.default.connection.close();
      logger.info("💾 Database connection closed");

      logger.info("✅ Graceful shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error("⚠️ Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (err) => {
  logger.error("❌ Unhandled Rejection:", err);
  gracefulShutdown("UnhandledRejection");
});

process.on("uncaughtException", (err) => {
  logger.error("❌ Uncaught Exception:", err);
  gracefulShutdown("UncaughtException");
});

export { io };
export default app;
