import express from "express";
import Stripe from "stripe";
import axios from "axios";
import authMiddleware from "../middleware/authMiddleware.js";
import { User } from "../models/User.js";
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_EXPLORER_PRICE_ID,
  STRIPE_PRO_PRICE_ID,
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_EXPLORER_PLAN_ID,
  PAYPAL_PRO_PLAN_ID,
  PAYPAL_WEBHOOK_ID,
  PAYPAL_MODE,
  CLIENT_URL,
} from "../config.js";
import { getPlanLimits, isSameMonth } from "../utils/planLimits.js";

// ─── PayPal helpers ───────────────────────────────────────────────────────────

const PAYPAL_BASE = PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getPayPalToken() {
  const res = await axios.post(
    `${PAYPAL_BASE}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_CLIENT_SECRET },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
  return res.data.access_token;
}

async function getPayPalSubscription(subscriptionId) {
  const token = await getPayPalToken();
  const res = await axios.get(
    `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

function paypalPlanIdToName(planId) {
  if (planId === PAYPAL_EXPLORER_PLAN_ID) return "explorer";
  if (planId === PAYPAL_PRO_PLAN_ID)      return "pro";
  return null;
}

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

// ─── POST /checkout-session ───────────────────────────────────────────────────
// Creates a Stripe Checkout Session in embedded mode and returns clientSecret
// so the frontend can render the payment form inside the page.

router.post("/checkout-session", authMiddleware, async (req, res) => {
  if (!stripe) return res.status(503).json({ message: "Payments not configured." });

  const { plan } = req.body;
  const priceId = plan === "explorer" ? STRIPE_EXPLORER_PRICE_ID : plan === "pro" ? STRIPE_PRO_PRICE_ID : null;
  if (!priceId) return res.status(400).json({ message: "Invalid plan." });

  try {
    const user = await User.findById(req.user.id).select("email stripeCustomerId");
    if (!user) return res.status(404).json({ message: "User not found" });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(user._id) } });
      user.stripeCustomerId = customer.id;
      await user.save();
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      ui_mode: "embedded",
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${CLIENT_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { userId: String(user._id), plan },
      subscription_data: { metadata: { userId: String(user._id), plan } },
    });

    return res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("Checkout session error:", err);
    return res.status(500).json({ message: "Failed to create checkout session." });
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

// ─── GET /paypal/plan-ids ──────────────────────────────────────────────────────
// Returns PayPal plan IDs so the frontend can pass them to PayPal SDK directly

router.get("/paypal/plan-ids", authMiddleware, (_req, res) => {
  if (!PAYPAL_CLIENT_ID) return res.status(503).json({ message: "PayPal not configured." });
  return res.json({
    explorer: PAYPAL_EXPLORER_PLAN_ID || null,
    pro:      PAYPAL_PRO_PLAN_ID      || null,
    clientId: PAYPAL_CLIENT_ID,
  });
});

// ─── POST /paypal/approve ──────────────────────────────────────────────────────
// Called by frontend after user approves subscription on PayPal

router.post("/paypal/approve", authMiddleware, async (req, res) => {
  if (!PAYPAL_CLIENT_ID) return res.status(503).json({ message: "PayPal not configured." });

  const { subscriptionId } = req.body;
  if (!subscriptionId) return res.status(400).json({ message: "subscriptionId is required." });

  try {
    const sub = await getPayPalSubscription(subscriptionId);

    if (sub.status !== "ACTIVE") {
      return res.status(400).json({ message: `Subscription not active (status: ${sub.status})` });
    }

    const planId = sub.plan_id;
    const plan   = paypalPlanIdToName(planId);
    if (!plan) return res.status(400).json({ message: "Unknown PayPal plan." });

    await User.findByIdAndUpdate(req.user.id, {
      plan,
      paypalSubscriptionId: subscriptionId,
      paymentProvider: "paypal",
      stripeSubscriptionId: null,
      planExpiresAt: null,
    });

    return res.json({ plan });
  } catch (err) {
    console.error("PayPal approve error:", err);
    return res.status(500).json({ message: "Failed to activate PayPal subscription." });
  }
});

// ─── POST /paypal/cancel ───────────────────────────────────────────────────────

router.post("/paypal/cancel", authMiddleware, async (req, res) => {
  if (!PAYPAL_CLIENT_ID) return res.status(503).json({ message: "PayPal not configured." });

  try {
    const user = await User.findById(req.user.id).select("paypalSubscriptionId");
    if (!user?.paypalSubscriptionId) {
      return res.status(400).json({ message: "No active PayPal subscription." });
    }

    const token = await getPayPalToken();
    await axios.post(
      `${PAYPAL_BASE}/v1/billing/subscriptions/${user.paypalSubscriptionId}/cancel`,
      { reason: "User requested cancellation" },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    await User.findByIdAndUpdate(req.user.id, {
      plan: "free",
      paypalSubscriptionId: null,
      paymentProvider: null,
      planExpiresAt: null,
    });

    return res.json({ message: "PayPal subscription cancelled." });
  } catch (err) {
    console.error("PayPal cancel error:", err);
    return res.status(500).json({ message: "Failed to cancel PayPal subscription." });
  }
});

// ─── POST /paypal/webhook ──────────────────────────────────────────────────────

router.post("/paypal/webhook", express.json(), async (req, res) => {
  if (!PAYPAL_CLIENT_ID) return res.status(503).json({ message: "PayPal not configured." });

  // Verify webhook signature
  try {
    const token = await getPayPalToken();
    const verifyRes = await axios.post(
      `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
      {
        auth_algo:         req.headers["paypal-auth-algo"],
        cert_url:          req.headers["paypal-cert-url"],
        transmission_id:   req.headers["paypal-transmission-id"],
        transmission_sig:  req.headers["paypal-transmission-sig"],
        transmission_time: req.headers["paypal-transmission-time"],
        webhook_id:        PAYPAL_WEBHOOK_ID,
        webhook_event:     req.body,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (verifyRes.data.verification_status !== "SUCCESS") {
      return res.status(400).json({ message: "Webhook verification failed." });
    }
  } catch (err) {
    console.error("PayPal webhook verify error:", err.message);
    return res.status(400).json({ message: "Webhook verification error." });
  }

  const event = req.body;
  try {
    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const sub    = event.resource;
        const plan   = paypalPlanIdToName(sub.plan_id);
        const userId = sub.custom_id; // set when subscription created via custom_id
        if (plan && userId) {
          await User.findByIdAndUpdate(userId, {
            plan,
            paypalSubscriptionId: sub.id,
            paymentProvider: "paypal",
            planExpiresAt: null,
          });
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const sub = event.resource;
        const user = await User.findOne({ paypalSubscriptionId: sub.id });
        if (user) {
          await User.findByIdAndUpdate(user._id, {
            plan: "free",
            paypalSubscriptionId: null,
            paymentProvider: null,
            planExpiresAt: null,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("PayPal webhook handler error:", err);
    return res.status(500).json({ message: "Webhook handler error." });
  }

  return res.json({ received: true });
});

export default router;
