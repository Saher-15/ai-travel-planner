import express from "express";
import { User } from "../models/User.js";
import { Trip } from "../models/Trip.js";
import { ContactMessage } from "../models/ContactMessage.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get("/stats", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
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
        .select("name email role verified createdAt"),

      // Recent 8 trips
      Trip.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("userId", "name email")
        .select("destination startDate endDate preferences.travelers preferences.budget createdAt"),

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

    return res.json({
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
        recent: recentTrips,
      },
      messages: {
        total:  totalMessages,
        unread: unreadMessages,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ message: "Failed to load stats." });
  }
});

export default router;
