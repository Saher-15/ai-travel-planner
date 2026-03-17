import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Eye, MapPinned, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input } from "../components/UI.jsx";
import { useTranslation } from "react-i18next";

function fmtRange(start, end, fallback) {
  return start && end ? `${start} → ${end}` : fallback;
}

function getTripDays(trip) {
  return Number(trip?.itinerary?.tripSummary?.days || 0);
}

function getInterests(trip) {
  return Array.isArray(trip?.preferences?.interests) ? trip.preferences.interests : [];
}

export default function MyTrips() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); document.title = t("myTrips.pageTitle"); }, [t]);

  const nav = useNavigate();
  const [trips, setTrips] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [coverPhotos, setCoverPhotos] = useState({});

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const { data } = await api.get("/trips");
      const loaded = Array.isArray(data) ? data : [];
      setTrips(loaded);

      // Fetch cover photos for all trips in one batch.
      // Use the stored English place name (placeMeta.name) so Hebrew destination
      // names don't break the photo search.
      if (loaded.length) {
        try {
          const places = loaded.map((trip) => {
            const englishName =
              trip.placeMeta?.name ||
              trip.placeMeta?.label ||
              (trip.tripMode === "multi"
                ? trip.multiCityMeta?.[0]?.name || trip.multiCityMeta?.[0]?.label
                : null) ||
              trip.destination ||
              "";
            return { query: englishName, title: englishName, destination: englishName };
          });
          const { data: photoData } = await api.post("/places/photos", { places });
          const results = Array.isArray(photoData?.results) ? photoData.results : [];
          const photoMap = {};
          loaded.forEach((trip, i) => {
            if (results[i]?.photoUrl) photoMap[trip._id] = results[i].photoUrl;
          });
          setCoverPhotos(photoMap);
        } catch {
          // photos are optional — silently ignore
        }
      }
    } catch (e2) {
      setErr(e2?.response?.data?.message || t("myTrips.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function del(id) {
    if (!window.confirm(t("myTrips.errors.deleteConfirm"))) return;
    try {
      await api.delete(`/trips/${id}`);
      setTrips((prev) => prev.filter((item) => item._id !== id));
    } catch (e2) {
      setErr(e2?.response?.data?.message || t("myTrips.errors.deleteFailed"));
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((trip) => {
      const destination = String(trip?.destination || "").toLowerCase();
      const budget = String(trip?.preferences?.budget || "").toLowerCase();
      const pace = String(trip?.preferences?.pace || "").toLowerCase();
      const interests = getInterests(trip).join(" ").toLowerCase();
      return destination.includes(q) || budget.includes(q) || pace.includes(q) || interests.includes(q);
    });
  }, [trips, query]);

  const totalTrips = trips.length;
  const filteredTrips = filtered.length;
  const totalDays = trips.reduce((sum, trip) => sum + getTripDays(trip), 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-4xl shadow-[0_20px_60px_-25px_rgba(15,23,42,0.28)]">
        {/* Full-width hero photo */}
        <img
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80"
          alt="Travel"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-slate-900/70 to-slate-900/60" />

        <div className="relative grid gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <div className="lg:col-span-8">
            <Badge className="border-white/30 bg-white/15 text-white backdrop-blur">{t("myTrips.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">{t("myTrips.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">{t("myTrips.description")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <HeroStat icon={<Compass size={18} />} title={t("myTrips.stats.savedTrips")} value={totalTrips} subtitle={t("myTrips.stats.storedInAccount")} />
              <HeroStat icon={<Search size={18} />} title={t("myTrips.stats.searchResults")} value={filteredTrips} subtitle={t("myTrips.stats.matchingFilter")} />
              <HeroStat icon={<MapPinned size={18} />} title={t("myTrips.stats.plannedDays")} value={totalDays} subtitle={t("myTrips.stats.acrossItineraries")} />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-4xl border border-white/20 bg-white/10 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-bold text-white">{t("myTrips.manage.title")}</div>
              <div className="mt-4 grid gap-3">
                <MiniInfo title={t("myTrips.manage.viewItineraries")} text={t("myTrips.manage.viewItinerariesText")} />
                <MiniInfo title={t("myTrips.manage.searchQuickly")} text={t("myTrips.manage.searchQuicklyText")} />
                <MiniInfo title={t("myTrips.manage.stayOrganized")} text={t("myTrips.manage.stayOrganizedText")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
        <CardHeader title={t("myTrips.library.title")} subtitle={t("myTrips.library.subtitle")} />
        <CardBody className="space-y-5 bg-linear-to-b from-white to-slate-50/60">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-5">
              <Input label={t("myTrips.library.searchLabel")} placeholder={t("myTrips.library.searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="lg:col-span-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button onClick={() => nav("/create")} className="inline-flex items-center gap-2">
                  <Plus size={16} />
                  {t("myTrips.library.createTrip")}
                </Button>
                <Button onClick={load} variant="secondary" className="inline-flex items-center gap-2">
                  <RefreshCw size={16} />
                  {t("common.refresh")}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="border-slate-200 bg-white text-slate-700">
              {filteredTrips} {filteredTrips !== 1 ? t("common.trips") : t("common.trip")}
            </Badge>
            <Badge className="border-slate-200 bg-white text-slate-700">{t("myTrips.library.savedInAccount")}</Badge>
            {!!query.trim() && (
              <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                {t("myTrips.library.filter", { query: query.trim() })}
              </Badge>
            )}
          </div>

          {err ? <Alert type="error">{err}</Alert> : null}
        </CardBody>
      </Card>

      {loading ? (
        <TripsSkeleton />
      ) : filtered.length ? (
        <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((trip) => (
            <TripCard key={trip._id} trip={trip} onView={() => nav(`/trip/${trip._id}`)} onDelete={() => del(trip._id)} coverPhoto={coverPhotos[trip._id] || null} />
          ))}
        </div>
      ) : (
        <EmptyTrips hasSearch={Boolean(query.trim())} onCreate={() => nav("/create")} onClear={() => setQuery("")} />
      )}
    </div>
  );
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
  const idx = char.charCodeAt(0) % keys.length;
  return DEST_GRADIENTS[keys[idx]];
}

function TripCard({ trip, onView, onDelete, coverPhoto }) {
  const { t } = useTranslation();
  const destination = trip.destination || t("common.notFound");
  const tripDays = getTripDays(trip);
  const budget = trip.preferences?.budget;
  const pace = trip.preferences?.pace;
  const interests = getInterests(trip);
  const gradient = getDestGradient(destination);

  return (
    <Card className="group overflow-hidden border border-slate-200/80 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_-24px_rgba(15,23,42,0.30)]">
      <div className={`relative overflow-hidden bg-linear-to-br ${gradient} p-6 pb-8 text-white min-h-52`}>
        {/* City photo as background */}
        {coverPhoto && (
          <img
            src={coverPhoto}
            alt={destination}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {/* Gradient overlay for text readability */}
        <div className={`absolute inset-0 ${coverPhoto ? "bg-linear-to-t from-black/75 via-black/30 to-black/10" : "bg-linear-to-t from-black/60 via-black/20 to-transparent"}`} />
        {/* Decorative blobs (only without photo) */}
        {!coverPhoto && (
          <>
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          </>
        )}
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">{t("myTrips.tripCard.destination")}</div>
          <div className="mt-2 line-clamp-2 text-3xl font-black tracking-tight drop-shadow-md">{destination}</div>
          <div className="mt-3 text-sm text-white/90 drop-shadow-sm">{fmtRange(trip.startDate, trip.endDate, t("common.datesNotSet"))}</div>
        </div>
      </div>

      <CardBody className="space-y-5 bg-linear-to-b from-white to-slate-50/50">
        <div className="flex flex-wrap gap-2">
          {pace ? <Badge className="border-sky-200 bg-sky-50 text-sky-700">{t("myTrips.tripCard.pace", { pace })}</Badge> : null}
          {budget ? <Badge className="border-violet-200 bg-violet-50 text-violet-700">{t("myTrips.tripCard.budget", { budget })}</Badge> : null}
          {tripDays ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{t("myTrips.tripCard.days", { count: tripDays })}</Badge> : null}
        </div>

        {!!interests.length && (
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{t("myTrips.tripCard.interests")}</div>
            <div className="flex flex-wrap gap-2">
              {interests.slice(0, 5).map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">{item}</span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          {t("myTrips.tripCard.openItinerary")}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onView} variant="secondary" className="inline-flex w-full items-center justify-center gap-2 sm:flex-1">
            <Eye size={16} />
            {t("myTrips.tripCard.viewTrip")}
          </Button>
          <Button onClick={onDelete} variant="danger" className="inline-flex w-full items-center justify-center gap-2 sm:flex-1">
            <Trash2 size={16} />
            {t("myTrips.tripCard.delete")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function EmptyTrips({ onCreate, onClear, hasSearch }) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
      <CardBody className="bg-linear-to-b from-white to-slate-50/60">
        <div className="rounded-4xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-xl font-black text-white shadow-lg">✈</div>
          <div className="mt-5 text-2xl font-black tracking-tight text-slate-900">
            {hasSearch ? t("myTrips.empty.noTripsFound") : t("myTrips.empty.noTrips")}
          </div>
          <div className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
            {hasSearch ? t("myTrips.empty.noTripsFoundText") : t("myTrips.empty.noTripsText")}
          </div>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {hasSearch ? (
              <Button variant="secondary" onClick={onClear}>{t("myTrips.empty.clearSearch")}</Button>
            ) : null}
            <Button onClick={onCreate} className="inline-flex items-center gap-2">
              <Plus size={16} />
              {t("myTrips.empty.createTrip")}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function TripsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden border border-slate-200/80">
          {/* Dark gradient header matching TripCard */}
          <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 p-5 space-y-3">
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/20" />
            <div className="h-7 w-3/4 animate-pulse rounded-lg bg-white/20" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/15" />
          </div>
          <CardBody className="space-y-5">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <div className="h-6 w-20 animate-pulse rounded-full bg-sky-100" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-violet-100" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-emerald-100" />
            </div>
            {/* Interests */}
            <div className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
              <div className="flex flex-wrap gap-2">
                <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
                <div className="h-6 w-14 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
            {/* Itinerary hint box */}
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            {/* Buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-2xl bg-red-50" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function HeroStat({ icon, title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">{icon}</div>
      <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
    </div>
  );
}

function MiniInfo({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}
