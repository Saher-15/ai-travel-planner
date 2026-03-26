import PDFDocument from "pdfkit";

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  navy:   "#0f172a",
  blue:   "#2563eb",
  cyan:   "#06b6d4",
  text:   "#1f2937",
  muted:  "#6b7280",
  soft:   "#94a3b8",
  border: "#e5e7eb",
  white:  "#ffffff",
  green:  "#16a34a",
  orange: "#ea580c",
  purple: "#7c3aed",
  pink:   "#db2777",
};

const BLOCKS = ["morning", "afternoon", "evening"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pageWidth(doc)   { return doc.page.width  - doc.page.margins.left - doc.page.margins.right; }
function pageLeft(doc)    { return doc.page.margins.left; }

function ensureSpace(doc, needed = 80) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom - 20) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
}

function card(doc, { x, y, w, h, fill = C.white, stroke = C.border, radius = 14 }) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fillAndStroke(fill, stroke);
  doc.restore();
}

function sectionTitle(doc, title, subtitle = "") {
  ensureSpace(doc, 60);
  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.navy).text(title);
  if (subtitle) {
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).fillColor(C.muted).text(subtitle);
  }
  doc.moveDown(0.5);
  doc.moveTo(pageLeft(doc), doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor(C.border).lineWidth(1).stroke();
  doc.moveDown(0.7);
}

function pill(doc, x, y, text, fill = "#eff6ff", color = C.blue) {
  const px = 10, py = 6, h = 22;
  const w  = doc.widthOfString(text, { font: "Helvetica-Bold", size: 9 }) + px * 2;
  doc.save();
  doc.roundedRect(x, y, w, h, 11).fill(fill);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(color).text(text, x + px, y + py + 1, { lineBreak: false });
  doc.restore();
  return w;
}

function footer(doc, pageNum) {
  const { left, right, bottom } = doc.page.margins;
  const pw = doc.page.width, ph = doc.page.height;
  const ly = ph - 30, ty = ph - 24;
  const px = doc.x, py = doc.y;

  doc.save();
  doc.moveTo(left, ly).lineTo(pw - right, ly).strokeColor(C.border).lineWidth(1).stroke();
  doc.page.margins.bottom = 0;
  doc.font("Helvetica").fontSize(9).fillColor(C.soft);
  doc.text("AI Travel Planner", left, ty, { width: 200, lineBreak: false });
  doc.text(`Page ${pageNum}`, pw - right - 100, ty, { width: 100, align: "right", lineBreak: false });
  doc.page.margins.bottom = bottom;
  doc.restore();
  doc.x = px; doc.y = py;
}

function dayHeader(doc, day) {
  ensureSpace(doc, 80);
  const x = pageLeft(doc), y = doc.y, w = pageWidth(doc), h = 48;
  doc.save();
  doc.roundedRect(x, y, w, h, 14).fill(C.navy);
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.white).text(`Day ${day.day}${day.title ? ` · ${day.title}` : ""}`, x + 16, y + 12, { width: w - 32, lineBreak: false });
  if (day.date) doc.font("Helvetica").fontSize(10).fillColor("#cbd5e1").text(day.date, x + 16, y + 30, { width: w - 32, lineBreak: false });
  doc.y = y + h + 12;
}

