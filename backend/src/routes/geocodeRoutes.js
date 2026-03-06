import express from "express";
import * as maptiler from "@maptiler/client";

const router = express.Router();

// Load API key
maptiler.config.apiKey = process.env.MAPTILER_KEY;

// Helper: safe JSON
async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Forward geocode (string → coordinates) using MapTiler
 */
async function geocodeOne(query) {
  try {
    const result = await maptiler.geocoding.forward(query, { limit: 1 });

    const feature = result?.features?.[0];
    if (!feature) return null;

    const [lon, lat] = feature.geometry.coordinates;

    return {
      query,
      lat,
      lon,
      display_name: feature.place_name || query,
    };
  } catch (err) {
    return null;
  }
}

/**
 * POST /api/geocode/batch
 * Body: { queries: string[] }
 * Returns: { results: [{ query, lat, lon, display_name }] }
 */
router.post("/batch", async (req, res) => {
  try {
    const { queries } = req.body;

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ message: "queries[] is required", results: [] });
    }

    // Clean + dedupe + limit
    const cleaned = queries
      .map((q) => String(q || "").trim())
      .filter(Boolean);

    const unique = [...new Set(cleaned.map((s) => s.toLowerCase()))]
      .map((lower) => cleaned.find((s) => s.toLowerCase() === lower))
      .filter(Boolean)
      .slice(0, 25);

    const results = [];

    for (const q of unique) {
      const r = await geocodeOne(q);
      if (r) results.push(r);
    }

    return res.json({ results });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Geocode failed", results: [] });
  }
});

/**
 * GET /api/geocode/place-details?lat=..&lon=..&q=Eiffel%20Tower
 * Uses MapTiler reverse geocoding + Wikipedia snippet
 */
router.get("/place-details", async (req, res) => {
  try {
    const { lat, lon, q } = req.query;

    const latNum = Number(lat);
    const lonNum = Number(lon);

    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return res.status(400).json({ message: "lat & lon are required" });
    }

    // Reverse geocode via MapTiler
    const rev = await maptiler.geocoding.reverse([lonNum, latNum], { limit: 1 });
    const feature = rev?.features?.[0];

    // Wikipedia snippet
    const wiki = await fetchWikipediaSnippet(q || feature?.place_name);

    // Photo fallback
    const photoUrl =
      wiki?.thumbnail ||
      `https://source.unsplash.com/800x500/?${encodeURIComponent(q || feature?.place_name || "travel landmark")}`;

    return res.json({
      display_name: feature?.place_name || null,
      category: feature?.properties?.category || null,
      type: feature?.properties?.type || null,
      address: feature?.properties?.address || null,
      wikipedia: wiki || null,
      photoUrl,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load place details" });
  }
});

// Wikipedia helper
async function fetchWikipediaSnippet(query) {
  if (!query) return null;

  const searchUrl =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      format: "json",
      srlimit: "1",
      origin: "*",
    });

  const sRes = await fetch(searchUrl);
  const sJson = await safeJson(sRes);
  const title = sJson?.query?.search?.[0]?.title;
  if (!title) return null;

  const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const sumRes = await fetch(sumUrl);
  const sumJson = await safeJson(sumRes);

  return {
    title: sumJson?.title || title,
    extract: sumJson?.extract || null,
    url: sumJson?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumbnail: sumJson?.thumbnail?.source || null,
  };
}

export default router;
