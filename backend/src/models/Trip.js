import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    durationHours: { type: Number, default: null },
    notes: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    type: { type: String, default: "", trim: true },
    rating: { type: Number, default: null },
    estimatedCostUSD: { type: Number, default: null },
    image: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const RecommendedPlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    reason: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    rating: { type: Number, default: null },
    image: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    source: { type: String, default: "", trim: true },
    link: { type: String, default: "", trim: true },
    rating: { type: Number, default: null },
  },
  { _id: false }
);

const DayPlanSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    date: { type: String, required: true },
    title: { type: String, default: "", trim: true },
    morning: { type: [ActivitySchema], default: [] },
    afternoon: { type: [ActivitySchema], default: [] },
    evening: { type: [ActivitySchema], default: [] },
    foodSuggestion: { type: String, default: "", trim: true },
    backupPlan: { type: String, default: "", trim: true },
    userNote: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const TripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tripMode: {
      type: String,
      enum: ["single", "multi"],
      default: "single",
    },

    destination: { type: String, required: true, trim: true },
    destinations: { type: [String], default: [] },

    // English place metadata — used for city photo lookups even when destination is in Hebrew
    placeMeta: {
      name: { type: String, default: "" },
      label: { type: String, default: "" },
      country: { type: String, default: "" },
      region: { type: String, default: "" },
      lng: { type: Number, default: null },
      lat: { type: Number, default: null },
    },
    multiCityMeta: { type: [Object], default: [] },

    startDate: { type: String, required: true },
    endDate: { type: String, required: true },

    preferences: {
      travelers: { type: Number, default: 2 },
      budget: {
        type: String,
        enum: ["low", "mid", "high"],
        default: "mid",
      },
      pace: {
        type: String,
        enum: ["relaxed", "moderate", "packed"],
        default: "moderate",
      },
      interests: { type: [String], default: [] },
      notes: { type: String, default: "", trim: true },
      sourceTab: { type: String, default: "", trim: true },
      tripType: { type: String, default: "", trim: true },
      from: { type: String, default: "", trim: true },
      includeEvents: { type: Boolean, default: true },
      eventTypes: { type: [String], default: [] },
    },

    itinerary: {
      tripSummary: { type: Object, default: {} },
      days: { type: [DayPlanSchema], default: [] },
      tips: { type: [String], default: [] },
      recommendedPlaces: { type: [RecommendedPlaceSchema], default: [] },
    },

    events: { type: [EventSchema], default: [] },

    status: {
      type: String,
      enum: ["planning", "upcoming", "completed"],
      default: "planning",
    },

    shareToken: { type: String, default: null },

    packingList: {
      type: [{ label: { type: String, required: true, trim: true }, checked: { type: Boolean, default: false }, _id: false }],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound index: user's trips sorted by newest first
TripSchema.index({ userId: 1, createdAt: -1 });
TripSchema.index({ shareToken: 1 }, { sparse: true });

export const Trip = mongoose.model("Trip", TripSchema);