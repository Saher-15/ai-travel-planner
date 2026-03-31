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

    verified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
    refreshTokenHash: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);