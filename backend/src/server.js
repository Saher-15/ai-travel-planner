import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { PORT } from "./config.js";
import { connectDB } from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import placePhotosRoutes from "./routes/placePhotos.js";
import adminRoutes from "./routes/adminRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import { pushLog } from "./services/logService.js";
import {
  readLimiter,
  authLimiter,
  aiLimiter,
  photoLimiter,
  contactLimiter,
} from "./middleware/limiters.js";

// ── Monkey-patch console.error to also push to the in-memory log buffer ───────
const _originalConsoleError = console.error;
console.error = (...args) => {
  _originalConsoleError(...args);
  try {
    pushLog({
      level:     "error",
      message:   args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      timestamp: new Date().toISOString(),
    });
  } catch {
    // swallow — never let logging crash the process
  }
};

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

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://travelplanner-ai.netlify.app",
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(compression());
// Stripe webhook needs raw body — mount before express.json()
app.use("/api/subscription/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(morgan("dev"));

// After morgan, push each request into the in-memory log buffer
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    try {
      pushLog({
        level:     "request",
        timestamp: new Date().toISOString(),
        method:    req.method,
        url:       req.originalUrl || req.url,
        status:    res.statusCode,
        duration:  Date.now() - startedAt,
        ip:        req.ip || req.socket?.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      });
    } catch {
      // swallow — never let logging crash the process
    }
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ message: "AI Travel Planner API running" }));

app.use("/api/auth",                          authLimiter,    authRoutes);
app.use("/api/places",                        photoLimiter,   placePhotosRoutes);
app.use("/api/contact",                       contactLimiter, contactRoutes);
app.use("/api/trips/generate",                aiLimiter);
app.use("/api/trips/generate-and-save",       aiLimiter);
app.use("/api/trips",                         readLimiter,    tripRoutes);
app.use("/api/admin",                         readLimiter,    adminRoutes);
app.use("/api/admin",                         readLimiter,    logRoutes);
app.use("/api/subscription",                  readLimiter,    subscriptionRoutes);

// ── Error handlers ────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, _req, res, _next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS blocked this request" });
  }
  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
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
