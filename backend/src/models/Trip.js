import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    durationHours: { type: Number, default: null },
    notes: { type: String, default: "" },
    location: { type: String, default: "" },
  },
  { _id: false }
);

const DayPlanSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    title: { type: String, default: "" },
    morning: { type: [ActivitySchema], default: [] },
    afternoon: { type: [ActivitySchema], default: [] },
    evening: { type: [ActivitySchema], default: [] },
    foodSuggestion: { type: String, default: "" },
    backupPlan: { type: String, default: "" },
  },
  { _id: false }
);

const TripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    destination: { type: String, required: true },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, required: true },   // YYYY-MM-DD

    preferences: {
      travelers: { type: Number, default: 1 },
      budget: { type: String, enum: ["low", "mid", "high"], default: "mid" },
      pace: { type: String, enum: ["relaxed", "moderate", "packed"], default: "moderate" },
      interests: { type: [String], default: [] },
      notes: { type: String, default: "" },
    },

    itinerary: {
      tripSummary: { type: Object, default: {} },
      days: { type: [DayPlanSchema], default: [] },
      tips: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

export const Trip = mongoose.model("Trip", TripSchema);