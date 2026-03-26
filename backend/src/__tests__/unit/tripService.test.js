/**
 * Unit tests for tripService.js
 * Tests all pure normalization and validation functions (no DB required).
 */

import { describe, it, expect } from "@jest/globals";
import {
  normalizeTripMode,
  normalizeDestinations,
  normalizeDay,
  normalizePreferences,
  normalizeItinerary,
  normalizeEvents,
  validateTripPayload,
  cleanPackingList,
  ALLOWED_BUDGETS,
  ALLOWED_PACES,
  ALLOWED_STATUSES,
  ALLOWED_EVENT_TYPES,
} from "../../services/tripService.js";

// ─── normalizeTripMode ────────────────────────────────────────────────────────

describe("normalizeTripMode", () => {
  it('returns "multi" for "multi"', () => {
    expect(normalizeTripMode("multi")).toBe("multi");
  });

  it('returns "single" for "single"', () => {
    expect(normalizeTripMode("single")).toBe("single");
  });

  it('defaults to "single" for unknown values', () => {
    expect(normalizeTripMode("unknown")).toBe("single");
    expect(normalizeTripMode(undefined)).toBe("single");
    expect(normalizeTripMode(null)).toBe("single");
    expect(normalizeTripMode("")).toBe("single");
  });
});

// ─── normalizeDestinations ────────────────────────────────────────────────────

describe("normalizeDestinations", () => {
  it("returns cleaned array when array is provided", () => {
    expect(normalizeDestinations(["Paris", "London"])).toEqual(["Paris", "London"]);
  });

  it("trims whitespace from destination strings", () => {
    expect(normalizeDestinations(["  Paris  ", " London "])).toEqual(["Paris", "London"]);
  });

  it("filters out empty strings", () => {
    expect(normalizeDestinations(["Paris", "", "  ", "London"])).toEqual(["Paris", "London"]);
  });

  it("falls back to fallbackDestination when array is empty", () => {
    expect(normalizeDestinations([], "Tokyo")).toEqual(["Tokyo"]);
  });

  it("falls back to fallbackDestination when array is undefined", () => {
    expect(normalizeDestinations(undefined, "Tokyo")).toEqual(["Tokyo"]);
  });

  it("returns empty array when both array and fallback are empty", () => {
    expect(normalizeDestinations([], "")).toEqual([]);
    expect(normalizeDestinations(undefined, "")).toEqual([]);
  });

  it("prefers array over fallback when array has valid entries", () => {
    expect(normalizeDestinations(["Paris"], "Tokyo")).toEqual(["Paris"]);
  });
});

// ─── normalizeDay ─────────────────────────────────────────────────────────────

describe("normalizeDay", () => {
  it("normalizes a complete day object", () => {
    const day = {
      day: 1,
      date: "2025-06-01",
      title: "Day 1",
      morning: [{ title: "Museum", durationHours: 2, notes: "Arrive early" }],
      afternoon: [],
      evening: [{ title: "Dinner" }],
      foodSuggestion: "Local cuisine",
      backupPlan: "Indoor museum",
      userNote: "My note",
    };
    const result = normalizeDay(day);
    expect(result.day).toBe(1);
    expect(result.date).toBe("2025-06-01");
    expect(result.morning).toHaveLength(1);
    expect(result.morning[0].title).toBe("Museum");
    expect(result.morning[0].durationHours).toBe(2);
    expect(result.evening).toHaveLength(1);
    expect(result.foodSuggestion).toBe("Local cuisine");
  });

  it("uses fallbackDayNumber when day.day is missing", () => {
    const result = normalizeDay({}, 5);
    expect(result.day).toBe(5);
  });

  it("defaults arrays to empty when missing", () => {
    const result = normalizeDay({ day: 1 });
    expect(result.morning).toEqual([]);
    expect(result.afternoon).toEqual([]);
    expect(result.evening).toEqual([]);
  });

  it("defaults activity title to 'Place' when missing", () => {
    const result = normalizeDay({ morning: [{ notes: "test" }] }, 1);
    expect(result.morning[0].title).toBe("Place");
  });

  it("sets durationHours to null for non-numeric values", () => {
    const result = normalizeDay({ morning: [{ title: "Museum", durationHours: "abc" }] }, 1);
    expect(result.morning[0].durationHours).toBeNull();
  });

  it("accepts string 'null' durationHours as null", () => {
    const result = normalizeDay({ morning: [{ title: "Test", durationHours: "" }] }, 1);
    expect(result.morning[0].durationHours).toBeNull();
  });
});

// ─── normalizePreferences ─────────────────────────────────────────────────────

