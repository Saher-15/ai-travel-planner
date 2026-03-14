import axios from "axios";
import { LRUCache } from "lru-cache";

// Cache event results for 2 hours per destination+date combo
const eventsCache = new LRUCache({ max: 200, ttl: 1000 * 60 * 60 * 2 });

const TM_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const TM_API_KEY = process.env.TICKETMASTER_API_KEY || "";

const ARENA_BASE_URL = "https://coca-cola-arena.com";
const ARENA_LIST_PAGES = [
  "https://coca-cola-arena.com/",
  "https://coca-cola-arena.com/music",
  "https://coca-cola-arena.com/sports",
  "https://coca-cola-arena.com/comedy",
  "https://coca-cola-arena.com/family",
];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

const EVENT_TYPE_TO_TM_CLASSIFICATION = {
  concert: "music",
  festival: "music",
  culture: "arts",
  nightlife: "music",
  food: "miscellaneous",
  family: "family",
  sports: "sports",
};

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((x) => normalizeString(x).toLowerCase()).filter(Boolean))];
}

function toIsoStart(dateStr) {
  return `${dateStr}T00:00:00Z`;
}

function toIsoEnd(dateStr) {
  return `${dateStr}T23:59:59Z`;
}

function isUaeDestination(destination = "") {
  return /dubai|abu dhabi|uae|united arab emirates/i.test(destination);
}

function mapEventTypesToTmClassifications(eventTypes = []) {
  const mapped = eventTypes
    .map((type) => EVENT_TYPE_TO_TM_CLASSIFICATION[normalizeString(type).toLowerCase()])
    .filter(Boolean);

  return [...new Set(mapped)];
}

function deriveKeywordFromPreferences(preferences = {}) {
  const eventTypes = uniqueStrings(preferences?.eventTypes || []);
  const interests = uniqueStrings(preferences?.interests || []);

  if (eventTypes.includes("concert")) return "concert";
  if (eventTypes.includes("festival")) return "festival";
  if (eventTypes.includes("sports")) return "sports";
  if (eventTypes.includes("family")) return "family";
  if (eventTypes.includes("food") || interests.includes("food")) return "food";
  if (eventTypes.includes("nightlife") || interests.includes("nightlife")) return "party";

  return "";
}

function matchesRequestedTypes(event, eventTypes = []) {
  if (!eventTypes.length) return true;

  const haystack = [
    event?.name,
    event?.category,
    event?.description,
    event?.location,
    event?.source,
  ]
    .join(" ")
    .toLowerCase();

  return eventTypes.some((type) => {
    const t = String(type || "").toLowerCase();
    if (!t) return false;

    if (t === "concert") return haystack.includes("concert") || haystack.includes("music");
    if (t === "festival") return haystack.includes("festival");
    if (t === "culture") {
      return (
        haystack.includes("arts") ||
        haystack.includes("theatre") ||
        haystack.includes("culture") ||
        haystack.includes("performing")
      );
    }
    if (t === "nightlife") {
      return (
        haystack.includes("party") ||
        haystack.includes("club") ||
        haystack.includes("dj") ||
        haystack.includes("music")
      );
    }
    if (t === "food") {
      return (
        haystack.includes("food") ||
        haystack.includes("dining") ||
        haystack.includes("wine")
      );
    }
    if (t === "family") {
      return (
        haystack.includes("family") ||
        haystack.includes("children") ||
        haystack.includes("community")
      );
    }
    if (t === "sports") return haystack.includes("sports");

    return haystack.includes(t);
  });
}

function destinationMatch(event, cleanDestination) {
  if (!cleanDestination) return true;

  const haystack = `${event.name} ${event.location} ${event.description}`.toLowerCase();
  const d = cleanDestination.toLowerCase();

  if (isUaeDestination(cleanDestination)) {
    return (
      haystack.includes("dubai") ||
      haystack.includes("abu dhabi") ||
      haystack.includes("uae") ||
      haystack.includes("united arab emirates")
    );
  }

  return haystack.includes(d) || !event.location;
}

