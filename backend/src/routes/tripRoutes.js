import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { Trip } from "../models/Trip.js";
import { generateItinerary } from "../services/openaiService.js";
import { fetchDestinationEvents } from "../services/eventsService.js";
import { aiLimiter } from "../middleware/limiters.js";
import PDFDocument from "pdfkit";

const router = express.Router();

const BLOCKS = ["morning", "afternoon", "evening"];
const ALLOWED_BUDGETS = ["low", "mid", "high"];
const ALLOWED_PACES = ["relaxed", "moderate", "packed"];
const ALLOWED_EVENT_TYPES = [
  "festival",
  "concert",
  "culture",
  "nightlife",
  "food",
  "family",
  "sports",
];

function safeFileName(name = "planner") {
  return (
    String(name)
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "planner"
  );
}

function fmtRange(s, e) {
  return s && e ? `${s} → ${e}` : "";
}

function isValidDateString(value) {
  if (!value || typeof value !== "string") return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function normalizeTripMode(value) {
  return value === "multi" ? "multi" : "single";
}

function normalizeDestinations(destinations = [], fallbackDestination = "") {
  if (Array.isArray(destinations)) {
    const cleaned = destinations
      .map((x) => String(x || "").trim())
      .filter(Boolean);

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
  const durationHours = toNullableNumber(activity?.durationHours);
  const rating = toNullableNumber(activity?.rating);

  return {
    title: String(activity?.title || "").trim() || "Place",
    durationHours,
    notes: String(activity?.notes || "").trim(),
    location: String(activity?.location || "").trim(),
    address: String(activity?.address || "").trim(),
    category: String(activity?.category || "").trim(),
    type: String(activity?.type || "").trim(),
    rating,
    image: String(
      activity?.image ||
        activity?.imageUrl ||
        activity?.photo ||
        activity?.photoUrl ||
        ""
    ).trim(),
  };
}

function normalizeDay(day = {}, fallbackDayNumber = 1) {
  return {
    day: Number(day?.day) || fallbackDayNumber,
    date: String(day?.date || "").trim(),
    title: String(day?.title || "").trim(),
    morning: Array.isArray(day?.morning) ? day.morning.map(normalizeActivity) : [],
    afternoon: Array.isArray(day?.afternoon) ? day.afternoon.map(normalizeActivity) : [],
    evening: Array.isArray(day?.evening) ? day.evening.map(normalizeActivity) : [],
    foodSuggestion: String(day?.foodSuggestion || "").trim(),
    backupPlan: String(day?.backupPlan || "").trim(),
  };
}

function normalizePreferences(preferences = {}) {
  const travelersNum = Number(preferences?.travelers);

  return {
    travelers: Number.isFinite(travelersNum) && travelersNum > 0 ? travelersNum : 1,
    budget: ALLOWED_BUDGETS.includes(preferences?.budget) ? preferences.budget : "mid",
    pace: ALLOWED_PACES.includes(preferences?.pace) ? preferences.pace : "moderate",
    interests: Array.isArray(preferences?.interests)
      ? preferences.interests.map((x) => String(x || "").trim()).filter(Boolean)
      : [],
    notes: String(preferences?.notes || "").trim(),
    sourceTab: String(preferences?.sourceTab || "").trim(),
    tripType: String(preferences?.tripType || "").trim(),
    from: String(preferences?.from || "").trim(),
    includeEvents:
      preferences?.includeEvents === undefined ? true : Boolean(preferences.includeEvents),
    eventTypes: Array.isArray(preferences?.eventTypes)
      ? preferences.eventTypes
          .map((x) => String(x || "").trim().toLowerCase())
          .filter((x) => ALLOWED_EVENT_TYPES.includes(x))
      : [],
  };
}

function normalizeRecommendedPlace(place = {}) {
  const rating = toNullableNumber(place?.rating);

  return {
    name: String(place?.name || "").trim() || "Recommended Place",
    reason: String(place?.reason || "").trim(),
    location: String(place?.location || "").trim(),
    address: String(place?.address || "").trim(),
    category: String(place?.category || "").trim(),
    rating,
    image: String(
      place?.image ||
        place?.imageUrl ||
        place?.photo ||
        place?.photoUrl ||
        ""
    ).trim(),
  };
}

function normalizeEvent(event = {}) {
  const rating = toNullableNumber(event?.rating);

  return {
    name: String(event?.name || "").trim() || "Event",
    date: String(event?.date || "").trim(),
    time: String(event?.time || "").trim(),
    location: String(event?.location || "").trim(),
    address: String(event?.address || "").trim(),
    category: String(event?.category || "").trim(),
    description: String(event?.description || "").trim(),
    source: String(event?.source || "").trim(),
    link: String(event?.link || "").trim(),
    rating,
  };
}

function normalizeEvents(events = []) {
  return Array.isArray(events)
    ? events
        .map((event) => normalizeEvent(event))
        .filter((event) => event.name && event.date)
    : [];
}

function normalizeItinerary(itinerary = {}) {
  return {
    tripSummary:
      itinerary?.tripSummary && typeof itinerary.tripSummary === "object"
        ? itinerary.tripSummary
        : {},
    days: Array.isArray(itinerary?.days)
      ? itinerary.days.map((day, index) => normalizeDay(day, index + 1))
      : [],
    tips: Array.isArray(itinerary?.tips)
      ? itinerary.tips.map((x) => String(x || "").trim()).filter(Boolean)
      : [],
    recommendedPlaces: Array.isArray(itinerary?.recommendedPlaces)
      ? itinerary.recommendedPlaces
          .map((place) => normalizeRecommendedPlace(place))
          .filter((place) => place.name && place.location)
      : [],
  };
}

function validateTripPayload({ destination, destinations, tripMode, startDate, endDate }) {
  const normalizedMode = normalizeTripMode(tripMode);
  const cleanDestination = String(destination || "").trim();
  const cleanDestinations = normalizeDestinations(destinations, cleanDestination);

  if (!cleanDestination) return "destination is required";
  if (!cleanDestinations.length) return "At least one destination is required";
  if (normalizedMode === "multi" && cleanDestinations.length < 2) {
    return "Multi-city trips require at least 2 destinations";
  }
  if (!startDate || !endDate) return "startDate and endDate are required";
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return "Invalid startDate or endDate";
  }
  if (new Date(startDate) > new Date(endDate)) {
    return "startDate must be before endDate";
  }

  return "";
}

/* =========================
   PDF HELPERS
========================= */

const PDF_COLORS = {
  navy: "#0f172a",
  blue: "#2563eb",
  cyan: "#06b6d4",
  text: "#1f2937",
  muted: "#6b7280",
  soft: "#94a3b8",
  border: "#e5e7eb",
  white: "#ffffff",
  green: "#16a34a",
  orange: "#ea580c",
  purple: "#7c3aed",
  pink: "#db2777",
};

function pageContentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc, needed = 80) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 20;
  if (doc.y + needed > bottomLimit) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
}

