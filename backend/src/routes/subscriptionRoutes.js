import express from "express";
import Stripe from "stripe";
import authMiddleware from "../middleware/authMiddleware.js";
import { User } from "../models/User.js";
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_EXPLORER_PRICE_ID,
  STRIPE_PRO_PRICE_ID,
  CLIENT_URL,
} from "../config.js";
import { getPlanLimits, isSameMonth } from "../utils/planLimits.js";

const router = express.Router();

// Stripe client — only constructed when the key is present (so dev still works without it)
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Map Stripe price IDs → plan names
function priceIdToPlan(priceId) {
  if (priceId === STRIPE_EXPLORER_PRICE_ID) return "explorer";
  if (priceId === STRIPE_PRO_PRICE_ID)      return "pro";
  return null;
}

// ─── GET /plan ────────────────────────────────────────────────────────────────

router.get("/plan", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "plan stripeSubscriptionId planExpiresAt aiGenerationsThisMonth aiGenerationsResetAt"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const limits = getPlanLimits(user.plan);
    const usedThisMonth = isSameMonth(user.aiGenerationsResetAt)
      ? (user.aiGenerationsThisMonth || 0)
      : 0;

    return res.json({
      plan: user.plan || "free",
      planExpiresAt: user.planExpiresAt || null,
      stripeSubscriptionId: user.stripeSubscriptionId || null,
      limits,
      usage: { aiGenerationsThisMonth: usedThisMonth },
    });
  } catch (err) {
    console.error("GET /plan error:", err);
    return res.status(500).json({ message: "Failed to fetch plan info." });
  }
});

// ─── POST /checkout ────────────────────────────────────────────────────────────

router.post("/checkout", authMiddleware, async (req, res) => {
  if (!stripe) return res.status(503).json({ message: "Payments not configured." });

  const { plan } = req.body;
  const priceId = plan === "explorer" ? STRIPE_EXPLORER_PRICE_ID : plan === "pro" ? STRIPE_PRO_PRICE_ID : null;
  if (!priceId) return res.status(400).json({ message: "Invalid plan." });

  try {
    const user = await User.findById(req.user.id).select("email stripeCustomerId plan");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Reuse existing Stripe customer or create new
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(user._id) } });
      user.stripeCustomerId = customer.id;
      await user.save();
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${CLIENT_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/pricing`,
      metadata: { userId: String(user._id), plan },
      subscription_data: { metadata: { userId: String(user._id), plan } },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ message: "Failed to create checkout session." });
  }
});

// ─── POST /portal ──────────────────────────────────────────────────────────────

router.post("/portal", authMiddleware, async (req, res) => {
  if (!stripe) return res.status(503).json({ message: "Payments not configured." });

  try {
    const user = await User.findById(req.user.id).select("stripeCustomerId");
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ message: "No billing account found. Please subscribe first." });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${CLIENT_URL}/profile`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    return res.status(500).json({ message: "Failed to open billing portal." });
  }
});

// ─── POST /webhook ─────────────────────────────────────────────────────────────
// Needs raw body — mounted with express.raw() in server.js

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(503).json({ message: "Payments not configured." });

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId  = session.metadata?.userId;
        const plan    = session.metadata?.plan;
        if (userId && plan) {
          await User.findByIdAndUpdate(userId, {
            plan,
            stripeSubscriptionId: session.subscription,
            planExpiresAt: null,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub  = event.data.object;
        const item = sub.items?.data?.[0];
        const plan = item ? priceIdToPlan(item.price.id) : null;
        if (plan && sub.metadata?.userId) {
          await User.findByIdAndUpdate(sub.metadata.userId, {
            plan,
            stripeSubscriptionId: sub.id,
            planExpiresAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        if (sub.metadata?.userId) {
          await User.findByIdAndUpdate(sub.metadata.userId, {
            plan: "free",
            stripeSubscriptionId: null,
            planExpiresAt: null,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ message: "Webhook handler error." });
  }

  return res.json({ received: true });
});

export default router;
