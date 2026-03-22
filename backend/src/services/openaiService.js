import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function ensureArray(x) {
  return Array.isArray(x) ? x : [];
}

function toISODate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function getDayCount(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) {
    return 1;
  }

  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

function addDays(dateString, daysToAdd) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + daysToAdd);
  return toISODate(d);
}

function safeJsonParse(text) {
  const trimmed = text?.trim();
  if (!trimmed) throw new Error("AI returned empty response.");

  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first === -1 || last === -1) {
      throw new Error("AI did not return valid JSON.");
    }
    return JSON.parse(trimmed.slice(first, last + 1));
  }
}

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeTripMode(value) {
  return value === "multi" ? "multi" : "single";
}

function normalizeDestinationsArray(destinations = [], fallbackDestination = "") {
  if (Array.isArray(destinations)) {
    const cleaned = destinations
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    if (cleaned.length) return cleaned;
  }

  const fallback = String(fallbackDestination || "").trim();
  return fallback ? [fallback] : [];
}

function splitDaysAcrossCities(startDate, endDate, destinations = []) {
  const totalDays = getDayCount(startDate, endDate);
  const cleanDestinations = normalizeDestinationsArray(destinations);

  if (!cleanDestinations.length) return [];

  const cityCount = cleanDestinations.length;
  const baseDays = Math.floor(totalDays / cityCount);
  const extraDays = totalDays % cityCount;

  let cursor = 0;

  return cleanDestinations.map((city, index) => {
    const days = baseDays + (index < extraDays ? 1 : 0);
    const segmentStart = addDays(startDate, cursor);
    const segmentEnd = addDays(startDate, cursor + Math.max(days - 1, 0));
    cursor += days;

    return {
      city,
      days,
      startDate: segmentStart,
      endDate: segmentEnd,
    };
  });
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLocationString(rawLocation, title, destinationLabel) {
  const base = normalizeString(rawLocation, "");
  const titleClean = normalizeString(title, "Place");
  const destClean = normalizeString(destinationLabel, "");

  if (base && base.split(",").length >= 2) {
    return base;
  }

  if (destClean) {
    return `${titleClean}, ${destClean}`;
  }

  return titleClean;
}

function normalizeAddressString(rawAddress, location, destinationLabel) {
  const base = normalizeString(rawAddress, "");
  if (base) return base;

  const locationClean = normalizeString(location, "");
  const destClean = normalizeString(destinationLabel, "");

  if (locationClean && locationClean !== destClean) {
    return locationClean;
  }

  return destClean;
}

function normalizeRating(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 5) return null;
  return Number(n.toFixed(1));
}

function normalizeActivity(activity = {}, destination = "") {
  const title = normalizeString(activity?.title, "Place");
  const notes = normalizeString(activity?.notes, "");
  const rawLocation = normalizeString(activity?.location, "");
  const rawAddress = normalizeString(activity?.address, "");
  const category = normalizeString(activity?.category, "");
  const type = normalizeString(activity?.type, "");
  const image = normalizeString(
    activity?.image || activity?.imageUrl || activity?.photo || activity?.photoUrl,
    ""
  );

  const durationHours =
    activity?.durationHours === null || typeof activity?.durationHours === "number"
      ? activity.durationHours
      : null;

  const location = normalizeLocationString(rawLocation, title, destination);
  const address = normalizeAddressString(rawAddress, location, destination);
  const rating = normalizeRating(activity?.rating);
  const costRaw = activity?.estimatedCostUSD;
  const estimatedCostUSD =
    typeof costRaw === "number" && Number.isFinite(costRaw) && costRaw >= 0
      ? Math.round(costRaw)
      : null;

  return {
    title,
    durationHours,
    notes,
    location,
    address,
    category,
    type,
    rating,
    estimatedCostUSD,
    image,
  };
}

