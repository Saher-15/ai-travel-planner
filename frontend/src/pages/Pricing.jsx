import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";

const cx = (...c) => c.filter(Boolean).join(" ");

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "$0",
    period: "forever",
    badge: null,
    color: "from-slate-600 to-slate-700",
    ring: "",
    highlight: false,
    features: [
      { label: "3 AI trip generations / month", included: true },
      { label: "Up to 5 saved trips",            included: true },
      { label: "Day-by-day itineraries",          included: true },
      { label: "Interactive map",                 included: true },
      { label: "PDF export",                      included: false },
      { label: "AI packing list",                 included: false },
      { label: "Trip sharing",                    included: false },
      { label: "Unlimited saved trips",           included: false },
      { label: "Priority support",                included: false },
    ],
  },
  {
    id: "explorer",
    name: "Explorer",
    price: 6.99,
    priceLabel: "$6.99",
    period: "/ month",
    badge: "Most Popular",
    color: "from-sky-500 to-blue-600",
    ring: "ring-2 ring-sky-400",
    highlight: true,
    features: [
      { label: "20 AI trip generations / month", included: true },
      { label: "Unlimited saved trips",           included: true },
      { label: "Day-by-day itineraries",          included: true },
      { label: "Interactive map",                 included: true },
      { label: "PDF export",                      included: true },
      { label: "AI packing list",                 included: true },
      { label: "Trip sharing",                    included: true },
      { label: "Priority support",                included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 14.99,
    priceLabel: "$14.99",
    period: "/ month",
    badge: "Best Value",
    color: "from-violet-500 to-purple-600",
    ring: "ring-2 ring-violet-400",
    highlight: true,
    features: [
      { label: "Unlimited AI trip generations",  included: true },
      { label: "Unlimited saved trips",           included: true },
      { label: "Day-by-day itineraries",          included: true },
      { label: "Interactive map",                 included: true },
      { label: "PDF export",                      included: true },
      { label: "AI packing list",                 included: true },
      { label: "Trip sharing",                    included: true },
      { label: "Priority support",                included: true },
    ],
  },
];

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

function CheckIcon({ included }) {
  if (included) {
    return (
      <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─── PayPal button wrapper ─────────────────────────────────────────────────────

function PayPalCheckout({ plan, onSuccess, onError }) {
  const [planIds, setPlanIds] = useState(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    api.get("/subscription/paypal/plan-ids")
      .then(({ data }) => setPlanIds(data))
      .catch(() => {});
  }, []);

  if (!planIds) {
    return <div className="h-10 animate-pulse rounded-xl bg-slate-100" />;
  }

  const paypalPlanId = plan === "explorer" ? planIds.explorer : planIds.pro;
  if (!paypalPlanId) {
    return (
      <p className="text-center text-xs text-slate-400">
        PayPal plan not configured yet.
      </p>
    );
  }

  return (
    <PayPalButtons
      style={{ layout: "vertical", shape: "rect", label: "subscribe", tagline: false, height: 40 }}
      createSubscription={(_data, actions) =>
        actions.subscription.create({ plan_id: paypalPlanId })
      }
      onApprove={async (data) => {
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        try {
          await api.post("/subscription/paypal/approve", {
            subscriptionId: data.subscriptionID,
          });
          onSuccess();
        } catch (err) {
          navigatedRef.current = false;
          onError(err?.response?.data?.message || "PayPal activation failed. Please contact support.");
        }
      }}
      onError={(err) => {
        console.error("PayPal error:", err);
        onError("PayPal encountered an error. Please try again.");
      }}
      onCancel={() => {}}
    />
  );
}

// ─── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, isCurrent, isLoggedIn, payMethod, loadingPlan, onStripe, onManageBilling, onPayPalSuccess, onPayPalError }) {
  const isPaid = plan.id !== "free";

  return (
    <div className={cx(
      "relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition-all hover:shadow-md",
      plan.highlight ? `${plan.ring} border-transparent` : "border-slate-200"
    )}>
      {plan.badge && (
        <div className={cx(
          "absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-white",
          `bg-linear-to-r ${plan.color}`
        )}>
          {plan.badge}
        </div>
      )}

      {/* Icon + name + price */}
      <div>
        <div className={cx(
          "inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br text-white text-sm font-black",
          plan.color
        )}>
          {plan.name.charAt(0)}
        </div>
        <h2 className="mt-3 text-xl font-black text-slate-900">{plan.name}</h2>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-3xl font-black text-slate-900">{plan.priceLabel}</span>
          <span className="text-sm text-slate-400">{plan.period}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="mt-5 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f.label} className="flex items-start gap-2.5">
            <CheckIcon included={f.included} />
            <span className={cx("text-sm leading-snug",
              f.included ? "text-slate-700" : "text-slate-400 line-through decoration-slate-300"
            )}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-6 space-y-2">
        {isCurrent ? (
          <div className="space-y-2">
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 py-2.5 text-center text-sm font-bold text-emerald-700">
              ✓ Your current plan
            </div>
            {isPaid && (
              <button
                type="button"
                onClick={onManageBilling}
                disabled={loadingPlan === "portal"}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingPlan === "portal" ? "Opening…" : "Manage billing"}
              </button>
            )}
          </div>
        ) : !isPaid ? (
          isLoggedIn ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 py-2.5 text-center text-sm font-semibold text-slate-400">
              Free plan
            </div>
          ) : (
            <Link
              to="/register"
              className="block rounded-2xl bg-slate-700 py-2.5 text-center text-sm font-bold text-white transition hover:bg-slate-600"
            >
              Get started free
            </Link>
          )
        ) : (
          <>
            {/* Stripe */}
            {payMethod === "stripe" && (
              <button
                type="button"
                onClick={() => onStripe(plan.id)}
                disabled={!!loadingPlan}
                className={cx(
                  "w-full rounded-2xl py-2.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60",
                  plan.id === "explorer"
                    ? "bg-linear-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25"
                    : "bg-linear-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25"
                )}
              >
                {loadingPlan === plan.id ? "Redirecting…" : isLoggedIn ? `Upgrade to ${plan.name}` : `Get ${plan.name}`}
              </button>
            )}

            {/* PayPal */}
            {payMethod === "paypal" && (
              isLoggedIn ? (
                <div className="overflow-hidden rounded-xl">
                  <PayPalCheckout
                    plan={plan.id}
                    onSuccess={onPayPalSuccess}
                    onError={onPayPalError}
                  />
                </div>
              ) : (
                <Link
                  to="/register"
                  className="block rounded-2xl bg-[#0070ba] py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#005ea6]"
                >
                  Sign up to pay with PayPal
                </Link>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const { isLoggedIn, user, refresh } = useAuth();
  const navigate = useNavigate();
  const [payMethod, setPayMethod] = useState("stripe"); // "stripe" | "paypal"
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentPlan = user?.plan || "free";

  async function handleStripe(planId) {
    setError("");
    if (!isLoggedIn) { navigate("/register"); return; }
    if (planId === currentPlan) return;
    setLoadingPlan(planId);
    try {
      const { data } = await api.post("/subscription/checkout", { plan: planId });
      window.location.href = data.url;
    } catch (err) {
      const status = err?.response?.status;
      const msg    = err?.response?.data?.message;
      setError(
        status === 503
          ? "Payments are not configured yet. Please try again later or contact support."
          : msg || "Failed to start checkout. Please try again."
      );
      setLoadingPlan(null);
    }
  }

  async function handleManageBilling() {
    setError("");
    setLoadingPlan("portal");
    try {
      const { data } = await api.post("/subscription/portal");
      window.location.href = data.url;
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 503
          ? "Billing portal is not configured yet. Please contact support."
          : err?.response?.data?.message || "Failed to open billing portal."
      );
      setLoadingPlan(null);
    }
  }

  async function handlePayPalSuccess() {
    await refresh();
    setSuccess("Payment successful! Your plan has been activated.");
    setTimeout(() => navigate("/upgrade/success"), 1200);
  }

  function handlePayPalError(msg) {
    setError(msg);
  }

  const paypalProviderOptions = {
    clientId: PAYPAL_CLIENT_ID || "test",
    vault: true,
    intent: "subscription",
    components: "buttons",
  };

  return (
    <PayPalScriptProvider options={paypalProviderOptions}>
      <div className="mx-auto max-w-5xl py-4 sm:py-8">

        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-600">
            Pricing
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Plans for every traveler
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Start free, upgrade when you're ready. Cancel anytime.
          </p>
        </div>

        {/* Payment method toggle */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setPayMethod("stripe")}
              className={cx(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                payMethod === "stripe"
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {/* Credit card icon */}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Credit / Debit Card
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("paypal")}
              className={cx(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                payMethod === "paypal"
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {/* PayPal P logo */}
              <svg className="h-4 w-4 text-[#003087]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.067 8.478c.492.315.844.825.983 1.39.451 1.82-.584 4.1-2.573 5.136a7.27 7.27 0 01-3.46.816H13.8l-.74 3.716H10.7L12.617 8.06h4.034c1.497 0 2.7.155 3.416.418zm-3.39 5.096c1.12-.594 1.752-1.782 1.52-2.79a1.37 1.37 0 00-.64-.878c-.42-.248-1.013-.35-1.793-.35H14.4l-.944 4.714h1.435c.93 0 1.714-.22 2.385-.696zM6.617 5H10.7l-.484 2.43H6.133L6.617 5zm-1.45 7.286l1.386-6.953h4.134l-.395 1.98H7.07l-.493 2.474h3.218l-.394 1.98H6.183l-.462 2.32-1.554.199z" />
              </svg>
              PayPal
            </button>
          </div>
        </div>

        {/* Stripe trust line */}
        {payMethod === "stripe" && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Secured by <span className="font-bold text-slate-500">Stripe</span> — bank-grade encryption
          </p>
        )}
        {payMethod === "paypal" && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Secured by <span className="font-bold text-[#003087]">PayPal</span> — buyer protection included
          </p>
        )}

        {/* Alerts */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
            {success}
          </div>
        )}

        {/* Plans grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={isLoggedIn && plan.id === currentPlan}
              isLoggedIn={isLoggedIn}
              payMethod={payMethod}
              loadingPlan={loadingPlan}
              onStripe={handleStripe}
              onManageBilling={handleManageBilling}
              onPayPalSuccess={handlePayPalSuccess}
              onPayPalError={handlePayPalError}
            />
          ))}
        </div>

        {/* Payment logos */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 opacity-50">
          {["Visa", "Mastercard", "Amex", "PayPal"].map((b) => (
            <span key={b} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-xs">
              {b}
            </span>
          ))}
          <span className="text-xs text-slate-400">· 256-bit SSL encrypted</span>
        </div>

        {/* FAQ */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-7">
          <h3 className="text-center text-base font-black text-slate-800">Frequently asked questions</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { q: "Can I cancel anytime?",        a: "Yes. Cancel from your billing portal (Stripe) or PayPal subscription manager. Access continues until the period ends." },
              { q: "What counts as a generation?", a: "Each AI-generated itinerary (new or regenerated) uses one credit from your monthly allowance." },
              { q: "Can I switch payment method?", a: "Yes — cancel your current subscription and re-subscribe with the other payment method." },
              { q: "Is payment secure?",           a: "Yes. Stripe uses bank-grade encryption. PayPal includes buyer protection on all transactions." },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
                <div className="text-sm font-bold text-slate-800">{q}</div>
                <div className="mt-1 text-sm text-slate-500">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
