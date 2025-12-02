import mongoose from "mongoose";

const BingoGameSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    gridSize: {
      type: Number,
      default: 5,
      enum: [5, 6, 7],
    },
    maxPlayers: {
      type: Number,
      default: 2,
      min: 2,
      max: 6,
    },
    players: [
      {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        board: [[Number]], // Variable grid size
        ready: { type: Boolean, default: false },
        connected: { type: Boolean, default: true },
        socketId: { type: String },
        lastActivity: { type: Date, default: Date.now },
      },
    ],
    drawnNumbers: [Number],
    currentTurnIndex: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["waiting", "playing", "finished"],
      default: "waiting",
    },
    winner: {
      userId: String,
      username: String,
    },
  },
  { timestamps: true }
);

// Indexes for optimized Bingo game queries
BingoGameSchema.index({ roomId: 1 }); // Primary lookup by room
BingoGameSchema.index({ gameStatus: 1 }); // Filter by status
BingoGameSchema.index({ "players.userId": 1 }); // Player queries
BingoGameSchema.index({ createdAt: -1 }); // Recent games

export default mongoose.model("BingoGame", BingoGameSchema);