function normalizeRecommendedPlace(place = {}, destination = "") {
  const name = normalizeString(place?.name, "Recommended Place");
  const reason = normalizeString(place?.reason, "");
  const category = normalizeString(place?.category, "");
  const rawLocation = normalizeString(place?.location, "");
  const rawAddress = normalizeString(place?.address, "");
  const image = normalizeString(
    place?.image || place?.imageUrl || place?.photo || place?.photoUrl,
    ""
  );

  const location = normalizeLocationString(rawLocation, name, destination);
  const address = normalizeAddressString(rawAddress, location, destination);
  const rating = normalizeRating(place?.rating);

  return {
    name,
    reason,
    category,
    location,
    address,
    rating,
    image,
  };
}

function findBestCityForDate(date, cityPlan = []) {
  return (
    cityPlan.find((segment) => date >= segment.startDate && date <= segment.endDate)?.city || ""
  );
}

function normalizeDay(day = {}, index = 0, fallbackDestination = "", startDate = "", cityPlan = []) {
  const safeDate =
    normalizeString(day?.date) || (startDate ? addDays(startDate, index) : "");

  const cityFromDate = findBestCityForDate(safeDate, cityPlan);
  const effectiveDestination = cityFromDate || fallbackDestination;

  return {
    day: Number(day?.day) || index + 1,
    date: safeDate,
    title: normalizeString(day?.title, `Day ${index + 1}`),
    morning: ensureArray(day?.morning).map((a) => normalizeActivity(a, effectiveDestination)),
    afternoon: ensureArray(day?.afternoon).map((a) => normalizeActivity(a, effectiveDestination)),
    evening: ensureArray(day?.evening).map((a) => normalizeActivity(a, effectiveDestination)),
    foodSuggestion: normalizeString(day?.foodSuggestion, ""),
    backupPlan: normalizeString(day?.backupPlan, ""),
  };
}

function normalizeTripSummary(summary = {}, fallback = {}) {
  return {
    destination: normalizeString(summary?.destination, fallback.destination || ""),
    startDate: normalizeString(summary?.startDate, fallback.startDate || ""),
    endDate: normalizeString(summary?.endDate, fallback.endDate || ""),
    days:
      typeof summary?.days === "number" && Number.isFinite(summary.days)
        ? summary.days
        : fallback.days || 1,
    style: normalizeString(summary?.style, fallback.style || "moderate"),
    budget: ["low", "mid", "high"].includes(summary?.budget)
      ? summary.budget
      : fallback.budget || "mid",
  };
}

function extractItineraryPlaces(days = []) {
  const set = new Set();

  for (const day of days) {
    for (const block of ["morning", "afternoon", "evening"]) {
      for (const activity of day?.[block] || []) {
        const title = normalizeText(activity?.title);
        const location = normalizeText(activity?.location);
        const address = normalizeText(activity?.address);

        if (title) set.add(title);
        if (location) set.add(location);
        if (address) set.add(address);
      }
    }
  }

  return set;
}

function dedupeRecommendedPlaces(places = []) {
  const seen = new Set();

  return places.filter((place) => {
    const keys = [
      normalizeText(place?.name),
      normalizeText(place?.location),
      normalizeText(place?.address),
    ].filter(Boolean);

    if (!keys.length) return false;

    const primaryKey = keys.join(" | ");
    if (seen.has(primaryKey)) return false;

    seen.add(primaryKey);
    return true;
  });
}

