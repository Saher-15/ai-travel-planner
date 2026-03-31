import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const PLAN_LABELS = {
  explorer: { name: "Explorer", price: "$6.99 / month", color: "from-sky-500 to-blue-600" },
  pro:      { name: "Pro",      price: "$14.99 / month", color: "from-violet-500 to-purple-600" },
};

export default function Checkout() {
  const { plan } = useParams();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const meta = PLAN_LABELS[plan];

  useEffect(() => {
    if (!isLoggedIn) { navigate("/login"); return; }
    if (!meta)       { navigate("/pricing"); return; }

    if (!stripePromise) {
      setError("Payment system is not configured yet. Please contact support.");
      setLoading(false);
      return;
    }

    api.post("/subscription/checkout-session", { plan })
      .then(({ data }) => { setClientSecret(data.clientSecret); })
      .catch((err) => {
        const msg = err?.response?.data?.message;
        const status = err?.response?.status;
        setError(
          status === 503
            ? "Payment system is not configured yet. Please contact support."
            : msg || "Failed to load checkout. Please try again."
        );
      })
      .finally(() => setLoading(false));
  }, [plan, isLoggedIn, navigate, meta]);

  if (!meta) return null;

  return (
    <div className="mx-auto max-w-2xl py-6">

      {/* Back link */}
      <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800">
        ← Back to pricing
      </Link>

      {/* Plan header */}
      <div className={`mt-5 overflow-hidden rounded-3xl bg-linear-to-r ${meta.color} px-6 py-5 text-white`}>
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Upgrading to</div>
        <div className="mt-1 text-2xl font-black">{meta.name}</div>
        <div className="mt-0.5 text-sm text-white/70">{meta.price} · cancel anytime</div>
      </div>

      {/* Checkout form */}
      <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center">
            <div className="text-3xl">⚠️</div>
            <p className="mt-3 text-sm font-semibold text-slate-700">{error}</p>
            <Link
              to="/pricing"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ← Back to plans
            </Link>
          </div>
        )}

        {clientSecret && stripePromise && (
          <div className="p-4">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>

      {/* Trust badges */}
      {!error && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <span>🔒 256-bit SSL</span>
          <span>·</span>
          <span>Powered by Stripe</span>
          <span>·</span>
          <span>Cancel anytime from your profile</span>
        </div>
      )}
    </div>
  );
}
