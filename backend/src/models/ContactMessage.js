import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "replied"],
      default: "pending",
    },
    adminReply: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    userReplySeen: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const ContactMessage = mongoose.model(
  "ContactMessage",
  contactMessageSchema
);