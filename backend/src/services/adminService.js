/**
 * adminService.js
 * Business logic for the admin dashboard.
 * Aggregates statistics across users, trips, and messages.
 */

import { User } from "../models/User.js";
import { Trip } from "../models/Trip.js";
import { ContactMessage } from "../models/ContactMessage.js";

/**
 * Helper: fill every missing day in a 30-day window with a count of 0
 * so front-end charts always receive exactly 30 data points.
 * @param {Array<{ _id: string, count: number }>} data — MongoDB aggregation result.
 * @param {Date} today — The start of today (midnight).
 * @returns {Array<{ date: string, count: number }>}
 */
function fillDays(data, today) {
  const map = Object.fromEntries(data.map((d) => [d._id, d.count]));
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today - (29 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: map[key] || 0 };
  });
}

/**
 * Aggregate all admin dashboard statistics in a single parallel query burst.
 * Returns counts, trends, breakdowns, and recent entity lists.
 *
 * @returns {Promise<{
 *   users: object,
 *   trips: object,
 *   messages: object
 * }>}
 */
export async function getDashboardStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week30 = new Date(today - 29 * 86400000);
  const week7 = new Date(today - 6 * 86400000);

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

    // Top 8 destinations by trip count
    Trip.aggregate([
      { $group: { _id: "$destination", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),

    // 8 most recently registered users
    User.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select("name email role verified createdAt"),

    // 8 most recently created trips (with owner info)
    Trip.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("userId", "name email")
      .select(
        "destination startDate endDate preferences.travelers preferences.budget createdAt"
      ),

    // Daily user sign-ups — last 30 days
    User.aggregate([
      { $match: { createdAt: { $gte: week30 } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Daily trip creations — last 30 days
    Trip.aggregate([
      { $match: { createdAt: { $gte: week30 } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Breakdown by budget tier (low / mid / high)
    Trip.aggregate([
      { $group: { _id: "$preferences.budget", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Breakdown by travel pace (relaxed / moderate / packed)
    Trip.aggregate([
      { $group: { _id: "$preferences.pace", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Breakdown by trip status (planning / upcoming / completed)
    Trip.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Number of trips that have an active public share link
    Trip.countDocuments({ shareToken: { $ne: null } }),

    // Number of trips that have at least one packing list item
    Trip.countDocuments({ "packingList.0": { $exists: true } }),
  ]);

  return {
    users: {
      total: totalUsers,
      today: newUsersToday,
      week: newUsersWeek,
      month: newUsersMonth,
      growth: fillDays(userGrowth, today),
      recent: recentUsers,
    },
    trips: {
      total: totalTrips,
      today: tripsToday,
      week: tripsWeek,
      month: tripsMonth,
      trends: fillDays(tripTrends, today),
      topDestinations,
      budgetBreakdown,
      paceBreakdown,
      statusBreakdown,
      sharedTrips,
      packingListsGenerated,
      recent: recentTrips,
    },
    messages: {
      total: totalMessages,
      unread: unreadMessages,
    },
  };
}
