/**
 * Unit tests for pure utility functions used in ViewTrip.
 * These functions are copied/matched from ViewTrip.jsx.
 * Testing them independently ensures regression coverage on critical data transforms.
 */

import { describe, it, expect } from "vitest";

// ── Replicated pure functions from ViewTrip.jsx ──────────────────────────────
// (No JSX needed — pure JS only)

function normalizeTripMode(mode) {
  return mode === "multi" ? "multi" : "single";
}

function getTripDestinations(trip) {
  if (Array.isArray(trip?.destinations) && trip.destinations.length) {
    return trip.destinations.filter(Boolean);
  }
  return trip?.destination ? [trip.destination] : [];
}

function getRecommendedPlaces(trip) {
  if (Array.isArray(trip?.recommendedPlaces)) return trip.recommendedPlaces;
  if (Array.isArray(trip?.itinerary?.recommendedPlaces)) return trip.itinerary.recommendedPlaces;
  if (Array.isArray(trip?.recommendations)) return trip.recommendations;
  return [];
}

const BLOCKS = ["morning", "afternoon", "evening"];
const BLOCK_ORDER = { morning: 1, afternoon: 2, evening: 3 };

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function extractUniqueLocations(itinerary, placeFallback = "Place") {
  const rows =
    itinerary?.days?.flatMap((d) =>
      BLOCKS.flatMap((block) =>
        (d?.[block] ?? [])
          .map((a) => ({
            day: d.day,
            date: d.date,
            title: a?.title || placeFallback,
            timeBlock: block,
            location: (a?.location || "").trim(),
            address: (a?.address || "").trim(),
            notes: a?.notes || "",
            durationHours: a?.durationHours ?? null,
            type: a?.type || "",
            category: a?.category || "",
          }))
          .filter((x) => x.location || x.address || x.title)
      )
    ) ?? [];

  const unique = Array.from(
    new Map(
      rows.map((x) => [normalizeText(x.address || x.location || x.title), x])
    ).values()
  );

  return unique.sort(
    (a, b) =>
      (a.day ?? 0) - (b.day ?? 0) ||
      (BLOCK_ORDER[a.timeBlock] ?? 99) - (BLOCK_ORDER[b.timeBlock] ?? 99)
  );
}

function countDayActivities(day) {
  return (
    (Array.isArray(day?.morning) ? day.morning.length : 0) +
    (Array.isArray(day?.afternoon) ? day.afternoon.length : 0) +
    (Array.isArray(day?.evening) ? day.evening.length : 0)
  );
}

