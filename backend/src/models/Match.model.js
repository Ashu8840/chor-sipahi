import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["chat", "video"],
      required: true,
    },
    players: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        username: String,
        displayName: String,
        finalScore: { type: Number, default: 0 },
        placement: Number,
      },
    ],
    rounds: [
      {
        roundNumber: Number,
        roles: {
          type: Map,
          of: String,
        },
        sipahi: {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          username: String,
        },
        chor: {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          username: String,
        },
        guessedPlayer: {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          username: String,
        },
        correctGuess: Boolean,
        roundScores: {
          type: Map,
          of: Number,
        },
        revealedRoles: [
          {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            role: String,
            revealedAt: Date,
          },
        ],
        startTime: Date,
        endTime: Date,
      },
    ],
    winner: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: String,
      displayName: String,
      finalScore: Number,
    },
    status: {
      type: String,
      enum: ["in-progress", "completed", "abandoned"],
      default: "in-progress",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: Date,
    duration: Number,
  },
  { timestamps: true }
);

matchSchema.index({ "players.userId": 1, createdAt: -1 });
matchSchema.index({ status: 1, createdAt: -1 });
matchSchema.index({ "winner.userId": 1 });

const Match = mongoose.model("Match", matchSchema);
export default Match;
