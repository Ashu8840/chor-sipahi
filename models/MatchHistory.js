import mongoose from "mongoose";

const matchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: String,
  displayName: String,
  roomCode: String,
  players: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      username: String,
      displayName: String,
      finalScore: Number,
      rank: Number,
    },
  ],
  yourFinalScore: Number,
  yourRank: Number,
  result: {
    type: String,
    enum: ["win", "loss"],
    required: true,
  },
  pointsEarned: Number,
  roundsPlayed: Number,
  playedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster user history queries
matchHistorySchema.index({ userId: 1, playedAt: -1 });

export default mongoose.model("MatchHistory", matchHistorySchema);