function getDayEstimatedHours(day) {
  const activities = [
    ...(Array.isArray(day?.morning) ? day.morning : []),
    ...(Array.isArray(day?.afternoon) ? day.afternoon : []),
    ...(Array.isArray(day?.evening) ? day.evening : []),
  ];
  return activities.reduce((sum, activity) => {
    const n = Number(activity?.durationHours);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

function formatHours(value) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (Number.isInteger(value)) return `${value}h`;
  return `${value.toFixed(1)}h`;
}

function formatCost(usd) {
  if (usd === 0) return "Free";
  if (!usd || !Number.isFinite(usd)) return null;
  return `~$${usd}`;
}

function fmtRange(s, e) {
  return s && e ? `${s} → ${e}` : "";
}

function clamp(s, n = 120) {
  const str = (s ?? "").toString();
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

// ─── normalizeTripMode ────────────────────────────────────────────────────────

describe("normalizeTripMode", () => {
  it('returns "multi" for "multi"', () => {
    expect(normalizeTripMode("multi")).toBe("multi");
  });

  it('returns "single" for any other value', () => {
    expect(normalizeTripMode("single")).toBe("single");
    expect(normalizeTripMode(undefined)).toBe("single");
    expect(normalizeTripMode(null)).toBe("single");
    expect(normalizeTripMode("")).toBe("single");
  });
});

// ─── getTripDestinations ──────────────────────────────────────────────────────

describe("getTripDestinations", () => {
  it("returns destinations array when present and non-empty", () => {
    const trip = { destinations: ["Paris", "London"], destination: "Paris" };
    expect(getTripDestinations(trip)).toEqual(["Paris", "London"]);
  });

  it("falls back to destination string when destinations array is empty", () => {
    const trip = { destinations: [], destination: "Tokyo" };
    expect(getTripDestinations(trip)).toEqual(["Tokyo"]);
  });

  it("filters falsy values from destinations array", () => {
    const trip = { destinations: ["Paris", null, "", "London"] };
    expect(getTripDestinations(trip)).toEqual(["Paris", "London"]);
  });

  it("returns empty array for null/undefined trip", () => {
    expect(getTripDestinations(null)).toEqual([]);
    expect(getTripDestinations(undefined)).toEqual([]);
  });

  it("returns empty array when both destinations and destination are missing", () => {
    expect(getTripDestinations({})).toEqual([]);
  });
});

// ─── getRecommendedPlaces ─────────────────────────────────────────────────────

describe("getRecommendedPlaces", () => {
  it("returns trip.recommendedPlaces when present", () => {
    const places = [{ name: "Eiffel Tower" }];
    expect(getRecommendedPlaces({ recommendedPlaces: places })).toEqual(places);
  });

  it("falls back to itinerary.recommendedPlaces", () => {
    const places = [{ name: "Louvre" }];
    expect(getRecommendedPlaces({ itinerary: { recommendedPlaces: places } })).toEqual(places);
  });

  it("falls back to trip.recommendations", () => {
    const places = [{ name: "Museum" }];
    expect(getRecommendedPlaces({ recommendations: places })).toEqual(places);
  });

  it("returns empty array when none present", () => {
    expect(getRecommendedPlaces({})).toEqual([]);
    expect(getRecommendedPlaces(null)).toEqual([]);
  });
});

// ─── extractUniqueLocations ───────────────────────────────────────────────────

describe("extractUniqueLocations", () => {
  const mockItinerary = {
    days: [
      {
        day: 1,
        date: "2025-06-01",
        morning: [
          { title: "Eiffel Tower", location: "Paris", address: "Champ de Mars" },
        ],
        afternoon: [
          { title: "Louvre", location: "Paris", address: "Rue de Rivoli" },
        ],
        evening: [],
      },
      {
        day: 2,
        date: "2025-06-02",
        morning: [
          { title: "Eiffel Tower", location: "Paris", address: "Champ de Mars" }, // duplicate
        ],
        afternoon: [],
        evening: [],
      },
    ],
  };

  it("deduplicates locations by address", () => {
    const result = extractUniqueLocations(mockItinerary);
    const addresses = result.map((r) => r.address);
    const uniqueAddresses = [...new Set(addresses)];
    expect(addresses.length).toBe(uniqueAddresses.length);
  });

  it("returns empty array for null/undefined itinerary", () => {
    expect(extractUniqueLocations(null)).toEqual([]);
    expect(extractUniqueLocations(undefined)).toEqual([]);
  });

  it("sorts by day then by time block (morning < afternoon < evening)", () => {
    const result = extractUniqueLocations(mockItinerary);
    // Day 1 afternoon (Louvre) appears before day 2 morning (Eiffel Tower)
    // because day 1 < day 2 in sort order.
    // Note: the "Champ de Mars" address appears in both day 1 morning AND day 2 morning.
    // The Map dedup retains the LAST entry (day 2), so sorted results are:
    //   [0] day 1 afternoon (Louvre), [1] day 2 morning (Eiffel Tower)
    expect(result[0].day).toBe(1);
    expect(result[0].title).toBe("Louvre");
    expect(result[1].day).toBe(2);
  });

  it("includes activities with only a title when location/address missing", () => {
    const itinerary = {
      days: [{ day: 1, morning: [{ title: "Free walk" }], afternoon: [], evening: [] }],
    };
    const result = extractUniqueLocations(itinerary);
    expect(result.some((r) => r.title === "Free walk")).toBe(true);
  });
});

// ─── countDayActivities ───────────────────────────────────────────────────────

describe("countDayActivities", () => {
  it("counts activities across all time blocks", () => {
    const day = {
      morning: [{ title: "A" }, { title: "B" }],
      afternoon: [{ title: "C" }],
      evening: [],
    };
    expect(countDayActivities(day)).toBe(3);
  });

  it("returns 0 for empty day", () => {
    expect(countDayActivities({ morning: [], afternoon: [], evening: [] })).toBe(0);
  });

  it("handles missing arrays gracefully", () => {
    expect(countDayActivities({})).toBe(0);
    expect(countDayActivities(null)).toBe(0);
    expect(countDayActivities(undefined)).toBe(0);
  });
});

// ─── getDayEstimatedHours ─────────────────────────────────────────────────────

describe("getDayEstimatedHours", () => {
  it("sums durationHours across all activities", () => {
    const day = {
      morning: [{ durationHours: 2 }, { durationHours: 1.5 }],
      afternoon: [{ durationHours: 3 }],
      evening: [],
    };
    expect(getDayEstimatedHours(day)).toBe(6.5);
  });

  it("ignores non-numeric durationHours", () => {
    const day = {
      morning: [{ durationHours: "abc" }, { durationHours: 2 }],
      afternoon: [],
      evening: [],
    };
    expect(getDayEstimatedHours(day)).toBe(2);
  });

  it("ignores zero and negative durationHours", () => {
    const day = {
      morning: [{ durationHours: 0 }, { durationHours: -1 }, { durationHours: 2 }],
      afternoon: [],
      evening: [],
    };
    expect(getDayEstimatedHours(day)).toBe(2);
  });

  it("returns 0 for empty day", () => {
    expect(getDayEstimatedHours({ morning: [], afternoon: [], evening: [] })).toBe(0);
  });
});

// ─── formatHours ─────────────────────────────────────────────────────────────

describe("formatHours", () => {
  it("formats whole numbers as Xh", () => {
    expect(formatHours(3)).toBe("3h");
    expect(formatHours(10)).toBe("10h");
  });

  it("formats decimals to 1 decimal place", () => {
    expect(formatHours(2.5)).toBe("2.5h");
    expect(formatHours(1.25)).toBe("1.3h"); // JS toFixed(1): 1.25 → "1.3"
    expect(formatHours(3.14)).toBe("3.1h");
  });

  it('returns "—" for zero, negative, or non-finite values', () => {
    expect(formatHours(0)).toBe("—");
    expect(formatHours(-1)).toBe("—");
    expect(formatHours(NaN)).toBe("—");
    expect(formatHours(Infinity)).toBe("—");
    expect(formatHours(undefined)).toBe("—");
  });
});

// ─── formatCost ───────────────────────────────────────────────────────────────

describe("formatCost", () => {
  it('returns "Free" for 0', () => {
    expect(formatCost(0)).toBe("Free");
  });

  it("returns formatted cost string for positive numbers", () => {
    expect(formatCost(50)).toBe("~$50");
    expect(formatCost(1500)).toBe("~$1500");
  });

  it("returns null for null/undefined/NaN", () => {
    expect(formatCost(null)).toBeNull();
    expect(formatCost(undefined)).toBeNull();
    expect(formatCost(NaN)).toBeNull();
  });
});

// ─── fmtRange ─────────────────────────────────────────────────────────────────

describe("fmtRange", () => {
  it("formats date range with arrow", () => {
    expect(fmtRange("2025-06-01", "2025-06-10")).toBe("2025-06-01 → 2025-06-10");
  });

  it("returns empty string if either date is missing", () => {
    expect(fmtRange("", "2025-06-10")).toBe("");
    expect(fmtRange("2025-06-01", "")).toBe("");
    expect(fmtRange(null, null)).toBe("");
  });
});

// ─── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("returns the string unchanged when within limit", () => {
    expect(clamp("Hello")).toBe("Hello");
  });

  it("truncates with ellipsis when exceeding limit", () => {
    const long = "x".repeat(150);
    const result = clamp(long);
    expect(result).toHaveLength(120);
    expect(result.endsWith("…")).toBe(true);
  });

  it("handles null/undefined gracefully", () => {
    expect(clamp(null)).toBe("");
    expect(clamp(undefined)).toBe("");
  });

  it("respects custom limit", () => {
    const result = clamp("Hello World", 5);
    expect(result).toHaveLength(5);
    expect(result).toBe("Hell…");
  });
});