describe("normalizePreferences", () => {
  it("normalizes a complete preferences object", () => {
    const prefs = {
      travelers: 3,
      budget: "high",
      pace: "packed",
      interests: ["art", "food"],
      notes: "No fish",
    };
    const result = normalizePreferences(prefs);
    expect(result.travelers).toBe(3);
    expect(result.budget).toBe("high");
    expect(result.pace).toBe("packed");
    expect(result.interests).toEqual(["art", "food"]);
    expect(result.notes).toBe("No fish");
  });

  it("defaults to 2 travelers when value is 0 or missing", () => {
    expect(normalizePreferences({}).travelers).toBe(2);
    expect(normalizePreferences({ travelers: 0 }).travelers).toBe(2);
    expect(normalizePreferences({ travelers: -1 }).travelers).toBe(2);
  });

  it("defaults budget to 'mid' for invalid values", () => {
    expect(normalizePreferences({ budget: "ultra" }).budget).toBe("mid");
    expect(normalizePreferences({}).budget).toBe("mid");
  });

  it("defaults pace to 'moderate' for invalid values", () => {
    expect(normalizePreferences({ pace: "snail" }).pace).toBe("moderate");
    expect(normalizePreferences({}).pace).toBe("moderate");
  });

  it("accepts all valid budgets", () => {
    for (const b of ALLOWED_BUDGETS) {
      expect(normalizePreferences({ budget: b }).budget).toBe(b);
    }
  });

  it("accepts all valid paces", () => {
    for (const p of ALLOWED_PACES) {
      expect(normalizePreferences({ pace: p }).pace).toBe(p);
    }
  });

  it("filters out blank interests", () => {
    const result = normalizePreferences({ interests: ["art", "", "  ", "food"] });
    expect(result.interests).toEqual(["art", "food"]);
  });

  it("defaults includeEvents to true when not provided", () => {
    expect(normalizePreferences({}).includeEvents).toBe(true);
  });

  it("respects includeEvents: false", () => {
    expect(normalizePreferences({ includeEvents: false }).includeEvents).toBe(false);
  });

  it("filters eventTypes to only allowed values", () => {
    const result = normalizePreferences({ eventTypes: ["concert", "invalid", "food"] });
    expect(result.eventTypes).toEqual(["concert", "food"]);
  });

  it("handles object travelers (adults+children+infants)", () => {
    const result = normalizePreferences({ travelers: { adults: 2, children: 1, infants: 0 } });
    expect(result.travelers).toBe(3);
  });

  it("handles object travelers using total field", () => {
    const result = normalizePreferences({ travelers: { total: 4 } });
    expect(result.travelers).toBe(4);
  });
});

// ─── normalizeItinerary ───────────────────────────────────────────────────────

describe("normalizeItinerary", () => {
  it("normalizes a full itinerary", () => {
    const itinerary = {
      tripSummary: { days: 3, style: "relaxed" },
      days: [
        { day: 1, date: "2025-06-01", morning: [{ title: "Tour" }] },
        { day: 2, date: "2025-06-02" },
      ],
      tips: ["Pack light", "Book early", ""],
      recommendedPlaces: [
        { name: "Eiffel Tower", location: "Paris, France" },
        { name: "", location: "" },        // should be filtered out
        { name: "Louvre", location: "Paris" },
      ],
    };
    const result = normalizeItinerary(itinerary);
    expect(result.tripSummary).toEqual({ days: 3, style: "relaxed" });
    expect(result.days).toHaveLength(2);
    expect(result.tips).toEqual(["Pack light", "Book early"]); // empty string filtered
    expect(result.recommendedPlaces).toHaveLength(2); // nameless/locationless filtered
  });

  it("returns empty structure for empty input", () => {
    const result = normalizeItinerary({});
    expect(result.days).toEqual([]);
    expect(result.tips).toEqual([]);
    expect(result.recommendedPlaces).toEqual([]);
    expect(result.tripSummary).toEqual({});
  });

  it("defaults day number from array index when day.day is missing", () => {
    const result = normalizeItinerary({ days: [{}, {}, {}] });
    expect(result.days[0].day).toBe(1);
    expect(result.days[1].day).toBe(2);
    expect(result.days[2].day).toBe(3);
  });
});

// ─── normalizeEvents ──────────────────────────────────────────────────────────

describe("normalizeEvents", () => {
  it("normalizes valid events", () => {
    const events = [
      { name: "Jazz Festival", date: "2025-06-05", location: "Paris" },
      { name: "Art Show", date: "2025-06-06" },
    ];
    const result = normalizeEvents(events);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Jazz Festival");
  });

  it("filters out events without a date; empty names default to 'Event'", () => {
    const events = [
      { name: "Good Event", date: "2025-06-05" },
      { name: "", date: "2025-06-06" },       // name defaults to "Event" → kept (has date)
      { name: "No Date Event", date: "" },    // no date → filtered
    ];
    const result = normalizeEvents(events);
    // 2 kept: "Good Event" and the empty-name one (defaulted to "Event")
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Good Event");
    expect(result[1].name).toBe("Event");
  });

  it("returns empty array for non-array input", () => {
    expect(normalizeEvents(null)).toEqual([]);
    expect(normalizeEvents(undefined)).toEqual([]);
    expect(normalizeEvents("string")).toEqual([]);
  });

  it("defaults event name to 'Event' then filters if still empty after defaulting", () => {
    // The normalizeEvent function defaults name to "Event" if empty,
    // but normalizeEvents then filters where e.name && e.date
    const events = [{ date: "2025-06-05" }];
    const result = normalizeEvents(events);
    // name defaults to "Event" which is truthy, date is provided → kept
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Event");
  });
});

