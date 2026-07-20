import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import { getLogs, getLogStats, clearLogs } from "../services/logService.js";

const router = express.Router();

/**
 * GET /api/admin/logs
 * Query params: level, limit, offset, search
 * Returns { logs, stats, total }
 */
router.get(
  "/logs",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    try {
      const { level, limit, offset, search } = req.query;
      const { logs, total } = getLogs({ level, limit, offset, search });
      const stats = getLogStats();
      return res.json({ logs, stats, total });
    } catch (err) {
      console.error("GET /api/admin/logs error:", err);
      return res.status(500).json({ message: "Failed to retrieve logs." });
    }
  }
);

/**
 * DELETE /api/admin/logs
 * Clears the in-memory log buffer.
 * Returns { cleared: true, removed: <count> }
 */
router.delete(
  "/logs",
  authMiddleware,
  adminMiddleware,
  (_req, res) => {
    try {
      const removed = clearLogs();
      return res.json({ cleared: true, removed });
    } catch (err) {
      console.error("DELETE /api/admin/logs error:", err);
      return res.status(500).json({ message: "Failed to clear logs." });
    }
  }
);

export default router;
