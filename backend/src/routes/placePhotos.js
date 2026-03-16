import express from "express";
import fetch from "node-fetch";
import { LRUCache } from "lru-cache";
import { PlacePhoto } from "../models/PlacePhoto.js";

// In-memory cache — first layer (fast, avoids DB round-trips)
const photoCache = new LRUCache({ max: 500, ttl: 1000 * 60 * 60 * 6 });

const router = express.Router();

const PIXABAY_KEY = process.env.PIXABAY_KEY;

// ------------------------------
// Helpers
// ------------------------------
function clean(value = "") {
  return String(value || "").trim();
}

function normalizeSpaces(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanTitleForPhotoSearch(value = "") {
  return normalizeSpaces(
    String(value || "")
      .replace(/\b(morning|afternoon|evening)\b/gi, "")
      .replace(/\b(breakfast|lunch|dinner|brunch)\s+at\b/gi, "")
      .replace(/\b(walking|guided|boat|bus|city|food|bike)\s+tour\b/gi, "")
      .replace(/\btour\b/gi, "")
      .replace(/\bvisit(\s+to)?\b/gi, "")
      .replace(/\bexplore\b/gi, "")
      .replace(/\brelaxed\b/gi, "")
      .replace(/\bnearby\b/gi, "")
      .replace(/\bstroll\b/gi, "")
      .replace(/\bday\s+trip\b/gi, "")
      .replace(/[–—]/g, " ")
  );
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((x) => clean(x)).filter(Boolean))];
}

function isGenericLocation(value = "") {
  const v = clean(value).toLowerCase();
  return ["hotel", "local café", "local cafe", "nearby café", "nearby cafe"].some((item) =>
    v.includes(item)
  );
}

function isHebrew(value = "") {
  return /[\u0590-\u05FF]/.test(value);
}

const STREET_PREFIXES = /^(carrer|calle|cami|rue|via|viale|strasse|str\.|avenue|ave\.?|blvd\.?|road|rd\.?|street|st\.?|drive|dr\.?|lane|ln\.?|place|pl\.?|square|piazza|platz|passeig|paseo|rambla|avenida|rua)\b/i;

function isStreetAddress(value = "") {
  return STREET_PREFIXES.test(clean(value));
}

// Extract venue: first location segment, only if it's NOT a street address
// "Picasso Museum, Barcelona, Spain"      → "Picasso Museum"
// "Carrer de Blai, Poble Sec, Barcelona"  → "" (skip — it's a street)
function extractVenueName(location = "") {
  const parts = clean(location).split(",").map((p) => clean(p)).filter(Boolean);
  const first = parts[0] || "";
  if (isGenericLocation(first) || isStreetAddress(first)) return "";
  return first;
}

// Extract neighborhood: second segment when first is a street
// "Carrer de Blai, Poble Sec, Barcelona, Spain" → "Poble Sec"
function extractNeighborhood(location = "") {
  const parts = clean(location).split(",").map((p) => clean(p)).filter(Boolean);
  if (parts.length >= 3 && isStreetAddress(parts[0])) return parts[1];
  return "";
}

// Extract city: second-to-last segment
// "Picasso Museum, Barcelona, Spain" → "Barcelona"
function extractCity(location = "") {
  const parts = clean(location).split(",").map((p) => clean(p)).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : "";
}

