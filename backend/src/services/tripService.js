import crypto from "crypto";
import { Trip } from "../models/Trip.js";
import { generateItinerary, generatePackingList } from "./openaiService.js";
import { fetchDestinationEvents } from "./eventsService.js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALLOWED_BUDGETS     = ["low", "mid", "high"];
export const ALLOWED_PACES       = ["relaxed", "moderate", "packed"];
export const ALLOWED_STATUSES    = ["planning", "upcoming", "completed"];
export const ALLOWED_EVENT_TYPES = ["festival","concert","culture","nightlife","food","family","sports"];

// ─── Normalizers ──────────────────────────────────────────────────────────────

export function normalizeTripMode(value) {
  return value === "multi" ? "multi" : "single";
}

export function normalizeDestinations(destinations = [], fallbackDestination = "") {
  if (Array.isArray(destinations)) {
    const cleaned = destinations.map((x) => String(x || "").trim()).filter(Boolean);
    if (cleaned.length) return cleaned;
  }
  const fallback = String(fallbackDestination || "").trim();
  return fallback ? [fallback] : [];
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeActivity(activity = {}) {
  return {
    title:         String(activity?.title || "").trim() || "Place",
    durationHours: toNullableNumber(activity?.durationHours),
    notes:         String(activity?.notes || "").trim(),
    location:      String(activity?.location || "").trim(),
    address:       String(activity?.address || "").trim(),
    category:      String(activity?.category || "").trim(),
    type:          String(activity?.type || "").trim(),
    rating:        toNullableNumber(activity?.rating),
    image:         String(activity?.image || activity?.imageUrl || activity?.photo || activity?.photoUrl || "").trim(),
    estimatedCostUSD: toNullableNumber(activity?.estimatedCostUSD),
  };
}

export function normalizeDay(day = {}, fallbackDayNumber = 1) {
  return {
    day:           Number(day?.day) || fallbackDayNumber,
    date:          String(day?.date || "").trim(),
    title:         String(day?.title || "").trim(),
    morning:       Array.isArray(day?.morning)   ? day.morning.map(normalizeActivity)   : [],
    afternoon:     Array.isArray(day?.afternoon) ? day.afternoon.map(normalizeActivity) : [],
    evening:       Array.isArray(day?.evening)   ? day.evening.map(normalizeActivity)   : [],
    foodSuggestion: String(day?.foodSuggestion || "").trim(),
    backupPlan:    String(day?.backupPlan || "").trim(),
    userNote:      String(day?.userNote || "").trim(),
  };
}

export function normalizePreferences(preferences = {}) {
  const raw = preferences?.travelers;
  const travelersNum = typeof raw === "object" && raw !== null
    ? Number(raw.total ?? (Number(raw.adults || 0) + Number(raw.children || 0) + Number(raw.infants || 0)))
    : Number(raw);

  return {
    travelers:     Number.isFinite(travelersNum) && travelersNum > 0 ? travelersNum : 2,
    budget:        ALLOWED_BUDGETS.includes(preferences?.budget) ? preferences.budget : "mid",
    pace:          ALLOWED_PACES.includes(preferences?.pace)     ? preferences.pace   : "moderate",
    interests:     Array.isArray(preferences?.interests)
      ? preferences.interests.map((x) => String(x || "").trim()).filter(Boolean)
      : [],
    notes:         String(preferences?.notes || "").trim(),
    sourceTab:     String(preferences?.sourceTab || "").trim(),
    tripType:      String(preferences?.tripType || "").trim(),
    from:          String(preferences?.from || "").trim(),
    includeEvents: preferences?.includeEvents === undefined ? true : Boolean(preferences.includeEvents),
    eventTypes:    Array.isArray(preferences?.eventTypes)
      ? preferences.eventTypes.map((x) => String(x || "").trim().toLowerCase()).filter((x) => ALLOWED_EVENT_TYPES.includes(x))
      : [],
  };
}

function normalizeRecommendedPlace(place = {}) {
  return {
    name:     String(place?.name || "").trim() || "Recommended Place",
    reason:   String(place?.reason || "").trim(),
    location: String(place?.location || "").trim(),
    address:  String(place?.address || "").trim(),
    category: String(place?.category || "").trim(),
    rating:   toNullableNumber(place?.rating),
    image:    String(place?.image || place?.imageUrl || place?.photo || place?.photoUrl || "").trim(),
  };
}

function normalizeEvent(event = {}) {
  return {
    name:        String(event?.name || "").trim() || "Event",
    date:        String(event?.date || "").trim(),
    time:        String(event?.time || "").trim(),
    location:    String(event?.location || "").trim(),
    address:     String(event?.address || "").trim(),
    category:    String(event?.category || "").trim(),
    description: String(event?.description || "").trim(),
    source:      String(event?.source || "").trim(),
    link:        String(event?.link || "").trim(),
    rating:      toNullableNumber(event?.rating),
  };
}

export function normalizeEvents(events = []) {
  return Array.isArray(events)
    ? events.map(normalizeEvent).filter((e) => e.name && e.date)
    : [];
}

export function normalizeItinerary(itinerary = {}) {
  return {
    tripSummary: itinerary?.tripSummary && typeof itinerary.tripSummary === "object" ? itinerary.tripSummary : {},
    days: Array.isArray(itinerary?.days)
      ? itinerary.days.map((day, i) => normalizeDay(day, i + 1))
      : [],
    tips: Array.isArray(itinerary?.tips)
      ? itinerary.tips.map((x) => String(x || "").trim()).filter(Boolean)
      : [],
    recommendedPlaces: Array.isArray(itinerary?.recommendedPlaces)
      ? itinerary.recommendedPlaces.map(normalizeRecommendedPlace).filter((p) => p.name && p.location)
      : [],
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidDateString(value) {
  if (!value || typeof value !== "string") return false;
  return !Number.isNaN(new Date(value).getTime());
}

export function validateTripPayload({ destination, destinations, tripMode, startDate, endDate }) {
  const mode            = normalizeTripMode(tripMode);
  const cleanDest       = String(destination || "").trim();
  const cleanDests      = normalizeDestinations(destinations, cleanDest);

  if (!cleanDest)                                             return "destination is required";
  if (!cleanDests.length)                                     return "At least one destination is required";
  if (mode === "multi" && cleanDests.length < 2)              return "Multi-city trips require at least 2 destinations";
  if (!startDate || !endDate)                                 return "startDate and endDate are required";
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) return "Invalid startDate or endDate";
  if (new Date(startDate) > new Date(endDate))                return "startDate must be before endDate";

  return "";
}

// ─── Service methods ──────────────────────────────────────────────────────────

export async function generateTripItinerary(body) {
  const { tripMode, destination, destinations, startDate, endDate, preferences, multiCityMeta } = body;
  const mode       = normalizeTripMode(tripMode);
  const cleanDest  = String(destination || "").trim();
  const cleanDests = normalizeDestinations(destinations, cleanDest);
  const prefs      = normalizePreferences(preferences);

  const [itinerary, events] = await Promise.all([
    generateItinerary({ tripMode: mode, destination: cleanDest, destinations: cleanDests, startDate, endDate, preferences: prefs, multiCityMeta: Array.isArray(multiCityMeta) ? multiCityMeta : [] }),
    fetchDestinationEvents({ destination: cleanDests[0] || cleanDest, startDate, endDate, preferences: prefs }),
  ]);

  return { itinerary: normalizeItinerary(itinerary), events: normalizeEvents(events) };
}

export async function generateAndSaveTrip(userId, body) {
  const { tripMode, destination, destinations, startDate, endDate, preferences, language, multiCityMeta, placeMeta } = body;
  const mode          = normalizeTripMode(tripMode);
  const cleanDest     = String(destination || "").trim();
  const cleanDests    = normalizeDestinations(destinations, cleanDest);
  const prefs         = normalizePreferences(preferences);
  const cleanMeta     = Array.isArray(multiCityMeta) ? multiCityMeta : [];

  const [itinerary, events] = await Promise.all([
    generateItinerary({ tripMode: mode, destination: cleanDest, destinations: cleanDests, startDate, endDate, preferences: prefs, language: language === "he" ? "he" : "en", multiCityMeta: cleanMeta }),
    fetchDestinationEvents({ destination: cleanDests[0] || cleanDest, startDate, endDate, preferences: prefs }),
  ]);

  return Trip.create({
    userId,
    tripMode:     mode,
    destination:  cleanDest,
    destinations: cleanDests,
    startDate,
    endDate,
    preferences:  prefs,
    itinerary:    normalizeItinerary(itinerary),
    events:       normalizeEvents(events),
    placeMeta:    placeMeta && typeof placeMeta === "object" ? placeMeta : {},
    multiCityMeta: cleanMeta,
  });
}

export async function createTrip(userId, body) {
  const { tripMode, destination, destinations, startDate, endDate, preferences, itinerary, events } = body;
  const mode      = normalizeTripMode(tripMode);
  const cleanDest = String(destination || "").trim();
  const cleanDests = normalizeDestinations(destinations, cleanDest);

  return Trip.create({
    userId,
    tripMode:     mode,
    destination:  cleanDest,
    destinations: cleanDests,
    startDate,
    endDate,
    preferences:  normalizePreferences(preferences),
    itinerary:    normalizeItinerary(itinerary),
    events:       normalizeEvents(events),
  });
}

export async function getTrips(userId) {
  return Trip.find({ userId })
    .select("destination destinations tripMode startDate endDate preferences itinerary.tripSummary status shareToken createdAt placeMeta multiCityMeta")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getTrip(id, userId) {
  return Trip.findOne({ _id: id, userId }).lean();
}

export async function getSharedTrip(shareToken) {
  return Trip.findOne({ shareToken })
    .select("destination destinations tripMode startDate endDate preferences itinerary events placeMeta multiCityMeta status")
    .lean();
}

export async function updateTrip(id, userId, body) {
  const { tripMode, destination, destinations, startDate, endDate, preferences, itinerary, events } = body;
  const mode       = normalizeTripMode(tripMode);
  const cleanDest  = String(destination || "").trim();
  const cleanDests = normalizeDestinations(destinations, cleanDest);

  const trip = await Trip.findOne({ _id: id, userId });
  if (!trip) return null;

  trip.tripMode    = mode;
  trip.destination = cleanDest;
  trip.destinations = cleanDests;
  trip.startDate   = startDate;
  trip.endDate     = endDate;
  trip.preferences = normalizePreferences(preferences);

  const normalized = normalizeItinerary(itinerary);

  // Preserve existing recommendedPlaces if incoming has none
  const incomingHasPlaces  = Array.isArray(itinerary?.recommendedPlaces) && itinerary.recommendedPlaces.length > 0;
  const existingHasPlaces  = Array.isArray(trip?.itinerary?.recommendedPlaces) && trip.itinerary.recommendedPlaces.length > 0;
  if (!incomingHasPlaces && existingHasPlaces) normalized.recommendedPlaces = trip.itinerary.recommendedPlaces;

  trip.itinerary = normalized;

  const incomingHasEvents = Array.isArray(events);
  const existingHasEvents = Array.isArray(trip?.events) && trip.events.length > 0;
  if (incomingHasEvents)       trip.events = normalizeEvents(events);
  else if (!existingHasEvents) trip.events = [];

  await trip.save();
  return trip;
}

export async function deleteTrip(id, userId) {
  return Trip.findOneAndDelete({ _id: id, userId });
}

export async function shareTrip(id, userId) {
  const trip = await Trip.findOne({ _id: id, userId });
  if (!trip) return null;
  if (!trip.shareToken) {
    trip.shareToken = crypto.randomBytes(24).toString("hex");
    await trip.save();
  }
  return trip.shareToken;
}

export async function unshareTrip(id, userId) {
  const trip = await Trip.findOne({ _id: id, userId });
  if (!trip) return null;
  trip.shareToken = null;
  await trip.save();
  return true;
}

export async function updateTripStatus(id, userId, status) {
  return Trip.findOneAndUpdate(
    { _id: id, userId },
    { status },
    { new: true, select: "status" }
  );
}

export async function duplicateTrip(id, userId) {
  const source = await Trip.findOne({ _id: id, userId }).lean();
  if (!source) return null;
  const { _id, __v, createdAt, updatedAt, shareToken, ...rest } = source;
  return Trip.create({
    ...rest,
    userId,
    status:      "planning",
    shareToken:  null,
    destination: `${rest.destination} (Copy)`,
    packingList: [],
    itinerary: {
      ...rest.itinerary,
      days: (rest.itinerary?.days || []).map((d) => ({ ...d, userNote: "" })),
    },
  });
}

export async function getPackingList(id, userId) {
  const trip = await Trip.findOne({ _id: id, userId }).select("packingList").lean();
  if (!trip) return null;
  return trip.packingList || [];
}

export async function generatePackingListForTrip(id, userId) {
  const trip = await Trip.findOne({ _id: id, userId });
  if (!trip) return null;
  const items = await generatePackingList({
    destination: trip.destination,
    startDate:   trip.startDate,
    endDate:     trip.endDate,
    preferences: trip.preferences,
  });
  trip.packingList = items;
  await trip.save();
  return trip.packingList;
}

export function cleanPackingList(packingList) {
  return packingList
    .filter((x) => x && typeof x.label === "string" && x.label.trim())
    .map((x) => ({ label: String(x.label).trim().slice(0, 200), checked: Boolean(x.checked) }));
}

export async function updatePackingList(id, userId, packingList) {
  const cleaned = cleanPackingList(packingList);
  return Trip.findOneAndUpdate(
    { _id: id, userId },
    { packingList: cleaned },
    { new: true, select: "packingList" }
  );
}

export async function updateDayNote(id, userId, dayIndex, note) {
  const trip = await Trip.findOne({ _id: id, userId });
  if (!trip) return null;
  if (!trip.itinerary?.days?.[dayIndex]) throw new Error("Day not found");
  trip.itinerary.days[dayIndex].userNote = String(note || "").trim().slice(0, 2000);
  trip.markModified("itinerary");
  await trip.save();
  return { dayIndex, userNote: trip.itinerary.days[dayIndex].userNote };
}
