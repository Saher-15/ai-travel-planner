import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { Alert, Badge, Button, Card, CardBody, CardHeader } from "../components/UI.jsx";

const BLOCKS = ["morning", "afternoon", "evening"];
const BLOCK_ORDER = { morning: 1, afternoon: 2, evening: 3 };

function fmtRange(s, e) { return s && e ? `${s} → ${e}` : ""; }
function formatHours(value) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (Number.isInteger(value)) return `${value}h`;
  return `${value.toFixed(1)}h`;
}
function countDayActivities(day) {
  return BLOCKS.reduce((n, b) => n + (Array.isArray(day?.[b]) ? day[b].length : 0), 0);
}
function getDayHours(day) {
  return BLOCKS.flatMap((b) => day?.[b] ?? []).reduce((s, a) => {
    const n = Number(a?.durationHours);
    return Number.isFinite(n) && n > 0 ? s + n : s;
  }, 0);
}
function buildGoogleMapsUrl(place) {
  const q = place?.address?.trim() || place?.location?.trim() || place?.title || "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function SharedTrip() {
  const { token } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDays, setOpenDays] = useState({ 1: true });

  useEffect(() => {
    window.scrollTo(0, 0);
    (async () => {
      try {
        const { data } = await api.get(`/trips/shared/${token}`);
        setTrip(data);
        if (data?.destination) document.title = `${data.destination} – Shared Trip`;
      } catch (e) {
        setError(e?.response?.data?.message || "Trip not found or link has expired.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const summary = trip?.itinerary?.tripSummary || {};
  const destinations = useMemo(() => {
    if (Array.isArray(trip?.destinations) && trip.destinations.length) return trip.destinations.filter(Boolean);
    return trip?.destination ? [trip.destination] : [];
  }, [trip]);

  const totalActivities = useMemo(() =>
    (trip?.itinerary?.days || []).reduce((s, d) => s + countDayActivities(d), 0), [trip]);
  const totalHours = useMemo(() =>
    (trip?.itinerary?.days || []).reduce((s, d) => s + getDayHours(d), 0), [trip]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
    </div>
  );

  if (error) return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
      <Alert type="error">{error}</Alert>
      <Button onClick={() => nav("/")} variant="secondary">Go Home</Button>
    </div>
  );

  const tripMode = trip.tripMode === "multi" ? "multi" : "single";

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* View-only banner */}
      <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
        <span>👁 This is a shared read-only trip — <a href="/" className="underline hover:text-amber-900">plan your own</a></span>
        <Badge className="border-amber-300 bg-amber-100 text-amber-800">Shared Trip</Badge>
      </div>

      <div className="space-y-8 rounded-4xl bg-linear-to-b from-slate-50 via-white to-sky-50/40 p-1">

        {/* Header */}
        <Card className="relative overflow-hidden border-0 shadow-[0_24px_80px_-28px_rgba(37,99,235,0.55)]">
          <div className="relative text-white">
            <div className="absolute inset-0 bg-linear-to-br from-sky-700 via-blue-700 to-indigo-900" />
            <div className="relative z-10 flex flex-col gap-6 px-6 py-7 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white/85">
                  {tripMode === "multi" ? "Multi-City Itinerary" : "Smart Travel Plan"}
                </div>
                <div className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{trip.destination}</div>
                <div className="mt-2 text-sm text-white/85 sm:text-base">{fmtRange(trip.startDate, trip.endDate)}</div>
                {tripMode === "multi" && destinations.length > 1 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {destinations.map((city) => (
                      <span key={city} className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">{city}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {summary.days ? <Badge className="border-white/20 bg-white/10 text-white">{summary.days} days</Badge> : null}
                {summary.style ? <Badge className="border-white/20 bg-white/10 text-white">{summary.style}</Badge> : null}
                {summary.budget ? <Badge className="border-white/20 bg-white/10 text-white">{summary.budget} budget</Badge> : null}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: "📋", label: "Activities", value: totalActivities },
            { icon: "⏱", label: "Estimated Hours", value: formatHours(totalHours) },
            { icon: "📅", label: "Days", value: summary.days || 0 },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <div className="text-2xl">{icon}</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid gap-6 lg:grid-cols-2">
          {(trip?.itinerary?.days || []).map((day) => (
            <SharedDayCard
              key={day.day}
              day={day}
              isOpen={Boolean(openDays[day.day])}
              onToggle={() => setOpenDays((p) => ({ ...p, [day.day]: !p[day.day] }))}
            />
          ))}
        </div>

        {/* Tips */}
        {!!trip?.itinerary?.tips?.length && (
          <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
            <CardHeader title="Travel Tips" subtitle="Helpful tips for your trip" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                {trip.itinerary.tips.map((tip, i) => (
                  <div key={i} className="rounded-3xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-4 text-sm leading-6 text-slate-700 shadow-sm">
                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Tip {i + 1}</div>
                    {tip}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* CTA */}
        <Card className="overflow-hidden border border-sky-200 bg-linear-to-br from-sky-50 to-indigo-50 shadow-sm">
          <CardBody className="text-center py-8">
            <div className="text-2xl font-black text-slate-900">Plan your own AI trip</div>
            <div className="mt-2 text-sm text-slate-600">Get a personalized itinerary generated in seconds</div>
            <Button className="mt-5" onClick={() => nav("/create")}>Create My Trip</Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function SharedDayCard({ day, isOpen, onToggle }) {
  const acts = countDayActivities(day);
  const hours = getDayHours(day);
  return (
    <Card className="overflow-hidden border border-slate-200/80 shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
        onClick={onToggle}
      >
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">Day {day.day}</div>
          <div className="mt-1 text-base font-extrabold text-slate-900">{day.title || `Day ${day.day}`}</div>
          <div className="mt-1 text-xs text-slate-500">{day.date}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge className="border-slate-200 bg-white text-slate-700">{acts} activities</Badge>
          {hours > 0 && <Badge className="border-sky-200 bg-sky-50 text-sky-700">{formatHours(hours)}</Badge>}
          <span className="text-xl text-slate-400">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 pb-5">
          {BLOCKS.map((block) => {
            const items = day?.[block];
            if (!Array.isArray(items) || !items.length) return null;
            return (
              <div key={block} className="mt-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{block}</div>
                <ul className="space-y-2">
                  {items.map((x, i) => (
                    <li key={i} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
                      <div className="font-bold text-slate-900">{x.title}</div>
                      {x.location && <div className="mt-1 text-xs text-slate-500">📍 {x.location}</div>}
                      {x.notes && <div className="mt-1 text-xs leading-5 text-slate-600">{x.notes}</div>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {x.durationHours ? <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{formatHours(Number(x.durationHours))}</span> : null}
                        {x.category ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{x.category}</span> : null}
                      </div>
                      {(x.location || x.address) && (
                        <a href={buildGoogleMapsUrl(x)} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-bold text-sky-700 hover:text-sky-800">Open in Maps →</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {day.foodSuggestion && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              🍽 {day.foodSuggestion}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
