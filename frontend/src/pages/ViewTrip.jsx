import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
} from "../components/UI.jsx";

const BLOCKS = ["morning", "afternoon", "evening"];
const BLOCK_ORDER = { morning: 1, afternoon: 2, evening: 3 };

const fmtRange = (s, e) => (s && e ? `${s} → ${e}` : "");

const clamp = (s, n = 120) => {
  const str = (s ?? "").toString();
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
};

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

function buildPhotoQuery(item = {}, destination = "") {
  return [
    item?.title,
    item?.name,
    item?.placeName,
    item?.location,
    item?.address,
    destination,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function extractUniqueLocations(itinerary, destination = "", placeFallback = "Place") {
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
            image: a?.image || a?.imageUrl || a?.photo || a?.photoUrl || null,
            photoQuery: buildPhotoQuery(a, destination),
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

function usePlacePhotos(places, destination = "") {
  const stablePlaces = useMemo(
    () => (Array.isArray(places) ? places.filter(Boolean) : []),
    [places]
  );

  return useAsync(async () => {
    if (!stablePlaces.length) return [];

    const payload = stablePlaces.map((item) => ({
      query:
        item.photoQuery ||
        buildPhotoQuery(item, destination) ||
        item.title ||
        item.name ||
        item.placeName ||
        item.location ||
        item.address ||
        "",
      title: item.title || item.name || item.placeName || "",
      location: item.location || "",
      address: item.address || "",
      destination,
    }));

    const { data } = await api.post("/places/photos", { places: payload });
    const results = Array.isArray(data?.results) ? data.results : [];

    // Promise.all preserves order so results[i] matches stablePlaces[i]
    return stablePlaces.map((item, idx) => {
      const result = results[idx];
      return {
        ...item,
        photoUrl: item.photoUrl || item.image || item.imageUrl || item.photo || result?.photoUrl || null,
        photoAttribution: item.photoAttribution || result?.photoAttribution || null,
      };
    });
  }, [stablePlaces, destination]);
}

function scrollToDay(dayNumber) {
  const el = document.getElementById(`day-${dayNumber}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
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

export default function ViewTrip() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const nav = useNavigate();
  const { id } = useParams();

  const tripState = useAsync(async () => (await api.get(`/trips/${id}`)).data, [id]);
  const trip = tripState.data;
  const summary = trip?.itinerary?.tripSummary || {};
  const tripMode = normalizeTripMode(trip?.tripMode);
  const destinations = getTripDestinations(trip);
  const primaryDestination = trip?.destination || destinations[0] || "";

  const rawRecommendedPlaces = useMemo(() => getRecommendedPlaces(trip), [trip]);

  const pdfRef = useRef(null);
  const [openDays, setOpenDays] = useState({});
  const [downloadError, setDownloadError] = useState("");

  const locations = useMemo(
    () => extractUniqueLocations(trip?.itinerary, primaryDestination, t("viewTrip.place")),
    [trip, primaryDestination, t]
  );

  const itineraryPhotosState = usePlacePhotos(locations, primaryDestination);
  const placesWithPhotos = itineraryPhotosState.data || locations;

  const photoMap = useMemo(() => {
    const map = new Map();
    placesWithPhotos.forEach((p) => {
      const key = normalizeText(p.address || p.location || p.title);
      if (key && p.photoUrl) map.set(key, p.photoUrl);
    });
    return map;
  }, [placesWithPhotos]);

  const recommendedBase = useMemo(
    () =>
      rawRecommendedPlaces.map((place) => ({
        ...place,
        title: place?.title || place?.name || t("viewTrip.recommendedPlace"),
        notes: place?.notes || place?.reason || "",
        photoQuery: buildPhotoQuery(place, primaryDestination),
      })),
    [rawRecommendedPlaces, primaryDestination, t]
  );

  const recommendedPhotosState = usePlacePhotos(
    recommendedBase,
    primaryDestination
  );
  const recommendedPlaces = recommendedPhotosState.data || recommendedBase;

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

  const tripMapPlaces = useMemo(() => {
    return locations.map((item) => ({
      title: item.title,
      location: item.location,
      address: item.address,
    }));
  }, [locations]);

  const toggleDay = (dayNumber) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayNumber]: !prev[dayNumber],
    }));
  };

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

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {downloadError ? <Alert type="error">{downloadError}</Alert> : null}
      {itineraryPhotosState.error ? (
        <Alert type="error">{itineraryPhotosState.error}</Alert>
      ) : null}
      {recommendedPhotosState.error ? (
        <Alert type="error">{recommendedPhotosState.error}</Alert>
      ) : null}

      <div
        ref={pdfRef}
        className="space-y-8 rounded-4xl bg-linear-to-b from-slate-50 via-white to-sky-50/40 p-1"
      >
        <Header
          trip={trip}
          summary={summary}
          tripMode={tripMode}
          destinations={destinations}
          onBack={() => nav("/trips")}
          onNew={() => nav("/create")}
          onEdit={() => nav(`/trip/${id}/edit`)}
          onDownload={downloadPDF}
        />

        <TripOverview
          trip={trip}
          summary={summary}
          tripMode={tripMode}
          destinations={destinations}
          totalActivities={totalActivities}
          totalHours={totalHours}
          placeCount={placeCount}
        />

        <HotelsSection trip={trip} />

        <CityPlanSection
          summary={summary}
          tripMode={tripMode}
          destinations={destinations}
        />

        <EventsSection events={trip?.events || []} />

        <div className="grid gap-6 lg:grid-cols-2">
          {trip?.itinerary?.days?.map((d) => (
            <DayCard
              key={d.day}
              day={d}
              isOpen={Boolean(openDays[d.day])}
              onToggle={() => toggleDay(d.day)}
              destination={primaryDestination}
              photoMap={photoMap}
            />
          ))}
        </div>

        {!!trip?.itinerary?.tips?.length && (
          <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
            <CardHeader
              title={t("viewTrip.tripTips")}
              subtitle={t("viewTrip.tripTipsSubtitle")}
            />
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

        <PlacesGallery
          points={placesWithPhotos}
          loading={itineraryPhotosState.loading}
        />

        <RecommendedPlacesSection
          places={recommendedPlaces}
          // onJump={handleJumpToDay}
          loading={recommendedPhotosState.loading}
        />
      </div>
    </div>
  );
}

function Header({
  trip,
  summary,
  tripMode,
  destinations,
  onBack,
  onNew,
  onEdit,
  onDownload,
}) {
  const { t } = useTranslation();
  return (
    <Card className="relative overflow-hidden border-0 shadow-[0_24px_80px_-28px_rgba(37,99,235,0.55)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_24%)]" />
      <div className="relative bg-linear-to-br from-sky-700 via-blue-700 to-indigo-900 text-white">
        <div className="flex flex-col gap-6 px-6 py-7 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white/85">
              {tripMode === "multi" ? t("viewTrip.multiCityItinerary") : t("viewTrip.smartTravelPlan")}
            </div>

            <div className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {trip?.destination || t("viewTrip.trip")}
            </div>

            <div className="mt-2 text-sm text-white/85 sm:text-base">
              {fmtRange(trip?.startDate, trip?.endDate)}
            </div>

            {tripMode === "multi" && destinations.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {destinations.map((city) => (
                  <span
                    key={city}
                    className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
                  >
                    {city}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            {summary.days ? (
              <Badge className="border-white/20 bg-white/10 text-white shadow-sm">
                {t("viewTrip.days", { count: summary.days })}
              </Badge>
            ) : null}

            {tripMode === "multi" ? (
              <Badge className="border-white/20 bg-white/10 text-white shadow-sm">
                {t("viewTrip.cities", { count: destinations.length })}
              </Badge>
            ) : null}

            {summary.style ? (
              <Badge className="border-white/20 bg-white/10 text-white shadow-sm">
                {t("viewTrip.pace", { pace: summary.style })}
              </Badge>
            ) : null}

            {summary.budget ? (
              <Badge className="border-white/20 bg-white/10 text-white shadow-sm">
                {t("viewTrip.budget", { budget: summary.budget })}
              </Badge>
            ) : null}

            {!!trip?.events?.length ? (
              <Badge className="border-white/20 bg-white/10 text-white shadow-sm">
                {t("viewTrip.events", { count: trip.events.length })}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3 px-6 pb-7 sm:px-8">
          <Button type="button" onClick={onBack} variant="secondary">
            {t("viewTrip.back")}
          </Button>

          <Button
            type="button"
            onClick={onEdit}
            variant="secondary"
            className="bg-white/15 text-white backdrop-blur hover:bg-white/20"
          >
            {t("viewTrip.editTrip")}
          </Button>

          <Button
            type="button"
            onClick={onNew}
            variant="ghost"
            className="bg-white/10 text-white backdrop-blur hover:bg-white/15"
          >
            {t("viewTrip.createNew")}
          </Button>

          <Button
            type="button"
            className=" text-sky-800 shadow-lg hover:bg-sky-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDownload?.();
            }}
          >
            {t("viewTrip.downloadPDF")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TripOverview({
  trip,
  summary,
  tripMode,
  destinations,
  totalActivities,
  totalHours,
  placeCount,
}) {
  const { t } = useTranslation();
  const preferences = trip?.preferences || {};
  const interests = Array.isArray(preferences?.interests)
    ? preferences.interests
    : [];

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title={t("viewTrip.tripOverview")}
        subtitle={t("viewTrip.tripOverviewSubtitle")}
      />
      <CardBody className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            value={summary?.budget || preferences?.budget || "—"}
            icon="💳"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FancyInfoTile label={t("viewTrip.activities")} value={totalActivities || "0"} icon="🧭" />
          <FancyInfoTile
            label={t("viewTrip.estimatedHours")}
            value={formatHours(totalHours)}
            icon="⏱️"
          />
          <FancyInfoTile label={t("viewTrip.events_label")} value={trip?.events?.length || "0"} icon="🎟️" />
          <FancyInfoTile label={t("viewTrip.places")} value={placeCount || "0"} icon="📍" />
        </div>

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

function RecommendedPlacesSection({ places, onJump, loading }) {
  const { t } = useTranslation();
  if (!places?.length && !loading) return null;

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title={t("viewTrip.recommendedPlaces")}
        subtitle={t("viewTrip.recommendedPlacesSubtitle")}
        right={
          !loading ? (
            <Badge className="bg-sky-50 text-sky-700">{t("viewTrip.placesCount", { count: places.length })}</Badge>
          ) : null
        }
      />
      <CardBody>
        {loading && !places?.length ? (
          <SoftMessage>{t("viewTrip.loadingPlacePhotos")}</SoftMessage>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {places.map((place, i) => {
              const title =
                place?.title ||
                place?.name ||
                place?.placeName ||
                place?.location ||
                t("viewTrip.recommendedPlace");

              const image =
                place?.photoUrl ||
                place?.image ||
                place?.imageUrl ||
                place?.photo ||
                null;

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
                  className="group overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden bg-slate-100">
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-sm font-medium text-slate-500">
                        {t("viewTrip.noPhotoAvailable")}
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/55 to-transparent" />

                    {dayNumber ? (
                      <div className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                        {t("viewTrip.dayLabel", { number: dayNumber })}
                      </div>
                    ) : null}
                  </div>

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
        )}
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

function PlacesGallery({ points, loading }) {
  const { t } = useTranslation();
  if (!points?.length && !loading) return null;

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
      <CardHeader
        title={t("viewTrip.placesGallery")}
        subtitle={t("viewTrip.placesGallerySubtitle")}
        right={
          !loading ? (
            <Badge className="bg-sky-50 text-sky-700">{t("viewTrip.placesCount", { count: points.length })}</Badge>
          ) : null
        }
      />
      <CardBody>
        {loading && !points?.length ? (
          <SoftMessage>{t("viewTrip.loadingPlacePhotosGallery")}</SoftMessage>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {points.map((place, i) => {

              return (
                <div
                  key={`${place.address || place.location || place.title}-${i}`}
                  className="group overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden bg-slate-100">
                    {place.photoUrl ? (
                      <img
                        src={place.photoUrl}
                        alt={place.title || place.location}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-sm font-medium text-slate-500">
                        {t("viewTrip.noPhotoAvailable")}
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/55 to-transparent" />

                    <div className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      {t("viewTrip.dayTimeBlock", { day: place.day, timeBlock: place.timeBlock })}
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <div className="text-lg font-extrabold tracking-tight text-slate-900">
                        {place.title || t("viewTrip.place")}
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
                      {place.durationHours ? (
                        <Tag color="indigo">{formatHours(Number(place.durationHours))}</Tag>
                      ) : null}
                      {place.category ? <Tag color="slate">{place.category}</Tag> : null}
                      {place.type ? <Tag color="sky">{place.type}</Tag> : null}
                    </div>

                    {place.notes ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                        {place.notes}
                      </div>
                    ) : null}

                    {place.address ? (
                      <div className="text-xs leading-5 text-slate-500">
                        {place.address}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-3">
                      <GoogleMapsButton
                        place={place}
                        className="text-xs font-bold text-sky-700 transition hover:text-sky-800"
                      />
                    </div>  
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function DayCard({ day, isOpen, onToggle, photoMap = new Map() }) {
  const { t } = useTranslation();
  const activityCount = countDayActivities(day);
  const totalHours = getDayEstimatedHours(day);

  return (
    <Card
      id={`day-${day.day}`}
      className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur scroll-mt-28"
    >
      <div className="relative overflow-hidden bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.16),transparent_24%)]" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
              {t("viewTrip.dayLabel", { number: day.day })}
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight leading-snug">
              {day.title}
            </div>
            <div className="mt-2 text-sm text-white/80">{day.date}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
          <MiniSection title={t("viewTrip.morning")} items={day.morning} icon="☀️" photoMap={photoMap} />
          <MiniSection title={t("viewTrip.afternoon")} items={day.afternoon} icon="🌤️" photoMap={photoMap} />
          <MiniSection title={t("viewTrip.evening")} items={day.evening} icon="🌙" photoMap={photoMap} />

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
        </CardBody>
      ) : null}
    </Card>
  );
}

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

function MiniSection({ title, items, icon, photoMap = new Map() }) {
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
          const photoKey = normalizeText(x.address || x.location || x.title);
          const photoUrl = x.photoUrl || x.image || photoMap.get(photoKey) || null;

          return (
            <li
              key={x.id ?? `${x.title}-${x.address || x.location}-${i}`}
              className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-linear-to-br from-white to-slate-50 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
            >
              {photoUrl && (
                <div className="relative h-28 sm:h-36 w-full overflow-hidden">
                  <img
                    src={photoUrl}
                    alt={x.title || x.location}
                    className="h-full w-full object-cover transition duration-700 hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/50 to-transparent" />
                </div>
              )}
              <div className="px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold tracking-tight text-slate-900">
                      {x.title}
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

function Tag({ children, color = "slate" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700",
    sky: "bg-sky-100 text-sky-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${styles[color] || styles.slate}`}
    >
      {children}
    </span>
  );
}

function buildBookingUrl({ destination, startDate, endDate, travelers }) {
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
  const destination = trip?.destination || "";
  const startDate = trip?.startDate || "";
  const endDate = trip?.endDate || "";
  const travelers = trip?.preferences?.travelers || 1;

  if (!destination) return null;

  const url = buildBookingUrl({ destination, startDate, endDate, travelers });

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

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-xl"
          >
            {t("viewTrip.hotels.searchButton")} →
          </a>
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