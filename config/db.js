import mongoose from "mongoose";

const { MONGO_URI, MONGO_DB_NAME } = process.env;

const buildMongoOptions = () => ({
  dbName: MONGO_DB_NAME || "chor-sipahi",
});

const connectDB = async () => {
  if (!MONGO_URI) {
    console.warn("⚠️ MONGO_URI is not defined. Skipping database connection.");
    return;
  }

  try {
    await mongoose.connect(MONGO_URI, buildMongoOptions());
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

export default connectDB;