function normalizeTicketmasterEvent(raw = {}) {
  const venue = raw?._embedded?.venues?.[0];
  const localDate = normalizeString(raw?.dates?.start?.localDate);
  const localTime = normalizeString(raw?.dates?.start?.localTime);
  const venueName = normalizeString(venue?.name);
  const city = normalizeString(venue?.city?.name);
  const country = normalizeString(venue?.country?.name);

  const location = [venueName, city, country].filter(Boolean).join(", ");

  const classifications = safeArray(raw?.classifications);
  const segment = normalizeString(classifications?.[0]?.segment?.name);
  const genre = normalizeString(classifications?.[0]?.genre?.name);
  const subGenre = normalizeString(classifications?.[0]?.subGenre?.name);

  const category = [segment, genre, subGenre].filter(Boolean).join(" / ");

  return {
    name: normalizeString(raw?.name, "Event"),
    date: localDate,
    time: localTime,
    location,
    category,
    description: normalizeString(
      raw?.info || raw?.pleaseNote || raw?.accessibility?.info || ""
    ),
    source: "Ticketmaster",
    link: normalizeString(raw?.url, ""),
  };
}

async function ticketmasterSearch(params) {
  if (!TM_API_KEY) return [];

  const { data } = await axios.get(TM_BASE_URL, {
    params: {
      apikey: TM_API_KEY,
      sort: "date,asc",
      size: 50,
      ...params,
    },
    timeout: 15000,
  });

  return safeArray(data?._embedded?.events);
}

function htmlDecode(text = "") {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(text = "") {
  return htmlDecode(
    String(text || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function extractMetaContent(html = "", propertyOrName = "") {
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return htmlDecode(match[1]).trim();
  }

  return "";
}

function parseArenaDate(text = "") {
  const cleaned = stripTags(text);

  const monthMap = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };

  const m1 = cleaned.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (m1) {
    const day = m1[1].padStart(2, "0");
    const rawMonth = m1[2].toLowerCase();
    const month =
      monthMap[rawMonth] ||
      monthMap[rawMonth.slice(0, 3)] ||
      (rawMonth === "may" ? "05" : "");
    const year = m1[3];
    if (month) return `${year}-${month}-${day}`;
  }

  const m2 = cleaned.match(
    /\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{4})\b/i
  );
  if (m2) {
    const rawMonth = m2[1].toLowerCase();
    const month =
      monthMap[rawMonth] ||
      monthMap[rawMonth.slice(0, 3)] ||
      (rawMonth === "may" ? "05" : "");
    const day = m2[2].padStart(2, "0");
    const year = m2[3];
    if (month) return `${year}-${month}-${day}`;
  }

  return "";
}

function parseArenaTime(text = "") {
  const cleaned = stripTags(text);

  const m1 = cleaned.match(/\bStart\s*:?\s*(\d{1,2}:\d{2})\b/i);
  if (m1) return m1[1];

  const m2 = cleaned.match(/\b(\d{1,2}:\d{2})\b/);
  if (m2) return m2[1];

  return "";
}

function inferCategoryFromUrl(url = "") {
  const path = String(url).toLowerCase();
  if (path.includes("/music/")) return "music / concert";
  if (path.includes("/sports/")) return "sports";
  if (path.includes("/comedy/")) return "comedy";
  if (path.includes("/family/")) return "family";
  if (path.includes("/arts/")) return "arts";
  return "event";
}

function extractArenaEventLinks(html = "") {
  const links = new Set();
  const regex = /href=["'](\/(?:music|sports|comedy|family|arts)\/\d+\/[^"']+)["']/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      links.add(`${ARENA_BASE_URL}${match[1]}`);
    }
  }

  return [...links];
}

async function fetchArenaListLinks() {
  const pages = await Promise.all(
    ARENA_LIST_PAGES.map(async (url) => {
      try {
        const { data } = await axios.get(url, {
          timeout: 15000,
          headers: BROWSER_HEADERS,
        });
        return String(data || "");
      } catch {
        return "";
      }
    })
  );

  return [...new Set(pages.flatMap(extractArenaEventLinks))].slice(0, 60);
}

function normalizeArenaEvent({ url, html }) {
  const title =
    extractMetaContent(html, "og:title") ||
    extractMetaContent(html, "twitter:title") ||
    stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");

  const description =
    extractMetaContent(html, "og:description") ||
    extractMetaContent(html, "description");

  const bodyText = stripTags(html);
  const date = parseArenaDate(`${title} ${description} ${bodyText}`);
  const time = parseArenaTime(`${description} ${bodyText}`);

  const name = normalizeString(
    title
      .replace(/\|\s*United Arab Emirates/gi, "")
      .replace(/\|\s*Coca-Cola Arena.*$/gi, "")
      .trim(),
    "Event"
  );

  return {
    name,
    date,
    time,
    location: "Coca-Cola Arena, Dubai, United Arab Emirates",
    category: inferCategoryFromUrl(url),
    description: normalizeString(description),
    source: "Coca-Cola Arena",
    link: url,
  };
}