function buildQueryCandidates(place = {}) {
  const rawTitle = clean(place?.title || place?.name || place?.placeName);
  const title = isHebrew(rawTitle) ? "" : cleanTitleForPhotoSearch(rawTitle);
  const location = clean(place?.location);

  const safeLocation = isGenericLocation(location) ? "" : location;

  const venue        = extractVenueName(safeLocation);      // "Picasso Museum" or ""
  const neighborhood = extractNeighborhood(safeLocation);   // "Poble Sec" or ""
  const city         = extractCity(safeLocation);           // "Barcelona"

  const venueWithCity         = venue && city ? `${venue} ${city}` : "";
  const neighborhoodWithCity  = neighborhood && city ? `${neighborhood} ${city}` : "";
  const cleanedTitle          = clean(title);
  const titleWithCity         = cleanedTitle && city ? `${cleanedTitle} ${city}` : "";
  const cityFallback          = city ? `${city} travel` : "";

  return uniqueStrings([
    venue,                // "Picasso Museum"          ← named place, best
    venueWithCity,        // "Picasso Museum Barcelona"
    neighborhoodWithCity, // "Poble Sec Barcelona"     ← street fallback
    cleanedTitle,         // "Gothic Quarter"
    titleWithCity,        // "Gothic Quarter Barcelona"
    cityFallback,         // "Barcelona travel"
  ]);
}


async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function searchPixabay(query) {
  if (!query || !PIXABAY_KEY) return null;

  // 1) In-memory cache (fastest)
  const cached = photoCache.get(query);
  if (cached !== undefined) return cached;

  // 2) MongoDB cache (persistent across restarts)
  const dbCached = await PlacePhoto.findOne({ query }).lean();
  if (dbCached) {
    const result = dbCached.photoUrl
      ? { matchedQuery: query, photoUrl: dbCached.photoUrl, photoAttribution: dbCached.photoAttribution }
      : null;
    photoCache.set(query, result);
    return result;
  }

  // 3) Call Pixabay API
  const url =
    `https://pixabay.com/api/?key=${PIXABAY_KEY}` +
    `&q=${encodeURIComponent(query)}` +
    `&image_type=photo&orientation=horizontal&per_page=5&safesearch=true&order=popular`;

  const response = await fetch(url);
  const data = await safeJson(response);

  if (!response.ok) {
    console.error("Pixabay error:", { status: response.status, query });
    photoCache.set(query, null);
    await PlacePhoto.updateOne({ query }, { query, photoUrl: null, photoAttribution: null }, { upsert: true });
    return null;
  }

  const first = Array.isArray(data?.hits) ? data.hits[0] : null;
  if (!first) {
    photoCache.set(query, null);
    await PlacePhoto.updateOne({ query }, { query, photoUrl: null, photoAttribution: null }, { upsert: true });
    return null;
  }

  const result = {
    matchedQuery: query,
    photoUrl: first.largeImageURL || first.webformatURL || null,
    photoAttribution: {
      photographer: first.user || "",
      photographerUrl: `https://pixabay.com/users/${first.user}-${first.user_id}/`,
      source: "Pixabay",
    },
  };

  // Save to MongoDB and in-memory cache
  photoCache.set(query, result);
  await PlacePhoto.updateOne(
    { query },
    { query, photoUrl: result.photoUrl, photoAttribution: result.photoAttribution },
    { upsert: true }
  );

  return result;
}

// ------------------------------
// Main Route
// ------------------------------
router.post("/photos", async (req, res) => {
  try {
    const places = Array.isArray(req.body?.places) ? req.body.places : [];

    if (!places.length || !PIXABAY_KEY) {
      return res.json({ results: [] });
    }

    const results = await Promise.all(
      places.map(async (place) => {
        const candidates = buildQueryCandidates(place);

        // Try candidates in order — venue → venue+city → title → title+city → city
        for (const candidate of candidates) {
          const found = await searchPixabay(candidate);
          if (found?.photoUrl) {
            return {
              query: candidate,
              matchedQuery: found.matchedQuery,
              title: clean(place?.title),
              location: clean(place?.location),
              address: clean(place?.address),
              photoUrl: found.photoUrl,
              photoAttribution: found.photoAttribution,
            };
          }
        }

        // No photo found
        return {
          query: clean(place?.title),
          matchedQuery: null,
          title: clean(place?.title),
          location: clean(place?.location),
          address: clean(place?.address),
          photoUrl: null,
          photoAttribution: null,
        };
      })
    );

    return res.json({ results });
  } catch (error) {
    console.error("place photos error:", error);
    return res.status(500).json({ message: "Failed to fetch place photos." });
  }
});

export default router;
