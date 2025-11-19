import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reported: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomId: String,
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
    },
    reason: {
      type: String,
      required: true,
      enum: [
        "offensive-language",
        "cheating",
        "harassment",
        "inappropriate-behavior",
        "other",
      ],
    },
    description: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
    actionTaken: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);
export default Report;
