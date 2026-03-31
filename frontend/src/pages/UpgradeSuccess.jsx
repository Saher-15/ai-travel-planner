import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function UpgradeSuccess() {
  const { refresh } = useAuth();

  // Refresh user so plan updates in context
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
        🎉
      </div>
      <h1 className="mt-5 text-2xl font-black text-slate-900">You're all set!</h1>
      <p className="mt-2 text-slate-500">
        Your plan has been upgraded. Enjoy your new features.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/create"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5"
        >
          Create a Trip
        </Link>
        <Link
          to="/trips"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          My Trips
        </Link>
      </div>
    </div>
  );
}
