/**
 * photoService.js
 * Fetches and caches place photos from Wikipedia and Pixabay.
 *
 * Cache strategy (two layers):
 *   1. In-memory LRU cache — fast, avoids DB round-trips for hot queries.
 *   2. MongoDB (PlacePhoto) — persists across restarts, shared between processes.
 *
 * Wikipedia is tried first (verified landmark photos); Pixabay is used as a
 * generic city/category fallback.  Hebrew place names are resolved to English
 * via the he.wikipedia.org language-links API before querying.
 */

import fetch from "node-fetch";
import { LRUCache } from "lru-cache";
import { PlacePhoto } from "../models/PlacePhoto.js";

// In-memory LRU: max 500 entries, 6-hour TTL
const photoCache = new LRUCache({ max: 500, ttl: 1000 * 60 * 60 * 6 });

const PIXABAY_KEY = process.env.PIXABAY_KEY;

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

function clean(value = "") {
  return String(value || "").trim();
}

function normalizeSpaces(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

/**
 * Strip time-of-day words, generic verbs, and filler phrases from an activity
 * title so the resulting string makes a better photo search query.
 */
function cleanTitleForPhotoSearch(value = "") {
  return normalizeSpaces(
    String(value || "")
      .replace(/\b(morning|afternoon|evening)\b/gi, "")
      .replace(/\b(breakfast|lunch|dinner|brunch)\s+at\b/gi, "")
      .replace(/\bcasual\s+(lunch|dinner|breakfast|brunch|meal)\b/gi, "")
      .replace(/\b(casual|quick|relaxing|relaxed)\b/gi, "")
      .replace(/\bat\s+(a|an|the)\b/gi, "")
      .replace(/\b(walking|guided|boat|bus|city|food|bike)\s+tour\b/gi, "")
      .replace(/\btour\b/gi, "")
      .replace(/\bvisit(\s+to)?\b/gi, "")
      .replace(/\bexplore\b/gi, "")
      .replace(/\bnearby\b/gi, "")
      .replace(/\bstroll\b/gi, "")
      .replace(/\bday\s+trip\b/gi, "")
      .replace(/\band\s+\w+/gi, "")
      .replace(/\bmarket\b/gi, "")
      .replace(/[–—]/g, " ")
  ).replace(/^(a|an|the)\s+/i, "");
}

/** Food/dining venue categories — for these we skip the venue name and use
 *  "city + restaurant" instead (venue names are too generic for Pixabay). */
const FOOD_TYPES = ["restaurant", "cafe", "bistro", "bar", "food", "eatery", "diner", "brasserie"];

function isFoodVenue(place = {}) {
  const t = `${place?.type || ""} ${place?.category || ""}`.toLowerCase();
  return FOOD_TYPES.some((f) => t.includes(f));
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

/** Regex matching common street-address prefixes across multiple languages. */
const STREET_PREFIXES =
  /^(carrer|calle|cami|rue|via|viale|strasse|str\.|avenue|ave\.?|blvd\.?|road|rd\.?|street|st\.?|drive|dr\.?|lane|ln\.?|place|pl\.?|square|piazza|platz|passeig|paseo|rambla|avenida|rua)\b/i;

function isStreetAddress(value = "") {
  return STREET_PREFIXES.test(clean(value));
}

/**
 * Extract the venue name from a location string ("Picasso Museum, Barcelona, Spain" → "Picasso Museum").
 * Returns empty string if the first segment looks like a street address or generic place.
 */
function extractVenueName(location = "") {
  const parts = clean(location)
    .split(",")
    .map((p) => clean(p))
    .filter(Boolean);
  const first = parts[0] || "";
  if (isGenericLocation(first) || isStreetAddress(first)) return "";
  return first;
}

/**
 * Extract the neighbourhood when the first segment is a street address.
 * "Carrer de Blai, Poble Sec, Barcelona, Spain" → "Poble Sec"
 */
function extractNeighborhood(location = "") {
  const parts = clean(location)
    .split(",")
    .map((p) => clean(p))
    .filter(Boolean);
  if (parts.length >= 3 && isStreetAddress(parts[0])) return parts[1];
  return "";
}

/**
 * Extract the city from a location string (second-to-last segment).
 * "Picasso Museum, Barcelona, Spain" → "Barcelona"
 */
function extractCity(location = "") {
  const parts = clean(location)
    .split(",")
    .map((p) => clean(p))
    .filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : "";
}

/**
 * Build an ordered list of Pixabay/Wikipedia search query candidates for a place,
 * from most-specific to most-generic.
 */
function buildQueryCandidates(place = {}) {
  const rawTitle = clean(place?.title || place?.name || place?.placeName);
  const title = isHebrew(rawTitle) ? "" : cleanTitleForPhotoSearch(rawTitle);
  const location = clean(place?.location);

  const safeLocation = isGenericLocation(location) ? "" : location;

  const venue = extractVenueName(safeLocation);
  const neighborhood = extractNeighborhood(safeLocation);
  const city = extractCity(safeLocation);

  const isFood = isFoodVenue(place);
  const safeVenue = isFood ? "" : venue;
  const venueWithCity = safeVenue && city ? `${safeVenue} ${city}` : "";
  const neighborhoodWithCity = neighborhood && city ? `${neighborhood} ${city}` : "";
  const cleanedTitle = clean(title);
  const titleWithCity = cleanedTitle && city ? `${cleanedTitle} ${city}` : "";
  const foodFallback = isFood && city ? `${city} restaurant food` : "";
  const cityFallback = city ? `${city} travel` : "";

  // Landscape-friendly queries for city-cover photos (no location context)
  const coverSkyline = cleanedTitle && !city ? `${cleanedTitle} skyline` : "";
  const coverPanorama = cleanedTitle && !city ? `${cleanedTitle} panorama travel` : "";

  return uniqueStrings([
    safeVenue,
    venueWithCity,
    cleanedTitle,
    titleWithCity,
    neighborhoodWithCity,
    foodFallback,
    cityFallback,
    coverSkyline,
    coverPanorama,
  ]);
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Wikipedia (free, no key required)
// ---------------------------------------------------------------------------

/**
 * Look up a place on the English Wikipedia REST API and return a photo result.
 * Results are cached in both LRU memory and MongoDB.
 * @param {string} query
 * @returns {Promise<{ photoUrl: string, photoAttribution: object }|null>}
 */
async function searchWikipedia(query) {
  if (!query) return null;

  const cacheKey = `wiki_v3:${query.toLowerCase()}`;

  const cached = photoCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const dbCached = await PlacePhoto.findOne({ query: cacheKey }).lean();
  if (dbCached) {
    const result = dbCached.photoUrl
      ? { photoUrl: dbCached.photoUrl, photoAttribution: dbCached.photoAttribution }
      : null;
    photoCache.set(cacheKey, result);
    return result;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TravelPlannerApp/1.0 (open-source educational project)" },
    });
    clearTimeout(timeout);

    const data = res.ok ? await safeJson(res) : null;

    const thumbnailSrc = data?.thumbnail?.source || null;
    if (!thumbnailSrc || data?.type === "disambiguation" || data?.type === "no-extract") {
      photoCache.set(cacheKey, null);
      await PlacePhoto.updateOne(
        { query: cacheKey },
        { query: cacheKey, photoUrl: null, photoAttribution: null },
        { upsert: true }
      );
      return null;
    }

    // Prefer full-resolution original; otherwise scale up the thumbnail URL.
    const originalSrc = data?.originalimage?.source || null;
    const src = originalSrc || thumbnailSrc.replace(/\/\d+px-/, "/1200px-");

    const result = {
      photoUrl: src,
      photoAttribution: {
        photographer: data.description || "",
        photographerUrl: data?.content_urls?.desktop?.page || "",
        source: "Wikipedia",
      },
    };

    photoCache.set(cacheKey, result);
    await PlacePhoto.updateOne(
      { query: cacheKey },
      { query: cacheKey, photoUrl: result.photoUrl, photoAttribution: result.photoAttribution },
      { upsert: true }
    );

    return result;
  } catch {
    photoCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Resolve a Hebrew city name to its canonical English Wikipedia title via the
 * language-links API.  This means "ברצלונה" and "Barcelona" share one cached photo.
 * @param {string} hebrewCity
 * @returns {Promise<string|null>}
 */
async function resolveHebrewToEnglishTitle(hebrewCity) {
  if (!hebrewCity) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url =
      `https://he.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(hebrewCity)}` +
      `&prop=langlinks&lllang=en&format=json&origin=*`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TravelPlannerApp/1.0 (open-source educational project)" },
    });
    clearTimeout(timeout);
    const data = res.ok ? await safeJson(res) : null;
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0];
    return page?.langlinks?.[0]?.["*"] || null;
  } catch {
    return null;
  }
}