async function fetchCocaColaArenaEvents({
  destination,
  startDate,
  endDate,
  preferences = {},
}) {
  if (!isUaeDestination(destination)) return [];

  const requestedTypes = uniqueStrings(preferences?.eventTypes || []);
  const links = await fetchArenaListLinks();

  if (!links.length) return [];

  const pages = await Promise.all(
    links.map(async (url) => {
      try {
        const { data } = await axios.get(url, {
          timeout: 15000,
          headers: BROWSER_HEADERS,
        });
        return { url, html: String(data || "") };
      } catch {
        return null;
      }
    })
  );

  return pages
    .filter(Boolean)
    .map(normalizeArenaEvent)
    .filter((event) => event.name && event.date)
    .filter((event) => event.date >= startDate && event.date <= endDate)
    .filter((event) => destinationMatch(event, destination))
    .filter((event) => matchesRequestedTypes(event, requestedTypes));
}

function sortAndDedupe(events = []) {
  const deduped = Array.from(
    new Map(
      events.map((event) => [
        `${(event.name || "").toLowerCase()}|${event.date || ""}|${(
          event.location || ""
        ).toLowerCase()}`,
        event,
      ])
    ).values()
  );

  return deduped.sort((a, b) => {
    const aKey = `${a.date || ""} ${a.time || ""}`.trim();
    const bKey = `${b.date || ""} ${b.time || ""}`.trim();
    return aKey.localeCompare(bKey);
  });
}

export async function fetchDestinationEvents({
  destination,
  startDate,
  endDate,
  preferences = {},
}) {
  const cleanDestination = normalizeString(destination);
  if (!cleanDestination || !startDate || !endDate) return [];

  const includeEvents =
    preferences?.includeEvents === undefined ? true : Boolean(preferences.includeEvents);

  if (!includeEvents) return [];

  const requestedTypes = uniqueStrings(preferences?.eventTypes || []);
  const cacheKey = `${cleanDestination}|${startDate}|${endDate}|${requestedTypes.sort().join(",")}`;
  const cached = eventsCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const tmClassifications = mapEventTypesToTmClassifications(requestedTypes);
  const keyword = deriveKeywordFromPreferences(preferences);

  const collected = [];

  try {
    const tmRaw = [];

    tmRaw.push(
      ...(await ticketmasterSearch({
        city: cleanDestination,
        startDateTime: toIsoStart(startDate),
        endDateTime: toIsoEnd(endDate),
      }))
    );

    if (!tmRaw.length && tmClassifications.length) {
      tmRaw.push(
        ...(await ticketmasterSearch({
          city: cleanDestination,
          startDateTime: toIsoStart(startDate),
          endDateTime: toIsoEnd(endDate),
          classificationName: tmClassifications.join(","),
        }))
      );
    }

    if (!tmRaw.length && keyword) {
      tmRaw.push(
        ...(await ticketmasterSearch({
          city: cleanDestination,
          startDateTime: toIsoStart(startDate),
          endDateTime: toIsoEnd(endDate),
          keyword,
        }))
      );
    }

    if (!tmRaw.length && isUaeDestination(cleanDestination)) {
      tmRaw.push(
        ...(await ticketmasterSearch({
          countryCode: "AE",
          startDateTime: toIsoStart(startDate),
          endDateTime: toIsoEnd(endDate),
        }))
      );
    }

    if (!tmRaw.length && isUaeDestination(cleanDestination)) {
      tmRaw.push(
        ...(await ticketmasterSearch({
          countryCode: "AE",
          keyword: cleanDestination,
          startDateTime: toIsoStart(startDate),
          endDateTime: toIsoEnd(endDate),
        }))
      );
    }

    collected.push(...tmRaw.map(normalizeTicketmasterEvent));
  } catch (err) {
    console.error("Ticketmaster events fetch error:", err?.response?.data || err.message);
  }

  try {
    const arenaEvents = await fetchCocaColaArenaEvents({
      destination: cleanDestination,
      startDate,
      endDate,
      preferences,
    });

    collected.push(...arenaEvents);
  } catch (err) {
    console.error("Coca-Cola Arena events fetch error:", err?.message || err);
  }

  const finalEvents = collected
    .filter((event) => event.name && event.date)
    .filter((event) => event.date >= startDate && event.date <= endDate)
    .filter((event) => destinationMatch(event, cleanDestination))
    .filter((event) => matchesRequestedTypes(event, requestedTypes));

  const result = sortAndDedupe(finalEvents);
  eventsCache.set(cacheKey, result);
  return result;
}