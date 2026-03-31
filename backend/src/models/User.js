import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    firstName:   { type: String, default: "" },
    lastName:    { type: String, default: "" },
    email:       { type: String, required: true, unique: true },
    passwordHash:{ type: String, required: true },

    nationality:       { type: String, default: "" },
    phone:             { type: String, default: "" },
    dateOfBirth:       { type: String, default: "" },
    travelStyle:       { type: String, enum: ["", "budget", "standard", "luxury"], default: "" },
    preferredCurrency: { type: String, default: "" },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // ── Subscription ───────────────────────────────────────────────────────────
    plan: {
      type: String,
      enum: ["free", "explorer", "pro"],
      default: "free",
    },
    stripeCustomerId:      { type: String, default: null },
    stripeSubscriptionId:  { type: String, default: null },
    paypalSubscriptionId:  { type: String, default: null },
    paymentProvider:       { type: String, enum: ["stripe", "paypal", null], default: null },
    planExpiresAt:         { type: Date,   default: null },

    // AI generation quota — reset each calendar month
    aiGenerationsThisMonth: { type: Number, default: 0 },
    aiGenerationsResetAt:   { type: Date,   default: null },

    verified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
    refreshTokenHash: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);