function drawPageFooter(doc, pageNumber) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = doc.page.margins.left;
  const right = doc.page.margins.right;

  const footerLineY = pageHeight - 30;
  const footerTextY = pageHeight - 24;

  const prevX = doc.x;
  const prevY = doc.y;

  doc.save();

  doc
    .moveTo(left, footerLineY)
    .lineTo(pageWidth - right, footerLineY)
    .strokeColor(PDF_COLORS.border)
    .lineWidth(1)
    .stroke();

  const oldBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  doc.font("Helvetica").fontSize(9).fillColor(PDF_COLORS.soft);

  doc.text("AI Travel Planner", left, footerTextY, {
    width: 200,
    lineBreak: false,
  });

  doc.text(`Page ${pageNumber}`, pageWidth - right - 100, footerTextY, {
    width: 100,
    align: "right",
    lineBreak: false,
  });

  doc.page.margins.bottom = oldBottom;

  doc.restore();
  doc.x = prevX;
  doc.y = prevY;
}

function addSectionTitle(doc, title, subtitle = "") {
  ensureSpace(doc, 60);

  doc.font("Helvetica-Bold").fontSize(16).fillColor(PDF_COLORS.navy).text(title);

  if (subtitle) {
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).fillColor(PDF_COLORS.muted).text(subtitle);
  }

  doc.moveDown(0.5);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor(PDF_COLORS.border)
    .lineWidth(1)
    .stroke();

  doc.moveDown(0.7);
}

