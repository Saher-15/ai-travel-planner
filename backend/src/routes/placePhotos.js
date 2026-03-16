import express from "express";
import fetch from "node-fetch";
import { LRUCache } from "lru-cache";

// Cache Pixabay results for 6 hours — photos don't change often
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
      .replace(/\bvisit\b/gi, "")
      .replace(/\bexplore\b/gi, "")
      .replace(/\brelaxed\b/gi, "")
      .replace(/\bnearby\b/gi, "")
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

function buildQueryCandidates(place = {}) {
  const rawTitle = clean(place?.title || place?.name || place?.placeName);
  const title = cleanTitleForPhotoSearch(rawTitle);
  const location = clean(place?.location);
  const address = clean(place?.address);

  const safeLocation = isGenericLocation(location) ? "" : location;
  const safeAddress = address.toLowerCase().includes("depends on stay location") ? "" : address;

  return uniqueStrings([
    title && safeLocation ? `${title}, ${safeLocation}` : "",
    title,
    safeLocation,
    safeAddress
  ]);
}

function buildCityCountryFallback(place = {}) {
  const loc = clean(place?.location || "");
  if (!loc) return null;

  const parts = loc.split(",").map((p) => clean(p)).filter(Boolean);

  if (parts.length >= 2) {
    const city = parts[parts.length - 2];
    const country = parts[parts.length - 1];
    return `${city}, ${country}`;
  }

  return null;
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

  const cached = photoCache.get(query);
  if (cached !== undefined) return cached;

  const url =
    `https://pixabay.com/api/?key=${PIXABAY_KEY}` +
    `&q=${encodeURIComponent(query)}` +
    `&image_type=photo&orientation=horizontal&per_page=5&safesearch=true&order=popular`;

  const response = await fetch(url);
  const data = await safeJson(response);

  if (!response.ok) {
    console.error("Pixabay error:", { status: response.status, query });
    photoCache.set(query, null);
    return null;
  }

  const first = Array.isArray(data?.hits) ? data.hits[0] : null;
  if (!first) {
    photoCache.set(query, null);
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

  photoCache.set(query, result);
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

        // 1) Try normal candidates
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

        // 2) Try city + country fallback
        const cityCountry = buildCityCountryFallback(place);
        if (cityCountry) {
          const found = await searchPixabay(cityCountry);

          if (found?.photoUrl) {
            return {
              query: cityCountry,
              matchedQuery: found.matchedQuery,
              title: clean(place?.title),
              location: clean(place?.location),
              address: clean(place?.address),
              photoUrl: found.photoUrl,
              photoAttribution: found.photoAttribution,
            };
          }
        }

        // 3) No photo found
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