// ─── validateTripPayload ──────────────────────────────────────────────────────

describe("validateTripPayload", () => {
  const valid = {
    destination: "Paris",
    destinations: ["Paris"],
    tripMode: "single",
    startDate: "2025-06-01",
    endDate: "2025-06-10",
  };

  it("returns empty string for valid payload", () => {
    expect(validateTripPayload(valid)).toBe("");
  });

  it("errors when destination is empty", () => {
    expect(validateTripPayload({ ...valid, destination: "" })).toBe("destination is required");
    expect(validateTripPayload({ ...valid, destination: "   " })).toBe("destination is required");
  });

  it("errors when no destinations can be resolved", () => {
    const result = validateTripPayload({ ...valid, destination: "", destinations: [] });
    expect(result).toBeTruthy();
  });

  it("errors for multi-city with only 1 destination", () => {
    const result = validateTripPayload({
      ...valid,
      tripMode: "multi",
      destinations: ["Paris"],
    });
    expect(result).toBe("Multi-city trips require at least 2 destinations");
  });

  it("passes for multi-city with 2+ destinations", () => {
    const result = validateTripPayload({
      ...valid,
      tripMode: "multi",
      destinations: ["Paris", "London"],
    });
    expect(result).toBe("");
  });

  it("errors when startDate or endDate is missing", () => {
    expect(validateTripPayload({ ...valid, startDate: "" })).toBe("startDate and endDate are required");
    expect(validateTripPayload({ ...valid, endDate: "" })).toBe("startDate and endDate are required");
  });

  it("errors when startDate is after endDate", () => {
    const result = validateTripPayload({ ...valid, startDate: "2025-06-10", endDate: "2025-06-01" });
    expect(result).toBe("startDate must be before endDate");
  });

  it("accepts same startDate and endDate (single-day trip)", () => {
    const result = validateTripPayload({ ...valid, startDate: "2025-06-01", endDate: "2025-06-01" });
    expect(result).toBe("");
  });

  it("errors for invalid date strings", () => {
    const result = validateTripPayload({ ...valid, startDate: "not-a-date" });
    expect(result).toBe("Invalid startDate or endDate");
  });
});

// ─── cleanPackingList ─────────────────────────────────────────────────────────

describe("cleanPackingList", () => {
  it("filters out items without a valid label", () => {
    const items = [
      { label: "Passport", checked: false },
      { label: "", checked: false },
      { label: "   ", checked: true },
      null,
      undefined,
    ];
    const result = cleanPackingList(items);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Passport");
  });

  it("trims labels and truncates at 200 chars", () => {
    const longLabel = "x".repeat(250);
    const result = cleanPackingList([{ label: longLabel, checked: false }]);
    expect(result[0].label).toHaveLength(200);
  });

  it("coerces checked to boolean", () => {
    const result = cleanPackingList([
      { label: "Item", checked: 1 },
      { label: "Item2", checked: 0 },
    ]);
    expect(result[0].checked).toBe(true);
    expect(result[1].checked).toBe(false);
  });

  it("trims whitespace from labels", () => {
    const result = cleanPackingList([{ label: "  Sunscreen  ", checked: false }]);
    expect(result[0].label).toBe("Sunscreen");
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("exported constants", () => {
  it("ALLOWED_BUDGETS contains expected values", () => {
    expect(ALLOWED_BUDGETS).toEqual(expect.arrayContaining(["low", "mid", "high"]));
    expect(ALLOWED_BUDGETS).toHaveLength(3);
  });

  it("ALLOWED_PACES contains expected values", () => {
    expect(ALLOWED_PACES).toEqual(expect.arrayContaining(["relaxed", "moderate", "packed"]));
    expect(ALLOWED_PACES).toHaveLength(3);
  });

  it("ALLOWED_STATUSES contains expected values", () => {
    expect(ALLOWED_STATUSES).toEqual(expect.arrayContaining(["planning", "upcoming", "completed"]));
    expect(ALLOWED_STATUSES).toHaveLength(3);
  });

  it("ALLOWED_EVENT_TYPES contains at least 7 values", () => {
    expect(ALLOWED_EVENT_TYPES.length).toBeGreaterThanOrEqual(7);
  });
});