function drawInfoPill(doc, x, y, text, fill = "#eff6ff", color = PDF_COLORS.blue) {
  const paddingX = 10;
  const paddingY = 6;
  const width = doc.widthOfString(text, { font: "Helvetica-Bold", size: 9 }) + paddingX * 2;
  const height = 22;

  doc.save();
  doc.roundedRect(x, y, width, height, 11).fill(fill);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(color)
    .text(text, x + paddingX, y + paddingY + 1, { lineBreak: false });
  doc.restore();

  return width;
}

function drawCard(doc, { x, y, w, h, fill = "#ffffff", stroke = PDF_COLORS.border, radius = 14 }) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fillAndStroke(fill, stroke);
  doc.restore();
}

function renderWrappedText(doc, text, options = {}) {
  const {
    font = "Helvetica",
    size = 11,
    color = PDF_COLORS.text,
    width = pageContentWidth(doc),
    align = "left",
  } = options;

  doc.font(font).fontSize(size).fillColor(color).text(text, { width, align });
}

function drawDayHeader(doc, day) {
  ensureSpace(doc, 80);

  const x = doc.page.margins.left;
  const y = doc.y;
  const w = pageContentWidth(doc);
  const h = 48;

  doc.save();
  doc.roundedRect(x, y, w, h, 14).fill(PDF_COLORS.navy);
  doc.restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(PDF_COLORS.white)
    .text(`Day ${day.day}${day.title ? ` · ${day.title}` : ""}`, x + 16, y + 12, {
      width: w - 32,
      lineBreak: false,
    });

  if (day.date) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#cbd5e1")
      .text(day.date, x + 16, y + 30, {
        width: w - 32,
        lineBreak: false,
      });
  }

  doc.y = y + h + 12;
}

function drawBlock(doc, label, items = []) {
  if (!items.length) return;

  const labelColors = {
    morning: { fill: "#eff6ff", text: "#1d4ed8" },
    afternoon: { fill: "#fef3c7", text: "#b45309" },
    evening: { fill: "#f3e8ff", text: "#7c3aed" },
  };

  const theme = labelColors[label] || { fill: "#f1f5f9", text: "#334155" };

  const startX = doc.page.margins.left;
  const width = pageContentWidth(doc);

  let estimatedHeight = 56;

  for (const a of items) {
    const lineBits = [a?.title || "Place", a?.location, a?.address].filter(Boolean);
    const title = lineBits.join(" • ");
    const subBits = [
      a?.notes?.trim(),
      a?.category,
      a?.type,
      a?.durationHours ? `Estimated duration: ${a.durationHours} hour(s)` : "",
      a?.rating ? `Rating: ${a.rating}` : "",
    ].filter(Boolean);
    const sub = subBits.join(" • ");

    doc.font("Helvetica-Bold").fontSize(11);
    estimatedHeight += doc.heightOfString(title, { width: width - 36 }) + 6;

    if (sub) {
      doc.font("Helvetica").fontSize(10);
      estimatedHeight += doc.heightOfString(sub, { width: width - 36 }) + 10;
    } else {
      estimatedHeight += 8;
    }
  }

  estimatedHeight += 12;

  ensureSpace(doc, estimatedHeight + 8);

  const startY = doc.y;

  drawCard(doc, {
    x: startX,
    y: startY,
    w: width,
    h: estimatedHeight,
    fill: PDF_COLORS.white,
    stroke: PDF_COLORS.border,
    radius: 14,
  });

  doc.save();
  doc.roundedRect(startX + 14, startY + 14, 92, 22, 11).fill(theme.fill);
  doc.restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(theme.text)
    .text(label.toUpperCase(), startX + 25, startY + 20, {
      lineBreak: false,
    });

  let y = startY + 48;

  for (const [idx, a] of items.entries()) {
    const lineBits = [a?.title || "Place", a?.location, a?.address].filter(Boolean);
    const title = `${idx + 1}. ${lineBits.join(" • ")}`;

    const subBits = [
      a?.notes?.trim(),
      a?.category,
      a?.type,
      a?.durationHours ? `Estimated duration: ${a.durationHours} hour(s)` : "",
      a?.rating ? `Rating: ${a.rating}` : "",
    ].filter(Boolean);
    const sub = subBits.join(" • ");

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(PDF_COLORS.navy)
      .text(title, startX + 18, y, {
        width: width - 36,
      });

    y = doc.y + 2;

    if (sub) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(PDF_COLORS.muted)
        .text(sub, startX + 18, y, {
          width: width - 36,
        });

      y = doc.y + 8;
    } else {
      y += 8;
    }
  }

  doc.y = startY + estimatedHeight + 12;
}