function block(doc, label, items = []) {
  if (!items.length) return;

  const theme = { morning: { fill: "#eff6ff", text: "#1d4ed8" }, afternoon: { fill: "#fef3c7", text: "#b45309" }, evening: { fill: "#f3e8ff", text: "#7c3aed" } }[label] || { fill: "#f1f5f9", text: "#334155" };
  const x = pageLeft(doc), w = pageWidth(doc);

  let estimatedH = 56;
  for (const a of items) {
    const title = [a?.title || "Place", a?.location, a?.address].filter(Boolean).join(" • ");
    const sub   = [a?.notes?.trim(), a?.category, a?.type, a?.durationHours ? `${a.durationHours}h` : "", a?.rating ? `★ ${a.rating}` : ""].filter(Boolean).join(" • ");
    doc.font("Helvetica-Bold").fontSize(11);
    estimatedH += doc.heightOfString(title, { width: w - 36 }) + 6;
    if (sub) { doc.font("Helvetica").fontSize(10); estimatedH += doc.heightOfString(sub, { width: w - 36 }) + 10; }
    else estimatedH += 8;
  }
  estimatedH += 12;

  ensureSpace(doc, estimatedH + 8);
  const y = doc.y;

  card(doc, { x, y, w, h: estimatedH });
  doc.save();
  doc.roundedRect(x + 14, y + 14, 92, 22, 11).fill(theme.fill);
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(theme.text).text(label.toUpperCase(), x + 25, y + 20, { lineBreak: false });

  let cy = y + 48;
  for (const [i, a] of items.entries()) {
    const title = `${i + 1}. ${[a?.title || "Place", a?.location, a?.address].filter(Boolean).join(" • ")}`;
    const sub   = [a?.notes?.trim(), a?.category, a?.type, a?.durationHours ? `${a.durationHours}h` : "", a?.rating ? `★ ${a.rating}` : ""].filter(Boolean).join(" • ");
    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.navy).text(title, x + 18, cy, { width: w - 36 });
    cy = doc.y + 2;
    if (sub) { doc.font("Helvetica").fontSize(10).fillColor(C.muted).text(sub, x + 18, cy, { width: w - 36 }); cy = doc.y + 8; }
    else cy += 8;
  }
  doc.y = y + estimatedH + 12;
}

function bullets(doc, title, items = []) {
  if (!items.length) return;
  sectionTitle(doc, title);
  const x = pageLeft(doc), w = pageWidth(doc);
  items.forEach((item) => {
    doc.font("Helvetica").fontSize(10.5);
    const th = doc.heightOfString(String(item), { width: w - 40 });
    const ch = Math.max(34, th + 20);
    ensureSpace(doc, ch + 12);
    const y = doc.y;
    card(doc, { x, y, w, h: ch, fill: "#fcfcfd", radius: 12 });
    doc.circle(x + 15, y + 17, 3).fill(C.blue);
    doc.font("Helvetica").fontSize(10.5).fillColor(C.text).text(String(item), x + 28, y + 10, { width: w - 40 });
    doc.y = y + ch + 8;
  });
  doc.moveDown(0.3);
}

function events(doc, evts = []) {
  if (!evts.length) return;
  sectionTitle(doc, "Events During Your Trip", "Live happenings and recommended stops");
  const x = pageLeft(doc), w = pageWidth(doc);
  evts.forEach((ev) => {
    const title = ev.name || "Event";
    const meta  = [ev.date, ev.time, ev.location, ev.address].filter(Boolean).join(" • ");
    const desc  = String(ev.description || "").trim();
    doc.font("Helvetica-Bold").fontSize(12); const th = doc.heightOfString(title, { width: w - 28 });
    doc.font("Helvetica").fontSize(10);      const mh = meta ? doc.heightOfString(meta, { width: w - 28 }) : 0;
    doc.font("Helvetica").fontSize(10);      const dh = desc ? doc.heightOfString(desc, { width: w - 28 }) : 0;
    const ch = Math.max(82, 54 + th + mh + dh);
    ensureSpace(doc, ch + 12);
    const y = doc.y;
    card(doc, { x, y, w, h: ch });
    doc.save(); doc.roundedRect(x + 14, y + 14, 72, 22, 11).fill("#ecfeff"); doc.restore();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.cyan).text(ev.category || "EVENT", x + 26, y + 20, { lineBreak: false });
    let cy = y + 42;
    doc.font("Helvetica-Bold").fontSize(12).fillColor(C.navy).text(title, x + 14, cy, { width: w - 28 }); cy = doc.y + 4;
    if (meta) { doc.font("Helvetica").fontSize(10).fillColor(C.muted).text(meta, x + 14, cy, { width: w - 28 }); cy = doc.y + 4; }
    if (desc) { doc.font("Helvetica").fontSize(10).fillColor(C.text).text(desc, x + 14, cy, { width: w - 28 }); }
    doc.y = y + ch + 12;
  });
}

