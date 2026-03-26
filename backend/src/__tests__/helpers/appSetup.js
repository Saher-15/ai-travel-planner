/**
 * Creates a bare Express app for integration tests (no real DB connection,
 * no listen()) so supertest can drive HTTP requests directly.
 */

import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "../../routes/authRoutes.js";
import tripRoutes from "../../routes/tripRoutes.js";
import contactRoutes from "../../routes/contactRoutes.js";
import adminRoutes from "../../routes/adminRoutes.js";

export function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/auth", authRoutes);
  app.use("/api/trips", tripRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/admin", adminRoutes);

  // 404 catch-all
  app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

  return app;
}
