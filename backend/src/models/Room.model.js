import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      enum: ["chat", "video"],
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    passkey: {
      type: String,
      select: false,
    },
    maxPlayers: {
      type: Number,
      default: 4,
      min: 2,
      max: 4,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    players: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: String,
        displayName: String,
        avatar: String,
        socketId: String,
        isReady: { type: Boolean, default: false },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["waiting", "playing", "finished"],
      default: "waiting",
    },
    currentRound: {
      type: Number,
      default: 0,
    },
    totalRounds: {
      type: Number,
      default: 10,
    },
    gameState: {
      roles: mongoose.Schema.Types.Mixed,
      revealedRoles: [mongoose.Schema.Types.Mixed],
      scores: mongoose.Schema.Types.Mixed,
      currentSipahi: String,
      roundStartTime: Date,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
    },
  },
  { timestamps: true }
);

roomSchema.pre("save", async function (next) {
  if (!this.isModified("passkey") || !this.passkey) return next();
  const salt = await bcrypt.genSalt(10);
  this.passkey = await bcrypt.hash(this.passkey, salt);
  next();
});

roomSchema.methods.comparePasskey = async function (candidatePasskey) {
  if (!this.passkey) return true;
  return await bcrypt.compare(candidatePasskey, this.passkey);
};

roomSchema.methods.isFull = function () {
  return this.players.length >= this.maxPlayers;
};

roomSchema.methods.addPlayer = function (playerData) {
  if (this.isFull()) throw new Error("Room is full");
  const playerExists = this.players.some(
    (p) => p.userId.toString() === playerData.userId.toString()
  );
  if (playerExists) throw new Error("Player already in room");
  this.players.push(playerData);
  return this.save();
};

roomSchema.methods.removePlayer = function (userId) {
  this.players = this.players.filter(
    (p) => p.userId.toString() !== userId.toString()
  );
  return this.save();
};

const Room = mongoose.model("Room", roomSchema);
export default Room;
