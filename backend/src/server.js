import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PORT } from './config.js';
import { connectDB } from './db.js';
import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js"; // ✅ add this
import dotenv from "dotenv";
import geocodeRoutes from "./routes/geocodeRoutes.js";

dotenv.config();

const app = express();

// Security middlewares
app.use(helmet());

// CORS for development (allows Postman + your frontend)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'AI Travel Planner API running' });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Trip routes
app.use("/api/trips", tripRoutes);

app.use("/api/geocode", geocodeRoutes);

// (optional) 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// (optional) error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Server error" });
});

// Start server
const start = async () => {
  await connectDB();
  app.listen(PORT || 5000, () => {
    console.log(`Server running on port ${PORT || 5000}`);
  });
};

start();