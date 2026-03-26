import { useEffect, useState } from "react";

const STORAGE_KEY = "a11y_prefs";

const DEFAULTS = {
  fontSize: 0,       // -1 = smaller, 0 = normal, 1 = large, 2 = x-large
  highContrast: false,
  reduceMotion: false,
  dyslexiaFont: false,
};

function loadPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

function applyPrefs(prefs) {
  const root = document.documentElement;

  // Font size
  const sizes = ["90%", "100%", "115%", "130%"];
  root.style.setProperty("--a11y-font-scale", sizes[prefs.fontSize + 1] || "100%");
  root.classList.toggle("a11y-font-scaled", prefs.fontSize !== 0);

  // High contrast
  root.classList.toggle("a11y-high-contrast", prefs.highContrast);

  // Reduce motion
  root.classList.toggle("a11y-reduce-motion", prefs.reduceMotion);

  // Dyslexia font
  root.classList.toggle("a11y-dyslexia", prefs.dyslexiaFont);
}

export default function AccessibilityWidget() {
  const [prefs, setPrefs]     = useState(loadPrefs);
  const [open, setOpen]       = useState(false);
  const [announce, setAnnounce] = useState("");

  // Apply on mount + whenever prefs change
  useEffect(() => {
    applyPrefs(prefs);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* noop */ }
  }, [prefs]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function update(key, value) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setPrefs({ ...DEFAULTS });
    setAnnounce("Accessibility preferences reset to defaults.");
  }

  const FONT_LABELS = ["Smaller", "Default", "Large", "X-Large"];

  return (
    <>
      {/* Live region for screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </div>

      {/* Floating trigger */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

        {/* Panel */}
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Accessibility settings"
            className="w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] animate-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-black text-slate-900">Accessibility</p>
                <p className="text-[11px] text-slate-400">WCAG 2.1 AA</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close accessibility settings"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-sky-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 p-3">

              {/* Font size */}
              <fieldset>
                <legend className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Text Size
                </legend>
                <div className="flex gap-1">
                  {FONT_LABELS.map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { update("fontSize", i - 1); setAnnounce(`Text size set to ${label}.`); }}
                      aria-pressed={prefs.fontSize === i - 1}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-sky-500 ${
                        prefs.fontSize === i - 1
                          ? "border-sky-400 bg-sky-500 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-300 hover:bg-sky-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Toggles */}
              {[
                { key: "highContrast", label: "High Contrast", desc: "Stronger color contrast", icon: "◑" },
                { key: "reduceMotion", label: "Reduce Motion", desc: "Disable animations", icon: "⏸" },
                { key: "dyslexiaFont", label: "Dyslexia Font", desc: "More readable typeface", icon: "Aa" },
              ].map(({ key, label, desc, icon }) => (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={prefs[key]}
                  onClick={() => { update(key, !prefs[key]); setAnnounce(`${label} ${!prefs[key] ? "enabled" : "disabled"}.`); }}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-sky-500 ${
                    prefs[key]
                      ? "border-sky-200 bg-sky-50"
                      : "border-transparent bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base font-black text-slate-700 shadow-sm border border-slate-100">
                    {icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-slate-900">{label}</span>
                    <span className="block text-[11px] text-slate-400">{desc}</span>
                  </span>
                  <span className={`h-5 w-9 rounded-full transition-colors ${prefs[key] ? "bg-sky-500" : "bg-slate-200"}`}>
                    <span className={`block h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform ${prefs[key] ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </button>
              ))}

              {/* Reset */}
              <button
                type="button"
                onClick={reset}
                className="mt-1 w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-500"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close accessibility settings" : "Open accessibility settings"}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/30 transition hover:scale-105 hover:bg-slate-800 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 11l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="7" r="1" fill="currentColor" />
          </svg>
        </button>
      </div>
    </>
  );
}
