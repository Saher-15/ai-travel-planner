import express from "express";
import { openai } from "../services/openaiService.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, async (req, res) => {
  try {
    const { destination } = req.body;

    const prompt = `
      Create a structured 3-day travel itinerary for ${destination}.
      Return ONLY valid JSON. Do not include explanations or extra text.
      Use this exact structure:

      {
        "destination": "",
        "summary": "",
        "days": [
          {
            "day": 1,
            "title": "",
            "morning": "",
            "afternoon": "",
            "evening": "",
            "food": "",
            "tips": ""
          }
        ],
        "budget": {
          "accommodation": "",
          "food": "",
          "transportation": "",
          "activities": "",
          "total": ""
        },
        "weather": "",
        "best_time_to_visit": ""
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },   // forces JSON
      messages: [
        { role: "system", content: "You are a travel planning expert." },
        { role: "user", content: prompt }
      ],
    });

    const json = completion.choices[0].message.content;

    res.json(JSON.parse(json));

  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;
