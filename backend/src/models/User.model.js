import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    avatar: {
      type: String,
      default: function () {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.username}`;
      },
    },
    stats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
      matchesPlayed: { type: Number, default: 0 },
      rajaWins: { type: Number, default: 0 },
      mantriWins: { type: Number, default: 0 },
      sipahiCorrect: { type: Number, default: 0 },
      sipahiWrong: { type: Number, default: 0 },
      chorEscaped: { type: Number, default: 0 },
      chorCaught: { type: Number, default: 0 },
    },
    defeated: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: String,
        count: { type: Number, default: 0 },
      },
    ],
    defeatedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: String,
        count: { type: Number, default: 0 },
      },
    ],
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Case-insensitive unique index for username
userSchema.index(
  { username: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last seen
userSchema.methods.updateLastSeen = function () {
  this.lastSeen = Date.now();
  return this.save();
};

const User = mongoose.model("User", userSchema);

export default User;
