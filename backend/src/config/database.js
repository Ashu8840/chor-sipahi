import mongoose from "mongoose";
import logger from "./logger.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pool settings for high concurrency (200+ users)
      maxPoolSize: 50, // Increase pool size
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      // Performance optimizations
      retryWrites: true,
      w: "majority",
      readPreference: "primaryPreferred",
      // Prevent memory leaks
      maxIdleTimeMS: 60000,
      waitQueueTimeoutMS: 10000,
    });

    // Set up connection event handlers
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });

    // Enable query logging in development
    if (process.env.NODE_ENV === "development") {
      mongoose.set("debug", true);
    }

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Connection pool size: ${conn.connection.maxPoolSize}`);
  } catch (error) {
    logger.error(`❌ Database connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
