import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PORT } from "./config.js";
import { connectDB } from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import placePhotosRoutes from "./routes/placePhotos.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      const allowed = [
        "http://localhost:5173",
        "https://travelplanner-ai.netlify.app",
      ];

      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ------------------------------
// Limiters
// ------------------------------
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again shortly.",
  },
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again in a few minutes.",
  },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many AI generation requests. Please wait a bit and try again.",
  },
});

const photoLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many photo search requests. Please try again shortly.",
  },
});

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many contact form submissions. Please try again later.",
  },
});

// Public test route
app.get("/", (_req, res) => {
  res.json({ message: "AI Travel Planner API running" });
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/places", photoLimiter, placePhotosRoutes);
app.use("/api/contact", contactLimiter, contactRoutes);
app.use("/api/trips/generate", aiLimiter);
app.use("/api/trips/generate-and-save", aiLimiter);
app.use("/api/trips", readLimiter, tripRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS blocked this request" });
  }

  return res.status(500).json({ message: "Server error" });
});

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT || 5000, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT || 5000}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
};

start();