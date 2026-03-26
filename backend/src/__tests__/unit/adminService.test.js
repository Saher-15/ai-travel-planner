/**
 * Unit tests for adminService.js
 * Verifies dashboard stat aggregation with real in-memory MongoDB data.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "@jest/globals";
import mongoose from "mongoose";
import { setupDB, teardownDB, clearDB } from "../helpers/dbSetup.js";
import { getDashboardStats } from "../../services/adminService.js";
import { User } from "../../models/User.js";
import { Trip } from "../../models/Trip.js";
import { ContactMessage } from "../../models/ContactMessage.js";

beforeAll(setupDB);
afterAll(teardownDB);
afterEach(clearDB);

// Helper: create a minimal user
async function makeUser(overrides = {}) {
  return User.create({
    name: "Test User",
    email: `user${Date.now()}${Math.random()}@test.com`,
    passwordHash: "hashed",
    ...overrides,
  });
}

// Helper: create a minimal trip
async function makeTrip(userId, overrides = {}) {
  return Trip.create({
    userId,
    tripMode: "single",
    destination: "Paris",
    destinations: ["Paris"],
    startDate: "2025-06-01",
    endDate: "2025-06-07",
    preferences: { budget: "mid", pace: "moderate", travelers: 2, interests: [], includeEvents: true, eventTypes: [] },
    itinerary: { tripSummary: {}, days: [], tips: [], recommendedPlaces: [] },
    events: [],
    ...overrides,
  });
}

// ─── getDashboardStats ────────────────────────────────────────────────────────

describe("getDashboardStats", () => {
  it("returns stats object with expected top-level keys", async () => {
    const stats = await getDashboardStats();
    expect(stats).toHaveProperty("users");
    expect(stats).toHaveProperty("trips");
    expect(stats).toHaveProperty("messages");
  });

  it("counts total users correctly", async () => {
    await makeUser();
    await makeUser();
    await makeUser();

    const stats = await getDashboardStats();
    expect(stats.users.total).toBe(3);
  });

  it("counts total trips correctly", async () => {
    const user = await makeUser();
    await makeTrip(user._id);
    await makeTrip(user._id);

    const stats = await getDashboardStats();
    expect(stats.trips.total).toBe(2);
  });

  it("counts unread messages correctly", async () => {
    await ContactMessage.create({
      name: "A", email: "a@a.com", subject: "S", message: "M", isRead: false,
    });
    await ContactMessage.create({
      name: "B", email: "b@b.com", subject: "S", message: "M", isRead: true,
    });

    const stats = await getDashboardStats();
    expect(stats.messages.unread).toBe(1);
    expect(stats.messages.total).toBe(2);
  });

  it("returns exactly 30 data points for growth and trends", async () => {
    const stats = await getDashboardStats();
    expect(stats.users.growth).toHaveLength(30);
    expect(stats.trips.trends).toHaveLength(30);
  });

  it("each growth point has date and count fields", async () => {
    const stats = await getDashboardStats();
    stats.users.growth.forEach((point) => {
      expect(point).toHaveProperty("date");
      expect(point).toHaveProperty("count");
      expect(typeof point.count).toBe("number");
      expect(typeof point.date).toBe("string");
    });
  });

  it("counts shared trips correctly", async () => {
    const user = await makeUser();
    await makeTrip(user._id, { shareToken: "abc123" });
    await makeTrip(user._id, { shareToken: null });
    await makeTrip(user._id);

    const stats = await getDashboardStats();
    expect(stats.trips.sharedTrips).toBe(1);
  });

  it("counts trips with packing lists correctly", async () => {
    const user = await makeUser();
    await makeTrip(user._id, { packingList: [{ label: "Passport", checked: false }] });
    await makeTrip(user._id, { packingList: [] });

    const stats = await getDashboardStats();
    expect(stats.trips.packingListsGenerated).toBe(1);
  });

  it("returns recent users array", async () => {
    await makeUser({ name: "Recent User" });
    const stats = await getDashboardStats();
    expect(Array.isArray(stats.users.recent)).toBe(true);
  });

  it("returns topDestinations array", async () => {
    const user = await makeUser();
    await makeTrip(user._id, { destination: "Tokyo" });
    await makeTrip(user._id, { destination: "Tokyo" });
    await makeTrip(user._id, { destination: "Paris" });

    const stats = await getDashboardStats();
    expect(Array.isArray(stats.trips.topDestinations)).toBe(true);
    const top = stats.trips.topDestinations[0];
    expect(top._id).toBe("Tokyo");
    expect(top.count).toBe(2);
  });
});