function normalizeAndFillLocations(data, payload) {
  const tripMode = normalizeTripMode(payload?.tripMode);
  const cleanDestinations = normalizeDestinationsArray(
    payload?.destinations,
    payload?.destination
  );
  const fallbackDestinationLabel =
    tripMode === "multi" && cleanDestinations.length > 1
      ? cleanDestinations.join(" → ")
      : cleanDestinations[0] || normalizeString(payload?.destination, "");

  const destination = normalizeString(
    data?.tripSummary?.destination,
    fallbackDestinationLabel
  );

  const startDate = normalizeString(payload?.startDate, "");
  const endDate = normalizeString(payload?.endDate, "");
  const daysCount = getDayCount(startDate, endDate);
  const cityPlan =
    tripMode === "multi" && cleanDestinations.length > 1
      ? splitDaysAcrossCities(startDate, endDate, cleanDestinations)
      : [];

  const rawDays = ensureArray(data?.days);
  const normalizedDays = rawDays.map((day, index) =>
    normalizeDay(
      day,
      index,
      cleanDestinations[0] || fallbackDestinationLabel,
      startDate,
      cityPlan
    )
  );

  const finalDays =
    normalizedDays.length > 0
      ? normalizedDays
      : Array.from({ length: daysCount }, (_, index) =>
          normalizeDay(
            {
              day: index + 1,
              date: addDays(startDate, index),
              title: `Day ${index + 1}`,
              morning: [],
              afternoon: [],
              evening: [],
              foodSuggestion: "",
              backupPlan: "",
            },
            index,
            cleanDestinations[0] || fallbackDestinationLabel,
            startDate,
            cityPlan
          )
        );

  const itineraryPlaceSet = extractItineraryPlaces(finalDays);

  const recommendedPlaces = dedupeRecommendedPlaces(
    ensureArray(data?.recommendedPlaces)
      .map((place) => {
        const placeLocation = normalizeString(place?.location, "");
        const placeAddress = normalizeString(place?.address, "");
        const combinedGeoText = `${placeLocation} ${placeAddress}`.toLowerCase();

        const matchingCity =
          cleanDestinations.find((city) =>
            combinedGeoText.includes(city.toLowerCase())
          ) || cleanDestinations[0] || fallbackDestinationLabel;

        return normalizeRecommendedPlace(place, matchingCity);
      })
      .filter((place) => {
        if (!place.name || !place.location) return false;

        const name = normalizeText(place.name);
        const location = normalizeText(place.location);
        const address = normalizeText(place.address);

        return (
          !itineraryPlaceSet.has(name) &&
          !itineraryPlaceSet.has(location) &&
          !itineraryPlaceSet.has(address)
        );
      })
  );

  const tripSummary = normalizeTripSummary(data?.tripSummary, {
    destination,
    startDate,
    endDate,
    days: daysCount,
    style: payload?.preferences?.pace || "moderate",
    budget: payload?.preferences?.budget || "mid",
  });

  if (cityPlan.length) {
    tripSummary.cityPlan = cityPlan;
  }

  return {
    tripSummary,
    days: finalDays,
    tips: ensureArray(data?.tips)
      .map((x) => normalizeString(x))
      .filter(Boolean),
    recommendedPlaces,
  };
}

function buildPlannerHints({
  sourceTab,
  tripType,
  from,
  travelers,
  budget,
  pace,
  interests,
  notes,
}) {
  const hints = [];

  if (sourceTab) hints.push(`The trip was started from this homepage category: ${sourceTab}.`);
  if (tripType) hints.push(`Trip type or focus selected by user: ${tripType}.`);
  if (from) hints.push(`Origin or departure context: ${from}.`);

  if (travelers > 1) {
    hints.push(`Plan for a group of ${travelers} travelers, not a solo traveler.`);
  } else {
    hints.push("Plan for a solo traveler.");
  }

  if (pace === "relaxed") {
    hints.push("Use fewer activities, more breaks, later starts, and less rushing.");
  }
  if (pace === "moderate") {
    hints.push("Use a balanced schedule that feels realistic and comfortable.");
  }
  if (pace === "packed") {
    hints.push("Fit in more attractions, but still keep travel flow realistic.");
  }

  if (budget === "low") {
    hints.push("Prefer affordable attractions, casual food options, and lower-cost experiences.");
  }
  if (budget === "mid") {
    hints.push("Mix iconic attractions with comfortable mid-range food and experiences.");
  }
  if (budget === "high") {
    hints.push("Prefer premium experiences, highly rated attractions, and refined food suggestions.");
  }

  if (interests.includes("food")) {
    hints.push("Include strong food experiences and local specialties.");
  }
  if (interests.includes("history")) {
    hints.push("Include historical sites, museums, and cultural landmarks.");
  }
  if (interests.includes("culture")) {
    hints.push("Include local culture, neighborhoods, markets, and signature experiences.");
  }
  if (interests.includes("nature")) {
    hints.push("Include parks, scenic viewpoints, gardens, beaches, or outdoor experiences.");
  }
  if (interests.includes("shopping")) {
    hints.push("Include shopping districts, markets, or notable retail areas where appropriate.");
  }
  if (interests.includes("nightlife")) {
    hints.push("Include suitable evening activities, bars, live music, or vibrant night areas when safe.");
  }
  if (interests.includes("family")) {
    hints.push("Keep activities family-friendly and avoid unsafe or adult-only planning.");
  }

  if (notes) hints.push(`Special user notes: ${notes}`);

  if (sourceTab === "Activities") {
    hints.push("The user likely wants a trip built around experiences and attractions.");
  }
  if (sourceTab === "Hotels" || sourceTab === "Stays") {
    hints.push("The user likely wants a more stay-oriented and area-aware plan with a comfortable pace.");
  }
  if (sourceTab === "Flights") {
    hints.push("The user likely expects a full destination itinerary with travel-oriented structure.");
  }

  if (tripType === "oneway") {
    hints.push("The plan can feel more open-ended and does not need a strong return-trip feel.");
  }
  if (tripType === "multi") {
    hints.push("The trip can include stronger variety and more ambitious planning, but still remain coherent.");
  }
  if (tripType === "highlights") {
    hints.push("Prioritize iconic highlights and must-see places.");
  }
  if (tripType === "nature") {
    hints.push("Prioritize outdoor and scenic activities.");
  }
  if (tripType === "food") {
    hints.push("Prioritize food, cafes, and local culinary experiences.");
  }

  return hints;
}

