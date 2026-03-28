import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { Alert, Badge, Button, Card, CardBody, CardHeader } from "../components/UI.jsx";
import { fmtRange } from "../utils/helpers.js";

const BLOCKS = ["morning", "afternoon", "evening"];
const BLOCK_ICON = { morning: "☀️", afternoon: "🌤️", evening: "🌙" };
const DAY_GRADIENTS = [
  "from-slate-900 via-slate-800 to-indigo-950",
  "from-sky-900 via-blue-900 to-indigo-950",
  "from-indigo-900 via-violet-900 to-purple-950",
  "from-emerald-900 via-teal-900 to-cyan-950",
  "from-rose-900 via-red-900 to-orange-950",
  "from-amber-900 via-orange-900 to-rose-950",
  "from-violet-900 via-purple-900 to-indigo-950",
];

/* ── helpers ── */
function formatHours(v) {
  if (!Number.isFinite(v) || v <= 0) return "—";
  return Number.isInteger(v) ? `${v}h` : `${v.toFixed(1)}h`;
}
function countActs(day) {
  return BLOCKS.reduce((n, b) => n + (Array.isArray(day?.[b]) ? day[b].length : 0), 0);
}
function getDayHours(day) {
  return BLOCKS.flatMap((b) => day?.[b] ?? []).reduce((s, a) => {
    const n = Number(a?.durationHours);
    return Number.isFinite(n) && n > 0 ? s + n : s;
  }, 0);
}
function getDayGradient(n) {
  return DAY_GRADIENTS[(Number(n) - 1) % DAY_GRADIENTS.length];
}
function buildMapsUrl(place) {
  const q = place?.address?.trim() || place?.location?.trim() || place?.title || "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
function formatCost(usd) {
  if (usd === 0) return "Free";
  if (!usd || !Number.isFinite(usd)) return null;
  return `~$${usd}`;
}

/* ── Weather hook ── */
function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}
function dateAddDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function useWeather(lat, lng, startDate, endDate) {
  const [weather, setWeather] = useState({});
  useEffect(() => {
    if (!lat || !lng || !startDate || !endDate) return;
    const today = new Date().toISOString().split("T")[0];
    const isPast = endDate < today;
    if (!isPast && startDate > dateAddDays(today, 16)) return;
    const base = isPast
      ? "https://archive-api.open-meteo.com/v1/archive"
      : "https://api.open-meteo.com/v1/forecast";
    const params = new URLSearchParams({
      latitude: lat, longitude: lng,
      daily: "temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max",
      start_date: startDate, end_date: endDate, timezone: "auto",
    });
    fetch(`${base}?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const map = {};
        d.daily?.time?.forEach((date, i) => {
          map[date] = {
            code: d.daily.weathercode?.[i] ?? null,
            maxC: d.daily.temperature_2m_max?.[i] != null ? Math.round(d.daily.temperature_2m_max[i]) : null,
            minC: d.daily.temperature_2m_min?.[i] != null ? Math.round(d.daily.temperature_2m_min[i]) : null,
          };
        });
        setWeather(map);
      })
      .catch(() => {});
  }, [lat, lng, startDate, endDate]);
  return weather;
}

/* ── ICS export ── */
const ICS_BLOCK_HOUR = { morning: 9, afternoon: 13, evening: 19 };
function escICS(s) {
  return (s || "").replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}
function fmtICSDateTime(dateStr, hour, durH = 1) {
  const d = new Date(`${dateStr}T00:00:00`);
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  const fmtTime = (h) => `${pad(h)}${pad((h % 1) * 60)}00`;
  const prefix = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return { start: `${prefix}T${fmtTime(hour)}`, end: `${prefix}T${fmtTime(Math.min(hour + durH, 23.99))}` };
}
function generateICS(trip) {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AI Travel Planner//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${escICS(trip.destination)} Trip`,
  ];
  let uid = 0;
  (trip?.itinerary?.days || []).forEach((day) => {
    const offsets = { morning: 0, afternoon: 0, evening: 0 };
    BLOCKS.forEach((block) => {
      (day[block] || []).forEach((act) => {
        const dur = Number(act.durationHours) || 1;
        const { start, end } = fmtICSDateTime(day.date, ICS_BLOCK_HOUR[block] + offsets[block], dur);
        offsets[block] += dur;
        lines.push(
          "BEGIN:VEVENT",
          `UID:shared-${trip._id || uid}-${day.day}-${block}-${uid++}@travelplanner`,
          `DTSTART:${start}`, `DTEND:${end}`,
          `SUMMARY:${escICS(act.title)}`,
          `LOCATION:${escICS(act.address || act.location)}`,
          "END:VEVENT"
        );
      });
    });
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
function downloadICS(trip) {
  const blob = new Blob([generateICS(trip)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trip-${(trip.destination || "trip").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ── Main ── */
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
  const tripMode = trip?.tripMode === "multi" ? "multi" : "single";

  const totalActivities = useMemo(() =>
    (trip?.itinerary?.days || []).reduce((s, d) => s + countActs(d), 0), [trip]);
  const totalHours = useMemo(() =>
    (trip?.itinerary?.days || []).reduce((s, d) => s + getDayHours(d), 0), [trip]);
  const totalEstimatedCost = useMemo(() => {
    let sum = 0; let hasCost = false;
    (trip?.itinerary?.days || []).forEach((day) =>
      BLOCKS.forEach((block) =>
        (day[block] || []).forEach((act) => {
          if (typeof act?.estimatedCostUSD === "number") { sum += act.estimatedCostUSD; hasCost = true; }
        })
      )
    );
    return hasCost ? sum : null;
  }, [trip]);

  const weather = useWeather(
    trip?.placeMeta?.lat, trip?.placeMeta?.lng,
    trip?.startDate, trip?.endDate
  );

  const recommendedPlaces = useMemo(() =>
    Array.isArray(trip?.itinerary?.recommendedPlaces) ? trip.itinerary.recommendedPlaces : [], [trip]);

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

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Read-only banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span>👁 Shared read-only itinerary — <a href="/create" className="font-bold underline hover:text-amber-900">plan your own free trip</a></span>
        <Badge className="border-amber-300 bg-amber-100 text-amber-800">Shared Trip</Badge>
      </div>

      <div className="space-y-8 rounded-4xl bg-linear-to-b from-slate-50 via-white to-sky-50/40 p-1">

        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-[0_24px_80px_-28px_rgba(37,99,235,0.55)]">
          <div className="relative text-white">
            <div className="absolute inset-0 bg-linear-to-br from-sky-700 via-blue-700 to-indigo-900" />
            <div className="relative z-10 flex flex-col gap-6 px-6 py-7 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white/85">
                  {tripMode === "multi" ? "Multi-City Itinerary" : "AI Travel Plan"}
                </div>
                <div className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{trip.destination}</div>
                <div className="mt-2 text-sm text-white/85">{fmtRange(trip.startDate, trip.endDate)}</div>
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
                {!!trip?.events?.length && <Badge className="border-white/20 bg-white/10 text-white">{trip.events.length} events</Badge>}
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3 px-6 pb-6 sm:px-8">
              <Button
                type="button"
                className="bg-white/15 text-white backdrop-blur hover:bg-white/20"
                onClick={() => downloadICS(trip)}
              >
                📅 Save to Calendar
              </Button>
              <Button
                type="button"
                onClick={() => nav("/create")}
                className="text-sky-800 shadow-lg hover:bg-sky-50"
              >
                ✨ Plan My Own Trip
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: "🧭", label: "Activities", value: totalActivities },
            { icon: "⏱️", label: "Estimated Hours", value: formatHours(totalHours) },
            { icon: "📅", label: "Days", value: summary.days || 0 },
            { icon: "💰", label: "Est. Budget", value: totalEstimatedCost != null ? `~$${totalEstimatedCost}` : "—" },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-xl">{icon}</div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
                  <div className="mt-0.5 text-lg font-black text-slate-900">{value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Events */}
        {!!trip?.events?.length && <SharedEventsSection events={trip.events} />}

        {/* Day cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {(trip?.itinerary?.days || []).map((day) => (
            <SharedDayCard
              key={day.day}
              day={day}
              isOpen={Boolean(openDays[day.day])}
              onToggle={() => setOpenDays((p) => ({ ...p, [day.day]: !p[day.day] }))}
              weatherDay={weather[day.date] ?? null}
            />
          ))}
        </div>

        {/* Tips */}
        {!!trip?.itinerary?.tips?.length && (
          <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
            <CardHeader title="Travel Tips" subtitle="Helpful advice for this trip" />
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

        {/* Recommended places */}
        {recommendedPlaces.length > 0 && (
          <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
            <CardHeader
              title="Recommended Places"
              subtitle="Extra spots worth exploring"
              right={<Badge className="bg-sky-50 text-sky-700">{recommendedPlaces.length} places</Badge>}
            />
            <CardBody>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {recommendedPlaces.map((place, i) => (
                  <div key={i} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
                    <div className="space-y-3 p-5">
                      <div className="text-base font-extrabold tracking-tight text-slate-900">{place.name}</div>
                      {(place.location || place.address) && (
                        <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                          📍 {place.location || place.address}
                        </div>
                      )}
                      {place.category && (
                        <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">{place.category}</span>
                      )}
                      {place.reason && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">{place.reason}</div>
                      )}
                      <a href={buildMapsUrl(place)} target="_blank" rel="noreferrer" className="block text-xs font-bold text-sky-700 hover:text-sky-800">Open in Maps →</a>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* CTA */}
        <Card className="overflow-hidden border border-sky-200 bg-linear-to-br from-sky-50 to-indigo-50 shadow-sm">
          <CardBody className="py-10 text-center">
            <div className="text-2xl font-black text-slate-900">Like this trip? Plan your own ✨</div>
            <div className="mx-auto mt-2 max-w-md text-sm text-slate-600">Get a personalized AI itinerary in seconds — with weather, budget estimates, packing list and more.</div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => nav("/create")} className="px-8">Create My Trip</Button>
              <Button onClick={() => nav("/register")} variant="secondary">Sign Up Free</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* ── Day card ── */
function SharedDayCard({ day, isOpen, onToggle, weatherDay }) {
  const acts = countActs(day);
  const hours = getDayHours(day);
  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <button
        type="button"
        className={`relative w-full overflow-hidden bg-linear-to-br ${getDayGradient(day.day)} p-5 text-left text-white`}
        onClick={onToggle}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_20%)]" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">Day {day.day}</div>
            <div className="mt-2 text-xl font-black tracking-tight">{day.title || `Day ${day.day}`}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span>{day.date}</span>
              {weatherDay?.code != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
                  {getWeatherIcon(weatherDay.code)}
                  {weatherDay.maxC != null && `${weatherDay.maxC}°`}
                  {weatherDay.minC != null && ` / ${weatherDay.minC}°`}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <Badge className="border-white/20 bg-white/10 text-white">{acts} activities</Badge>
            {hours > 0 && <Badge className="border-white/20 bg-white/10 text-white">{formatHours(hours)}</Badge>}
            <span className="ml-1 text-lg text-white/60">{isOpen ? "▲" : "▼"}</span>
          </div>
        </div>
      </button>

      {isOpen && (
        <CardBody className="space-y-4">
          {BLOCKS.map((block) => {
            const items = day?.[block];
            if (!Array.isArray(items) || !items.length) return null;
            return (
              <div key={block} className="mt-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  <span className="text-base">{BLOCK_ICON[block]}</span>
                  {block}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold">{items.length}</span>
                </div>
                <ul className="mt-2 space-y-2">
                  {items.map((x, i) => {
                    const cost = formatCost(x?.estimatedCostUSD);
                    return (
                      <li key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="font-bold text-slate-900">{x.title}</div>
                        {x.location && (
                          <div className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">📍 {x.location}</div>
                        )}
                        {x.notes && <div className="mt-2 text-xs leading-5 text-slate-600">{x.notes}</div>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {x.durationHours ? <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">{formatHours(Number(x.durationHours))}</span> : null}
                          {cost ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">{cost}</span> : null}
                          {x.category ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">{x.category}</span> : null}
                        </div>
                        {(x.location || x.address) && (
                          <a href={buildMapsUrl(x)} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-bold text-sky-700 hover:text-sky-800">Open in Maps →</a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {day.foodSuggestion && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">🍽️ {day.foodSuggestion}</div>
          )}
          {day.backupPlan && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">🛟 {day.backupPlan}</div>
          )}
        </CardBody>
      )}
    </Card>
  );
}

/* ── Events ── */
function SharedEventsSection({ events }) {
  if (!events?.length) return null;
  const grouped = events.reduce((acc, e) => {
    const key = e?.date || "Unknown Date";
    (acc[key] = acc[key] || []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();
  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title="Local Events"
        subtitle="Events happening during this trip"
        right={<Badge className="bg-sky-50 text-sky-700">{events.length} events</Badge>}
      />
      <CardBody className="space-y-5">
        {dates.map((date) => (
          <div key={date}>
            <div className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">{date}</div>
            <div className="space-y-2">
              {grouped[date].map((ev, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-bold text-slate-900">{ev.name}</div>
                    {ev.category && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">{ev.category}</span>}
                  </div>
                  {ev.location && <div className="mt-1 text-xs text-slate-500">📍 {ev.location}</div>}
                  {ev.description && <div className="mt-2 text-xs leading-5 text-slate-600">{ev.description}</div>}
                  {ev.link && <a href={ev.link} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-bold text-sky-700">More info →</a>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
