import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildItineraryPrompt({ destination, startDate, endDate, preferences }) {
  const {
    travelers = 1,
    budget = "mid",
    pace = "moderate",
    interests = [],
    notes = "",
  } = preferences || {};

  return `
You are a professional travel planner.

Return ONLY valid JSON (no markdown, no comments, no extra text).

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
      "morning": [{ "title": string, "durationHours": number|null, "notes": string, "location": string }],
      "afternoon": [{ "title": string, "durationHours": number|null, "notes": string, "location": string }],
      "evening": [{ "title": string, "durationHours": number|null, "notes": string, "location": string }],
      "foodSuggestion": string,
      "backupPlan": string
    }
  ],
  "tips": [string]
}

Rules:
- Make the plan realistic.
- Include breaks and do not overload the day.
- Include 2-4 activities per time block.
- Prefer popular and safe attractions.
- Keep activities geographically close.
- Add a backup plan for bad weather.

CRITICAL LOCATION RULES (to support mapping):
- Every activity MUST include a non-empty "location" string.
- "location" MUST be geocodable and specific: "Place name, City, Country"
  Example: "Louvre Museum, Paris, France"
- Never use vague locations like "city center" without city/country.
- If unsure, include the destination city/country.

Trip input:
Destination: ${destination}
Start date: ${startDate}
End date: ${endDate}
Travelers: ${travelers}
Budget: ${budget}
Pace: ${pace}
Interests: ${interests.join(", ") || "none"}
Notes: ${notes || "none"}
`.trim();
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

function ensureArray(x) {
  return Array.isArray(x) ? x : [];
}

function normalizeAndFillLocations(data) {
  const dest = (data?.tripSummary?.destination || "").trim();

  // Normalize days array
  const days = Array.isArray(data?.days) ? data.days : [];
  data.days = days;

  for (const day of days) {
    day.morning = ensureArray(day.morning);
    day.afternoon = ensureArray(day.afternoon);
    day.evening = ensureArray(day.evening);

    for (const blockName of ["morning", "afternoon", "evening"]) {
      day[blockName] = day[blockName].map((a) => {
        const title = (a?.title || "Place").trim();
        const notes = typeof a?.notes === "string" ? a.notes : "";
        const durationHours =
          a?.durationHours === null || typeof a?.durationHours === "number"
            ? a.durationHours
            : null;

        let location = typeof a?.location === "string" ? a.location.trim() : "";

        // If AI forgot location, construct a good geocoding query
        if (!location) {
          location = dest ? `${title}, ${dest}` : title;
        } else if (dest) {
          // If location doesn't mention destination, append it to help geocoding
          const locLower = location.toLowerCase();
          const destLower = dest.toLowerCase();
          if (!locLower.includes(destLower)) {
            location = `${location}, ${dest}`;
          }
        }

        return { title, durationHours, notes, location };
      });
    }

    if (typeof day.foodSuggestion !== "string") day.foodSuggestion = "";
    if (typeof day.backupPlan !== "string") day.backupPlan = "";
    if (typeof day.title !== "string") day.title = `Day ${day.day || ""}`.trim();
  }

  if (!Array.isArray(data.tips)) data.tips = [];

  return data;
}

export async function generateItinerary(payload) {
  const prompt = buildItineraryPrompt(payload);

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  const text = response.output_text;

  let data = safeJsonParse(text);

  if (!data.days || !Array.isArray(data.days)) {
    throw new Error("AI JSON missing 'days' array.");
  }

  // ✅ Ensure activities always have geocodable `location` strings
  data = normalizeAndFillLocations(data);

  return data;
}