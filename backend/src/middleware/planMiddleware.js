import { User } from "../models/User.js";
import { Trip } from "../models/Trip.js";
import { getPlanLimits, isSameMonth } from "../utils/planLimits.js";

/**
 * Middleware factory.
 *
 *   requireFeature("pdf")      — blocks unless plan has pdf:true
 *   requireFeature("aiPacking")
 *   requireFeature("sharing")
 *   requireFeature("aiGen")    — checks monthly AI generation quota AND increments it on pass
 *   requireFeature("saveTrip") — checks saved-trip count limit
 *
 * Admins bypass all plan limits.
 */
export function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select(
        "plan role aiGenerationsThisMonth aiGenerationsResetAt"
      );
      if (!user) return res.status(404).json({ message: "User not found" });

      // Admins have no limits — bypass everything
      if (user.role === "admin") return next();

      const plan   = user.plan || "free";
      const limits = getPlanLimits(plan);

      // ── Feature gate ──────────────────────────────────────────────────────────
      if (feature === "pdf" && !limits.pdf) {
        return res.status(403).json({
          message: "PDF export requires Explorer or Pro plan.",
          upgradeRequired: true,
          feature: "pdf",
        });
      }

      if (feature === "aiPacking" && !limits.aiPacking) {
        return res.status(403).json({
          message: "AI packing list requires Explorer or Pro plan.",
          upgradeRequired: true,
          feature: "aiPacking",
        });
      }

      if (feature === "sharing" && !limits.sharing) {
        return res.status(403).json({
          message: "Trip sharing requires Explorer or Pro plan.",
          upgradeRequired: true,
          feature: "sharing",
        });
      }

      // ── AI generation quota ───────────────────────────────────────────────────
      if (feature === "aiGen") {
        if (limits.aiPerMonth !== Infinity) {
          const sameMonth = isSameMonth(user.aiGenerationsResetAt);
          const now       = new Date();

          if (sameMonth) {
            // Atomic increment: the filter condition enforces the quota so concurrent
            // requests cannot both slip through a check-then-act gap.
            const updated = await User.findOneAndUpdate(
              { _id: user._id, aiGenerationsThisMonth: { $lt: limits.aiPerMonth } },
              { $inc: { aiGenerationsThisMonth: 1 } },
              { new: false }
            );
            if (!updated) {
              // null → the quota condition failed; user is at or over the limit
              return res.status(403).json({
                message: `You've used all ${limits.aiPerMonth} AI generations for this month. Upgrade to generate more trips.`,
                upgradeRequired: true,
                feature: "aiGen",
                used: user.aiGenerationsThisMonth || 0,
                limit: limits.aiPerMonth,
              });
            }
          } else {
            // New calendar month — reset counter to 1 unconditionally
            await User.findByIdAndUpdate(user._id, {
              aiGenerationsThisMonth: 1,
              aiGenerationsResetAt: now,
            });
          }
        }
      }

      // ── Save-trip limit ───────────────────────────────────────────────────────
      if (feature === "saveTrip" && limits.maxTrips !== Infinity) {
        const count = await Trip.countDocuments({ userId: req.user.id });
        if (count >= limits.maxTrips) {
          return res.status(403).json({
            message: `Free plan allows up to ${limits.maxTrips} saved trips. Upgrade to save unlimited trips.`,
            upgradeRequired: true,
            feature: "saveTrip",
            count,
            limit: limits.maxTrips,
          });
        }
      }

      next();
    } catch (err) {
      console.error("planMiddleware error:", err);
      return res.status(500).json({ message: "Server error checking plan limits." });
    }
  };
}
