import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
} from "../components/UI.jsx";
import { clamp, fmtRange } from "../utils/helpers.js";

const BLOCKS = ["morning", "afternoon", "evening"];
const BLOCK_ORDER = { morning: 1, afternoon: 2, evening: 3 };
const EMPTY_SET = new Set();


function normalizeTripMode(mode) {
  return mode === "multi" ? "multi" : "single";
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getTripDestinations(trip) {
  if (Array.isArray(trip?.destinations) && trip.destinations.length) {
    return trip.destinations.filter(Boolean);
  }

  return trip?.destination ? [trip.destination] : [];
}

function getRecommendedPlaces(trip) {
  if (Array.isArray(trip?.recommendedPlaces)) return trip.recommendedPlaces;
  if (Array.isArray(trip?.itinerary?.recommendedPlaces)) {
    return trip.itinerary.recommendedPlaces;
  }
  if (Array.isArray(trip?.recommendations)) return trip.recommendations;
  return [];
}

function extractUniqueLocations(itinerary, placeFallback = "Place") {
  const rows =
    itinerary?.days?.flatMap((d) =>
      BLOCKS.flatMap((block) =>
        (d?.[block] ?? [])
          .map((a) => ({
            day: d.day,
            date: d.date,
            title: a?.title || placeFallback,
            timeBlock: block,
            location: (a?.location || "").trim(),
            address: (a?.address || "").trim(),
            notes: a?.notes || "",
            durationHours: a?.durationHours ?? null,
            type: a?.type || "",
            category: a?.category || "",
          }))
          .filter((x) => x.location || x.address || x.title)
      )
    ) ?? [];

  const unique = Array.from(
    new Map(
      rows.map((x) => [normalizeText(x.address || x.location || x.title), x])
    ).values()
  );

  return unique.sort(
    (a, b) =>
      (a.day ?? 0) - (b.day ?? 0) ||
      (BLOCK_ORDER[a.timeBlock] ?? 99) - (BLOCK_ORDER[b.timeBlock] ?? 99)
  );
}

function countDayActivities(day) {
  return (
    (Array.isArray(day?.morning) ? day.morning.length : 0) +
    (Array.isArray(day?.afternoon) ? day.afternoon.length : 0) +
    (Array.isArray(day?.evening) ? day.evening.length : 0)
  );
}

function getDayEstimatedHours(day) {
  const activities = [
    ...(Array.isArray(day?.morning) ? day.morning : []),
    ...(Array.isArray(day?.afternoon) ? day.afternoon : []),
    ...(Array.isArray(day?.evening) ? day.evening : []),
  ];

  return activities.reduce((sum, activity) => {
    const n = Number(activity?.durationHours);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

function formatHours(value) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (Number.isInteger(value)) return `${value}h`;
  return `${value.toFixed(1)}h`;
}

function formatCost(usd) {
  if (usd === 0) return "Free";
  if (!usd || !Number.isFinite(usd)) return null;
  return `~$${usd}`;
}

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
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Travel Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
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
        const desc = [act.notes, act.category ? `Category: ${act.category}` : ""].filter(Boolean).join("\\n");
        lines.push(
          "BEGIN:VEVENT",
          `UID:trip-${trip._id || uid}-${day.day}-${block}-${uid++}@travelplanner`,
          `DTSTART:${start}`,
          `DTEND:${end}`,
          `SUMMARY:${escICS(act.title)}`,
          desc ? `DESCRIPTION:${desc}` : "",
          `LOCATION:${escICS(act.address || act.location)}`,
          "END:VEVENT"
        );
      });
    });
    if (day.foodSuggestion) {
      const { start, end } = fmtICSDateTime(day.date, 20, 1.5);
      lines.push(
        "BEGIN:VEVENT",
        `UID:food-${trip._id || uid}-${day.day}@travelplanner`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:🍽️ ${escICS(day.foodSuggestion.slice(0, 80))}`,
        "CATEGORIES:FOOD",
        "END:VEVENT"
      );
    }
  });
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

function downloadICS(trip) {
  const blob = new Blob([generateICS(trip)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trip-${(trip.destination || "planner").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function dateAddDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

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

function useWeather(lat, lng, startDate, endDate) {
  const [weather, setWeather] = useState({});

  useEffect(() => {
    if (!lat || !lng || !startDate || !endDate) return;
    const today = new Date().toISOString().split("T")[0];
    const isPast = endDate < today;
    const isTooFarAhead = !isPast && startDate > dateAddDays(today, 16);
    if (isTooFarAhead) return;

    const base = isPast
      ? "https://archive-api.open-meteo.com/v1/archive"
      : "https://api.open-meteo.com/v1/forecast";
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      daily: "temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max",
      start_date: startDate,
      end_date: endDate,
      timezone: "auto",
    });

    const cacheKey = `w_${lat}_${lng}_${startDate}_${endDate}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setWeather(JSON.parse(cached)); return; }
    } catch { /* noop */ }

    fetch(`${base}?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const map = {};
        d.daily?.time?.forEach((date, i) => {
          map[date] = {
            code: d.daily.weathercode?.[i] ?? null,
            maxC: d.daily.temperature_2m_max?.[i] != null ? Math.round(d.daily.temperature_2m_max[i]) : null,
            minC: d.daily.temperature_2m_min?.[i] != null ? Math.round(d.daily.temperature_2m_min[i]) : null,
            precip: d.daily.precipitation_probability_max?.[i] ?? null,
          };
        });
        setWeather(map);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(map)); } catch { /* noop */ }
      })
      .catch(() => {});
  }, [lat, lng, startDate, endDate]);

  return weather;
}

function useDoneActivities(tripId) {
  const storageKey = `trip_done_${tripId}`;
  const [done, setDone] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    } catch {
      return new Set();
    }
  });

  const toggle = useCallback((key) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }, [storageKey]);

  return [done, toggle];
}

function useAsync(fn, deps) {
  const { t } = useTranslation();
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));

    (async () => {
      try {
        const data = await fn();
        if (alive) setState({ data, loading: false, error: "" });
      } catch (e) {
        if (alive) {
          setState({
            data: null,
            loading: false,
            error:
              e?.response?.data?.message ||
              e?.response?.data?.details?.message ||
              e?.message ||
              t("viewTrip.somethingWentWrong"),
          });
        }
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}


function buildGoogleMapsUrl(place) {
  const query =
    place?.address?.trim() ||
    place?.location?.trim() ||
    [place?.title || place?.name || place?.placeName, place?.destination]
      .filter(Boolean)
      .join(", ")
      .trim();

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function GoogleMapsButton({ place, className = "" }) {
  const { t } = useTranslation();
  const url = buildGoogleMapsUrl(place);

  return (
    <a href={url} target="_blank" rel="noreferrer" className={className}>
      {t("viewTrip.openInGoogleMaps")}
    </a>
  );
}

const PANEL_PATHS = {
  itinerary: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  overview:  "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  map:       "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  events:    "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
  places:    "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  tips:      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  budget:    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  expenses:  "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  packing:   "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  hotels:    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  chat:      "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  notes:     "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
};

function PanelIcon({ id, className = "h-5 w-5" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={PANEL_PATHS[id] ?? PANEL_PATHS.itinerary} />
    </svg>
  );
}

export default function ViewTrip() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const nav = useNavigate();
  const { id } = useParams();

  const tripState = useAsync(async () => (await api.get(`/trips/${id}`)).data, [id]);
  const trip = tripState.data;

  useEffect(() => {
    if (trip?.destination) {
      document.title = `${trip.destination} – Travel Planner`;
    }
  }, [trip?.destination]);
  const summary = trip?.itinerary?.tripSummary || {};
  const tripMode = normalizeTripMode(trip?.tripMode);
  const destinations = getTripDestinations(trip);


  const rawRecommendedPlaces = useMemo(() => getRecommendedPlaces(trip), [trip]);

  const pdfRef = useRef(null);
  const [activePanel, setActivePanel] = useState("itinerary");
  const [openDays, setOpenDays] = useState({});
  const [downloadError, setDownloadError] = useState("");
  const [shareToken, setShareToken] = useState(null);
  const [tripStatus, setTripStatus] = useState("planning");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    if (trip) {
      setShareToken(trip.shareToken || null);
      setTripStatus(trip.status || "planning");
    }
  }, [trip]);

  const handleShare = useCallback(async () => {
    setShareBusy(true);
    try {
      const { data } = await api.post(`/trips/${id}/share`);
      setShareToken(data.shareToken);
      setShareOpen(true);
    } catch { /* silent */ }
    finally { setShareBusy(false); }
  }, [id]);

  const handleUnshare = useCallback(async () => {
    try {
      await api.delete(`/trips/${id}/share`);
      setShareToken(null);
      setShareOpen(false);
    } catch { /* silent */ }
  }, [id]);

  const handleCopy = useCallback(() => {
    const url = `${window.location.origin}/shared/${shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareToken]);

  const handleStatusChange = useCallback(async (newStatus) => {
    setStatusBusy(true);
    try {
      await api.patch(`/trips/${id}/status`, { status: newStatus });
      setTripStatus(newStatus);
    } catch { /* silent */ }
    finally { setStatusBusy(false); }
  }, [id]);

  const locations = useMemo(
    () => extractUniqueLocations(trip?.itinerary, t("viewTrip.place")),
    [trip, t]
  );

  const recommendedPlaces = useMemo(
    () =>
      rawRecommendedPlaces.map((place) => ({
        ...place,
        title: place?.title || place?.name || t("viewTrip.recommendedPlace"),
        notes: place?.notes || place?.reason || "",
      })),
    [rawRecommendedPlaces, t]
  );

  const totalActivities = useMemo(() => {
    return (trip?.itinerary?.days || []).reduce(
      (sum, day) => sum + countDayActivities(day),
      0
    );
  }, [trip]);

  const totalHours = useMemo(() => {
    return (trip?.itinerary?.days || []).reduce(
      (sum, day) => sum + getDayEstimatedHours(day),
      0
    );
  }, [trip]);

  const placeCount = useMemo(() => locations.length || 0, [locations]);

  // Weather forecast (Open-Meteo, free, no API key)
  const weather = useWeather(
    trip?.placeMeta?.lat,
    trip?.placeMeta?.lng,
    trip?.startDate,
    trip?.endDate
  );

  // Activity completion tracking (localStorage)
  const [doneActivities, toggleDone] = useDoneActivities(id);
  const completedCount = doneActivities.size;

  // Total estimated cost across all activities
  const totalEstimatedCost = useMemo(() => {
    let sum = 0;
    let hasCost = false;
    (trip?.itinerary?.days || []).forEach((day) => {
      BLOCKS.forEach((block) => {
        (day[block] || []).forEach((act) => {
          if (typeof act?.estimatedCostUSD === "number" && Number.isFinite(act.estimatedCostUSD)) {
            sum += act.estimatedCostUSD;
            hasCost = true;
          }
        });
      });
    });
    if (hasCost) return sum;
    // Fallback: rough estimate from budget level × days
    const days = trip?.itinerary?.tripSummary?.days || trip?.itinerary?.days?.length || 0;
    const budget = trip?.preferences?.budget || trip?.itinerary?.tripSummary?.budget || "";
    const ratePerDay = budget === "low" ? 45 : budget === "high" ? 250 : 100;
    return days > 0 ? days * ratePerDay : null;
  }, [trip]);

  // Per-day done sets — DayCards only re-render when their own activities change
  const perDayDone = useMemo(() => {
    const map = new Map();
    doneActivities.forEach((key) => {
      const idx = parseInt(key.split("_")[0], 10);
      if (!Number.isFinite(idx)) return;
      if (!map.has(idx)) map.set(idx, new Set());
      map.get(idx).add(key);
    });
    return map;
  }, [doneActivities]);

  const toggleDay = (dayNumber) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayNumber]: !prev[dayNumber],
    }));
  };

  const exportCalendar = useCallback(() => {
    if (trip) downloadICS(trip);
  }, [trip]);

  const downloadPDF = async () => {
    setDownloadError("");

    try {
      const res = await api.get(`/trips/${id}/pdf`, { responseType: "blob" });

      const contentType = res?.headers?.["content-type"] || "";
      if (!contentType.includes("pdf")) {
        throw new Error(t("viewTrip.failedDownloadPDF"));
      }

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const safeName = (trip?.destination || "planner")
        .toString()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      const a = document.createElement("a");
      a.href = url;
      a.download = `trip-${safeName || "planner"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download PDF error:", err);
      setDownloadError(
        err?.response?.data?.message || err?.message || t("viewTrip.failedDownloadPDF")
      );
    }
  };

  if (tripState.loading) return <TripSkeleton />;

  if (tripState.error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Alert type="error">{tripState.error}</Alert>
        <div className="flex gap-2">
          <Button onClick={() => nav("/trips")} variant="secondary">
            {t("viewTrip.back")}
          </Button>
          <Button onClick={() => nav("/create")} variant="ghost">
            {t("viewTrip.createNew")}
          </Button>
        </div>
      </div>
    );
  }

  const PANELS = [
    { id: "itinerary", label: t("viewTrip.itinerary"),         subtitle: `${trip?.itinerary?.days?.length ?? 0} days planned`,        badge: trip?.itinerary?.days?.length ?? 0 },
    { id: "overview",  label: t("viewTrip.overview"),          subtitle: "Trip details & progress" },
    { id: "map",       label: t("viewTrip.cityPlan"),          subtitle: "Multi-city breakdown",                                       hidden: tripMode !== "multi" },
    { id: "events",    label: t("viewTrip.events"),            subtitle: `${trip?.events?.length || 0} local events`,                  badge: trip?.events?.length || 0,          hidden: !trip?.events?.length },
    { id: "places",    label: t("viewTrip.recommendedPlaces"), subtitle: `${recommendedPlaces.length} recommended spots`,              badge: recommendedPlaces.length,           hidden: !recommendedPlaces.length },
    { id: "tips",      label: t("viewTrip.tripTips"),          subtitle: `${trip?.itinerary?.tips?.length || 0} travel tips`,          badge: trip?.itinerary?.tips?.length || 0, hidden: !trip?.itinerary?.tips?.length },
    { id: "budget",    label: t("viewTrip.budgetSummary"),     subtitle: "Estimated costs by category" },
    { id: "expenses",  label: t("viewTrip.expenseTracker"),    subtitle: "Track your spending" },
    { id: "packing",   label: t("viewTrip.packingList.title"),  subtitle: "Packing checklist" },
    { id: "hotels",    label: "Hotels",                        subtitle: "Find accommodation" },
    { id: "chat",      label: "AI Assistant",                  subtitle: "Ask about your trip" },
    { id: "notes",     label: "Personal Notes",                subtitle: "Your private notes" },
  ].filter((p) => !p.hidden);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {downloadError ? <Alert type="error" className="mb-4">{downloadError}</Alert> : null}

      {/* ── Trip header ── */}
      <Header
        trip={trip}
        summary={summary}
        tripMode={tripMode}
        destinations={destinations}
        onBack={() => nav("/trips")}
        onNew={() => nav("/create")}
        onEdit={() => nav(`/trip/${id}/edit`)}
        onDownload={downloadPDF}
        onExportCalendar={exportCalendar}
        shareToken={shareToken}
        shareOpen={shareOpen}
        setShareOpen={setShareOpen}
        shareBusy={shareBusy}
        copied={copied}
        onShare={handleShare}
        onUnshare={handleUnshare}
        onCopy={handleCopy}
        tripStatus={tripStatus}
        statusBusy={statusBusy}
        onStatusChange={handleStatusChange}
      />

      {/* ── Feature grid navigation ── */}
      <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
        {PANELS.map((p) => {
          const active = activePanel === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePanel(p.id)}
              className={[
                "group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all duration-150 sm:gap-2 sm:rounded-2xl sm:p-3",
                active
                  ? "border-blue-500 bg-blue-600 shadow-md shadow-blue-200"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50",
              ].join(" ")}
            >
              {/* Badge */}
              {p.badge > 0 && (
                <span className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none sm:h-5 sm:min-w-5 sm:text-[10px] ${
                  active ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                }`}>
                  {p.badge}
                </span>
              )}

              {/* Icon */}
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 sm:h-9 sm:w-9 sm:rounded-xl ${
                active ? "bg-white/20" : "bg-slate-100 group-hover:bg-blue-100"
              }`}>
                <PanelIcon id={p.id} className={`h-4 w-4 sm:h-5 sm:w-5 ${active ? "text-white" : "text-slate-500 group-hover:text-blue-600"}`} />
              </div>

              {/* Label */}
              <span className={`w-full truncate text-[10px] font-semibold leading-tight sm:text-xs ${
                active ? "text-white" : "text-slate-600 group-hover:text-blue-700"
              }`}>
                {p.label}
              </span>

              {/* Subtitle — only on md+ */}
              <span className={`hidden w-full truncate text-[9px] leading-none md:block ${
                active ? "text-blue-100" : "text-slate-400"
              }`}>
                {p.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Panel content ── */}
      <div className="mt-5" ref={pdfRef}>
        <div className="min-w-0">
          {activePanel === "itinerary" && (
            <div className="grid gap-4 sm:gap-6">
              {trip?.itinerary?.days?.map((d, idx) => (
                <DayCard
                  key={d.day}
                  day={d}
                  tripId={id}
                  dayIndex={idx}
                  isOpen={Boolean(openDays[d.day])}
                  onToggle={() => toggleDay(d.day)}
                  weatherDay={weather[d.date] ?? null}
                  dayDone={perDayDone.get(idx) ?? EMPTY_SET}
                  onToggleDone={toggleDone}
                />
              ))}
            </div>
          )}

          {activePanel === "overview" && (
            <TripOverview
              trip={trip}
              summary={summary}
              tripMode={tripMode}
              destinations={destinations}
              totalActivities={totalActivities}
              totalHours={totalHours}
              placeCount={placeCount}
              completedCount={completedCount}
              totalEstimatedCost={totalEstimatedCost}
            />
          )}

          {activePanel === "map" && (
            <CityPlanSection
              summary={summary}
              tripMode={tripMode}
              destinations={destinations}
            />
          )}

          {activePanel === "events" && (
            <EventsSection events={trip?.events || []} />
          )}

          {activePanel === "places" && (
            <RecommendedPlacesSection places={recommendedPlaces} />
          )}

          {activePanel === "tips" && (
            <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-sm">
              <CardBody>
                <div className="grid gap-4 sm:grid-cols-2">
                  {trip.itinerary.tips.map((tip, i) => (
                    <div
                      key={i}
                      className="rounded-3xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-4 text-sm leading-6 text-slate-700 shadow-sm"
                    >
                      <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
                        {t("viewTrip.tip", { index: i + 1 })}
                      </div>
                      {tip}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {activePanel === "budget" && (
            <BudgetSummaryPanel days={trip?.itinerary?.days || []} budget={trip?.preferences?.budget} />
          )}

          {activePanel === "expenses" && (
            <ExpenseTrackerSection tripId={id} aiEstimate={totalEstimatedCost} />
          )}

          {activePanel === "packing" && (
            <PackingListSection tripId={id} />
          )}

          {activePanel === "hotels" && (
            <HotelsSection trip={trip} />
          )}

          {activePanel === "chat" && (
            <TripChatSection trip={trip} tripId={id} />
          )}

          {activePanel === "notes" && (
            <PersonalNotesSection tripId={id} initialNotes={trip?.personalNotes || ""} />
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  planning: "border-amber-300 bg-amber-100 text-amber-800",
  upcoming: "border-sky-300 bg-sky-100 text-sky-800",
  completed: "border-emerald-300 bg-emerald-100 text-emerald-800",
};
const STATUS_LABELS = { planning: "📋 Planning", upcoming: "✈️ Upcoming", completed: "✅ Completed" };

function Header({
  trip,
  summary,
  tripMode,
  destinations,
  onBack,
  onNew,
  onEdit,
  onDownload,
  onExportCalendar,
  shareToken,
  shareOpen,
  setShareOpen,
  shareBusy,
  copied,
  onShare,
  onUnshare,
  onCopy,
  tripStatus,
  statusBusy,
  onStatusChange,
}) {
  const { t } = useTranslation();
  const shareUrl = shareToken ? `${window.location.origin}/shared/${shareToken}` : "";

  const hasCover = Boolean(trip?.coverPhoto);

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[0_20px_60px_-16px_rgba(15,23,42,0.35)]">
      {/* Background — cover photo or gradient fallback */}
      {hasCover && (
        <img
          src={trip.coverPhoto}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className={`absolute inset-0 ${
        hasCover
          ? "bg-linear-to-b from-black/30 via-black/55 to-black/85"
          : "bg-linear-to-br from-slate-900 via-slate-800 to-blue-950"
      }`} />

      {/* ── Main content ── */}
      <div className="relative z-10 px-5 pb-5 pt-6 sm:px-7 sm:pt-7">

        {/* Top row: badge + status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/80 backdrop-blur-sm">
            {tripMode === "multi" ? t("viewTrip.multiCityItinerary") : t("viewTrip.smartTravelPlan")}
          </span>

          {/* Status pills */}
          <div className="flex items-center gap-1.5">
            {["planning", "upcoming", "completed"].map((s) => (
              <button
                key={s}
                type="button"
                disabled={statusBusy}
                onClick={() => onStatusChange(s)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold border transition-all ${
                  tripStatus === s
                    ? STATUS_STYLES[s]
                    : "border-white/15 bg-white/8 text-white/55 hover:bg-white/15 hover:text-white/80"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Destination + date */}
        <div className="mt-4">
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
            {trip?.destination || t("viewTrip.trip")}
          </h1>
          <p className="mt-1.5 text-sm text-white/70 sm:text-base">
            {fmtRange(trip?.startDate, trip?.endDate)}
          </p>
        </div>

        {/* Multi-city chips */}
        {tripMode === "multi" && destinations.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {destinations.map((city) => (
              <span key={city} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {city}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {summary.days ? (
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur-sm">
              {t("viewTrip.days", { count: summary.days })}
            </span>
          ) : null}
          {tripMode === "multi" ? (
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur-sm">
              {t("viewTrip.cities", { count: destinations.length })}
            </span>
          ) : null}
          {summary.style ? (
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur-sm">
              {t("viewTrip.pace", { pace: summary.style })}
            </span>
          ) : null}
          {summary.budget && summary.budget.toLowerCase() !== "null" ? (
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur-sm">
              {t("viewTrip.budget", { budget: summary.budget })}
            </span>
          ) : null}
          {!!trip?.events?.length ? (
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur-sm">
              {t("viewTrip.events", { count: trip.events.length })}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="relative z-10 border-t border-white/10 px-5 py-3 sm:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
            ← {t("viewTrip.back")}
          </button>
          <button type="button" onClick={onEdit}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
            ✏ {t("viewTrip.editTrip")}
          </button>
          <button type="button" onClick={onNew}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
            + {t("viewTrip.createNew")}
          </button>
          <button type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDownload?.(); }}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
            ↓ {t("viewTrip.downloadPDF")}
          </button>
          <button type="button" onClick={onExportCalendar}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
            📅 Calendar
          </button>
          <button type="button" disabled={shareBusy}
            onClick={shareToken ? () => setShareOpen((o) => !o) : onShare}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold backdrop-blur-sm transition ${
              shareToken
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                : "border-white/20 bg-white/10 text-white hover:bg-white/20"
            }`}>
            🔗 {shareBusy ? "..." : shareToken ? "Shared" : "Share"}
          </button>
        </div>
      </div>

      {/* Share panel */}
      {shareOpen && shareToken && (
        <div className="relative z-10 mx-5 mb-4 rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-md sm:mx-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-white/75">Public link — anyone with this can view the trip:</p>
            <button type="button" onClick={() => setShareOpen(false)} className="text-white/50 hover:text-white text-xl leading-none">×</button>
          </div>
          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input readOnly value={shareUrl}
              className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white outline-none" />
            <div className="flex gap-2">
              <button type="button" onClick={onCopy}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100">
                {copied ? "✓ Copied!" : "Copy"}
              </button>
              <button type="button" onClick={onUnshare}
                className="rounded-xl border border-red-400/40 bg-red-500/20 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/30">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TripOverview({
  trip,
  summary,
  tripMode,
  destinations,
  totalActivities,
  totalHours,
  completedCount,
  totalEstimatedCost,
}) {
  const { t } = useTranslation();
  const preferences = trip?.preferences || {};
  const interests = Array.isArray(preferences?.interests)
    ? preferences.interests
    : [];

  const completionPct = totalActivities > 0
    ? Math.round((completedCount / totalActivities) * 100)
    : 0;

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title={t("viewTrip.tripOverview")}
        subtitle={t("viewTrip.tripOverviewSubtitle")}
      />
      <CardBody className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <FancyInfoTile
            label={tripMode === "multi" ? t("viewTrip.tripMode") : t("viewTrip.destination")}
            value={tripMode === "multi" ? t("viewTrip.multiCity") : trip?.destination || "—"}
            icon="🌍"
          />
          <FancyInfoTile
            label={t("viewTrip.dates")}
            value={fmtRange(trip?.startDate, trip?.endDate) || "—"}
            icon="📅"
          />
          <FancyInfoTile
            label={t("viewTrip.pace_label")}
            value={summary?.style || preferences?.pace || "—"}
            icon="⚡"
          />
          <FancyInfoTile
            label={t("viewTrip.budget_label")}
            value={[summary?.budget, preferences?.budget].find((v) => v && v.toLowerCase() !== "null") || "—"}
            icon="💳"
          />
          <FancyInfoTile
            label={t("viewTrip.travelers") || "Travelers"}
            value={(() => {
              const n = Number(preferences?.travelers || 0);
              if (!n) return "—";
              return n === 1 ? "1 Traveler" : `${n} Travelers`;
            })()}
            icon="👥"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FancyInfoTile label={t("viewTrip.activities")} value={`${completedCount}/${totalActivities}`} icon="✅" />
          <FancyInfoTile
            label={t("viewTrip.estimatedHours")}
            value={formatHours(totalHours)}
            icon="⏱️"
          />
          <FancyInfoTile label={t("viewTrip.events_label")} value={trip?.events?.length || "0"} icon="🎟️" />
          <FancyInfoTile
            label="Est. Budget"
            value={totalEstimatedCost != null && Number.isFinite(totalEstimatedCost) ? `~$${totalEstimatedCost}` : "—"}
            icon="💰"
          />
        </div>

        {totalActivities > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Trip Progress</div>
              <div className="text-xs font-bold text-slate-700">{completionPct}%</div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-linear-to-r from-sky-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-500">{completedCount} of {totalActivities} activities completed</div>
          </div>
        )}

        {tripMode === "multi" && destinations.length > 1 ? (
          <div className="rounded-3xl border border-slate-200 bg-linear-to-r from-sky-50 to-indigo-50 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              {t("viewTrip.citiesInTrip")}
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {destinations.map((city) => (
                <span
                  key={city}
                  className="rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm"
                >
                  {city}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {!!interests.length && (
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              {t("viewTrip.interests")}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {interests.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold capitalize text-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {preferences?.notes ? (
          <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              {t("viewTrip.notes")}
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-700">
              {preferences.notes}
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function CityPlanSection({ summary, tripMode, destinations }) {
  const { t } = useTranslation();
  const cityPlan = Array.isArray(summary?.cityPlan) ? summary.cityPlan : [];

  if (tripMode !== "multi" || !destinations.length) return null;

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title={t("viewTrip.cityPlan")}
        subtitle={t("viewTrip.cityPlanSubtitle")}
        right={<Badge className="bg-sky-50 text-sky-700">{t("viewTrip.cities", { count: destinations.length })}</Badge>}
      />
      <CardBody>
        {cityPlan.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cityPlan.map((segment, index) => (
              <div
                key={`${segment.city}-${index}`}
                className="rounded-3xl border border-slate-200 bg-linear-to-br from-white to-indigo-50/60 p-5 shadow-sm"
              >
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  {t("viewTrip.city", { index: index + 1 })}
                </div>
                <div className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
                  {segment.city}
                </div>
                <div className="mt-3 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  {segment.days} {t("viewTrip.day")}{segment.days > 1 ? "s" : ""}
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  {fmtRange(segment.startDate, segment.endDate)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SoftMessage>{t("viewTrip.multiCityTrip", { count: destinations.length })}</SoftMessage>
        )}
      </CardBody>
    </Card>
  );
}

function RecommendedPlacesSection({ places, onJump }) {
  const { t } = useTranslation();
  if (!places?.length) return null;

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title={t("viewTrip.recommendedPlaces")}
        subtitle={t("viewTrip.recommendedPlacesSubtitle")}
        right={
          <Badge className="bg-sky-50 text-sky-700">{t("viewTrip.placesCount", { count: places.length })}</Badge>
        }
      />
      <CardBody>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {places.map((place, i) => {
              const title =
                place?.title ||
                place?.name ||
                place?.placeName ||
                place?.location ||
                t("viewTrip.recommendedPlace");

              const description =
                place?.description ||
                place?.notes ||
                place?.reason ||
                place?.summary ||
                "";

              const dayNumber = place?.day || place?.dayNumber || null;
              const category = place?.category || place?.type || "";
              const duration = place?.durationHours || place?.estimatedHours || null;

              return (
                <div
                  key={place?._id || place?.id || `${title}-${i}`}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  <div className="space-y-4 p-5">
                    <div>
                      <div className="text-lg font-extrabold tracking-tight text-slate-900">
                        {title}
                      </div>

                      {place?.location ? (
                        <div className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                          📍 {place.location}
                        </div>
                      ) : place?.address ? (
                        <div className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                          📍 {place.address}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {category ? <Tag color="sky">{category}</Tag> : null}
                      {duration ? (
                        <Tag color="indigo">{formatHours(Number(duration))}</Tag>
                      ) : null}
                    </div>

                    {description ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                        {description}
                      </div>
                    ) : null}

                    {place?.address ? (
                      <div className="text-xs leading-5 text-slate-500">
                        {place.address}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <GoogleMapsButton
                        place={place}
                        className="text-xs font-bold text-sky-700 transition hover:text-sky-800"
                      />

                      {dayNumber ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => onJump?.(dayNumber)}
                        >
                          {t("viewTrip.goToDay", { number: dayNumber })}
                        </Button>
                      ) : null}
                    </div>              
                  </div>
                </div>
              );
            })}
          </div>
      </CardBody>
    </Card>
  );
}

function EventsSection({ events }) {
  const { t } = useTranslation();
  if (!events?.length) return null;

  const grouped = events.reduce((acc, event) => {
    const key = event?.date || t("viewTrip.unknownDate");
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  const orderedDates = Object.keys(grouped).sort();

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title={t("viewTrip.eventsTitle")}
        subtitle={t("viewTrip.eventsSubtitle")}
        right={<Badge className="bg-sky-50 text-sky-700">{t("viewTrip.events", { count: events.length })}</Badge>}
      />
      <CardBody className="space-y-6">
        {orderedDates.map((dateKey) => (
          <div key={dateKey}>
            <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
              {dateKey}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {grouped[dateKey].map((event, i) => (
                <div
                  key={`${event.name}-${event.date}-${i}`}
                  className="rounded-3xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-base font-extrabold tracking-tight text-slate-900">
                      {event.name || t("viewTrip.event")}
                    </div>

                    {event.category ? <Tag color="sky">{event.category}</Tag> : null}
                  </div>

                  <div className="mt-3 text-xs font-medium text-slate-500">
                    {event.time || t("viewTrip.timeNotSpecified")}
                  </div>

                  {event.location ? (
                    <div className="mt-2 text-sm font-semibold text-slate-700">
                      {event.location}
                    </div>
                  ) : null}

                  {event.address ? (
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {event.address}
                    </div>
                  ) : null}

                  {event.description ? (
                    <div className="mt-4 text-sm leading-6 text-slate-600">
                      {event.description}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {event.source ? (
                      <span className="text-xs text-slate-500">{event.source}</span>
                    ) : null}

                    {(event.location || event.address) ? (
                      <GoogleMapsButton
                        place={event}
                        className="text-xs font-bold text-sky-700 transition hover:text-sky-800"
                      />
                    ) : null}

                    {event.link ? (
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-sky-700 transition hover:text-sky-800"
                      >
                        {t("viewTrip.viewEvent")}
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}


const DAY_GRADIENTS = [
  "from-slate-900 via-slate-800 to-indigo-950",
  "from-sky-900 via-blue-900 to-indigo-950",
  "from-indigo-900 via-violet-900 to-purple-950",
  "from-emerald-900 via-teal-900 to-cyan-950",
  "from-rose-900 via-red-900 to-orange-950",
  "from-amber-900 via-orange-900 to-rose-950",
  "from-violet-900 via-purple-900 to-indigo-950",
];
function getDayGradient(dayNumber) {
  return DAY_GRADIENTS[(Number(dayNumber) - 1) % DAY_GRADIENTS.length];
}

const DayCard = memo(function DayCard({ day, tripId, dayIndex, isOpen, onToggle, weatherDay, dayDone, onToggleDone }) {
  const { t } = useTranslation();
  const activityCount = countDayActivities(day);
  const totalHours = getDayEstimatedHours(day);
  const [note, setNote] = useState(day.userNote || "");
  const [noteSaved, setNoteSaved] = useState(false);
  const noteTimer = useRef(null);

  const doneDayCount = dayDone.size;

  const saveNote = useCallback((val) => {
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      try {
        await api.patch(`/trips/${tripId}/days/${dayIndex}/note`, { note: val });
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2000);
      } catch { /* silent */ }
    }, 800);
  }, [tripId, dayIndex]);

  useEffect(() => () => clearTimeout(noteTimer.current), []);

  return (
    <Card
      id={`day-${day.day}`}
      className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur scroll-mt-28"
    >
      <div className={`relative overflow-hidden bg-linear-to-br ${getDayGradient(day.day)} p-5 text-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.16),transparent_24%)]" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
              {t("viewTrip.dayLabel", { number: day.day })}
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight leading-snug">
              {day.title}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span>{day.date}</span>
              {weatherDay?.code != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
                  {getWeatherIcon(weatherDay.code)}
                  {weatherDay.maxC != null && `${weatherDay.maxC}°`}
                  {weatherDay.minC != null && ` / ${weatherDay.minC}°`}
                  {weatherDay.precip != null && weatherDay.precip > 0 && ` · 💧${weatherDay.precip}%`}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {doneDayCount > 0 && (
              <Badge className="border-emerald-400/40 bg-emerald-500/20 text-emerald-100">
                ✓ {doneDayCount}/{activityCount}
              </Badge>
            )}
            <Badge className="border-white/20 bg-white/10 text-white">
              {t("viewTrip.activitiesCount", { count: activityCount })}
            </Badge>
            <Badge className="border-white/20 bg-white/10 text-white">
              {formatHours(totalHours)}
            </Badge>
            <Button
              type="button"
              variant="secondary"
              className="bg-white/15 text-white backdrop-blur hover:bg-white/20"
              onClick={onToggle}
            >
              {isOpen ? t("viewTrip.collapse") : t("viewTrip.expand")}
            </Button>
          </div>
        </div>
      </div>

      {isOpen ? (
        <CardBody className="space-y-1">
          <MiniSection title={t("viewTrip.morning")} items={day.morning} icon="☀️" dayIdx={dayIndex} block="morning" doneSet={dayDone} onToggle={onToggleDone} />
          <MiniSection title={t("viewTrip.afternoon")} items={day.afternoon} icon="🌤️" dayIdx={dayIndex} block="afternoon" doneSet={dayDone} onToggle={onToggleDone} />
          <MiniSection title={t("viewTrip.evening")} items={day.evening} icon="🌙" dayIdx={dayIndex} block="evening" doneSet={dayDone} onToggle={onToggleDone} />

          {(day.foodSuggestion || day.backupPlan) && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {day.foodSuggestion ? (
                <FancyInfoTile
                  label={t("viewTrip.foodSuggestion")}
                  value={clamp(day.foodSuggestion)}
                  icon="🍽️"
                />
              ) : null}
              {day.backupPlan ? (
                <FancyInfoTile
                  label={t("viewTrip.backupPlan")}
                  value={clamp(day.backupPlan)}
                  icon="🛟"
                />
              ) : null}
            </div>
          )}

          {/* Personal day note */}
          <div className="mt-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              📝 My Notes
              {noteSaved && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Saved ✓</span>}
            </div>
            <textarea
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              rows={3}
              maxLength={2000}
              placeholder="Add your personal notes for this day..."
              value={note}
              onChange={(e) => { setNote(e.target.value); saveNote(e.target.value); }}
            />
          </div>
        </CardBody>
      ) : null}
    </Card>
  );
});

function TripSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl bg-linear-to-br from-sky-700 via-blue-700 to-indigo-900 p-6 sm:p-8">
        <div className="h-5 w-24 animate-pulse rounded-full bg-white/20" />
        <div className="mt-4 h-9 w-2/3 animate-pulse rounded-xl bg-white/20" />
        <div className="mt-2 h-4 w-1/3 animate-pulse rounded-full bg-white/15" />
        <div className="mt-6 flex flex-wrap gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-white/15" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-white/15" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-white/15" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <div className="h-10 w-24 animate-pulse rounded-2xl bg-white/15" />
          <div className="h-10 w-24 animate-pulse rounded-2xl bg-white/15" />
          <div className="h-10 w-28 animate-pulse rounded-2xl bg-white/15" />
        </div>
      </div>

      {/* Trip Overview */}
      <Card className="overflow-hidden border border-slate-200/80">
        <CardBody className="space-y-4">
          <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Day cards grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border border-slate-200/80">
            <div className="flex items-center gap-4 bg-slate-50 px-5 py-4">
              <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
            <CardBody className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Tips */}
      <Card className="overflow-hidden border border-slate-200/80">
        <CardBody className="space-y-3">
          <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function FancyInfoTile({ label, value, icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-lg">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-sm font-semibold leading-6 text-slate-800 wrap-break-word">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniSection({ title, items, icon, dayIdx, block, doneSet, onToggle }) {
  const { t } = useTranslation();
  if (!items?.length) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          <span className="text-base normal-case">{icon}</span>
          {title}
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
          {items.length > 1 ? t("viewTrip.items", { count: items.length }) : t("viewTrip.item", { count: items.length })}
        </div>
      </div>

      <ul className="mt-3 space-y-3 text-sm text-slate-800">
        {items.map((x, i) => {
          const doneKey = `${dayIdx}_${block}_${i}`;
          const isDone = doneSet?.has(doneKey);
          const cost = formatCost(x?.estimatedCostUSD);
          return (
            <li
              key={x.id ?? `${x.title}-${x.address || x.location}-${i}`}
              className={`overflow-hidden rounded-3xl border shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                isDone
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-slate-200 bg-white hover:border-sky-200"
              }`}
            >
              <div className="px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => onToggle?.(doneKey)}
                        className={`mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isDone
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 bg-white hover:border-emerald-400"
                        }`}
                        aria-label={isDone ? "Mark incomplete" : "Mark done"}
                      >
                        {isDone && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                      <div className={`text-sm font-extrabold tracking-tight ${isDone ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {x.title}
                      </div>
                    </div>

                    {x.location ? (
                      <div className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        📍 {x.location}
                      </div>
                    ) : null}

                    {x.address ? (
                      <div className="mt-2 text-xs leading-5 text-slate-500">
                        {x.address}
                      </div>
                    ) : null}

                    {x.notes ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2.5 text-xs leading-5 text-slate-600">
                        {x.notes}
                      </div>
                    ) : null}

                    {(x.location || x.address) ? (
                      <div className="mt-3">
                        <GoogleMapsButton
                          place={x}
                          className="text-xs font-bold text-sky-700 transition hover:text-sky-800"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {x.durationHours ? (
                      <Tag color="indigo">{formatHours(Number(x.durationHours))}</Tag>
                    ) : null}
                    {cost ? <Tag color="emerald">{cost}</Tag> : null}
                    {x.category ? <Tag color="slate">{x.category}</Tag> : null}
                    {x.type ? <Tag color="sky">{x.type}</Tag> : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const BUDGET_COLORS = { low: "emerald", mid: "sky", high: "violet" };
const BUDGET_LABELS = { low: "Budget Trip", mid: "Mid-range", high: "Premium" };

function BudgetSummaryPanel({ days, budget }) {
  const dailyTotals = days.map((day) => {
    let total = 0;
    let hasCost = false;
    BLOCKS.forEach((block) => {
      (day[block] || []).forEach((act) => {
        if (typeof act?.estimatedCostUSD === "number") {
          total += act.estimatedCostUSD;
          hasCost = true;
        }
      });
    });
    return { day: day.day, date: day.date, title: day.title, total, hasCost };
  });

  const tripTotal = dailyTotals.reduce((s, d) => s + d.total, 0);
  const hasCostData = dailyTotals.some((d) => d.hasCost);
  if (!hasCostData) return null;

  const colorKey = BUDGET_COLORS[budget] || "sky";
  const gradients = {
    emerald: "from-emerald-500 to-teal-500",
    sky: "from-sky-500 to-blue-500",
    violet: "from-violet-500 to-purple-500",
  };
  const barGrad = gradients[colorKey] || gradients.sky;
  const maxDay = Math.max(...dailyTotals.map((d) => d.total), 1);

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title="Estimated Budget"
        subtitle="Per-person cost estimates generated by AI — use as a rough guide"
        right={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 capitalize">
              {BUDGET_LABELS[budget] || budget}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
              ~${tripTotal} total
            </span>
          </div>
        }
      />
      <CardBody>
        <div className="space-y-3">
          {dailyTotals.filter((d) => d.hasCost).map((d) => (
            <div key={d.day} className="flex items-center gap-3">
              <div className="w-20 shrink-0 text-[11px] font-bold text-slate-500 truncate">
                Day {d.day}
              </div>
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-linear-to-r ${barGrad} transition-all duration-500`}
                  style={{ width: `${Math.round((d.total / maxDay) * 100)}%` }}
                />
              </div>
              <div className="w-14 shrink-0 text-right text-xs font-bold text-slate-700">
                ~${d.total}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-500 leading-5">
          ⚠️ These are AI-generated estimates per person in USD. Actual costs vary by season, group size, and booking method.
        </div>
      </CardBody>
    </Card>
  );
}

const EXPENSE_CATS = [
  { key: "food",          label: "Food & Drink",   icon: "🍽️" },
  { key: "transport",     label: "Transport",      icon: "🚌" },
  { key: "activities",    label: "Activities",     icon: "🎫" },
  { key: "accommodation", label: "Accommodation",  icon: "🏨" },
  { key: "shopping",      label: "Shopping",       icon: "🛍️" },
  { key: "other",         label: "Other",          icon: "🔧" },
];

function useExpenses(tripId) {
  const key = `trip_expenses_${tripId}`;
  const [expenses, setExpenses] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); }
    catch { return []; }
  });

  const add = useCallback((exp) => {
    setExpenses((prev) => {
      const next = [...prev, { ...exp, id: `${Date.now()}_${Math.random().toString(36).slice(2)}` }];
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, [key]);

  const remove = useCallback((id) => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, [key]);

  return [expenses, add, remove];
}

function ExpenseTrackerSection({ tripId, aiEstimate }) {
  const [expenses, addExpense, removeExpense] = useExpenses(tripId);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("food");

  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const byCategory = EXPENSE_CATS.map(({ key, label: catLabel, icon }) => ({
    key, label: catLabel, icon,
    total: expenses.filter((e) => e.category === key).reduce((s, e) => s + (Number(e.amount) || 0), 0),
  })).filter((c) => c.total > 0);

  const handleAdd = (ev) => {
    ev.preventDefault();
    const amt = parseFloat(amount);
    if (!label.trim() || !Number.isFinite(amt) || amt <= 0) return;
    addExpense({ label: label.trim(), amount: amt, category: cat, date: new Date().toISOString() });
    setLabel("");
    setAmount("");
  };

  const diff = aiEstimate != null ? total - aiEstimate : null;

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardBody className="space-y-5">
          {/* Summary row */}
          {(total > 0 || aiEstimate != null) && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Spent</div>
                <div className="mt-1 text-2xl font-black text-slate-900">${total.toFixed(2)}</div>
              </div>
              {aiEstimate != null && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">AI Estimate</div>
                    <div className="mt-1 text-2xl font-black text-slate-900">${aiEstimate}</div>
                  </div>
                  <div className={`rounded-2xl border p-4 text-center ${diff > 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Difference</div>
                    <div className={`mt-1 text-2xl font-black ${diff > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {diff > 0 ? "+" : ""}{diff != null ? `$${diff.toFixed(2)}` : "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Category breakdown */}
          {byCategory.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-3">
              {byCategory.map((c) => (
                <div key={c.key} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                  <span className="text-lg">{c.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-500">{c.label}</div>
                    <div className="text-sm font-bold text-slate-900">${c.total.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add expense form */}
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-36">
              <label className="block mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Description</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Dinner at restaurant"
                maxLength={80}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div className="w-24 min-w-20">
              <label className="block mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Amount $</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div className="w-36 min-w-32">
              <label className="block mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Category</label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400"
              >
                {EXPENSE_CATS.map((c) => (
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
            >
              + Add
            </button>
          </form>

          {/* Expenses list */}
          {expenses.length > 0 && (
            <ul className="space-y-2">
              {[...expenses].reverse().map((e) => {
                const catInfo = EXPENSE_CATS.find((c) => c.key === e.category) || EXPENSE_CATS[5];
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <span className="text-lg">{catInfo.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 truncate">{e.label}</div>
                      <div className="text-[11px] text-slate-400">{catInfo.label}</div>
                    </div>
                    <div className="shrink-0 text-sm font-bold text-slate-800">${Number(e.amount).toFixed(2)}</div>
                    <button
                      type="button"
                      onClick={() => removeExpense(e.id)}
                      className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {expenses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
              No expenses logged yet. Add your first one above.
            </div>
          )}
        </CardBody>
    </Card>
  );
}

function PackingListSection({ tripId }) {
  const [list, setList] = useState(null); // null = not loaded yet
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        api.get(`/trips/${tripId}/packing`)
          .then(({ data }) => setList(data.packingList || []))
          .catch(() => setList([]));
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(saveTimer.current); };
  }, [tripId]);

  const persistList = useCallback((updated) => {
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.put(`/trips/${tripId}/packing`, { packingList: updated });
      } catch { /* silent */ }
      finally { setSaving(false); }
    }, 600);
  }, [tripId]);

  const toggle = (i) => {
    const updated = list.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item);
    setList(updated);
    persistList(updated);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/trips/${tripId}/packing/generate`);
      setList(data.packingList || []);
    } catch { /* silent */ }
    finally { setGenerating(false); }
  };

  if (list === null) return <div ref={sectionRef} className="h-4" />;

  const checked = list.filter((x) => x.checked).length;

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title="🎒 Packing List"
        subtitle="AI-generated checklist — check items as you pack"
        right={
          <div className="flex items-center gap-2">
            {saving && <span className="text-[11px] text-slate-400">Saving…</span>}
            {list.length > 0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                {checked}/{list.length} packed
              </span>
            )}
          </div>
        }
      />
      <CardBody>
        {list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-500">No packing list yet. Generate one with AI based on your trip details.</p>
            <Button
              type="button"
              className="mt-4"
              onClick={generate}
              disabled={generating}
            >
              {generating ? "Generating…" : "✨ Generate Packing List"}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((item, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition select-none ${
                    item.checked
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 line-through opacity-70"
                      : "border-slate-200 bg-white text-slate-800 hover:border-sky-200 hover:bg-sky-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggle(i)}
                    className="h-4 w-4 rounded accent-sky-600"
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="secondary" onClick={generate} disabled={generating} className="text-xs">
                {generating ? "Generating…" : "↻ Regenerate"}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function SectionToggle({ icon, title, meta, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-left shadow-sm hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-lg leading-none">{icon}</span>
        <span className="flex-1 font-semibold text-slate-800 text-sm">{title}</span>
        {meta ? <span className="text-xs text-slate-500 shrink-0">{meta}</span> : null}
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function Tag({ children, color = "slate" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700",
    sky: "bg-sky-100 text-sky-700",
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${styles[color] || styles.slate}`}
    >
      {children}
    </span>
  );
}

function buildHotellookUrl({ destination, startDate, endDate, travelers }) {
  const aid = import.meta.env.VITE_BOOKING_AID;
  const params = new URLSearchParams({
    ss: destination || "",
    checkin: startDate || "",
    checkout: endDate || "",
    group_adults: String(travelers || 1),
    no_rooms: "1",
    lang: "en-gb",
  });
  if (aid) params.set("aid", aid);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function HotelsSection({ trip }) {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const nav = useNavigate();
  const destination = trip?.destination || "";
  const startDate = trip?.startDate || "";
  const endDate = trip?.endDate || "";
  const travelers = trip?.preferences?.travelers || 1;

  if (!destination) return null;

  const url = buildHotellookUrl({ destination, startDate, endDate, travelers });

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <div className="relative overflow-hidden bg-linear-to-br from-blue-700 via-blue-600 to-sky-500 px-6 py-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
              🏨 {t("viewTrip.hotels.poweredBy")}
            </div>
            <div className="mt-2 text-xl font-black tracking-tight">
              {t("viewTrip.hotels.title", { destination })}
            </div>
            <div className="mt-1 text-sm text-white/80">
              {t("viewTrip.hotels.subtitle")}
            </div>
          </div>

          {isLoggedIn ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-xl"
            >
              {t("viewTrip.hotels.searchButton")} →
            </a>
          ) : (
            <button
              type="button"
              onClick={() => nav("/login")}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              🔒 {t("viewTrip.loginToBook")}
            </button>
          )}
        </div>
      </div>

      <CardBody>
        <div className="grid gap-4 sm:grid-cols-3">
          {startDate && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {t("viewTrip.hotels.checkIn")}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{startDate}</div>
            </div>
          )}
          {endDate && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {t("viewTrip.hotels.checkOut")}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{endDate}</div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {t("viewTrip.travelers")}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              {travelers > 1
                ? t("viewTrip.hotels.travelers_plural", { count: travelers })
                : t("viewTrip.hotels.travelers", { count: travelers })}
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-400">
          {t("viewTrip.hotels.affiliateNote")}
        </div>
      </CardBody>
    </Card>
  );
}

function SoftMessage({ children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 text-sm text-slate-600">
      {children}
    </div>
  );
}

// ─── AI Trip Chat ─────────────────────────────────────────────────────────────

const CHAT_SUGGESTIONS = [
  "What's the best restaurant near Day 1's activities?",
  "Suggest a backup plan for rainy weather",
  "What should I pack for this trip?",
  "Any local customs or etiquette I should know?",
  "How much cash should I bring?",
  "What's the best way to get around?",
];

function PersonalNotesSection({ tripId, initialNotes }) {
  const { api } = window.__apiRef ?? {};
  const [notes, setNotes]         = useState(initialNotes);
  const [saved, setSaved]         = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const debounceRef               = useRef(null);
  const MAX                       = 5000;

  // Import api inline — ViewTrip already imports it at the top
  const saveNotes = useCallback(async (text) => {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/trips/${tripId}/personal-notes`, { notes: text });
      setSaved(true);
    } catch {
      setError("Failed to save. Will retry on next change.");
    } finally {
      setSaving(false);
    }
  }, [tripId]);

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length > MAX) return;
    setNotes(val);
    setSaved(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(val), 1200);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const lines   = notes.split("\n").length;
  const words   = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const remaining = MAX - notes.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Personal Notes</h3>
          <p className="text-sm text-slate-500">Private to you — never shared with others</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {saving ? (
            <span className="flex items-center gap-1.5 text-slate-400">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 01-8-8z" />
              </svg>
              Saving…
            </span>
          ) : saved && notes.length > 0 ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          ) : null}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <textarea
        value={notes}
        onChange={handleChange}
        placeholder={"Write anything about your trip — packing reminders, must-try restaurants, important addresses, contacts, budget notes…\n\nOnly you can see this."}
        className="w-full min-h-72 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        spellCheck
      />

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{words} {words === 1 ? "word" : "words"} · {lines} {lines === 1 ? "line" : "lines"}</span>
        <span className={remaining < 200 ? "text-amber-500 font-medium" : ""}>{remaining.toLocaleString()} characters left</span>
      </div>
    </div>
  );
}

function TripChatSection({ trip, tripId }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I'm your AI travel assistant for your trip to **${trip?.destination || "your destination"}**. Ask me anything about your itinerary, local tips, what to pack, restaurants, or anything else about your trip!`,
    },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const history = messages.slice(-10);
      const { data } = await api.post(`/trips/${tripId}/chat`, { message: msg, history });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to get a response. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function renderContent(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br />");
  }

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">AI Trip Assistant</p>
          <p className="text-[11px] text-slate-400">Powered by GPT-4 · knows your itinerary</p>
        </div>
        <div className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      </div>

      {/* Messages */}
      <div className="flex h-[420px] flex-col gap-4 overflow-y-auto px-5 py-5 sm:h-[500px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar */}
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              m.role === "user"
                ? "bg-sky-600 text-white"
                : "bg-linear-to-br from-sky-100 to-indigo-100 text-sky-700"
            }`}>
              {m.role === "user" ? "You" : "AI"}
            </div>
            {/* Bubble */}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                m.role === "user"
                  ? "rounded-tr-sm bg-sky-600 text-white"
                  : "rounded-tl-sm border border-slate-100 bg-slate-50 text-slate-800"
              }`}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: renderContent(m.content) }}
            />
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-100 to-indigo-100 text-xs font-bold text-sky-700">AI</div>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-3">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d * 0.18}s` }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions (only shown when just the greeting is present) */}
      {messages.length === 1 && (
        <div className="border-t border-slate-100 px-5 pb-4 pt-3">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {CHAT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s)}
                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your trip…"
            className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
            style={{ minHeight: "44px", maxHeight: "120px" }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm transition-all hover:bg-sky-700 disabled:opacity-40"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-400">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </Card>
  );
}