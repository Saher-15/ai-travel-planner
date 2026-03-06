import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { Trip } from "../models/Trip.js";
import { generateItinerary } from "../services/openaiService.js";
import aiLimiter from "../middleware/aiLimiter.js";
import PDFDocument from "pdfkit";

const router = express.Router();

const BLOCKS = ["morning", "afternoon", "evening"];

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

/**
 * POST /trips/generate
 * Generates itinerary (AI - OpenAI)
 */
router.post("/generate", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { destination, startDate, endDate, preferences } = req.body;

    if (!destination || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "destination, startDate, endDate are required" });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res
        .status(400)
        .json({ message: "startDate must be before endDate" });
    }

    const itinerary = await generateItinerary({
      destination,
      startDate,
      endDate,
      preferences,
    });

    return res.json({ itinerary });
  } catch (err) {
    console.error("Generate itinerary error:", err);
    return res
      .status(500)
      .json({ message: err.message || "Failed to generate itinerary" });
  }
});

/**
 * POST /trips/generate-and-save
 * Generates itinerary with OpenAI + saves trip to MongoDB
 */
router.post("/generate-and-save", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { destination, startDate, endDate, preferences } = req.body;

    if (!destination || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "destination, startDate, endDate are required" });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res
        .status(400)
        .json({ message: "startDate must be before endDate" });
    }

    const itinerary = await generateItinerary({
      destination,
      startDate,
      endDate,
      preferences,
    });

    const trip = await Trip.create({
      userId: req.user.id,
      destination,
      startDate,
      endDate,
      preferences: preferences || {},
      itinerary,
    });

    return res.status(201).json(trip);
  } catch (err) {
    console.error("Generate and save error:", err);
    return res
      .status(500)
      .json({ message: err.message || "Failed to generate and save trip" });
  }
});

/**
 * POST /trips
 * Saves trip to MongoDB (manual save)
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { destination, startDate, endDate, preferences, itinerary } = req.body;

    if (!destination || !startDate || !endDate || !itinerary) {
      return res.status(400).json({
        message: "destination, startDate, endDate, itinerary are required",
      });
    }

    const trip = await Trip.create({
      userId: req.user.id,
      destination,
      startDate,
      endDate,
      preferences: preferences || {},
      itinerary,
    });

    return res.status(201).json(trip);
  } catch (err) {
    console.error("Save trip error:", err);
    return res.status(500).json({ message: "Failed to save trip" });
  }
});

/**
 * GET /trips
 * List my trips
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    return res.json(trips);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch trips" });
  }
});

/**
 * GET /trips/:id
 * Get one trip
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    return res.json(trip);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch trip" });
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
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete trip" });
  }
});

/**
 * GET /trips/:id/pdf
 * Download trip as PDF (server-side)
 *
 * IMPORTANT: Keep this AFTER "/:id" route? Actually either works,
 * but keeping it here avoids any edge-case matching issues.
 */
router.get("/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    const fileBase = safeFileName(trip.destination || "trip");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="trip-${fileBase}.pdf"`
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    // If stream errors happen, avoid crashing node
    doc.on("error", (e) => {
      console.error("PDFKit error:", e);
      if (!res.headersSent) res.status(500).json({ message: "Failed to generate PDF" });
      else res.end();
    });

    // If client closes connection mid-stream
    res.on("close", () => {
      try {
        doc.end();
      } catch {}
    });

    doc.pipe(res);

    // Title (PDFKit doesn't support {bold:true} in text options)
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#111");
    doc.text(trip.destination || "Trip Planner");
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(11).fillColor("#444");
    doc.text(fmtRange(trip.startDate, trip.endDate));
    doc.moveDown(1);

    // Summary
    const summary = trip?.itinerary?.tripSummary || {};
    const summaryParts = [];
    if (summary.days) summaryParts.push(`Days: ${summary.days}`);
    if (summary.style) summaryParts.push(`Pace: ${summary.style}`);
    if (summary.budget) summaryParts.push(`Budget: ${summary.budget}`);

    if (summaryParts.length) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#111").text("Summary");
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(11).fillColor("#444").text(summaryParts.join(" • "));
      doc.moveDown(1);
    }

    // Days
    const days = trip?.itinerary?.days || [];
    for (const d of days) {
      doc.font("Helvetica-Bold").fontSize(14).fillColor("#111");
      doc.text(`Day ${d.day}: ${d.title || ""}`);

      if (d.date) {
        doc.font("Helvetica").fontSize(10).fillColor("#666");
        doc.text(d.date);
      }

      doc.moveDown(0.5);

      for (const block of BLOCKS) {
        const items = d?.[block] || [];
        if (!items.length) continue;

        doc.font("Helvetica-Bold").fontSize(12).fillColor("#111");
        doc.text(block.toUpperCase());
        doc.moveDown(0.25);

        doc.font("Helvetica").fontSize(11).fillColor("#333");
        for (const a of items) {
          const t = a?.title ? `• ${a.title}` : "• Place";
          const loc = a?.location ? ` (${a.location})` : "";
          doc.text(`${t}${loc}`);
        }

        doc.moveDown(0.6);
      }

      if (d.foodSuggestion) {
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#111").text("Food suggestion:");
        doc.font("Helvetica").fontSize(11).fillColor("#333").text(String(d.foodSuggestion));
        doc.moveDown(0.5);
      }

      if (d.backupPlan) {
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#111").text("Backup plan:");
        doc.font("Helvetica").fontSize(11).fillColor("#333").text(String(d.backupPlan));
        doc.moveDown(0.5);
      }

      // Divider
      doc.moveDown(0.5);
      doc
        .strokeColor("#e5e7eb")
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(1);
    }

    // Tips
    const tips = trip?.itinerary?.tips || [];
    if (tips.length) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#111").text("Tips");
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(11).fillColor("#333");
      tips.forEach((t) => doc.text(`• ${t}`));
      doc.moveDown(1);
    }

    doc.end();
  } catch (err) {
    console.error("PDF download error:", err);
    return res.status(500).json({ message: "Failed to generate PDF" });
  }
});

export default router;