function buildItineraryPrompt({
  tripMode = "single",
  destination,
  destinations = [],
  startDate,
  endDate,
  preferences,
  language = "en",
  multiCityMeta = [],
}) {
  const {
    travelers = 1,
    budget = "mid",
    pace = "moderate",
    interests = [],
    notes = "",
    sourceTab = "",
    tripType = "",
    from = "",
  } = preferences || {};

  const cleanTripMode = normalizeTripMode(tripMode);
  const cleanDestinations = normalizeDestinationsArray(destinations, destination);
  const isMultiCity = cleanTripMode === "multi" && cleanDestinations.length > 1;

  // Use per-city dates from multiCityMeta when available, otherwise split evenly
  const hasCityDates =
    isMultiCity &&
    Array.isArray(multiCityMeta) &&
    multiCityMeta.length === cleanDestinations.length &&
    multiCityMeta.every((c) => c.startDate && c.endDate);

  const cityPlan = isMultiCity
    ? hasCityDates
      ? cleanDestinations.map((city, i) => ({
          city,
          days: getDayCount(multiCityMeta[i].startDate, multiCityMeta[i].endDate),
          startDate: multiCityMeta[i].startDate,
          endDate: multiCityMeta[i].endDate,
        }))
      : splitDaysAcrossCities(startDate, endDate, cleanDestinations)
    : [];

  const days = isMultiCity && cityPlan.length
    ? cityPlan.reduce((sum, c) => sum + c.days, 0)
    : getDayCount(startDate, endDate);

  const plannerHints = buildPlannerHints({
    sourceTab,
    tripType,
    from,
    travelers,
    budget,
    pace,
    interests,
    notes,
  });

  return `
You are a professional travel planner creating realistic, high-quality itineraries.

Return ONLY valid JSON.
Do not use markdown.
Do not include explanations.
Do not include comments.
Do not wrap JSON in code fences.

JSON schema:
{
  "tripSummary": {
    "destination": string,
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "days": number,
    "style": string,
    "budget": "low" | "mid" | "high"
  },
  "days": [
    {
      "day": number,
      "date": "YYYY-MM-DD",
      "title": string,
      "morning": [
        {
          "title": string,
          "durationHours": number | null,
          "notes": string,
          "location": "Place name, City, Country",
          "address": "Specific route-friendly address or highly specific address-like text",
          "category": string,
          "type": string,
          "rating": number | null,
          "estimatedCostUSD": number | null
        }
      ],
      "afternoon": [
        {
          "title": string,
          "durationHours": number | null,
          "notes": string,
          "location": "Place name, City, Country",
          "address": "Specific route-friendly address or highly specific address-like text",
          "category": string,
          "type": string,
          "rating": number | null,
          "estimatedCostUSD": number | null
        }
      ],
      "evening": [
        {
          "title": string,
          "durationHours": number | null,
          "notes": string,
          "location": "Place name, City, Country",
          "address": "Specific route-friendly address or highly specific address-like text",
          "category": string,
          "type": string,
          "rating": number | null,
          "estimatedCostUSD": number | null
        }
      ],
      "foodSuggestion": string,
      "backupPlan": string
    }
  ],
  "tips": [string],
  "recommendedPlaces": [
    {
      "name": string,
      "reason": string,
      "location": "Place name, City, Country",
      "address": "Specific route-friendly address or highly specific address-like text",
      "category": string,
      "rating": number | null
    }
  ]
}

Trip input:
Trip mode: ${isMultiCity ? "multi-city" : "single-city"}
Main destination label: ${destination}
Destinations: ${cleanDestinations.join(" | ")}
Start date: ${startDate}
End date: ${endDate}
Number of days: ${days}
Travelers: ${travelers}
Budget: ${budget}
Pace: ${pace}
Interests: ${interests.join(", ") || "none"}
Notes: ${notes || "none"}
Source tab: ${sourceTab || "none"}
Trip type: ${tripType || "none"}
From: ${from || "none"}

${
  isMultiCity
    ? `Multi-city distribution plan:
${cityPlan
  .map(
    (c, i) =>
      `- City ${i + 1}: ${c.city} | ${c.days} day(s) | ${c.startDate} to ${c.endDate}`
  )
  .join("\n")}`
    : ""
}

Core planning rules:
- Make the plan realistic and usable.
- Keep each day geographically coherent.
- Do not overload days unrealistically.
- Respect the pace setting.
- Respect the number of travelers.
- Keep popular, safe, and practical attractions.
- Include breaks and transitions naturally.
- Include food suggestions that fit the destination.
- Add a useful backup plan for each day.
- Provide exactly ${days} days.
- Each day must have a meaningful title.
- Each time block should usually have 2 to 4 activities, but relaxed trips may have fewer.
- Prefer real famous places, museums, neighborhoods, viewpoints, markets, parks, landmarks, and strong local experiences.
- Avoid repeating the same attraction.
- Do not invent impossible travel times or strange routing.

Multi-city rules:
- If the trip mode is multi-city, the itinerary must cover all listed destinations.
- Follow the exact city distribution plan provided above.
- Group days by city in a natural order.
- Each day's activities must belong to the correct city for that date range.
- Include realistic transfer flow between cities when the city changes.
- Day titles should reflect the active city when helpful.
- Do not place attractions from one city inside another city’s day.

Recommended places rules:
- Include 6 to 10 recommended places.
- For multi-city trips, spread recommended places across the listed destinations.
- These should be useful extra options, nearby highlights, hidden gems, scenic areas, or must-see attractions.
- Make them fit the destination, budget, interests, and trip style.
- Every recommended place MUST include a specific geocodable "location".
- Use format like "Place name, City, Country".
- "reason" should be short and helpful.
- "category" should be concise, such as "museum", "viewpoint", "market", "park", "neighborhood", "food", "beach", "landmark".
- Include "address" whenever confidently known.
- If not confidently known, still provide the best useful address-like text, not an empty string.
- "rating" is optional and should be null when uncertain. Do not guess precise ratings.
- Recommended places MUST NOT repeat any place already used in the itinerary.
- Recommended places should be extra options, not duplicates of scheduled activities.

Budget estimation rules:
- For each activity, set "estimatedCostUSD" to a realistic per-person cost in USD (e.g. 0 for free parks, 15–25 for museums, 20–60 for restaurants, 50+ for premium experiences).
- Use null only if the cost is genuinely impossible to estimate.
- Round to the nearest whole dollar.
- Calibrate costs to match the trip's budget level (low/mid/high).

Critical location and address rules:
- Every activity MUST include a non-empty "location".
- Each "location" must be geocodable and specific.
- Use this format whenever possible: "Place name, City, Country".
- Example: "Louvre Museum, Paris, France".
- Never use vague labels like "city center" by itself.
- Never use only a city name or only a country name as the location.
- Avoid generic labels like "old town", "downtown", "the beach" without city and country.
- Every activity SHOULD include "address".
- Address quality must be route-friendly.
- Prefer exact street addresses for restaurants, museums, landmarks, stations, hotels, viewpoints, and known attractions.
- If exact street address is confidently known, provide it.
- If exact street address is not confidently known, provide a highly specific fallback such as:
  - "Museo del Prado, Calle de Ruiz de Alarcón 23, Madrid, Spain"
  - "Gran Vía 28, Madrid, Spain"
  - "Near Plaza Mayor, Madrid, Spain"
  - "Montmartre, Paris, France"
- For well-known roads, boulevards, squares, and avenues, do NOT return only a street name. Add a number, nearby landmark, or junction when possible.
- Avoid vague addresses like only "Gran Vía, Madrid, Spain".
- Avoid ambiguous addresses that could exist in suburbs or nearby towns.
- Never leave address empty unless absolutely necessary.
- Do not invent apartment numbers, suite numbers, or fake postal codes.
- Only include "rating" when genuinely confident; otherwise use null.

Route-map quality rules:
- Think about whether the address would help a map API find the correct place.
- Prefer unique, map-search-friendly place strings.
- For restaurants and cafes, include the establishment name plus street address when known.
- For major attractions, include the attraction name plus a precise address or landmark-based address.
- If a place is inside a famous district, include the district and city.
- Avoid returning duplicate street names without extra detail.

Strong personalization rules:
${plannerHints.map((h) => `- ${h}`).join("\n")}

Quality rules:
- Morning should feel like a good morning plan.
- Afternoon should feel like a natural continuation.
- Evening should feel suitable for the time of day.
- Family trips should avoid unsafe nightlife-heavy planning.
- Low budget trips should avoid overly luxury-heavy suggestions.
- Packed trips can be fuller, but still realistic.
- Relaxed trips should feel easy and enjoyable.
- Food suggestions should be destination-specific.
- Tips should be practical and concise.

${language === "he" ? `Language rules:
- Write ALL text fields in Hebrew (title, notes, foodSuggestion, backupPlan, tips, reason, style, budget).
- Keep place names, addresses, and locations in their original language (English/local) so maps and search work correctly.
- The "destination" field in tripSummary must stay in English/original.
` : ""}
Return only JSON.
`.trim();
}

