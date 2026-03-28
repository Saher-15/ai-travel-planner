import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/User.js";
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, APP_URL } from "../config.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { sendEmail } from "../utils/email.js";
import {
  verificationEmail,
  resetPasswordEmail,
} from "../utils/emailTemplates.js";

const router = express.Router();

// Strong password regex
const strongPassword =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
};

function issueTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

/* ============================
   REGISTER
============================ */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        message:
          "Password must be 8+ chars and include uppercase, lowercase, number, and special character",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
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

      return res.status(201).json({
        message:
          "Account created, but verification email could not be sent right now. Please try resending verification later.",
      });
    }

    return res.status(201).json({
      message: "Account created. Check your email to verify your account.",
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ============================
   VERIFY EMAIL
============================ */
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ============================
   RESEND VERIFICATION
============================ */
router.post("/resend-verification", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verified) {
      return res.status(400).json({ message: "Already verified" });
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

      return res.status(500).json({
        message: "Could not send verification email right now. Please try again.",
      });
    }

    return res.json({ message: "Verification email sent" });
  } catch (err) {
    console.error("RESEND VERIFICATION ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ============================
   LOGIN
============================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = issueTokens(user._id);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 8);
    await user.save();

    return res
      .cookie("token", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie("refreshToken", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({
        message: "Logged in",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
          role: user.role || "user",
        },
      });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ============================
   REFRESH TOKEN
============================ */
router.post("/refresh", async (req, res) => {
  try {
    const incoming = req.cookies?.refreshToken;
    if (!incoming) {
      return res.status(401).json({ message: "No refresh token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(incoming, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({ message: "Session revoked" });
    }

    const valid = await bcrypt.compare(incoming, user.refreshTokenHash);
    if (!valid) {
      // Possible token reuse — revoke all sessions
      user.refreshTokenHash = undefined;
      await user.save();
      return res.status(401).json({ message: "Token reuse detected. Please log in again." });
    }

    // Rotate: issue new pair
    const { accessToken, refreshToken: newRefresh } = issueTokens(user._id);
    user.refreshTokenHash = await bcrypt.hash(newRefresh, 8);
    await user.save();

    return res
      .cookie("token", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie("refreshToken", newRefresh, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ message: "Token refreshed" });
  } catch (err) {
    console.error("REFRESH ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ============================
   FORGOT PASSWORD
============================ */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({
        message: "If that email exists, a reset link was sent",
      });
    }

    user.resetToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const link = `${APP_URL}/reset-password/${user.resetToken}`;

    const emailResult = await sendEmail(
      user.email,
      "Reset your password",
      resetPasswordEmail(user.name, link)
    );

    if (!emailResult.success) {
      console.error("FORGOT PASSWORD EMAIL FAILED:", emailResult.error);

      return res.status(500).json({
        message: "Could not send reset email right now. Please try again.",
      });
    }

    return res.json({
      message: "If that email exists, a reset link was sent",
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ============================
   RESET PASSWORD
============================ */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!strongPassword.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be 8+ chars and include uppercase, lowercase, number, and special character",
      });
    }

    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    // Revoke all refresh sessions on password reset
    user.refreshTokenHash = undefined;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ============================
   LOGOUT
============================ */
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshTokenHash = undefined;
      await user.save();
    }
  } catch { /* best-effort */ }

  return res
    .clearCookie("token", COOKIE_OPTS)
    .clearCookie("refreshToken", COOKIE_OPTS)
    .json({ message: "Logged out" });
});

/* ============================
   ME
============================ */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name email verified role"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      loggedIn: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error("ME ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
