/**
 * Integration tests for /api/trips routes.
 * Uses mongodb-memory-server and mocks OpenAI + event APIs.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { setupDB, teardownDB, clearDB } from "../helpers/dbSetup.js";
import { User } from "../../models/User.js";
import { Trip } from "../../models/Trip.js";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.unstable_mockModule("../../utils/email.js", () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));
jest.unstable_mockModule("../../utils/emailTemplates.js", () => ({
  verificationEmail: jest.fn().mockReturnValue(""),
  resetPasswordEmail: jest.fn().mockReturnValue(""),
}));

// Mock AI + events so tests don't call external APIs
jest.unstable_mockModule("../../services/openaiService.js", () => ({
  generateItinerary: jest.fn().mockResolvedValue({
    tripSummary: { days: 3, style: "moderate" },
    days: [
      { day: 1, date: "2025-06-01", morning: [{ title: "Tour", durationHours: 2 }] },
    ],
    tips: ["Pack light"],
    recommendedPlaces: [{ name: "Eiffel Tower", location: "Paris" }],
  }),
  generatePackingList: jest.fn().mockResolvedValue([
    { label: "Passport", checked: false },
    { label: "Sunscreen", checked: false },
  ]),
}));

jest.unstable_mockModule("../../services/eventsService.js", () => ({
  fetchDestinationEvents: jest.fn().mockResolvedValue([]),
}));

// Mock PDF generation to avoid binary output in tests
jest.unstable_mockModule("../../services/pdfService.js", () => ({
  generateTripPDF: jest.fn((trip, res) => {
    res.setHeader("Content-Type", "application/pdf");
    res.end("PDF content");
  }),
}));

let app;

const SECRET = process.env.JWT_ACCESS_SECRET || "test-secret";

beforeAll(async () => {
  await setupDB();
  process.env.JWT_ACCESS_SECRET = SECRET;
  const { buildApp } = await import("../helpers/appSetup.js");
  app = buildApp();
});

afterAll(teardownDB);
afterEach(clearDB);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createTestUser(overrides = {}) {
  const user = await User.create({
    name: "Test User",
    email: "tripuser@example.com",
    passwordHash: "hashed",
    verified: true,
    ...overrides,
  });
  return user;
}

function makeAuthCookie(userId) {
  const token = jwt.sign({ userId }, SECRET, { expiresIn: "1d" });
  return `token=${token}`;
}

const TRIP_BODY = {
  tripMode: "single",
  destination: "Paris",
  destinations: ["Paris"],
  startDate: "2025-06-01",
  endDate: "2025-06-07",
  preferences: { budget: "mid", pace: "moderate", travelers: 2 },
  itinerary: {
    tripSummary: { days: 6 },
    days: [{ day: 1, date: "2025-06-01", morning: [{ title: "Museum" }] }],
    tips: ["Pack light"],
    recommendedPlaces: [],
  },
  events: [],
};

async function createTrip(user, overrides = {}) {
  const cookie = makeAuthCookie(user._id);
  const res = await request(app)
    .post("/api/trips")
    .set("Cookie", cookie)
    .send({ ...TRIP_BODY, ...overrides });
  return { res, cookie, tripId: res.body._id };
}

// ─── POST /api/trips (Create) ─────────────────────────────────────────────────

describe("POST /api/trips", () => {
  it("creates a trip and returns 201", async () => {
    const user = await createTestUser();
    const { res } = await createTrip(user);
    expect(res.status).toBe(201);
    expect(res.body.destination).toBe("Paris");
    expect(res.body._id).toBeDefined();
  });

  it("returns 401 without auth cookie", async () => {
    const res = await request(app).post("/api/trips").send(TRIP_BODY);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing destination", async () => {
    const user = await createTestUser();
    const cookie = makeAuthCookie(user._id);
    const res = await request(app)
      .post("/api/trips")
      .set("Cookie", cookie)
      .send({ ...TRIP_BODY, destination: "", destinations: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when startDate is after endDate", async () => {
    const user = await createTestUser();
    const cookie = makeAuthCookie(user._id);
    const res = await request(app)
      .post("/api/trips")
      .set("Cookie", cookie)
      .send({ ...TRIP_BODY, startDate: "2025-06-10", endDate: "2025-06-01" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing itinerary", async () => {
    const user = await createTestUser();
    const cookie = makeAuthCookie(user._id);
    const { itinerary: _it, ...noItinerary } = TRIP_BODY;
    const res = await request(app)
      .post("/api/trips")
      .set("Cookie", cookie)
      .send(noItinerary);
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/trips (List) ────────────────────────────────────────────────────

describe("GET /api/trips", () => {
  it("returns list of user trips", async () => {
    const user = await createTestUser();
    await createTrip(user);
    await createTrip(user, { destination: "London", destinations: ["London"] });
    const cookie = makeAuthCookie(user._id);

    const res = await request(app).get("/api/trips").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("returns empty array for user with no trips", async () => {
    const user = await createTestUser();
    const cookie = makeAuthCookie(user._id);
    const res = await request(app).get("/api/trips").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("does not return another user's trips", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser({ email: "other@example.com" });
    await createTrip(user1);

    const cookie2 = makeAuthCookie(user2._id);
    const res = await request(app).get("/api/trips").set("Cookie", cookie2);
    expect(res.body).toHaveLength(0);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/trips");
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/trips/:id (Single) ──────────────────────────────────────────────

describe("GET /api/trips/:id", () => {
  it("returns the trip for the owner", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app).get(`/api/trips/${tripId}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.destination).toBe("Paris");
  });

  it("returns 404 for another user's trip", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser({ email: "other@example.com" });
    const { tripId } = await createTrip(user1);

    const cookie2 = makeAuthCookie(user2._id);
    const res = await request(app).get(`/api/trips/${tripId}`).set("Cookie", cookie2);
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-existent trip id", async () => {
    const user = await createTestUser();
    const cookie = makeAuthCookie(user._id);
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/trips/${fakeId}`).set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/trips/:id (Update) ─────────────────────────────────────────────

describe("PUT /api/trips/:id", () => {
  it("updates the trip destination", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app)
      .put(`/api/trips/${tripId}`)
      .set("Cookie", cookie)
      .send({ ...TRIP_BODY, destination: "Tokyo", destinations: ["Tokyo"] });

    expect(res.status).toBe(200);
    expect(res.body.destination).toBe("Tokyo");
  });

  it("returns 404 for another user's trip", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser({ email: "other@example.com" });
    const { tripId } = await createTrip(user1);

    const cookie2 = makeAuthCookie(user2._id);
    const res = await request(app)
      .put(`/api/trips/${tripId}`)
      .set("Cookie", cookie2)
      .send(TRIP_BODY);
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/trips/:id ────────────────────────────────────────────────────

describe("DELETE /api/trips/:id", () => {
  it("deletes the trip and returns 200", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app).delete(`/api/trips/${tripId}`).set("Cookie", cookie);
    expect(res.status).toBe(200);

    const check = await Trip.findById(tripId);
    expect(check).toBeNull();
  });

  it("returns 404 when deleting another user's trip", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser({ email: "other@example.com" });
    const { tripId } = await createTrip(user1);

    const cookie2 = makeAuthCookie(user2._id);
    const res = await request(app).delete(`/api/trips/${tripId}`).set("Cookie", cookie2);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/trips/:id/share & DELETE /api/trips/:id/share ─────────────────

describe("Trip sharing", () => {
  it("creates a share token", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app).post(`/api/trips/${tripId}/share`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.shareToken).toBeDefined();
    expect(res.body.shareToken.length).toBeGreaterThan(0);
  });

  it("removes the share token", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    await request(app).post(`/api/trips/${tripId}/share`).set("Cookie", cookie);
    const res = await request(app).delete(`/api/trips/${tripId}/share`).set("Cookie", cookie);
    expect(res.status).toBe(200);

    const trip = await Trip.findById(tripId);
    expect(trip.shareToken).toBeNull();
  });

  it("returns shared trip via GET /api/trips/shared/:token", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);
    const { body: { shareToken } } = await request(app)
      .post(`/api/trips/${tripId}/share`)
      .set("Cookie", cookie);

    const res = await request(app).get(`/api/trips/shared/${shareToken}`);
    expect(res.status).toBe(200);
    expect(res.body.destination).toBe("Paris");
  });

  it("returns 404 for invalid share token", async () => {
    const res = await request(app).get("/api/trips/shared/invalid-token-xyz");
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/trips/:id/status ─────────────────────────────────────────────

describe("PATCH /api/trips/:id/status", () => {
  it("updates trip status to 'upcoming'", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app)
      .patch(`/api/trips/${tripId}/status`)
      .set("Cookie", cookie)
      .send({ status: "upcoming" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("upcoming");
  });

  it("returns 400 for invalid status value", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app)
      .patch(`/api/trips/${tripId}/status`)
      .set("Cookie", cookie)
      .send({ status: "invalid_status" });
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/trips/:id/duplicate ───────────────────────────────────────────

describe("POST /api/trips/:id/duplicate", () => {
  it("creates a copy of the trip", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app)
      .post(`/api/trips/${tripId}/duplicate`)
      .set("Cookie", cookie);

    expect(res.status).toBe(201);
    expect(res.body.destination).toMatch(/\(Copy\)/);
    expect(res.body._id).not.toBe(tripId);
    expect(res.body.status).toBe("planning");
  });
});

// ─── Packing list ─────────────────────────────────────────────────────────────

describe("Packing list routes", () => {
  it("GET /api/trips/:id/packing returns empty array initially", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app).get(`/api/trips/${tripId}/packing`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.packingList).toEqual([]);
  });

  it("PUT /api/trips/:id/packing updates the packing list", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);
    const list = [
      { label: "Passport", checked: false },
      { label: "Sunscreen", checked: true },
    ];

    const res = await request(app)
      .put(`/api/trips/${tripId}/packing`)
      .set("Cookie", cookie)
      .send({ packingList: list });

    expect(res.status).toBe(200);
    expect(res.body.packingList).toHaveLength(2);
    expect(res.body.packingList[0].label).toBe("Passport");
  });

  it("PUT /api/trips/:id/packing returns 400 for non-array packingList", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app)
      .put(`/api/trips/${tripId}/packing`)
      .set("Cookie", cookie)
      .send({ packingList: "not-an-array" });
    expect(res.status).toBe(400);
  });

  it("PUT /api/trips/:id/packing returns 400 for list > 100 items", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);
    const bigList = Array.from({ length: 101 }, (_, i) => ({ label: `Item ${i}`, checked: false }));

    const res = await request(app)
      .put(`/api/trips/${tripId}/packing`)
      .set("Cookie", cookie)
      .send({ packingList: bigList });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/trips/:id/days/:dayIndex/note ─────────────────────────────────

describe("PATCH /api/trips/:id/days/:dayIndex/note", () => {
  it("saves a note for a day", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app)
      .patch(`/api/trips/${tripId}/days/0/note`)
      .set("Cookie", cookie)
      .send({ note: "Remember to visit early" });

    expect(res.status).toBe(200);
    expect(res.body.userNote).toBe("Remember to visit early");
    expect(res.body.dayIndex).toBe(0);
  });

  it("returns 400 for out-of-range dayIndex", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app)
      .patch(`/api/trips/${tripId}/days/99/note`)
      .set("Cookie", cookie)
      .send({ note: "test" });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/trips/:id/pdf ───────────────────────────────────────────────────

describe("GET /api/trips/:id/pdf", () => {
  it("returns PDF content for valid trip", async () => {
    const user = await createTestUser();
    const { tripId, cookie } = await createTrip(user);

    const res = await request(app).get(`/api/trips/${tripId}/pdf`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/pdf/);
  });

  it("returns 404 for non-existent trip", async () => {
    const user = await createTestUser();
    const cookie = makeAuthCookie(user._id);
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app).get(`/api/trips/${fakeId}/pdf`).set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});