function recommendedPlaces(doc, places = []) {
  if (!places.length) return;
  sectionTitle(doc, "Recommended Places", "Top suggestions worth visiting");
  const x = pageLeft(doc), w = pageWidth(doc);
  places.forEach((p) => {
    const title  = p.name || "Place";
    const meta   = [p.location, p.address, p.category, p.rating ? `★ ${p.rating}` : ""].filter(Boolean).join(" • ");
    const reason = String(p.reason || "").trim();
    doc.font("Helvetica-Bold").fontSize(12); const th = doc.heightOfString(title,  { width: w - 28 });
    doc.font("Helvetica").fontSize(10);      const mh = meta   ? doc.heightOfString(meta,   { width: w - 28 }) : 0;
    doc.font("Helvetica").fontSize(10.5);    const rh = reason ? doc.heightOfString(reason, { width: w - 28 }) : 0;
    const ch = Math.max(86, 28 + th + mh + rh + 18);
    ensureSpace(doc, ch + 12);
    const y = doc.y;
    card(doc, { x, y, w, h: ch });
    doc.font("Helvetica-Bold").fontSize(12).fillColor(C.navy).text(title, x + 14, y + 14, { width: w - 28 }); let cy = doc.y + 4;
    if (meta)   { doc.font("Helvetica").fontSize(10).fillColor(C.muted).text(meta,   x + 14, cy, { width: w - 28 }); cy = doc.y + 4; }
    if (reason) { doc.font("Helvetica").fontSize(10.5).fillColor(C.text).text(reason, x + 14, cy, { width: w - 28 }); }
    doc.y = y + ch + 12;
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateTripPDF(trip, res) {
  const fileBase = String(trip.destination || "trip").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "trip";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="trip-${fileBase}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margins: { top: 42, bottom: 42, left: 40, right: 40 }, bufferPages: true, autoFirstPage: true });
  let streamEnded = false;

  doc.on("error", (e) => { console.error("PDFKit error:", e); if (!streamEnded && !res.headersSent) res.status(500).json({ message: "Failed to generate PDF" }); });
  res.on("error", (e) => { console.error("Response stream error:", e); });
  doc.pipe(res);

  // ── Cover header ──
  const cw = pageWidth(doc), cx = pageLeft(doc), cy = doc.y;
  doc.save(); doc.roundedRect(cx, cy, cw, 110, 20).fill(C.navy); doc.restore();
  doc.font("Helvetica-Bold").fontSize(24).fillColor(C.white).text(trip.destination || "Trip", cx + 22, cy + 20, { width: cw - 44 });
  const dateLine = trip.startDate && trip.endDate ? `${trip.startDate} → ${trip.endDate}` : "";
  if (dateLine) doc.font("Helvetica").fontSize(11).fillColor("#cbd5e1").text(dateLine, cx + 22, cy + 54, { width: cw - 44 });
  if (trip.tripMode === "multi" && Array.isArray(trip.destinations) && trip.destinations.length) {
    doc.font("Helvetica").fontSize(10).fillColor("#93c5fd").text(`Route: ${trip.destinations.join(" → ")}`, cx + 22, cy + 74, { width: cw - 44 });
  }
  doc.y = cy + 128;

  // ── Metadata pills ──
  const summary = trip?.itinerary?.tripSummary || {};
  const prefs   = trip?.preferences || {};
  const pillValues = [
    summary.days     ? `${summary.days} Days` : "",
    prefs.travelers  ? `${prefs.travelers} Traveler${prefs.travelers > 1 ? "s" : ""}` : "",
    summary.style || prefs.pace   || "",
    summary.budget || prefs.budget || "",
    trip.tripMode === "multi" ? "Multi City" : "Single City",
  ].filter(Boolean);

  const palette = [["#eff6ff", C.blue], ["#ecfeff", C.cyan], ["#f5f3ff", C.purple], ["#fff7ed", C.orange], ["#fdf2f8", C.pink]];
  let px = cx, py = doc.y, maxX = doc.page.width - doc.page.margins.right;
  pillValues.forEach((pv, i) => {
    const [fill, color] = palette[i % palette.length];
    const est = doc.widthOfString(String(pv), { font: "Helvetica-Bold", size: 9 }) + 20;
    if (px + est > maxX) { px = cx; py += 30; }
    px += pill(doc, px, py, String(pv), fill, color) + 8;
  });
  doc.y = py + 36;

  // ── Preferences ──
  if (prefs.interests?.length || prefs.notes) {
    sectionTitle(doc, "Traveler Preferences");
    if (prefs.interests?.length) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.navy).text("Interests");
      doc.moveDown(0.25);
      doc.font("Helvetica").fontSize(10.5).fillColor(C.text).text(prefs.interests.join(" • "), { width: cw });
      doc.moveDown(0.7);
    }
    if (prefs.notes) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.navy).text("Notes");
      doc.moveDown(0.25);
      doc.font("Helvetica").fontSize(10.5).fillColor(C.text).text(prefs.notes, { width: cw });
      doc.moveDown(0.6);
    }
  }

  // ── Daily itinerary ──
  const days = trip?.itinerary?.days || [];
  if (days.length) {
    sectionTitle(doc, "Daily Itinerary", "Your day-by-day personalized route");
    for (const day of days) {
      dayHeader(doc, day);
      for (const b of BLOCKS) { if (day[b]?.length) block(doc, b, day[b]); }

      if (day.foodSuggestion) {
        doc.font("Helvetica").fontSize(10.5);
        const th = doc.heightOfString(String(day.foodSuggestion), { width: cw - 28 });
        const ch = Math.max(52, 30 + th + 10);
        ensureSpace(doc, ch + 12); const y = doc.y;
        card(doc, { x: cx, y, w: cw, h: ch, fill: "#fff7ed", stroke: "#fed7aa" });
        doc.font("Helvetica-Bold").fontSize(10).fillColor(C.orange).text("FOOD SUGGESTION", cx + 14, y + 10, { lineBreak: false });
        doc.font("Helvetica").fontSize(10.5).fillColor(C.text).text(String(day.foodSuggestion), cx + 14, y + 24, { width: cw - 28 });
        doc.y = y + ch + 12;
      }

      if (day.backupPlan) {
        doc.font("Helvetica").fontSize(10.5);
        const th = doc.heightOfString(String(day.backupPlan), { width: cw - 28 });
        const ch = Math.max(52, 30 + th + 10);
        ensureSpace(doc, ch + 12); const y = doc.y;
        card(doc, { x: cx, y, w: cw, h: ch, fill: "#f0fdf4", stroke: "#bbf7d0" });
        doc.font("Helvetica-Bold").fontSize(10).fillColor(C.green).text("BACKUP PLAN", cx + 14, y + 10, { lineBreak: false });
        doc.font("Helvetica").fontSize(10.5).fillColor(C.text).text(String(day.backupPlan), cx + 14, y + 24, { width: cw - 28 });
        doc.y = y + ch + 12;
      }

      doc.moveDown(0.4);
    }
  }

  recommendedPlaces(doc, trip?.itinerary?.recommendedPlaces || []);
  bullets(doc, "Travel Tips", trip?.itinerary?.tips || []);
  events(doc, trip?.events || []);

  // ── Page footers ──
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    footer(doc, i + 1);
  }

  doc.flushPages();
  streamEnded = true;
  doc.end();

  return doc;
}