function drawSimpleBullets(doc, title, items = []) {
  if (!items.length) return;

  addSectionTitle(doc, title);

  const x = doc.page.margins.left;
  const width = pageContentWidth(doc);

  items.forEach((item) => {
    doc.font("Helvetica").fontSize(10.5);
    const textHeight = doc.heightOfString(String(item), {
      width: width - 40,
    });
    const cardHeight = Math.max(34, textHeight + 20);

    ensureSpace(doc, cardHeight + 12);

    const y = doc.y;

    drawCard(doc, {
      x,
      y,
      w: width,
      h: cardHeight,
      fill: "#fcfcfd",
      stroke: PDF_COLORS.border,
      radius: 12,
    });

    doc.circle(x + 15, y + 17, 3).fill(PDF_COLORS.blue);

    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(PDF_COLORS.text)
      .text(String(item), x + 28, y + 10, {
        width: width - 40,
      });

    doc.y = y + cardHeight + 8;
  });

  doc.moveDown(0.3);
}

function drawEvents(doc, events = []) {
  if (!events.length) return;

  addSectionTitle(doc, "Events During Your Trip", "Live happenings and recommended stops");

  const x = doc.page.margins.left;
  const width = pageContentWidth(doc);

  events.forEach((event) => {
    const category = event.category || "EVENT";
    const title = event.name || "Event";
    const meta = [event.date, event.time, event.location, event.address]
      .filter(Boolean)
      .join(" • ");
    const description = String(event.description || "").trim();

    doc.font("Helvetica-Bold").fontSize(12);
    const titleHeight = doc.heightOfString(title, { width: width - 28 });

    doc.font("Helvetica").fontSize(10);
    const metaHeight = meta
      ? doc.heightOfString(meta, { width: width - 28 })
      : 0;

    doc.font("Helvetica").fontSize(10);
    const descHeight = description
      ? doc.heightOfString(description, { width: width - 28 })
      : 0;

    const cardHeight = Math.max(82, 54 + titleHeight + metaHeight + descHeight);

    ensureSpace(doc, cardHeight + 12);

    const y = doc.y;

    drawCard(doc, {
      x,
      y,
      w: width,
      h: cardHeight,
      fill: "#ffffff",
      stroke: PDF_COLORS.border,
      radius: 14,
    });

    doc.save();
    doc.roundedRect(x + 14, y + 14, 72, 22, 11).fill("#ecfeff");
    doc.restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(PDF_COLORS.cyan)
      .text(category, x + 26, y + 20, { lineBreak: false });

    let cursorY = y + 42;

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(PDF_COLORS.navy)
      .text(title, x + 14, cursorY, {
        width: width - 28,
      });

    cursorY = doc.y + 4;

    if (meta) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(PDF_COLORS.muted)
        .text(meta, x + 14, cursorY, {
          width: width - 28,
        });

      cursorY = doc.y + 4;
    }

    if (description) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(PDF_COLORS.text)
        .text(description, x + 14, cursorY, {
          width: width - 28,
        });
    }

    doc.y = y + cardHeight + 12;
  });
}

