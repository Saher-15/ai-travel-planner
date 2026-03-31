import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    ring: "ring-slate-200",
    btnClass: "bg-slate-700 hover:bg-slate-600 text-white",
    features: [
      { label: "3 AI trip generations per month",  included: true },
      { label: "Up to 5 saved trips",               included: true },
      { label: "Day-by-day itineraries",             included: true },
      { label: "Interactive map",                    included: true },
      { label: "PDF export",                         included: false },
      { label: "AI packing list",                    included: false },
      { label: "Trip sharing",                       included: false },
      { label: "Unlimited saved trips",              included: false },
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
    ring: "ring-sky-400",
    btnClass: "bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/30",
    features: [
      { label: "20 AI trip generations per month",  included: true },
      { label: "Unlimited saved trips",              included: true },
      { label: "Day-by-day itineraries",             included: true },
      { label: "Interactive map",                    included: true },
      { label: "PDF export",                         included: true },
      { label: "AI packing list",                    included: true },
      { label: "Trip sharing",                       included: true },
      { label: "Priority support",                   included: false },
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
    ring: "ring-violet-400",
    btnClass: "bg-linear-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white shadow-lg shadow-violet-500/30",
    features: [
      { label: "Unlimited AI trip generations",     included: true },
      { label: "Unlimited saved trips",              included: true },
      { label: "Day-by-day itineraries",             included: true },
      { label: "Interactive map",                    included: true },
      { label: "PDF export",                         included: true },
      { label: "AI packing list",                    included: true },
      { label: "Trip sharing",                       included: true },
      { label: "Priority support",                   included: true },
    ],
  },
];

function CheckIcon({ included }) {
  if (included) {
    return (
      <svg className="h-4.5 w-4.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  return (
    <svg className="h-4.5 w-4.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function Pricing() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");

  const currentPlan = user?.plan || "free";

  async function handleChoosePlan(planId) {
    setError("");
    if (planId === "free") return; // Can't buy free
    if (!isLoggedIn) {
      navigate("/register");
      return;
    }
    if (planId === currentPlan) return;

    setLoadingPlan(planId);
    try {
      const { data } = await api.post("/subscription/checkout", { plan: planId });
      window.location.href = data.url;
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to start checkout. Please try again.");
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
      setError(err?.response?.data?.message || "Failed to open billing portal.");
      setLoadingPlan(null);
    }
  }

  return (
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
          Start free, upgrade when you're ready. No hidden fees.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Plans grid */}
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent  = isLoggedIn && plan.id === currentPlan;
          const isPopular  = plan.badge === "Most Popular";

          return (
            <div
              key={plan.id}
              className={cx(
                "relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
                isPopular ? "ring-2 ring-sky-400 border-sky-200" : "border-slate-200",
                plan.id === "pro" ? "ring-2 ring-violet-400 border-violet-200" : ""
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={cx(
                  "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white",
                  `bg-linear-to-r ${plan.color}`
                )}>
                  {plan.badge}
                </div>
              )}

              {/* Plan name + price */}
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
              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    <CheckIcon included={f.included} />
                    <span className={cx("text-sm leading-snug", f.included ? "text-slate-700" : "text-slate-400 line-through decoration-slate-300")}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-6 space-y-2">
                {isCurrent ? (
                  <div className="flex flex-col gap-2">
                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 py-2.5 text-center text-sm font-bold text-emerald-700">
                      Your current plan
                    </div>
                    {plan.id !== "free" && (
                      <button
                        type="button"
                        onClick={handleManageBilling}
                        disabled={loadingPlan === "portal"}
                        className="rounded-2xl border border-slate-200 bg-white py-2 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {loadingPlan === "portal" ? "Opening…" : "Manage billing"}
                      </button>
                    )}
                  </div>
                ) : plan.id === "free" ? (
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
                  <button
                    type="button"
                    onClick={() => handleChoosePlan(plan.id)}
                    disabled={!!loadingPlan}
                    className={cx(
                      "w-full rounded-2xl py-2.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60",
                      plan.btnClass
                    )}
                  >
                    {loadingPlan === plan.id ? "Redirecting…" : isLoggedIn ? `Upgrade to ${plan.name}` : `Get ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ strip */}
      <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-7">
        <h3 className="text-center text-base font-black text-slate-800">Frequently asked questions</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { q: "Can I cancel anytime?",   a: "Yes. Cancel from your billing portal and you keep access until the end of the billing period." },
            { q: "What counts as a generation?", a: "Each AI-generated itinerary (new or regenerate) uses one generation credit." },
            { q: "Can I switch plans?",     a: "Yes. Upgrade or downgrade anytime. Changes take effect on your next billing cycle." },
            { q: "Is payment secure?",      a: "All payments are processed by Stripe, the industry standard for secure payments." },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-2xl bg-white p-4 shadow-xs border border-slate-100">
              <div className="text-sm font-bold text-slate-800">{q}</div>
              <div className="mt-1 text-sm text-slate-500">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
