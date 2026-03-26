/**
 * Unit tests for authService.js
 * Uses mongodb-memory-server for real Mongoose operations,
 * and mocks external dependencies (email sending).
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from "@jest/globals";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setupDB, teardownDB, clearDB } from "../helpers/dbSetup.js";
import { User } from "../../models/User.js";

// ── Mock external side-effects ────────────────────────────────────────────────
// We mock the email utilities so tests don't fire real HTTP requests.

jest.unstable_mockModule("../../utils/email.js", () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.unstable_mockModule("../../utils/emailTemplates.js", () => ({
  verificationEmail: jest.fn().mockReturnValue("<html>verify</html>"),
  resetPasswordEmail: jest.fn().mockReturnValue("<html>reset</html>"),
}));

// ── Lazy-import services AFTER mocks are set up ───────────────────────────────

let registerUser, verifyEmail, loginUser, forgotPassword, resetPassword, getMe, resendVerification, strongPassword;

beforeAll(async () => {
  await setupDB();
  // Dynamic import so jest.unstable_mockModule takes effect
  const mod = await import("../../services/authService.js");
  registerUser     = mod.registerUser;
  verifyEmail      = mod.verifyEmail;
  loginUser        = mod.loginUser;
  forgotPassword   = mod.forgotPassword;
  resetPassword    = mod.resetPassword;
  getMe            = mod.getMe;
  resendVerification = mod.resendVerification;
  strongPassword   = mod.strongPassword;
});

afterAll(teardownDB);
afterEach(clearDB);

// ─── strongPassword regex ─────────────────────────────────────────────────────

describe("strongPassword regex", () => {
  it("accepts valid strong passwords", () => {
    expect(strongPassword.test("Str0ng!Pass")).toBe(true);
    expect(strongPassword.test("MyP@ssw0rd")).toBe(true);
    expect(strongPassword.test("Abcdef1!")).toBe(true);
  });

  it("rejects passwords shorter than 8 chars", () => {
    expect(strongPassword.test("Ab1!xyz")).toBe(false);
  });

  it("rejects passwords without uppercase", () => {
    expect(strongPassword.test("str0ng!pass")).toBe(false);
  });

  it("rejects passwords without lowercase", () => {
    expect(strongPassword.test("STR0NG!PASS")).toBe(false);
  });

  it("rejects passwords without a digit", () => {
    expect(strongPassword.test("StrongPass!")).toBe(false);
  });

  it("rejects passwords without a special character", () => {
    expect(strongPassword.test("Str0ngPass1")).toBe(false);
  });
});

// ─── registerUser ─────────────────────────────────────────────────────────────

describe("registerUser", () => {
  it("creates a user in the database", async () => {
    await registerUser("Alice", "alice@example.com", "Pass@1234");
    const user = await User.findOne({ email: "alice@example.com" });
    expect(user).not.toBeNull();
    expect(user.name).toBe("Alice");
  });

  it("normalizes email to lowercase", async () => {
    await registerUser("Bob", "BOB@EXAMPLE.COM", "Pass@1234");
    const user = await User.findOne({ email: "bob@example.com" });
    expect(user).not.toBeNull();
  });

  it("trims name whitespace", async () => {
    await registerUser("  Carol  ", "carol@example.com", "Pass@1234");
    const user = await User.findOne({ email: "carol@example.com" });
    expect(user.name).toBe("Carol");
  });

  it("stores a hashed password, not plaintext", async () => {
    await registerUser("Dave", "dave@example.com", "Pass@1234");
    const user = await User.findOne({ email: "dave@example.com" });
    expect(user.passwordHash).not.toBe("Pass@1234");
    const match = await bcrypt.compare("Pass@1234", user.passwordHash);
    expect(match).toBe(true);
  });

  it("generates a verificationToken", async () => {
    await registerUser("Eve", "eve@example.com", "Pass@1234");
    const user = await User.findOne({ email: "eve@example.com" });
    expect(user.verificationToken).toBeDefined();
    expect(user.verificationToken.length).toBeGreaterThan(0);
  });

  it("throws 400 if email already exists", async () => {
    await registerUser("Frank", "frank@example.com", "Pass@1234");
    await expect(
      registerUser("Frank2", "frank@example.com", "Pass@1234")
    ).rejects.toMatchObject({ statusCode: 400, message: "Email already exists" });
  });

  it("returns { emailSent: true } on success", async () => {
    const result = await registerUser("Grace", "grace@example.com", "Pass@1234");
    expect(result).toEqual({ emailSent: true });
  });
});

// ─── verifyEmail ──────────────────────────────────────────────────────────────

describe("verifyEmail", () => {
  it("marks user as verified and clears verificationToken", async () => {
    await registerUser("Hank", "hank@example.com", "Pass@1234");
    const user = await User.findOne({ email: "hank@example.com" });
    const token = user.verificationToken;

    await verifyEmail(token);

    const updated = await User.findOne({ email: "hank@example.com" });
    expect(updated.verified).toBe(true);
    expect(updated.verificationToken).toBeUndefined();
  });

  it("throws 400 for invalid token", async () => {
    await expect(verifyEmail("bad-token")).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── loginUser ────────────────────────────────────────────────────────────────

describe("loginUser", () => {
  beforeEach(async () => {
    await registerUser("Ivan", "ivan@example.com", "Pass@1234");
    // Manually verify so login doesn't require it
    await User.updateOne({ email: "ivan@example.com" }, { verified: true });
  });

  it("returns token and user object on valid credentials", async () => {
    const result = await loginUser("ivan@example.com", "Pass@1234");
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe("ivan@example.com");
    expect(result.user.name).toBe("Ivan");
  });

  it("JWT contains userId", async () => {
    const { token } = await loginUser("ivan@example.com", "Pass@1234");
    const decoded = jwt.decode(token);
    expect(decoded.userId).toBeDefined();
  });

  it("normalizes email (case-insensitive login)", async () => {
    const result = await loginUser("IVAN@EXAMPLE.COM", "Pass@1234");
    expect(result.user.email).toBe("ivan@example.com");
  });

  it("throws 400 for wrong password", async () => {
    await expect(loginUser("ivan@example.com", "WrongPass!1")).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid credentials",
    });
  });

  it("throws 400 for non-existent email", async () => {
    await expect(loginUser("nobody@example.com", "Pass@1234")).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid credentials",
    });
  });

  it("returns role field in user object", async () => {
    const result = await loginUser("ivan@example.com", "Pass@1234");
    expect(result.user.role).toBe("user");
  });
});

// ─── forgotPassword ───────────────────────────────────────────────────────────

describe("forgotPassword", () => {
  it("silently returns { userExists: false } for unknown email (no enumeration)", async () => {
    const result = await forgotPassword("nobody@example.com");
    expect(result).toEqual({ userExists: false });
  });

  it("sets resetToken and returns { userExists: true } for known email", async () => {
    await registerUser("Judy", "judy@example.com", "Pass@1234");
    const result = await forgotPassword("judy@example.com");
    expect(result).toEqual({ userExists: true });

    const user = await User.findOne({ email: "judy@example.com" });
    expect(user.resetToken).toBeDefined();
    expect(user.resetTokenExpires).toBeDefined();
    expect(new Date(user.resetTokenExpires).getTime()).toBeGreaterThan(Date.now());
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe("resetPassword", () => {
  it("resets the password and clears the token", async () => {
    await registerUser("Ken", "ken@example.com", "Pass@1234");
    await forgotPassword("ken@example.com");
    const user = await User.findOne({ email: "ken@example.com" });
    const token = user.resetToken;

    await resetPassword(token, "NewPass@5678");

    const updated = await User.findOne({ email: "ken@example.com" });
    const match = await bcrypt.compare("NewPass@5678", updated.passwordHash);
    expect(match).toBe(true);
    expect(updated.resetToken).toBeUndefined();
    expect(updated.resetTokenExpires).toBeUndefined();
  });

  it("throws 400 for invalid/expired token", async () => {
    await expect(resetPassword("bad-token", "NewPass@5678")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws 400 for expired reset token", async () => {
    await registerUser("Leo", "leo@example.com", "Pass@1234");
    // Manually set an expired token
    await User.updateOne(
      { email: "leo@example.com" },
      { resetToken: "expired-token", resetTokenExpires: Date.now() - 1000 }
    );
    await expect(resetPassword("expired-token", "NewPass@5678")).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

// ─── getMe ────────────────────────────────────────────────────────────────────

describe("getMe", () => {
  it("returns user profile fields for valid userId", async () => {
    await registerUser("Mia", "mia@example.com", "Pass@1234");
    const user = await User.findOne({ email: "mia@example.com" });

    const profile = await getMe(user._id.toString());
    expect(profile.name).toBe("Mia");
    expect(profile.email).toBe("mia@example.com");
    expect(profile.role).toBe("user");
    expect(profile.verified).toBe(false);
  });

  it("throws 404 for non-existent userId", async () => {
    await expect(getMe("64f000000000000000000000")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("does not return passwordHash in profile", async () => {
    await registerUser("Ned", "ned@example.com", "Pass@1234");
    const user = await User.findOne({ email: "ned@example.com" });
    const profile = await getMe(user._id.toString());
    expect(profile.passwordHash).toBeUndefined();
  });
});