function drawRecommendedPlaces(doc, places = []) {
  if (!places.length) return;

  addSectionTitle(doc, "Recommended Places", "Top suggestions worth visiting");

  const x = doc.page.margins.left;
  const width = pageContentWidth(doc);

  places.forEach((place) => {
    const title = place.name || "Recommended Place";
    const meta = [place.location, place.address, place.category, place.rating ? `Rating: ${place.rating}` : ""]
      .filter(Boolean)
      .join(" • ");
    const reason = String(place.reason || "").trim();

    doc.font("Helvetica-Bold").fontSize(12);
    const titleHeight = doc.heightOfString(title, { width: width - 28 });

    doc.font("Helvetica").fontSize(10);
    const metaHeight = meta
      ? doc.heightOfString(meta, { width: width - 28 })
      : 0;

    doc.font("Helvetica").fontSize(10.5);
    const reasonHeight = reason
      ? doc.heightOfString(reason, { width: width - 28 })
      : 0;

    const cardHeight = Math.max(86, 28 + titleHeight + metaHeight + reasonHeight + 18);

    ensureSpace(doc, cardHeight + 12);

    const y = doc.y;

    drawCard(doc, {
      x,
      y,
      w: width,
      h: cardHeight,
      fill: "#ffffff",
      stroke: PDF_COLORS.border,
      radius: 14,
    });

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(PDF_COLORS.navy)
      .text(title, x + 14, y + 14, {
        width: width - 28,
      });

    let cursorY = doc.y + 4;

    if (meta) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(PDF_COLORS.muted)
        .text(meta, x + 14, cursorY, {
          width: width - 28,
        });

      cursorY = doc.y + 4;
    }

    if (reason) {
      doc
        .font("Helvetica")
        .fontSize(10.5)
        .fillColor(PDF_COLORS.text)
        .text(reason, x + 14, cursorY, {
          width: width - 28,
        });
    }

    doc.y = y + cardHeight + 12;
  });
}

/**
 * POST /trips/generate
 */
router.post("/generate", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { tripMode, destination, destinations, startDate, endDate, preferences, multiCityMeta } = req.body;

    const normalizedTripMode = normalizeTripMode(tripMode);
    const cleanDestination = String(destination || "").trim();
    const cleanDestinations = normalizeDestinations(destinations, cleanDestination);

    const validationError = validateTripPayload({
      tripMode: normalizedTripMode,
      destination: cleanDestination,
      destinations: cleanDestinations,
      startDate,
      endDate,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedPreferences = normalizePreferences(preferences);

    const [itinerary, fetchedEvents] = await Promise.all([
      generateItinerary({
        tripMode: normalizedTripMode,
        destination: cleanDestination,
        destinations: cleanDestinations,
        startDate,
        endDate,
        preferences: normalizedPreferences,
        multiCityMeta: Array.isArray(multiCityMeta) ? multiCityMeta : [],
      }),
      fetchDestinationEvents({
        destination: cleanDestinations[0] || cleanDestination,
        startDate,
        endDate,
        preferences: normalizedPreferences,
      }),
    ]);

    return res.json({
      itinerary: normalizeItinerary(itinerary),
      events: normalizeEvents(fetchedEvents),
    });
  } catch (err) {
    console.error("Generate itinerary error:", err);
    return res.status(500).json({ message: err.message || "Failed to generate itinerary" });
  }
});

/**
 * POST /trips/generate-and-save
 */
