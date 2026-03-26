/**
 * Integration tests for /api/auth routes.
 * Uses a real in-memory MongoDB and a bare Express app (no HTTP listen).
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import { setupDB, teardownDB, clearDB } from "../helpers/dbSetup.js";
import { User } from "../../models/User.js";

// Mock email sending so tests don't make real HTTP calls
jest.unstable_mockModule("../../utils/email.js", () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));
jest.unstable_mockModule("../../utils/emailTemplates.js", () => ({
  verificationEmail: jest.fn().mockReturnValue("<html>verify</html>"),
  resetPasswordEmail: jest.fn().mockReturnValue("<html>reset</html>"),
}));

let app;

beforeAll(async () => {
  await setupDB();
  // Must dynamic-import after mocks
  const { buildApp } = await import("../helpers/appSetup.js");
  app = buildApp();
});

afterAll(teardownDB);
afterEach(clearDB);

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_USER = {
  name: "Test User",
  email: "test@example.com",
  password: "Pass@1234",
  confirmPassword: "Pass@1234",
};

async function registerAndVerify(overrides = {}) {
  const payload = { ...VALID_USER, ...overrides };
  await request(app).post("/api/auth/register").send(payload);
  const user = await User.findOne({ email: payload.email.toLowerCase().trim() });
  if (user?.verificationToken) {
    await request(app).get(`/api/auth/verify/${user.verificationToken}`);
  }
  return user;
}

async function loginAndGetCookie(email = VALID_USER.email, password = VALID_USER.password) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const cookie = res.headers["set-cookie"]?.[0] || "";
  return { cookie, user: res.body.user, token: res.body.token };
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("returns 201 and creates a user", async () => {
    const res = await request(app).post("/api/auth/register").send(VALID_USER);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/account created/i);

    const user = await User.findOne({ email: "test@example.com" });
    expect(user).not.toBeNull();
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "A", email: "a@a.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when passwords don't match", async () => {
    const res = await request(app).post("/api/auth/register").send({
      ...VALID_USER,
      confirmPassword: "Different@1234",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/do not match/i);
  });

  it("returns 400 for weak password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      ...VALID_USER,
      password: "weakpassword",
      confirmPassword: "weakpassword",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/password/i);
  });

  it("returns 400 for duplicate email", async () => {
    await request(app).post("/api/auth/register").send(VALID_USER);
    const res = await request(app).post("/api/auth/register").send(VALID_USER);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("normalizes email to lowercase", async () => {
    await request(app).post("/api/auth/register").send({
      ...VALID_USER,
      email: "TEST@EXAMPLE.COM",
    });
    const user = await User.findOne({ email: "test@example.com" });
    expect(user).not.toBeNull();
  });
});

// ─── GET /api/auth/verify/:token ─────────────────────────────────────────────

describe("GET /api/auth/verify/:token", () => {
  it("verifies the email and clears the token", async () => {
    await request(app).post("/api/auth/register").send(VALID_USER);
    const user = await User.findOne({ email: "test@example.com" });
    const token = user.verificationToken;

    const res = await request(app).get(`/api/auth/verify/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);

    const updated = await User.findOne({ email: "test@example.com" });
    expect(updated.verified).toBe(true);
    expect(updated.verificationToken).toBeUndefined();
  });

  it("returns 400 for invalid token", async () => {
    const res = await request(app).get("/api/auth/verify/bad-token");
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await registerAndVerify();
  });

  it("returns 200 and sets cookie on valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@example.com");
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
  });

  it("returns 400 for wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: VALID_USER.email,
      password: "WrongPass!1",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("returns 400 for non-existent user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "Pass@1234",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: VALID_USER.email });
    expect(res.status).toBe(400);
  });

  it("login is case-insensitive for email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "TEST@EXAMPLE.COM",
      password: VALID_USER.password,
    });
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("returns user profile when authenticated", async () => {
    await registerAndVerify();
    const { cookie } = await loginAndGetCookie();

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.loggedIn).toBe(true);
  });

  it("returns 401 without authentication cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "token=invalid-token");
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  it("returns 200 and clears the cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
    // Cookie should be cleared (set with empty value or expires in past)
    const cookies = res.headers["set-cookie"];
    if (cookies) {
      expect(cookies[0]).toMatch(/token=/);
    }
  });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  it("returns 200 with generic message for unknown email (no enumeration)", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "nobody@example.com",
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email/i);
  });

  it("returns 200 and saves resetToken for known email", async () => {
    await registerAndVerify();
    const res = await request(app).post("/api/auth/forgot-password").send({
      email: VALID_USER.email,
    });
    expect(res.status).toBe(200);

    const user = await User.findOne({ email: "test@example.com" });
    expect(user.resetToken).toBeDefined();
    expect(new Date(user.resetTokenExpires).getTime()).toBeGreaterThan(Date.now());
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/reset-password/:token ────────────────────────────────────

describe("POST /api/auth/reset-password/:token", () => {
  async function getResetToken() {
    await registerAndVerify();
    await request(app).post("/api/auth/forgot-password").send({ email: VALID_USER.email });
    const user = await User.findOne({ email: "test@example.com" });
    return user.resetToken;
  }

  it("resets the password and returns 200", async () => {
    const token = await getResetToken();
    const res = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ newPassword: "NewPass@5678", confirmPassword: "NewPass@5678" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset successful/i);
  });

  it("can login with new password after reset", async () => {
    const token = await getResetToken();
    await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ newPassword: "NewPass@5678", confirmPassword: "NewPass@5678" });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: VALID_USER.email,
      password: "NewPass@5678",
    });
    expect(loginRes.status).toBe(200);
  });

  it("returns 400 for mismatched passwords", async () => {
    const token = await getResetToken();
    const res = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ newPassword: "NewPass@5678", confirmPassword: "Different@5678" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid/expired token", async () => {
    await registerAndVerify();
    const res = await request(app)
      .post("/api/auth/reset-password/bad-token")
      .send({ newPassword: "NewPass@5678", confirmPassword: "NewPass@5678" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for weak new password", async () => {
    const token = await getResetToken();
    const res = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ newPassword: "weak", confirmPassword: "weak" });
    expect(res.status).toBe(400);
  });
});
