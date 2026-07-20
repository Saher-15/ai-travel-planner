import express from "express";
import mongoose from "mongoose";
import { LRUCache } from "lru-cache";
import { User } from "../models/User.js";
import { Trip } from "../models/Trip.js";
import { ContactMessage } from "../models/ContactMessage.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

const statsCache = new LRUCache({ max: 1, ttl: 60_000 }); // 1-minute TTL

router.get("/stats", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const cached = statsCache.get("stats");
    if (cached) {
      res.set("Cache-Control", "max-age=60");
      return res.json(cached);
    }

    const now     = new Date();
    const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week30  = new Date(today - 29 * 86400000);
    const week7   = new Date(today -  6 * 86400000);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      totalTrips,
      tripsToday,
      tripsWeek,
      tripsMonth,
      unreadMessages,
      totalMessages,
      topDestinations,
      recentUsers,
      recentTrips,
      userGrowth,
      tripTrends,
      budgetBreakdown,
      paceBreakdown,
      statusBreakdown,
      sharedTrips,
      packingListsGenerated,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: week7 } }),
      User.countDocuments({ createdAt: { $gte: week30 } }),
      Trip.countDocuments(),
      Trip.countDocuments({ createdAt: { $gte: today } }),
      Trip.countDocuments({ createdAt: { $gte: week7 } }),
      Trip.countDocuments({ createdAt: { $gte: week30 } }),
      ContactMessage.countDocuments({ isRead: false }),
      ContactMessage.countDocuments(),

      // Top 8 destinations
      Trip.aggregate([
        { $group: { _id: "$destination", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // Recent 8 users
      User.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select("name email role verified createdAt")
        .lean(),

      // Recent 8 trips
      Trip.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("userId", "name email")
        .select("destination startDate endDate preferences.travelers preferences.budget createdAt")
        .lean(),

      // Daily user sign-ups — last 30 days
      User.aggregate([
        { $match: { createdAt: { $gte: week30 } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Daily trip counts — last 30 days
      Trip.aggregate([
        { $match: { createdAt: { $gte: week30 } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Budget breakdown
      Trip.aggregate([
        { $group: { _id: "$preferences.budget", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Pace breakdown
      Trip.aggregate([
        { $group: { _id: "$preferences.pace", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Status breakdown
      Trip.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Shared trips count
      Trip.countDocuments({ shareToken: { $ne: null } }),

      // Trips with packing lists
      Trip.countDocuments({ "packingList.0": { $exists: true } }),
    ]);

    // Fill any missing days with 0 so charts have exactly 30 data points
    function fillDays(data) {
      const map = Object.fromEntries(data.map(d => [d._id, d.count]));
      return Array.from({ length: 30 }, (_, i) => {
        const d   = new Date(today - (29 - i) * 86400000);
        const key = d.toISOString().slice(0, 10);
        return { date: key, count: map[key] || 0 };
      });
    }

    const result = {
      users: {
        total: totalUsers,
        today: newUsersToday,
        week:  newUsersWeek,
        month: newUsersMonth,
        growth: fillDays(userGrowth),
        recent: recentUsers,
      },
      trips: {
        total: totalTrips,
        today: tripsToday,
        week:  tripsWeek,
        month: tripsMonth,
        trends: fillDays(tripTrends),
        topDestinations,
        budgetBreakdown,
        paceBreakdown,
        statusBreakdown,
        sharedTrips,
        packingListsGenerated,
        recent: recentTrips,
      },
      messages: {
        total:  totalMessages,
        unread: unreadMessages,
      },
    };

    statsCache.set("stats", result);
    res.set("Cache-Control", "max-age=60");
    return res.json(result);
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ message: "Failed to load stats." });
  }
});

/**
 * GET /api/admin/trips/search?q=japan&limit=20
 * Case-insensitive regex search on destination field.
 * Returns { count, trips } with selected fields.
 */
router.get("/trips/search", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const q     = (req.query.q || "").trim();
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));

    if (!q) {
      return res.status(400).json({ message: "Query parameter 'q' is required." });
    }

    const regex = new RegExp(q, "i");

    const trips = await Trip.find({ destination: regex })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email")
      .select("destination startDate endDate status createdAt preferences.travelers userId")
      .lean();

    return res.json({ count: trips.length, trips });
  } catch (err) {
    console.error("Admin trips search error:", err);
    return res.status(500).json({ message: "Failed to search trips." });
  }
});

/**
 * GET /api/admin/health
 * Returns basic process health metrics.
 */
router.get("/health", authMiddleware, adminMiddleware, (_req, res) => {
  try {
    return res.json({
      uptime:     process.uptime(),
      memoryMB:   parseFloat((process.memoryUsage().heapUsed / 1e6).toFixed(2)),
      mongoState: mongoose.connection.readyState,
      timestamp:  new Date().toISOString(),
    });
  } catch (err) {
    console.error("Admin health error:", err);
    return res.status(500).json({ message: "Failed to retrieve health info." });
  }
});

export default router;