router.post("/generate-and-save", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { tripMode, destination, destinations, startDate, endDate, preferences, language, multiCityMeta, placeMeta } = req.body;

    const normalizedTripMode = normalizeTripMode(tripMode);
    const cleanDestination = String(destination || "").trim();
    const cleanDestinations = normalizeDestinations(destinations, cleanDestination);

    const validationError = validateTripPayload({
      tripMode: normalizedTripMode,
      destination: cleanDestination,
      destinations: cleanDestinations,
      startDate,
      endDate,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedPreferences = normalizePreferences(preferences);
    const cleanMultiCityMeta = Array.isArray(multiCityMeta) ? multiCityMeta : [];

    const [itinerary, fetchedEvents] = await Promise.all([
      generateItinerary({
        tripMode: normalizedTripMode,
        destination: cleanDestination,
        destinations: cleanDestinations,
        startDate,
        endDate,
        preferences: normalizedPreferences,
        language: language === "he" ? "he" : "en",
        multiCityMeta: cleanMultiCityMeta,
      }),
      fetchDestinationEvents({
        destination: cleanDestinations[0] || cleanDestination,
        startDate,
        endDate,
        preferences: normalizedPreferences,
      }),
    ]);

    const trip = await Trip.create({
      userId: req.user.id,
      tripMode: normalizedTripMode,
      destination: cleanDestination,
      destinations: cleanDestinations,
      startDate,
      endDate,
      preferences: normalizedPreferences,
      itinerary: normalizeItinerary(itinerary),
      events: normalizeEvents(fetchedEvents),
      placeMeta: placeMeta && typeof placeMeta === "object" ? placeMeta : {},
      multiCityMeta: cleanMultiCityMeta,
    });

    return res.status(201).json(trip);
  } catch (err) {
    console.error("Generate and save error:", err);
    return res.status(500).json({ message: err.message || "Failed to generate and save trip" });
  }
});

/**
 * POST /trips
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      tripMode,
      destination,
      destinations,
      startDate,
      endDate,
      preferences,
      itinerary,
      events,
    } = req.body;

    const normalizedTripMode = normalizeTripMode(tripMode);
    const cleanDestination = String(destination || "").trim();
    const cleanDestinations = normalizeDestinations(destinations, cleanDestination);

    const validationError = validateTripPayload({
      tripMode: normalizedTripMode,
      destination: cleanDestination,
      destinations: cleanDestinations,
      startDate,
      endDate,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (!itinerary || typeof itinerary !== "object") {
      return res.status(400).json({ message: "itinerary is required" });
    }

    const trip = await Trip.create({
      userId: req.user.id,
      tripMode: normalizedTripMode,
      destination: cleanDestination,
      destinations: cleanDestinations,
      startDate,
      endDate,
      preferences: normalizePreferences(preferences),
      itinerary: normalizeItinerary(itinerary),
      events: normalizeEvents(events),
    });

    return res.status(201).json(trip);
  } catch (err) {
    console.error("Save trip error:", err);
    return res.status(500).json({ message: "Failed to save trip" });
  }
});

/**
 * GET /trips
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id })
      .select("destination destinations tripMode startDate endDate preferences itinerary.tripSummary createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return res.json(trips);
  } catch {
    return res.status(500).json({ message: "Failed to fetch trips" });
  }
});

/**
 * GET /trips/:id
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    return res.json(trip);
  } catch {
    return res.status(500).json({ message: "Failed to fetch trip" });
  }
});

/**
 * PUT /trips/:id
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const {
      tripMode,
      destination,
      destinations,
      startDate,
      endDate,
      preferences,
      itinerary,
      events,
    } = req.body;

    const normalizedTripMode = normalizeTripMode(tripMode);
    const cleanDestination = String(destination || "").trim();
    const cleanDestinations = normalizeDestinations(destinations, cleanDestination);

    const validationError = validateTripPayload({
      tripMode: normalizedTripMode,
      destination: cleanDestination,
      destinations: cleanDestinations,
      startDate,
      endDate,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (!itinerary || typeof itinerary !== "object") {
      return res.status(400).json({ message: "itinerary is required" });
    }

    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    trip.tripMode = normalizedTripMode;
    trip.destination = cleanDestination;
    trip.destinations = cleanDestinations;
    trip.startDate = startDate;
    trip.endDate = endDate;
    trip.preferences = normalizePreferences(preferences);

    const normalized = normalizeItinerary(itinerary);

    const incomingHasRecommendedPlaces =
      Array.isArray(itinerary?.recommendedPlaces) && itinerary.recommendedPlaces.length > 0;

    const existingHasRecommendedPlaces =
      Array.isArray(trip?.itinerary?.recommendedPlaces) &&
      trip.itinerary.recommendedPlaces.length > 0;

    if (!incomingHasRecommendedPlaces && existingHasRecommendedPlaces) {
      normalized.recommendedPlaces = trip.itinerary.recommendedPlaces;
    }

    trip.itinerary = normalized;

    const incomingHasEvents = Array.isArray(events);
    const existingHasEvents = Array.isArray(trip?.events) && trip.events.length > 0;

    if (incomingHasEvents) {
      trip.events = normalizeEvents(events);
    } else if (!existingHasEvents) {
      trip.events = [];
    }

    await trip.save();

    return res.json(trip);
  } catch (err) {
    console.error("Update trip error:", err);
    return res.status(500).json({ message: "Failed to update trip" });
  }
});

/**
 * DELETE /trips/:id
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Trip.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!deleted) return res.status(404).json({ message: "Trip not found" });
    return res.json({ message: "Trip deleted" });
  } catch {
    return res.status(500).json({ message: "Failed to delete trip" });
  }
});

/**
 * GET /trips/:id/pdf
 */
