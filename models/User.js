import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 20,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 30,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  profilePicture: {
    type: String,
    default:
      "https://res.cloudinary.com/dj0vncxox/image/upload/v1/defaults/default-avatar.png",
  },
  cloudinaryId: {
    type: String,
    default: null,
  },
  stats: {
    totalMatches: {
      type: Number,
      default: 0,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    wins: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries (username already has unique: true, no need for separate index)
userSchema.index({ "stats.totalPoints": -1 });

export default mongoose.model("User", userSchema);
