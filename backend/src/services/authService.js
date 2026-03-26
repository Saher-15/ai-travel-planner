/**
 * authService.js
 * Handles all authentication business logic: registration, email verification,
 * login, password reset, and fetching the current user profile.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/User.js";
import { JWT_ACCESS_SECRET, APP_URL } from "../config.js";
import { sendEmail } from "../utils/email.js";
import {
  verificationEmail,
  resetPasswordEmail,
} from "../utils/emailTemplates.js";

/** Regex enforcing strong passwords (8+ chars, mixed case, digit, special char). */
export const strongPassword =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Register a new user.
 * Validates uniqueness, hashes password, creates User, sends verification email.
 * @returns {{ emailSent: boolean }} — callers may warn if email failed.
 */
export async function registerUser(name, email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const err = new Error("Email already exists");
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString("hex");

  await User.create({
    name: trimmedName,
    email: normalizedEmail,
    passwordHash,
    verificationToken,
  });

  const link = `${APP_URL}/verify/${verificationToken}`;
  const emailResult = await sendEmail(
    normalizedEmail,
    "Verify your email",
    verificationEmail(trimmedName, link)
  );

  if (!emailResult.success) {
    console.error("REGISTER EMAIL FAILED:", emailResult.error);
  }

  return { emailSent: emailResult.success };
}

/**
 * Mark a user's email address as verified using the token from their inbox.
 * Throws if the token is invalid or already used.
 */
export async function verifyEmail(token) {
  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    const err = new Error("Invalid or expired token");
    err.statusCode = 400;
    throw err;
  }

  user.verified = true;
  user.verificationToken = undefined;
  await user.save();
}

/**
 * Regenerate and resend the email-verification link for an unverified user.
 * @param {string} userId — MongoDB ObjectId string from the JWT payload.
 * @throws if user not found, already verified, or email delivery fails.
 */
export async function resendVerification(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (user.verified) {
    const err = new Error("Already verified");
    err.statusCode = 400;
    throw err;
  }

  user.verificationToken = crypto.randomBytes(32).toString("hex");
  await user.save();

  const link = `${APP_URL}/verify/${user.verificationToken}`;
  const emailResult = await sendEmail(
    user.email,
    "Verify your email",
    verificationEmail(user.name, link)
  );

  if (!emailResult.success) {
    console.error("RESEND VERIFICATION EMAIL FAILED:", emailResult.error);
    const err = new Error("Could not send verification email right now. Please try again.");
    err.statusCode = 500;
    throw err;
  }
}

/**
 * Authenticate a user and return a signed JWT alongside safe user fields.
 * @returns {{ user: object, token: string }}
 */
export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 400;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error("Invalid credentials");
    err.statusCode = 400;
    throw err;
  }

  const token = jwt.sign({ userId: user._id }, JWT_ACCESS_SECRET, {
    expiresIn: "1d",
  });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      verified: user.verified,
      role: user.role || "user",
    },
  };
}

/**
 * Initiate a password-reset flow by generating a reset token and emailing the link.
 * Always resolves (no error thrown) when the email does not exist — this prevents
 * user enumeration.  Throws only on email delivery failure.
 * @returns {{ userExists: boolean }}
 */
export async function forgotPassword(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    // Respond the same way whether the email exists or not
    return { userExists: false };
  }

  user.resetToken = crypto.randomBytes(32).toString("hex");
  user.resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  const link = `${APP_URL}/reset-password/${user.resetToken}`;
  const emailResult = await sendEmail(
    user.email,
    "Reset your password",
    resetPasswordEmail(user.name, link)
  );

  if (!emailResult.success) {
    console.error("FORGOT PASSWORD EMAIL FAILED:", emailResult.error);
    const err = new Error("Could not send reset email right now. Please try again.");
    err.statusCode = 500;
    throw err;
  }

  return { userExists: true };
}

/**
 * Complete the password-reset flow: validate the token, hash the new password,
 * and clear the reset token fields.
 * @param {string} token     — URL token from the reset email.
 * @param {string} newPassword — The user's chosen new password (already validated by route).
 */
export async function resetPassword(token, newPassword) {
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    const err = new Error("Invalid or expired token");
    err.statusCode = 400;
    throw err;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
}

/**
 * Return the public profile fields for a logged-in user.
 * @param {string} userId — MongoDB ObjectId string.
 * @returns {{ id, name, email, verified, role }}
 */
export async function getMe(userId) {
  const user = await User.findById(userId).select("name email verified role");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    verified: user.verified,
    role: user.role || "user",
  };
}