router.get("/:id/pdf", authMiddleware, async (req, res) => {
  let doc;

  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    const fileBase = safeFileName(trip.destination || "trip");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="trip-${fileBase}.pdf"`);

    doc = new PDFDocument({
      size: "A4",
      margins: { top: 42, bottom: 42, left: 40, right: 40 },
      bufferPages: true,
      autoFirstPage: true,
    });

    let streamEnded = false;

    doc.on("error", (e) => {
      console.error("PDFKit error:", e);
      if (!streamEnded && !res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    });

    res.on("error", (e) => {
      console.error("Response stream error:", e);
    });

    doc.pipe(res);

    const contentWidth = pageContentWidth(doc);
    const topX = doc.page.margins.left;
    const topY = doc.y;

    doc.save();
    doc.roundedRect(topX, topY, contentWidth, 110, 20).fill(PDF_COLORS.navy);
    doc.restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(PDF_COLORS.white)
      .text(trip.destination || "Trip Planner", topX + 22, topY + 20, {
        width: contentWidth - 44,
      });

    const dateLine = fmtRange(trip.startDate, trip.endDate);
    if (dateLine) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#cbd5e1")
        .text(dateLine, topX + 22, topY + 54, {
          width: contentWidth - 44,
        });
    }

    if (trip.tripMode === "multi" && Array.isArray(trip.destinations) && trip.destinations.length) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#93c5fd")
        .text(`Route: ${trip.destinations.join(" → ")}`, topX + 22, topY + 74, {
          width: contentWidth - 44,
        });
    }

    doc.y = topY + 128;

    const summary = trip?.itinerary?.tripSummary || {};
    const prefs = trip?.preferences || {};

    let pillX = doc.page.margins.left;
    let pillY = doc.y;
    const pillGap = 8;
    const pillMaxX = doc.page.width - doc.page.margins.right;

    const pillValues = [
      summary.days ? `${summary.days} Days` : "",
      prefs.travelers ? `${prefs.travelers} Traveler${prefs.travelers > 1 ? "s" : ""}` : "",
      summary.style || prefs.pace || "",
      summary.budget || prefs.budget || "",
      trip.tripMode === "multi" ? "Multi City" : "Single City",
    ].filter(Boolean);

    pillValues.forEach((pill, idx) => {
      const palette = [
        ["#eff6ff", PDF_COLORS.blue],
        ["#ecfeff", PDF_COLORS.cyan],
        ["#f5f3ff", PDF_COLORS.purple],
        ["#fff7ed", PDF_COLORS.orange],
        ["#fdf2f8", PDF_COLORS.pink],
      ];

      const [fill, color] = palette[idx % palette.length];
      const estimatedWidth =
        doc.widthOfString(String(pill), { font: "Helvetica-Bold", size: 9 }) + 20;

      if (pillX + estimatedWidth > pillMaxX) {
        pillX = doc.page.margins.left;
        pillY += 30;
      }

      const usedWidth = drawInfoPill(doc, pillX, pillY, String(pill), fill, color);
      pillX += usedWidth + pillGap;
    });

    doc.y = pillY + 36;

    if (prefs.interests?.length || prefs.notes) {
      addSectionTitle(doc, "Traveler Preferences");

      if (prefs.interests?.length) {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(PDF_COLORS.navy)
          .text("Interests");
        doc.moveDown(0.25);
        renderWrappedText(doc, prefs.interests.join(" • "), {
          size: 10.5,
          color: PDF_COLORS.text,
        });
        doc.moveDown(0.7);
      }

      if (prefs.notes) {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(PDF_COLORS.navy)
          .text("Notes");
        doc.moveDown(0.25);
        renderWrappedText(doc, prefs.notes, {
          size: 10.5,
          color: PDF_COLORS.text,
        });
        doc.moveDown(0.6);
      }
    }

    const days = trip?.itinerary?.days || [];
    if (days.length) {
      addSectionTitle(doc, "Daily Itinerary", "Your day-by-day personalized route");

      for (const day of days) {
        drawDayHeader(doc, day);

        for (const block of BLOCKS) {
          const items = day?.[block] || [];
          if (items.length) {
            drawBlock(doc, block, items);
          }
        }

        if (day.foodSuggestion) {
          doc.font("Helvetica").fontSize(10.5);
          const textHeight = doc.heightOfString(String(day.foodSuggestion), {
            width: contentWidth - 28,
          });
          const cardHeight = Math.max(52, 30 + textHeight + 10);

          ensureSpace(doc, cardHeight + 12);
          const cardY = doc.y;

          drawCard(doc, {
            x: doc.page.margins.left,
            y: cardY,
            w: contentWidth,
            h: cardHeight,
            fill: "#fff7ed",
            stroke: "#fed7aa",
            radius: 14,
          });

          doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor(PDF_COLORS.orange)
            .text("FOOD SUGGESTION", doc.page.margins.left + 14, cardY + 10, {
              lineBreak: false,
            });

          doc
            .font("Helvetica")
            .fontSize(10.5)
            .fillColor(PDF_COLORS.text)
            .text(String(day.foodSuggestion), doc.page.margins.left + 14, cardY + 24, {
              width: contentWidth - 28,
            });

          doc.y = cardY + cardHeight + 12;
        }

        if (day.backupPlan) {
          doc.font("Helvetica").fontSize(10.5);
          const textHeight = doc.heightOfString(String(day.backupPlan), {
            width: contentWidth - 28,
          });
          const cardHeight = Math.max(52, 30 + textHeight + 10);

          ensureSpace(doc, cardHeight + 12);
          const cardY = doc.y;

          drawCard(doc, {
            x: doc.page.margins.left,
            y: cardY,
            w: contentWidth,
            h: cardHeight,
            fill: "#f0fdf4",
            stroke: "#bbf7d0",
            radius: 14,
          });

          doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor(PDF_COLORS.green)
            .text("BACKUP PLAN", doc.page.margins.left + 14, cardY + 10, {
              lineBreak: false,
            });

          doc
            .font("Helvetica")
            .fontSize(10.5)
            .fillColor(PDF_COLORS.text)
            .text(String(day.backupPlan), doc.page.margins.left + 14, cardY + 24, {
              width: contentWidth - 28,
            });

          doc.y = cardY + cardHeight + 12;
        }

        doc.moveDown(0.4);
      }
    }

    const recommendedPlaces = trip?.itinerary?.recommendedPlaces || [];
    if (recommendedPlaces.length) {
      drawRecommendedPlaces(doc, recommendedPlaces);
    }

    const tips = trip?.itinerary?.tips || [];
    if (tips.length) {
      drawSimpleBullets(doc, "Travel Tips", tips);
    }

    const eventsList = trip?.events || [];
    if (eventsList.length) {
      drawEvents(doc, eventsList);
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      drawPageFooter(doc, i + 1);
    }

    doc.flushPages();
    streamEnded = true;
    doc.end();
  } catch (err) {
    console.error("PDF download error:", err);

    if (doc && !doc.destroyed) {
      try {
        doc.end();
      } catch {}
    }

    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to generate PDF" });
    }

    return res.end();
  }
});

export default router;