export async function generatePackingList({ destination, startDate, endDate, preferences = {} }) {
  const { travelers = 1, budget = "mid", interests = [] } = preferences;
  const days = getDayCount(startDate, endDate);
  const interestStr = interests.length ? interests.join(", ") : "general sightseeing";

  const prompt = `Generate a practical packing list for a ${days}-day trip to ${destination} (${startDate} to ${endDate}).
Travelers: ${travelers}. Budget: ${budget}. Interests: ${interestStr}.
Return ONLY a JSON array of 20-30 short label strings (no explanations, no objects):
["Passport", "Phone charger", "Sunscreen", ...]`.trim();

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  const text = response.output_text?.trim() || "[]";
  let items;
  try {
    items = JSON.parse(text);
  } catch {
    const first = text.indexOf("[");
    const last = text.lastIndexOf("]");
    items = first !== -1 && last !== -1 ? JSON.parse(text.slice(first, last + 1)) : [];
  }

  if (!Array.isArray(items)) items = [];
  return items
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((label) => ({ label, checked: false }));
}

export async function generateItinerary(payload) {
  const prompt = buildItineraryPrompt({ ...payload, language: payload.language || "en" });

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  const text = response.output_text;
  let data = safeJsonParse(text);

  if (!data || typeof data !== "object") {
    throw new Error("AI returned invalid data.");
  }

  if (!Array.isArray(data.days)) {
    throw new Error("AI JSON missing 'days' array.");
  }

  data = normalizeAndFillLocations(data, payload);

  return data;
}