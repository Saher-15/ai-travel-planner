import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/limiters.js";
import {
  ALLOWED_STATUSES,
  validateTripPayload,
  normalizeDestinations,
  normalizeTripMode,
  generateTripItinerary,
  generateAndSaveTrip,
  createTrip,
  getTrips,
  getTrip,
  getSharedTrip,
  updateTrip,
  deleteTrip,
  shareTrip,
  unshareTrip,
  updateTripStatus,
  duplicateTrip,
  getPackingList,
  generatePackingListForTrip,
  updatePackingList,
  updateDayNote,
} from "../services/tripService.js";
import { chatWithTripAssistant } from "../services/openaiService.js";
import { generateTripPDF } from "../services/pdfService.js";

const router = express.Router();

// ─── Generate (no save) ───────────────────────────────────────────────────────

router.post("/generate", authMiddleware, aiLimiter, async (req, res) => {
  const { tripMode, destination, destinations, startDate, endDate } = req.body;
  const error = validateTripPayload({
    tripMode: normalizeTripMode(tripMode),
    destination: String(destination || "").trim(),
    destinations: normalizeDestinations(destinations, destination),
    startDate,
    endDate,
  });
  if (error) return res.status(400).json({ message: error });

  try {
    const result = await generateTripItinerary(req.body);
    return res.json(result);
  } catch (err) {
    console.error("Generate error:", err);
    return res.status(500).json({ message: err.message || "Failed to generate itinerary" });
  }
});

// ─── Generate + save ──────────────────────────────────────────────────────────

router.post("/generate-and-save", authMiddleware, aiLimiter, async (req, res) => {
  const { tripMode, destination, destinations, startDate, endDate } = req.body;
  const error = validateTripPayload({
    tripMode: normalizeTripMode(tripMode),
    destination: String(destination || "").trim(),
    destinations: normalizeDestinations(destinations, destination),
    startDate,
    endDate,
  });
  if (error) return res.status(400).json({ message: error });

  try {
    const trip = await generateAndSaveTrip(req.user.id, req.body);
    return res.status(201).json(trip);
  } catch (err) {
    console.error("Generate-and-save error:", err);
    return res.status(500).json({ message: err.message || "Failed to generate and save trip" });
  }
});

// ─── Create ───────────────────────────────────────────────────────────────────

router.post("/", authMiddleware, async (req, res) => {
  const { tripMode, destination, destinations, startDate, endDate, itinerary } = req.body;
  const error = validateTripPayload({
    tripMode: normalizeTripMode(tripMode),
    destination: String(destination || "").trim(),
    destinations: normalizeDestinations(destinations, destination),
    startDate,
    endDate,
  });
  if (error) return res.status(400).json({ message: error });
  if (!itinerary || typeof itinerary !== "object") return res.status(400).json({ message: "itinerary is required" });

  try {
    const trip = await createTrip(req.user.id, req.body);
    return res.status(201).json(trip);
  } catch (err) {
    console.error("Create trip error:", err);
    return res.status(500).json({ message: "Failed to save trip" });
  }
});

// ─── Shared (public) ──────────────────────────────────────────────────────────

router.get("/shared/:token", async (req, res) => {
  try {
    const trip = await getSharedTrip(req.params.token);
    if (!trip) return res.status(404).json({ message: "Shared trip not found or link expired." });
    return res.json(trip);
  } catch {
    return res.status(500).json({ message: "Failed to load shared trip." });
  }
});

// ─── List ─────────────────────────────────────────────────────────────────────

router.get("/", authMiddleware, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const { status, q } = req.query;
    const result = await getTrips(req.user.id, { page, limit, status, q });
    return res.json(result);
  } catch {
    return res.status(500).json({ message: "Failed to fetch trips" });
  }
});

// ─── Share / unshare ──────────────────────────────────────────────────────────

router.post("/:id/share", authMiddleware, async (req, res) => {
  try {
    const token = await shareTrip(req.params.id, req.user.id);
    if (!token) return res.status(404).json({ message: "Trip not found" });
    return res.json({ shareToken: token });
  } catch {
    return res.status(500).json({ message: "Failed to create share link." });
  }
});

router.delete("/:id/share", authMiddleware, async (req, res) => {
  try {
    const ok = await unshareTrip(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ message: "Trip not found" });
    return res.json({ message: "Share link removed." });
  } catch {
    return res.status(500).json({ message: "Failed to remove share link." });
  }
});

// ─── Status ───────────────────────────────────────────────────────────────────

router.patch("/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
  }
  try {
    const trip = await updateTripStatus(req.params.id, req.user.id, status);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    return res.json({ status: trip.status });
  } catch {
    return res.status(500).json({ message: "Failed to update status." });
  }
});