/**
 * Fetch a photo for a Hebrew place name.
 * Attempts English Wikipedia first (via title resolution), then falls back to
 * querying the Hebrew Wikipedia directly.
 * @param {string} hebrewQuery
 * @returns {Promise<{ photoUrl: string, photoAttribution: object }|null>}
 */
async function searchHebrewWikipedia(hebrewQuery) {
  if (!hebrewQuery || !isHebrew(hebrewQuery)) return null;

  const hebrewCity = hebrewQuery.split(",")[0].trim();
  if (!hebrewCity) return null;

  const englishTitle = await resolveHebrewToEnglishTitle(hebrewCity);
  if (englishTitle) {
    const result = await searchWikipedia(englishTitle);
    if (result?.photoUrl) return result;
  }

  // Fallback: query Hebrew Wikipedia directly
  const cacheKey = `hewiki:${hebrewCity}`;
  const cached = photoCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const dbCached = await PlacePhoto.findOne({ query: cacheKey }).lean();
  if (dbCached) {
    const result = dbCached.photoUrl
      ? { photoUrl: dbCached.photoUrl, photoAttribution: dbCached.photoAttribution }
      : null;
    photoCache.set(cacheKey, result);
    return result;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://he.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hebrewCity)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TravelPlannerApp/1.0 (open-source educational project)" },
    });
    clearTimeout(timeout);

    const data = res.ok ? await safeJson(res) : null;
    const thumbnailSrc = data?.thumbnail?.source || null;

    if (!thumbnailSrc || data?.type === "disambiguation" || data?.type === "no-extract") {
      photoCache.set(cacheKey, null);
      await PlacePhoto.updateOne(
        { query: cacheKey },
        { query: cacheKey, photoUrl: null, photoAttribution: null },
        { upsert: true }
      );
      return null;
    }

    const originalSrc = data?.originalimage?.source || null;
    const src = originalSrc || thumbnailSrc.replace(/\/\d+px-/, "/1200px-");

    const result = {
      photoUrl: src,
      photoAttribution: {
        photographer: data.description || "",
        photographerUrl: data?.content_urls?.desktop?.page || "",
        source: "Wikipedia",
      },
    };

    photoCache.set(cacheKey, result);
    await PlacePhoto.updateOne(
      { query: cacheKey },
      { query: cacheKey, photoUrl: result.photoUrl, photoAttribution: result.photoAttribution },
      { upsert: true }
    );
    return result;
  } catch {
    photoCache.set(cacheKey, null);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pixabay (generic city/category queries only)
// ---------------------------------------------------------------------------

/**
 * Search Pixabay for a horizontal travel photo.
 * Only used with generic city/category queries — never with specific venue names.
 * @param {string} query
 * @returns {Promise<{ photoUrl: string, photoAttribution: object }|null>}
 */
async function searchPixabay(query) {
  if (!query || !PIXABAY_KEY) return null;

  const cacheKey = `pix_v2:${query}`;

  const cached = photoCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const dbCached = await PlacePhoto.findOne({ query: cacheKey }).lean();
  if (dbCached) {
    const result = dbCached.photoUrl
      ? { photoUrl: dbCached.photoUrl, photoAttribution: dbCached.photoAttribution }
      : null;
    photoCache.set(cacheKey, result);
    return result;
  }

  const url =
    `https://pixabay.com/api/?key=${PIXABAY_KEY}` +
    `&q=${encodeURIComponent(query)}` +
    `&image_type=photo&orientation=horizontal&per_page=5&safesearch=true&order=popular&min_width=1200`;

  const res = await fetch(url);
  const data = await safeJson(res);
  const first = res.ok && Array.isArray(data?.hits) ? data.hits[0] : null;

  if (!first) {
    photoCache.set(cacheKey, null);
    await PlacePhoto.updateOne(
      { query: cacheKey },
      { query: cacheKey, photoUrl: null, photoAttribution: null },
      { upsert: true }
    );
    return null;
  }

  const result = {
    photoUrl: first.largeImageURL || first.webformatURL || null,
    photoAttribution: {
      photographer: first.user || "",
      photographerUrl: `https://pixabay.com/users/${first.user}-${first.user_id}/`,
      source: "Pixabay",
    },
  };

  photoCache.set(cacheKey, result);
  await PlacePhoto.updateOne(
    { query: cacheKey },
    { query: cacheKey, photoUrl: result.photoUrl, photoAttribution: result.photoAttribution },
    { upsert: true }
  );
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * When a place name is in Hebrew, resolve it to its English Wikipedia title
 * BEFORE building search candidates. This ensures the main Wikipedia search
 * path works correctly instead of falling through to a slow last-resort.
 * e.g. "ירושלים" → "Jerusalem" → candidates: ["Jerusalem", "Jerusalem travel", ...]
 */
async function normalizeHebrewPlace(place) {
  const raw = clean(place?.query || place?.title || place?.name || place?.destination || place?.placeName);
  if (!raw || !isHebrew(raw)) return place;

  const hebrewCity = raw.split(",")[0].trim();
  const englishTitle = await resolveHebrewToEnglishTitle(hebrewCity);
  if (!englishTitle) return place;

  return {
    ...place,
    title:       englishTitle,
    name:        englishTitle,
    query:       englishTitle,
    placeName:   englishTitle,
    destination: englishTitle,
  };
}

/**
 * Resolve photos for a list of places.
 * For each place, candidates are tried in priority order:
 *   1. Wikipedia (all candidates — after Hebrew→English normalization)
 *   2. Pixabay (last 2 generic candidates only)
 *   3. Hebrew Wikipedia last resort (if resolution failed)
 *
 * @param {Array<object>} places — Array of place objects with title/name, location, address.
 * @returns {Promise<Array<{ title, location, address, query, matchedQuery, photoUrl, photoAttribution }>>}
 */
export async function getPhotosForPlaces(places) {
  return Promise.all(
    places.map(async (place) => {
      // Resolve Hebrew names to English before building candidates
      const normalizedPlace = await normalizeHebrewPlace(place);
      const candidates = buildQueryCandidates(normalizedPlace);
      const base = {
        title: clean(place?.title),
        location: clean(place?.location),
        address: clean(place?.address),
      };

      // 1) Wikipedia first — verified photos for landmarks, museums, and cities
      for (const candidate of candidates) {
        const wiki = await searchWikipedia(candidate);
        if (wiki?.photoUrl) {
          return {
            ...base,
            query: candidate,
            matchedQuery: candidate,
            photoUrl: wiki.photoUrl,
            photoAttribution: wiki.photoAttribution,
          };
        }
      }

      // 2) Pixabay fallback — only the last 2 generic candidates
      for (const candidate of candidates.slice(-2)) {
        const pix = await searchPixabay(candidate);
        if (pix?.photoUrl) {
          return {
            ...base,
            query: candidate,
            matchedQuery: candidate,
            photoUrl: pix.photoUrl,
            photoAttribution: pix.photoAttribution,
          };
        }
      }

      // 3) Last resort: Hebrew Wikipedia if resolution failed above
      const rawQuery = clean(place?.query || place?.title);
      if (isHebrew(rawQuery)) {
        const heWiki = await searchHebrewWikipedia(rawQuery);
        if (heWiki?.photoUrl) {
          return {
            ...base,
            query: rawQuery,
            matchedQuery: rawQuery,
            photoUrl: heWiki.photoUrl,
            photoAttribution: heWiki.photoAttribution,
          };
        }
      }

      return {
        ...base,
        query: clean(place?.title),
        matchedQuery: null,
        photoUrl: null,
        photoAttribution: null,
      };
    })
  );
}

/**
 * Wipe the entire photo cache (both in-memory LRU and MongoDB).
 * Forces all subsequent requests to re-fetch from external APIs.
 */
export async function clearCache() {
  photoCache.clear();
  await PlacePhoto.deleteMany({});
}
