import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Copy, Eye, MapPinned, Plus, RefreshCw, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client.js";
import { Alert, Button, toast } from "../components/UI.jsx";
import { useTranslation } from "react-i18next";
import { fmtRange } from "../utils/helpers.js";

const STATUS_BADGE = {
  planning:  "border-amber-200 bg-amber-50 text-amber-700",
  upcoming:  "border-sky-200 bg-sky-50 text-sky-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const STATUS_LABEL = { planning: "📋 Planning", upcoming: "✈️ Upcoming", completed: "✅ Completed" };
const PAGE_SIZE = 12;


function getTripDays(trip) {
  return Number(trip?.itinerary?.tripSummary?.days || 0);
}

function getInterests(trip) {
  return Array.isArray(trip?.preferences?.interests) ? trip.preferences.interests : [];
}

const DEST_GRADIENTS = {
  a: "from-sky-600 via-sky-500 to-cyan-400",
  b: "from-indigo-600 via-indigo-500 to-blue-400",
  c: "from-emerald-600 via-emerald-500 to-teal-400",
  d: "from-rose-600 via-rose-500 to-pink-400",
  e: "from-violet-600 via-violet-500 to-purple-400",
  f: "from-amber-600 via-amber-500 to-yellow-400",
};

function getDestGradient(name) {
  const char = (name || "").trim().toLowerCase()[0] || "a";
  const keys = Object.keys(DEST_GRADIENTS);
  return DEST_GRADIENTS[keys[char.charCodeAt(0) % keys.length]];
}

function getTripCountdown(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end   = new Date(endDate);   end.setHours(0, 0, 0, 0);
  const diffStart = Math.round((start - today) / 86400000);
  const diffEnd   = Math.round((end   - today) / 86400000);
  if (diffStart > 0 && diffStart <= 90) return { label: `${diffStart}d to go`, type: "upcoming" };
  if (diffStart === 0) return { label: "Today!", type: "today" };
  if (diffStart < 0 && diffEnd >= 0)   return { label: "Ongoing ✈️", type: "ongoing" };
  return null;
}

export default function MyTrips() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); document.title = t("myTrips.pageTitle"); }, [t]);

  const nav = useNavigate();
  const [trips, setTrips]               = useState([]);
  const [err, setErr]                   = useState("");
  const [loading, setLoading]           = useState(true);
  const [query, setQuery]               = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [coverPhotos, setCoverPhotos]   = useState({});
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const debounceRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusFilter]);

  const load = useCallback(async () => {
    setErr(""); setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());

      const { data } = await api.get(`/trips?${params}`);
      // Support both paginated { trips, total, totalPages } and legacy array
      const loaded = Array.isArray(data) ? data : (data?.trips ?? []);
      setTrips(loaded);
      setTotal(Array.isArray(data) ? loaded.length : (data?.total ?? loaded.length));
      setTotalPages(Array.isArray(data) ? 1 : (data?.totalPages ?? 1));

      if (loaded.length) {
        try {
          // Seed photoMap immediately from photos already stored on the trip
          const photoMap = {};
          loaded.forEach((trip) => {
            if (trip.coverPhoto) photoMap[trip._id] = [trip.coverPhoto];
          });
          setCoverPhotos({ ...photoMap });

          // Only fetch from the external API for trips that don't have a stored photo
          const requests = [];
          loaded.forEach((trip) => {
            if (trip.coverPhoto) return; // already have it

            if (trip.tripMode === "multi") {
              const cities = (
                trip.multiCityMeta?.length
                  ? trip.multiCityMeta.map((m) => m.name || m.label || "")
                  : trip.destinations?.length
                  ? trip.destinations
                  : (trip.destination || "").split(/\s*→\s*/)
              ).map((s) => String(s).trim()).filter(Boolean);
              if (cities.length > 1) {
                cities.forEach((city) => requests.push({ tripId: trip._id, name: city }));
                return;
              }
            }
            const name =
              trip.placeMeta?.name ||
              trip.placeMeta?.label ||
              (trip.destination || "").split(/\s*→\s*/)[0].trim();
            requests.push({ tripId: trip._id, name });
          });

          if (requests.length) {
            const places = requests.map(({ name }) => ({ query: name, title: name, destination: name }));
            const { data: photoData } = await api.post("/places/photos", { places });
            const results = Array.isArray(photoData?.results) ? photoData.results : [];
            requests.forEach(({ tripId }, i) => {
              const url = results[i]?.photoUrl;
              if (!url) return;
              if (!photoMap[tripId]) photoMap[tripId] = [];
              photoMap[tripId].push(url);
            });
            setCoverPhotos({ ...photoMap });
          }
        } catch { /* photos optional */ }
      }
    } catch (e) {
      setErr(e?.response?.data?.message || t("myTrips.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedQuery, t]);

  useEffect(() => { load(); }, [load]);

  const del = useCallback(async (id) => {
    if (!window.confirm(t("myTrips.errors.deleteConfirm"))) return;
    try {
      await api.delete(`/trips/${id}`);
      setTrips((prev) => prev.filter((item) => item._id !== id));
      setTotal((n) => Math.max(0, n - 1));
      toast("Trip deleted.", "success");
    } catch (e) {
      toast(e?.response?.data?.message || t("myTrips.errors.deleteFailed"), "error");
    }
  }, [t]);

  const duplicate = useCallback(async (id) => {
    try {
      const { data } = await api.post(`/trips/${id}/duplicate`);
      setTrips((prev) => [data, ...prev]);
      setTotal((n) => n + 1);
      toast("Trip duplicated successfully.", "success");
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to duplicate trip.", "error");
    }
  }, []);

  const changeStatus = useCallback(async (id, status) => {
    try {
      await api.patch(`/trips/${id}/status`, { status });
      setTrips((prev) => prev.map((tr) => tr._id === id ? { ...tr, status } : tr));
    } catch { /* silent */ }
  }, []);

  const handleView         = useCallback((id) => nav(`/trip/${id}`), [nav]);
  const handleDelete       = useCallback((id) => del(id), [del]);
  const handleDuplicate    = useCallback((id) => duplicate(id), [duplicate]);
  const handleStatusChange = useCallback((id, status) => changeStatus(id, status), [changeStatus]);

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-8 text-white shadow-xl sm:px-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-8 left-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              <MapPinned size={11} /> {t("myTrips.badge")}
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{t("myTrips.title")}</h1>
            <p className="mt-1.5 text-sm text-white/60">{t("myTrips.description")}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <span className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold">
              <Compass size={14} className="text-sky-300" /> {total} trips
            </span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {["all", "planning", "upcoming", "completed"].map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === s
                  ? "border-sky-400 bg-sky-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}>
              {s === "all" ? "All Trips" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trips…"
              className="rounded-2xl border border-slate-200 bg-white py-2 pl-8 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <Button onClick={() => nav("/create")} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Plus size={15} /> {t("myTrips.library.createTrip")}
          </Button>
          <button onClick={load} type="button"
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-sky-600">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {err ? <Alert type="error">{err}</Alert> : null}

      {/* ── Grid ── */}
      {loading ? (
        <TripsSkeleton />
      ) : trips.length ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {trips.map((trip) => (
              <TripCard
                key={trip._id}
                trip={trip}
                onView={handleView}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onStatusChange={handleStatusChange}
                coverPhotos={coverPhotos[trip._id] || null}
              />
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          )}
        </>
      ) : (
        <EmptyTrips
          hasSearch={Boolean(query.trim()) || statusFilter !== "all"}
          onCreate={() => nav("/create")}
          onClear={() => { setQuery(""); setStatusFilter("all"); }}
        />
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  const pages = useMemo(() => {
    const arr = [];
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      arr.push(i);
    }
    return arr;
  }, [page, totalPages]);

  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>

      {pages[0] > 1 && (
        <>
          <PageBtn n={1} current={page} onPage={onPage} />
          {pages[0] > 2 && <span className="px-1 text-slate-400">…</span>}
        </>
      )}

      {pages.map((n) => <PageBtn key={n} n={n} current={page} onPage={onPage} />)}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
          <PageBtn n={totalPages} current={page} onPage={onPage} />
        </>
      )}

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function PageBtn({ n, current, onPage }) {
  return (
    <button
      type="button"
      onClick={() => onPage(n)}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition ${
        n === current
          ? "border-sky-400 bg-sky-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {n}
    </button>
  );
}

const TripCard = memo(function TripCard({ trip, onView, onDelete, onDuplicate, onStatusChange, coverPhotos }) {
  const { t } = useTranslation();
  const destination = trip.destination || t("common.notFound");
  const tripDays    = getTripDays(trip);
  const budget      = trip.preferences?.budget;
  const pace        = trip.preferences?.pace;
  const interests   = getInterests(trip);
  const gradient    = getDestGradient(destination);
  const status      = trip.status || "planning";
  const countdown   = getTripCountdown(trip.startDate, trip.endDate);
  const id          = trip._id;
  const handleView         = useCallback(() => onView(id),         [onView, id]);
  const handleDelete       = useCallback(() => onDelete(id),       [onDelete, id]);
  const handleDuplicate    = useCallback(() => onDuplicate(id),    [onDuplicate, id]);
  const handleStatusChange = useCallback((s) => onStatusChange(id, s), [onStatusChange, id]);

  const photos = Array.isArray(coverPhotos) ? coverPhotos : (coverPhotos ? [coverPhotos] : []);
  const cityNames = trip.tripMode === "multi"
    ? (trip.multiCityMeta?.length
        ? trip.multiCityMeta.map((m) => m.name || m.label || "")
        : trip.destinations?.length
        ? trip.destinations
        : (trip.destination || "").split(/\s*→\s*/)
      ).map((s) => String(s).trim()).filter(Boolean)
    : [];
  const [photoIdx, setPhotoIdx] = useState(0);
  const timerRef = useRef(null);

  function startTimer(len) {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPhotoIdx((i) => (i + 1) % len);
    }, 3000);
  }

  useEffect(() => {
    if (photos.length <= 1) return;
    startTimer(photos.length);
    return () => clearInterval(timerRef.current);
  }, [photos.length]);

  const activePhoto = photos[photoIdx] || null;
  const activeCity  = cityNames[photoIdx] || null;

  return (
    <div className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-18px_rgba(15,23,42,0.22)]">

      {/* Cover */}
      <div className={`relative min-h-44 overflow-hidden bg-linear-to-br ${gradient}`}>
        {photos.map((src, i) => (
          <img key={src} src={src} alt={destination}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === photoIdx ? "opacity-100" : "opacity-0"} ${photos.length === 1 ? "group-hover:scale-105 transition-transform duration-500" : ""}`} />
        ))}
        <div className={`absolute inset-0 ${activePhoto ? "bg-linear-to-t from-black/80 via-black/25 to-black/5" : "bg-linear-to-t from-black/55 via-black/10 to-transparent"}`} />
        {!activePhoto && (
          <>
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          </>
        )}
        <div className="relative flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm ${STATUS_BADGE[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            {countdown && (
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur-sm ${
                countdown.type === "today"   ? "bg-yellow-400/90 text-yellow-900" :
                countdown.type === "ongoing" ? "bg-emerald-400/90 text-emerald-900" :
                                               "border border-white/30 bg-white/20 text-white"
              }`}>
                {countdown.label}
              </span>
            )}
          </div>
          <div className="mt-8">
            <div className="line-clamp-1 text-xl font-black tracking-tight text-white drop-shadow sm:text-2xl">{destination}</div>
            {activeCity && (
              <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/90">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                {activeCity}
              </div>
            )}
            <div className="mt-1 text-sm text-white/70">{fmtRange(trip.startDate, trip.endDate, t("common.datesNotSet"))}</div>
          </div>
        </div>
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button key={i} type="button" onClick={() => { setPhotoIdx(i); startTimer(photos.length); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === photoIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">

        {/* Stats row */}
        <div className="flex flex-wrap gap-1.5">
          {pace   && <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">{pace}</span>}
          {budget && <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">{budget}</span>}
          {tripDays ? <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{tripDays}d</span> : null}
        </div>

        {/* Interests */}
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {interests.slice(0, 4).map((item) => (
              <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 capitalize">{item}</span>
            ))}
            {interests.length > 4 && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400">+{interests.length - 4}</span>
            )}
          </div>
        )}

        {/* Status quick-change */}
        <div className="flex gap-1.5">
          {["planning", "upcoming", "completed"].map((s) => (
            <button key={s} type="button" onClick={() => handleStatusChange(s)}
              className={`flex-1 rounded-xl border py-1.5 text-[11px] font-semibold transition ${
                status === s ? STATUS_BADGE[s] : "border-slate-200 bg-white text-slate-400 hover:text-slate-600"
              }`}>
              {s === "planning" ? "📋" : s === "upcoming" ? "✈️" : "✅"} {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={handleView} type="button"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">
            <Eye size={14} /> View
          </button>
          <button onClick={handleDuplicate} type="button"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
            <Copy size={14} /> Copy
          </button>
          <button onClick={handleDelete} type="button"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-red-100 bg-red-50 py-2.5 text-xs font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
});

function EmptyTrips({ onCreate, onClear, hasSearch }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 text-2xl shadow-lg shadow-sky-200">
        ✈️
      </div>
      <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900">
        {hasSearch ? t("myTrips.empty.noTripsFound") : t("myTrips.empty.noTrips")}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {hasSearch ? t("myTrips.empty.noTripsFoundText") : t("myTrips.empty.noTripsText")}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {hasSearch && (
          <button onClick={onClear} type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            {t("myTrips.empty.clearSearch")}
          </button>
        )}
        <button onClick={onCreate} type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-200/50 transition hover:-translate-y-0.5 hover:shadow-lg">
          <Plus size={15} /> {t("myTrips.empty.createTrip")}
        </button>
      </div>
    </div>
  );
}

function TripsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-44 animate-pulse bg-linear-to-br from-slate-200 to-slate-300" />
          <div className="space-y-3 p-5">
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-slate-100" />
              <div className="h-5 w-10 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="flex gap-1.5">
              <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 flex-1 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-9 flex-1 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-9 flex-1 animate-pulse rounded-xl bg-red-50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
