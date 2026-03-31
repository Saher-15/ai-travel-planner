import { Link } from "react-router-dom";

const FEATURE_LABELS = {
  aiGen:    "AI trip generation",
  pdf:      "PDF export",
  aiPacking:"AI packing list",
  sharing:  "trip sharing",
  saveTrip: "saving more trips",
};

/**
 * Shows an upgrade nudge when a 403 with `upgradeRequired: true` is returned.
 *
 * Props:
 *   message  — the error message from the API
 *   feature  — feature key (aiGen | pdf | aiPacking | sharing | saveTrip)
 *   onDismiss — optional callback
 */
export default function UpgradeBanner({ message, feature, onDismiss }) {
  const featureLabel = FEATURE_LABELS[feature] || "this feature";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">🔒</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">
            {message || `Upgrade required for ${featureLabel}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"
            >
              View Plans
            </Link>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
