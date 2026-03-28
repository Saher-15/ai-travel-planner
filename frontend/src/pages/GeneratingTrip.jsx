import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Compass, MapPinned, PlaneTakeoff, Sparkles, Stars, UtensilsCrossed, Wand2 } from "lucide-react";
import { api } from "../api/client.js";
import { Alert, Button } from "../components/UI.jsx";
import { useTranslation } from "react-i18next";

const TIPS = [
  "Analyzing local weather patterns for your dates…",
  "Discovering hidden gems only locals know…",
  "Curating the best restaurants in the area…",
  "Mapping out the perfect day-by-day flow…",
  "Checking opening hours & seasonal highlights…",
  "Balancing must-sees with off-the-beaten-path stops…",
  "Tailoring the pace to your travel style…",
  "Adding local culture & cuisine recommendations…",
];

export default function GeneratingTrip() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation();
  const payload = location.state?.payload || null;

  const STEPS = [
    { icon: <MapPinned size={15} />,       title: t("generatingTrip.steps.0.title") },
    { icon: <Compass size={15} />,         title: t("generatingTrip.steps.1.title") },
    { icon: <UtensilsCrossed size={15} />, title: t("generatingTrip.steps.2.title") },
    { icon: <CalendarDays size={15} />,    title: t("generatingTrip.steps.3.title") },
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [tipIdx, setTipIdx]         = useState(0);
  const [err, setErr]               = useState("");
  const navigatedRef                = useRef(false);
  const processedRef                = useRef(false);

  const destinationLabel = useMemo(() => {
    if (!payload) return t("generatingTrip.errors.yourDestination");
    return payload.destination || t("generatingTrip.errors.yourDestination");
  }, [payload, t]);

  const tripMeta = useMemo(() => {
    if (!payload) return {};
    return {
      dates:     payload.startDate && payload.endDate ? `${payload.startDate} → ${payload.endDate}` : null,
      pace:      payload.preferences?.pace || null,
      budget:    payload.preferences?.budget || null,
      travelers: payload.preferences?.travelers?.summary || null,
    };
  }, [payload]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!payload) { setErr(t("generatingTrip.errors.missingDetails")); return; }
    const stepId = setInterval(() => setActiveStep((p) => Math.min(p + 1, STEPS.length - 1)), 1600);
    const tipId  = setInterval(() => setTipIdx((p) => (p + 1) % TIPS.length), 2800);
    return () => { clearInterval(stepId); clearInterval(tipId); };
  }, [payload]);

  useEffect(() => {
    if (!payload || processedRef.current) return;
    processedRef.current = true;
    async function run() {
      try {
        const { data: trip } = await api.post("/trips/generate-and-save", payload, { timeout: 120_000 });
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        nav(`/trip/${trip._id}`, { replace: true });
      } catch (e) {
        if (navigatedRef.current) return;
        const isTimeout = e?.code === "ECONNABORTED" || e?.message?.includes("timeout");
        const isAuth    = e?.response?.status === 401;
        setErr(
          isTimeout ? "Generation timed out — the AI is busy. Please try again." :
          isAuth    ? "Session expired. Please log in and try again." :
                      e?.response?.data?.message || t("generatingTrip.errors.generateFailed")
        );
      }
    }
    run();
  }, [payload, nav]);

  const progress = Math.round(((activeStep + 1) / STEPS.length) * 100);

  if (err) {
    return (
      <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Sparkles size={28} />
          </div>
          <h2 className="text-xl font-black text-slate-900">Something went wrong</h2>
          <Alert type="error">{err}</Alert>
          <div className="flex gap-3">
            <Button onClick={() => nav("/create")} className="flex-1">{t("generatingTrip.progress.backToCreate")}</Button>
            <Button variant="secondary" onClick={() => nav("/trips")} className="flex-1">{t("generatingTrip.viewMyTrips")}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-3">

        {/* ── Hero dark card ── */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 px-5 py-8 text-white shadow-2xl sm:px-8 sm:py-12">
          {/* Blobs */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute -right-12 top-4 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-10 left-1/3 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
          {/* Grid texture */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[32px_32px]" />

          <div className="relative text-center">
            {/* Animated icon with orbit rings */}
            <div className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-sky-500/15 duration-1000" />
              <span className="absolute inset-3 animate-ping rounded-full bg-indigo-400/20 [animation-delay:0.5s] [animation-duration:1.4s]" />
              <span className="absolute inset-6 animate-ping rounded-full bg-cyan-400/25 [animation-delay:1s] [animation-duration:1.8s]" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-[0_20px_50px_-10px_rgba(59,130,246,0.6)]">
                <Sparkles size={34} className="animate-pulse" />
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/70 mb-4">
              <Wand2 size={10} /> {t("generatingTrip.badge")}
            </div>

            {/* Destination */}
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              {t("generatingTrip.craftingJourney")}{" "}
              <span className="bg-linear-to-r from-sky-300 via-cyan-200 to-indigo-200 bg-clip-text text-transparent">
                {destinationLabel}
              </span>
            </h1>

            {/* Rotating tip */}
            <p key={tipIdx} className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/55 transition-all duration-500">
              {TIPS[tipIdx]}
            </p>

            {/* Progress bar */}
            <div className="mt-7 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-linear-to-r from-sky-400 via-cyan-400 to-indigo-400 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-bold text-white/30">
              <span>Generating</span>
              <span>{progress}%</span>
            </div>

            {/* Meta pills */}
            {Object.values(tripMeta).some(Boolean) && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {[
                  { icon: <CalendarDays size={11} />, val: tripMeta.dates },
                  { icon: <Compass size={11} />,      val: tripMeta.pace },
                  { icon: <Stars size={11} />,        val: tripMeta.budget },
                  { icon: <PlaneTakeoff size={11} />, val: tripMeta.travelers },
                ].filter(({ val }) => val).map(({ icon, val }) => (
                  <span key={val} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/75 backdrop-blur-sm">
                    {icon} {val}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Steps ── */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {STEPS.map((step, i) => {
              const isDone   = i < activeStep;
              const isActive = i === activeStep;
              return (
                <div key={step.title}
                  className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-300 ${
                    isDone ? "bg-emerald-50/50" : isActive ? "bg-sky-50/80" : "bg-white"
                  }`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all duration-300 ${
                    isDone   ? "bg-emerald-500 text-white shadow-sm" :
                    isActive ? "bg-sky-600 text-white shadow-sm shadow-sky-200" :
                               "bg-slate-100 text-slate-400"
                  }`}>
                    {isDone ? "✓" : step.icon}
                  </div>
                  <p className={`flex-1 text-sm font-semibold transition-colors duration-300 ${
                    isDone ? "text-emerald-700" : isActive ? "text-sky-700" : "text-slate-400"
                  }`}>
                    {step.title}
                  </p>
                  {isActive && (
                    <div className="flex gap-1 shrink-0">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-bounce"
                          style={{ animationDelay: `${d * 0.18}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