// ─── Duplicate ────────────────────────────────────────────────────────────────

router.post("/:id/duplicate", authMiddleware, async (req, res) => {
  try {
    const clone = await duplicateTrip(req.params.id, req.user.id);
    if (!clone) return res.status(404).json({ message: "Trip not found" });
    return res.status(201).json(clone);
  } catch {
    return res.status(500).json({ message: "Failed to duplicate trip." });
  }
});

// ─── Packing list ─────────────────────────────────────────────────────────────

router.get("/:id/packing", authMiddleware, async (req, res) => {
  try {
    const list = await getPackingList(req.params.id, req.user.id);
    if (list === null) return res.status(404).json({ message: "Trip not found" });
    return res.json({ packingList: list });
  } catch {
    return res.status(500).json({ message: "Failed to fetch packing list." });
  }
});

router.post("/:id/packing/generate", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const list = await generatePackingListForTrip(req.params.id, req.user.id);
    if (list === null) return res.status(404).json({ message: "Trip not found" });
    return res.json({ packingList: list });
  } catch (err) {
    console.error("Packing list generation error:", err);
    return res.status(500).json({ message: "Failed to generate packing list." });
  }
});

router.put("/:id/packing", authMiddleware, async (req, res) => {
  const { packingList } = req.body;
  if (!Array.isArray(packingList))     return res.status(400).json({ message: "packingList must be an array." });
  if (packingList.length > 100)        return res.status(400).json({ message: "Packing list cannot exceed 100 items." });

  try {
    const trip = await updatePackingList(req.params.id, req.user.id, packingList);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    return res.json({ packingList: trip.packingList });
  } catch {
    return res.status(500).json({ message: "Failed to save packing list." });
  }
});

// ─── Day note ─────────────────────────────────────────────────────────────────

router.patch("/:id/days/:dayIndex/note", authMiddleware, async (req, res) => {
  const dayIndex = parseInt(req.params.dayIndex, 10);
  if (!Number.isFinite(dayIndex) || dayIndex < 0) {
    return res.status(400).json({ message: "Invalid dayIndex." });
  }
  try {
    const result = await updateDayNote(req.params.id, req.user.id, dayIndex, req.body.note);
    if (!result) return res.status(404).json({ message: "Trip not found" });
    return res.json(result);
  } catch (err) {
    if (err.message === "Day not found") return res.status(400).json({ message: "Day not found." });
    return res.status(500).json({ message: "Failed to save note." });
  }
});

// ─── Get one ──────────────────────────────────────────────────────────────────

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const trip = await getTrip(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.set("Cache-Control", "private, max-age=60");
    return res.json(trip);
  } catch {
    return res.status(500).json({ message: "Failed to fetch trip" });
  }
});

// ─── Update ───────────────────────────────────────────────────────────────────

router.put("/:id", authMiddleware, async (req, res) => {
  const { tripMode, destination, destinations, startDate, endDate, itinerary } = req.body;
  const error = validateTripPayload({
    tripMode: normalizeTripMode(tripMode),
    destination: String(destination || "").trim(),
    destinations: normalizeDestinations(destinations, destination),
    startDate,
    endDate,
  });
  if (error) return res.status(400).json({ message: error });
  if (!itinerary || typeof itinerary !== "object") return res.status(400).json({ message: "itinerary is required" });

  try {
    const trip = await updateTrip(req.params.id, req.user.id, req.body);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    return res.json(trip);
  } catch (err) {
    console.error("Update trip error:", err);
    return res.status(500).json({ message: "Failed to update trip" });
  }
});

// ─── Delete ───────────────────────────────────────────────────────────────────

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await deleteTrip(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ message: "Trip not found" });
    return res.json({ message: "Trip deleted" });
  } catch {
    return res.status(500).json({ message: "Failed to delete trip" });
  }
});

// ─── PDF export ───────────────────────────────────────────────────────────────

router.get("/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const trip = await getTrip(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    generateTripPDF(trip, res);
  } catch (err) {
    console.error("PDF error:", err);
    if (!res.headersSent) return res.status(500).json({ message: "Failed to generate PDF" });
    return res.end();
  }
});

// ─── AI Trip Chat ─────────────────────────────────────────────────────────────

router.post("/:id/chat", authMiddleware, aiLimiter, async (req, res) => {
  const { message, history } = req.body;
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ message: "message is required" });
  }

  try {
    const trip = await getTrip(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    const reply = await chatWithTripAssistant({
      trip,
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
    });

    return res.json({ reply });
  } catch (err) {
    console.error("Trip chat error:", err);
    return res.status(500).json({ message: "Failed to get AI response. Please try again." });
  }
});

export default router;
