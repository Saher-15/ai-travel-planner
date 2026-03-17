import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Compass,
  MapPinned,
  Plus,
  RefreshCw,
  Sparkles,
  Ticket,
  Users,
  Wand2,
  Music4,
  UtensilsCrossed,
  Drama,
  Trophy,
  MoonStar,
  PartyPopper,
} from "lucide-react";
import { api } from "../api/client.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
} from "../components/UI.jsx";
import MapTilerMap from "../components/MapTilerMap.jsx";
import CityAutoComplete from "../components/CityAutoComplete.jsx";

const interestOptions = [
  "history",
  "food",
  "culture",
  "nature",
  "shopping",
  "nightlife",
  "family",
];

const eventTypeCardDefs = [
  { id: "festival", icon: <PartyPopper size={18} /> },
  { id: "concert", icon: <Music4 size={18} /> },
  { id: "culture", icon: <Drama size={18} /> },
  { id: "nightlife", icon: <MoonStar size={18} /> },
  { id: "food", icon: <UtensilsCrossed size={18} /> },
  { id: "family", icon: <Users size={18} /> },
  { id: "sports", icon: <Trophy size={18} /> },
];

function toISODateLocal(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISOPlus(days = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toISODateLocal(d);
}

function addDays(isoDate, days) {
  if (!isoDate) return todayISOPlus(days);
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return todayISOPlus(days);
  d.setDate(d.getDate() + days);
  return toISODateLocal(d);
}

function clampToToday(isoDate) {
  const today = todayISOPlus(0);
  if (!isoDate) return today;
  return isoDate < today ? today : isoDate;
}

function normalizeSourceTab(tab) {
  if (!tab) return "";
  if (["Flights", "Hotels", "Stays", "Activities"].includes(tab)) return tab;
  return "";
}

function getTripEnergy(pace, budget, t) {
  if (pace === "packed" && budget === "high") {
    return t("createTrip.energy.packedHigh");
  }
  if (pace === "packed") return t("createTrip.energy.packed");
  if (pace === "relaxed" && budget === "high") {
    return t("createTrip.energy.relaxedHigh");
  }
  if (pace === "relaxed") return t("createTrip.energy.relaxed");
  return t("createTrip.energy.default");
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getTravelerSummary(travelers, t) {
  const adults = Number(travelers.adults || 0);
  const children = Number(travelers.children || 0);
  const infants = Number(travelers.infants || 0);
  const total = adults + children + infants;

  if (!total) return t("createTrip.travelerSummary.notSpecified");

  const parts = [];
  if (adults) parts.push(t(adults === 1 ? "createTrip.travelerSummary.adult_one" : "createTrip.travelerSummary.adult_other", { count: adults }));
  if (children) parts.push(t(children === 1 ? "createTrip.travelerSummary.child_one" : "createTrip.travelerSummary.child_other", { count: children }));
  if (infants) parts.push(t(infants === 1 ? "createTrip.travelerSummary.infant_one" : "createTrip.travelerSummary.infant_other", { count: infants }));

  return parts.join(", ");
}

function getTravelerCount(travelers) {
  return (
    Number(travelers?.adults || 0) +
    Number(travelers?.children || 0) +
    Number(travelers?.infants || 0)
  );
}

function clampTravelerValue(value, min, max) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function parseTravelersParam(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return { adults: 2, children: 0, infants: 0 };
  }

  if (/^\d+$/.test(raw)) {
    const total = clampTravelerValue(Number(raw), 1, 12);
    return { adults: total, children: 0, infants: 0 };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      adults: clampTravelerValue(parsed?.adults, 1, 12),
      children: clampTravelerValue(parsed?.children, 0, 8),
      infants: clampTravelerValue(parsed?.infants, 0, 6),
    };
  } catch {
    return { adults: 2, children: 0, infants: 0 };
  }
}

function normalizePlace(place) {
  if (!place) return null;

  const placeName = String(place.placeName || place.name || "").trim();
  if (!placeName) return null;

  return {
    id:
      place.id ||
      `${placeName}-${place.center?.[0] || 0}-${place.center?.[1] || 0}`,
    name: place.name || placeName,
    placeName,
    center: Array.isArray(place.center) ? place.center : [],
    country: place.country || "",
    region: place.region || "",
    countryCode: place.countryCode || "",
    flag: place.flag || "🌍",
    type: place.type || "place",
  };
}

export default function CreateTrip() {
  const { t, i18n } = useTranslation();

  const eventTypeCards = eventTypeCardDefs.map((item) => ({
    ...item,
    label: t(`createTrip.events.types.${item.id}`),
    desc: t(`createTrip.events.${item.id}Desc`),
  }));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const destinationParam = searchParams.get("destination") || "";
  const startDateParam = searchParams.get("startDate") || "";
  const endDateParam = searchParams.get("endDate") || "";
  const travelersParam = searchParams.get("travelers") || "";
  const sourceTabParam = normalizeSourceTab(searchParams.get("sourceTab") || "");
  const tripTypeParam = searchParams.get("tripType") || "";
  const fromParam = searchParams.get("from") || "";

  const safeInitialStart = clampToToday(startDateParam || todayISOPlus(0));
  const safeInitialEnd =
    endDateParam && endDateParam > safeInitialStart
      ? endDateParam
      : addDays(safeInitialStart, 1);

  const [tripMode, setTripMode] = useState("single");
  const [destination, setDestination] = useState(destinationParam);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const [multiCityInput, setMultiCityInput] = useState("");
  const [multiCitySelectedPlace, setMultiCitySelectedPlace] = useState(null);
  const [multiCityPlaces, setMultiCityPlaces] = useState([]);

  const [startDate, setStartDate] = useState(safeInitialStart);
  const [endDate, setEndDate] = useState(safeInitialEnd);
  const [pace, setPace] = useState("moderate");
  const [budget, setBudget] = useState("mid");
  const [interests, setInterests] = useState([]);
  const [notes, setNotes] = useState("");
  const [includeEvents, setIncludeEvents] = useState(true);
  const [eventTypes, setEventTypes] = useState([]);
  const [travelers, setTravelers] = useState(parseTravelersParam(travelersParam));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const sourceTab = sourceTabParam;
  const tripType = tripTypeParam;
  const from = fromParam;

  useEffect(() => {
    const nextStart = clampToToday(startDateParam || todayISOPlus(0));
    const nextEnd =
      endDateParam && endDateParam > nextStart
        ? endDateParam
        : addDays(nextStart, 1);

    setDestination(destinationParam || "");
    setSelectedPlace(null);
    setMultiCityInput("");
    setMultiCitySelectedPlace(null);
    setMultiCityPlaces([]);
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setTravelers(parseTravelersParam(travelersParam));

    if (sourceTab === "Activities") {
      setInterests((prev) => {
        const next = new Set(prev);
        next.add("culture");
        if (tripType === "food") next.add("food");
        if (tripType === "nature") next.add("nature");
        if (tripType === "highlights") next.add("history");
        return [...next];
      });
    }

    if (sourceTab === "Hotels" || sourceTab === "Stays") {
      setPace("relaxed");
      if (tripType === "suite") setBudget("high");
      else if (tripType === "apartment") setBudget("mid");
    }

    if (sourceTab === "Flights") {
      if (tripType === "multi") setPace("packed");
      else if (tripType === "oneway") setPace("moderate");
    }
  }, [
    destinationParam,
    startDateParam,
    endDateParam,
    travelersParam,
    sourceTab,
    tripType,
  ]);

  const minStartDate = todayISOPlus(0);
  const minEndDate = useMemo(
    () => addDays(startDate || minStartDate, 1),
    [startDate, minStartDate]
  );

  const travelerCount = useMemo(() => getTravelerCount(travelers), [travelers]);
  const travelerSummary = useMemo(() => getTravelerSummary(travelers, t), [travelers, t]);

  const daysCount = useMemo(() => {
    const s = new Date(`${startDate}T12:00:00`);
    const e = new Date(`${endDate}T12:00:00`);

    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s >= e) {
      return null;
    }

    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const tripEnergy = useMemo(() => getTripEnergy(pace, budget, t), [pace, budget, t]);

  const previewTitle = useMemo(() => {
    if (tripMode === "multi") {
      return multiCityPlaces.length
        ? multiCityPlaces.map((city) => city.placeName).join(" → ")
        : t("createTrip.previewTitle.yourCities");
    }
    return destination || t("createTrip.previewTitle.yourDestination");
  }, [tripMode, multiCityPlaces, destination, t]);

  const mapQuery = useMemo(() => {
    if (tripMode === "multi") return multiCityPlaces[0]?.placeName || "";
    return destination;
  }, [tripMode, multiCityPlaces, destination]);

  const formSummary = useMemo(() => {
    if (tripMode === "single" && !destination.trim()) {
      return t("createTrip.formSummary.chooseDestination");
    }

    if (tripMode === "multi" && multiCityPlaces.length === 0) {
      return t("createTrip.formSummary.addCities");
    }

    const target =
      tripMode === "multi"
        ? multiCityPlaces.map((city) => city.placeName).join(" → ")
        : destination.trim();

    const paceName = t(`createTrip.preferences.paceOptions.${pace === "packed" ? "fast" : pace}`);
    const budgetName = t(`createTrip.preferences.budgetOptions.${budget === "low" ? "budget" : budget === "high" ? "luxury" : "midRange"}`);

    let summary = t("createTrip.formSummary.tripBase", { pace: paceName, days: daysCount || "", target });
    if (budget) summary += t("createTrip.formSummary.withBudget", { budget: budgetName });
    if (travelerCount) summary += t("createTrip.formSummary.forTravelers", { summary: travelerSummary });
    if (includeEvents) summary += t("createTrip.formSummary.includingEvents");
    return summary;
  }, [
    tripMode,
    destination,
    multiCityPlaces,
    pace,
    daysCount,
    budget,
    travelerCount,
    travelerSummary,
    includeEvents,
    t,
  ]);

  const eventSummary = useMemo(() => {
    if (!includeEvents) return t("createTrip.eventSummary.off");
    if (!eventTypes.length) return t("createTrip.eventSummary.mixed");
    return t("createTrip.eventSummary.prioritize", { types: eventTypes.join(", ") });
  }, [includeEvents, eventTypes, t]);

  function toggleInterest(x) {
    setInterests((prev) =>
      prev.includes(x) ? prev.filter((i) => i !== x) : [...prev, x]
    );
  }

  function toggleEventType(x) {
    setEventTypes((prev) =>
      prev.includes(x) ? prev.filter((i) => i !== x) : [...prev, x]
    );
  }

  function handleStartDateChange(value) {
    const safeStart = clampToToday(value || todayISOPlus(0));
    setStartDate(safeStart);
    setEndDate(addDays(safeStart, 1));
  }

  function handleEndDateChange(value) {
    if (!value) {
      setEndDate(addDays(startDate, 1));
      return;
    }
    if (value <= startDate) {
      setEndDate(addDays(startDate, 1));
      return;
    }
    setEndDate(value);
  }

  function updateTraveler(type, delta) {
    setTravelers((prev) => {
      const limits = {
        adults: { min: 1, max: 12 },
        children: { min: 0, max: 8 },
        infants: { min: 0, max: 6 },
      };

      const current = Number(prev[type] || 0);
      const nextValue = clampTravelerValue(
        current + delta,
        limits[type].min,
        limits[type].max
      );

      return { ...prev, [type]: nextValue };
    });
  }

  function addMultiCity() {
    const normalized = normalizePlace(multiCitySelectedPlace);

    if (!normalized) {
      setErr(t("createTrip.errors.chooseSuggestion"));
      return;
    }

    const alreadyExists = multiCityPlaces.some(
      (city) => city.placeName.toLowerCase() === normalized.placeName.toLowerCase()
    );

    if (alreadyExists) {
      setErr(t("createTrip.errors.cityAlreadyAdded"));
      return;
    }

    setMultiCityPlaces((prev) => [...prev, normalized]);
    setMultiCityInput("");
    setMultiCitySelectedPlace(null);
    setErr("");
  }

  function removeMultiCity(index) {
    setMultiCityPlaces((prev) => prev.filter((_, i) => i !== index));
  }

  function moveMultiCityUp(index) {
    if (index === 0) return;
    setMultiCityPlaces((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  }

  function moveMultiCityDown(index) {
    setMultiCityPlaces((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]];
      return copy;
    });
  }

  function resetForm() {
    const nextStart = clampToToday(startDateParam || todayISOPlus(0));
    setTripMode("single");
    setDestination(destinationParam || "");
    setSelectedPlace(null);
    setMultiCityInput("");
    setMultiCitySelectedPlace(null);
    setMultiCityPlaces([]);
    setStartDate(nextStart);
    setEndDate(addDays(nextStart, 1));
    setPace("moderate");
    setBudget("mid");
    setInterests([]);
    setNotes("");
    setIncludeEvents(true);
    setEventTypes([]);
    setTravelers(parseTravelersParam(travelersParam));
    setErr("");
  }

  async function generate(e) {
    e.preventDefault();
    setErr("");

    const cleanDestination = destination.trim();
    const cleanNotes = notes.trim();
    const cities = multiCityPlaces.map((city) => city.placeName);

    if (tripMode === "single" && !cleanDestination) {
      setErr(t("createTrip.errors.enterDestination"));
      return;
    }

    if (tripMode === "single" && !selectedPlace) {
      setErr(t("createTrip.errors.chooseDestinationSuggestion"));
      return;
    }

    if (tripMode === "multi" && multiCityPlaces.length < 2) {
      setErr(t("createTrip.errors.minCities"));
      return;
    }

    if (!daysCount) {
      setErr(t("createTrip.errors.selectValidDates"));
      return;
    }

    if (daysCount > 30) {
      setErr(t("createTrip.errors.maxDays"));
      return;
    }

    if (travelerCount < 1) {
      setErr(t("createTrip.errors.minTravelers"));
      return;
    }

    const payload = {
      tripMode,
      language: i18n.language?.split("-")[0] || "en",
      destination: tripMode === "single" ? cleanDestination : cities.join(" → "),
      destinations: tripMode === "multi" ? cities : [cleanDestination],
      startDate,
      endDate,
      preferences: {
        pace,
        budget,
        interests,
        notes: cleanNotes,
        travelers: {
          adults: Number(travelers.adults || 0),
          children: Number(travelers.children || 0),
          infants: Number(travelers.infants || 0),
          total: travelerCount,
          summary: travelerSummary,
        },
        sourceTab,
        tripType,
        from,
        includeEvents,
        eventTypes,
      },
      placeMeta:
        tripMode === "single" && selectedPlace
          ? {
              label: selectedPlace.placeName,
              name: selectedPlace.name,
              country: selectedPlace.country,
              region: selectedPlace.region || "",
              lng: selectedPlace.center?.[0] ?? null,
              lat: selectedPlace.center?.[1] ?? null,
            }
          : null,
      multiCityMeta:
        tripMode === "multi"
          ? multiCityPlaces.map((city) => ({
              label: city.placeName,
              name: city.name,
              country: city.country,
              region: city.region || "",
              lng: city.center?.[0] ?? null,
              lat: city.center?.[1] ?? null,
            }))
          : [],
    };

    nav("/generating-trip", {
      state: { payload },
    });
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-4xl border border-slate-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-linear-to-br from-sky-50 via-white to-indigo-50" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative grid gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <div className="lg:col-span-8">
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">
              {t("createTrip.badge")}
            </Badge>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {t("createTrip.title")}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              {t("createTrip.description")}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <TopHeroStat
                icon={<MapPinned size={18} />}
                label={t("createTrip.tripType.title")}
                value={tripMode === "multi" ? t("createTrip.tripType.multiCity") : t("createTrip.tripType.oneWay")}
              />
              <TopHeroStat
                icon={<CalendarDays size={18} />}
                label={t("createTrip.dates.title")}
                value={daysCount ? `${daysCount} ${t("common.days")}` : t("createTrip.dates.title")}
              />
              <TopHeroStat
                icon={<Users size={18} />}
                label={t("createTrip.travelers.title")}
                value={travelerCount ? `${travelerCount} ${t("createTrip.travelers.total")}` : t("createTrip.travelers.title")}
              />
              <TopHeroStat
                icon={<Sparkles size={18} />}
                label={t("createTrip.events.title")}
                value={includeEvents ? t("createTrip.generate.button") : t("createTrip.events.title")}
              />
            </div>

            <div className="mt-6 rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
                {t("createTrip.generate.summary")}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-700">
                {formSummary}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-4xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-bold text-slate-900">
                {t("createTrip.generate.readyToGenerate")}
              </div>
              <div className="mt-4 grid gap-3">
                <MiniInsight
                  title={t("createTrip.preferences.pace")}
                  text={t("createTrip.preferences.subtitle")}
                />
                <MiniInsight
                  title={t("createTrip.travelers.title")}
                  text={t("createTrip.travelers.subtitle")}
                />
                <MiniInsight
                  title={t("createTrip.events.title")}
                  text={t("createTrip.events.subtitle")}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader
              title={t("createTrip.destination.title")}
              subtitle={t("createTrip.destination.subtitle")}
              right={
                <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                  {daysCount ? `${daysCount} ${t("common.days")}` : t("createTrip.dates.title")}
                </Badge>
              }
            />

            <CardBody className="space-y-6 bg-linear-to-b from-white to-slate-50/60">
              <form onSubmit={generate} className="space-y-6">
                <SectionBlock
                  title={t("createTrip.tripType.title")}
                  subtitle={t("createTrip.tripType.label")}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ModeCard
                      active={tripMode === "single"}
                      tone="sky"
                      title={t("createTrip.tripType.oneWay")}
                      text={t("createTrip.destination.subtitle")}
                      onClick={() => setTripMode("single")}
                    />
                    <ModeCard
                      active={tripMode === "multi"}
                      tone="indigo"
                      title={t("createTrip.tripType.multiCity")}
                      text={t("createTrip.destination.mapSubtitle")}
                      onClick={() => setTripMode("multi")}
                    />
                  </div>
                </SectionBlock>

                <SectionBlock
                  title={tripMode === "single" ? t("createTrip.destination.title") : t("createTrip.tripType.multiCity")}
                  subtitle={
                    tripMode === "single"
                      ? t("createTrip.destination.subtitle")
                      : t("createTrip.destination.mapSubtitle")
                  }
                  right={
                    tripMode === "multi" ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {multiCityPlaces.length} {t("common.destination")}
                      </span>
                    ) : null
                  }
                >
                  {tripMode === "single" ? (
                    <CityAutoComplete
                      label={t("createTrip.destination.label")}
                      placeholder={t("createTrip.destination.placeholder")}
                      value={destination}
                      onChange={(value) => {
                        setDestination(value);
                        setSelectedPlace(null);
                      }}
                      onSelect={(place) => {
                        setDestination(place.placeName || place.name || "");
                        setSelectedPlace(place);
                      }}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <CityAutoComplete
                          label={t("createTrip.destination.label")}
                          placeholder={t("createTrip.destination.placeholder")}
                          value={multiCityInput}
                          onChange={(value) => {
                            setMultiCityInput(value);
                            setMultiCitySelectedPlace(null);
                          }}
                          onSelect={(place) => {
                            setMultiCityInput(place.placeName || place.name || "");
                            setMultiCitySelectedPlace(place);
                          }}
                          onEnter={() => {
                            addMultiCity();
                          }}
                        />

                        <Button
                          type="button"
                          className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                          onClick={addMultiCity}
                        >
                          <Plus size={16} />
                          {t("createTrip.addCity")}
                        </Button>
                      </div>

                      {multiCityPlaces.length ? (
                        <div className="space-y-3">
                          {multiCityPlaces.map((city, index) => (
                            <div
                              key={city.id}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{city.flag || "🌍"}</span>
                                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                                    {t("createTrip.stop", { n: index + 1 })}
                                  </span>
                                </div>

                                <div className="mt-2 text-sm font-bold text-slate-900">
                                  {city.placeName}
                                </div>

                                {(city.region || city.country) && (
                                  <div className="mt-1 text-xs text-slate-500">
                                    {[city.region, city.country]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => moveMultiCityUp(index)}
                                  disabled={index === 0}
                                  className={cx(
                                    "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                                    index === 0
                                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  ↑ {t("common.previous")}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => moveMultiCityDown(index)}
                                  disabled={index === multiCityPlaces.length - 1}
                                  className={cx(
                                    "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                                    index === multiCityPlaces.length - 1
                                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  ↓ {t("common.next")}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => removeMultiCity(index)}
                                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                                >
                                  {t("common.delete")}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          {t("createTrip.destination.mapSubtitle")}
                        </div>
                      )}
                    </div>
                  )}
                </SectionBlock>

                <SectionBlock title={t("createTrip.dates.title")} subtitle={t("createTrip.dates.subtitle")}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label={t("createTrip.dates.startDate")}
                      type="date"
                      value={startDate}
                      min={minStartDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                    <Input
                      label={t("createTrip.dates.endDate")}
                      type="date"
                      value={endDate}
                      min={minEndDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                    />
                  </div>
                </SectionBlock>

                <SectionBlock
                  title={t("createTrip.preferences.title")}
                  subtitle={t("createTrip.preferences.subtitle")}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                      label={t("createTrip.preferences.pace")}
                      value={pace}
                      onChange={(e) => setPace(e.target.value)}
                    >
                      <option value="relaxed">{t("createTrip.preferences.paceOptions.relaxed")}</option>
                      <option value="moderate">{t("createTrip.preferences.paceOptions.moderate")}</option>
                      <option value="packed">{t("createTrip.preferences.paceOptions.fast")}</option>
                    </Select>

                    <Select
                      label={t("createTrip.preferences.budget")}
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    >
                      <option value="low">{t("createTrip.preferences.budgetOptions.budget")}</option>
                      <option value="mid">{t("createTrip.preferences.budgetOptions.midRange")}</option>
                      <option value="high">{t("createTrip.preferences.budgetOptions.luxury")}</option>
                    </Select>
                  </div>

                  <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                      {t("createTrip.generate.summary")}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-800">
                      {tripEnergy}
                    </div>
                  </div>
                </SectionBlock>

                <SectionBlock
                  title={t("createTrip.travelers.title")}
                  subtitle={t("createTrip.travelers.subtitle")}
                  right={
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {travelerCount} {t("createTrip.travelers.total")}
                    </span>
                  }
                >
                  <div className="space-y-3">
                    <TravelerRow
                      title={t("createTrip.travelers.adults")}
                      subtitle={t("createTrip.travelers.adultsSubtitle")}
                      value={travelers.adults}
                      onDecrease={() => updateTraveler("adults", -1)}
                      onIncrease={() => updateTraveler("adults", 1)}
                      disableDecrease={Number(travelers.adults) <= 1}
                      disableIncrease={Number(travelers.adults) >= 12}
                    />

                    <TravelerRow
                      title={t("createTrip.travelers.children")}
                      subtitle={t("createTrip.travelers.childrenSubtitle")}
                      value={travelers.children}
                      onDecrease={() => updateTraveler("children", -1)}
                      onIncrease={() => updateTraveler("children", 1)}
                      disableDecrease={Number(travelers.children) <= 0}
                      disableIncrease={Number(travelers.children) >= 8}
                    />

                    <TravelerRow
                      title={t("createTrip.travelers.infants")}
                      subtitle={t("createTrip.travelers.infantsSubtitle")}
                      value={travelers.infants}
                      onDecrease={() => updateTraveler("infants", -1)}
                      onIncrease={() => updateTraveler("infants", 1)}
                      disableDecrease={Number(travelers.infants) <= 0}
                      disableIncrease={Number(travelers.infants) >= 6}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("createTrip.travelers.total")}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-800">
                      {travelerSummary}
                    </div>
                  </div>
                </SectionBlock>

                <SectionBlock
                  title={t("createTrip.interests.title")}
                  subtitle={t("createTrip.interests.subtitle")}
                  right={
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {interests.length} {t("common.interests")}
                    </span>
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    {interestOptions.map((x) => {
                      const active = interests.includes(x);

                      return (
                        <button
                          type="button"
                          key={x}
                          onClick={() => toggleInterest(x)}
                          className={cx(
                            "rounded-full border px-3.5 py-2 text-xs font-semibold capitalize transition-all duration-200",
                            active
                              ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                          )}
                        >
                          {t(`createTrip.interests.${x}`)}
                        </button>
                      );
                    })}
                  </div>
                </SectionBlock>

                <SectionBlock
                  title={t("createTrip.events.title")}
                  subtitle={t("createTrip.events.subtitle")}
                  tone="indigo"
                  right={
                    <Badge
                      className={
                        includeEvents
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }
                    >
                      {includeEvents ? t("createTrip.events.title") : t("createTrip.events.subtitle")}
                    </Badge>
                  }
                >
                  <div className="space-y-4">
                    <div
                      className={cx(
                        "rounded-2xl border p-4 transition-all",
                        includeEvents
                          ? "border-indigo-200 bg-linear-to-r from-indigo-50 to-sky-50"
                          : "border-slate-200 bg-slate-50"
                      )}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={cx(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                              includeEvents
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-200 text-slate-500"
                            )}
                          >
                            <Ticket size={18} />
                          </div>

                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {t("createTrip.events.title")}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-slate-600">
                              {t("createTrip.events.subtitle")}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIncludeEvents((prev) => !prev)}
                          className={cx(
                            "rounded-full px-4 py-2 text-xs font-bold transition-all duration-200",
                            includeEvents
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {includeEvents ? t("createTrip.events.title") : t("createTrip.events.subtitle")}
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-600">
                        {eventSummary}
                      </div>
                    </div>

                    {includeEvents ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {t("createTrip.events.title")}
                            </div>
                            <div className="text-xs text-slate-500">
                              {t("createTrip.events.subtitle")}
                            </div>
                          </div>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {eventTypes.length || t("common.filter")} {t("common.interests")}
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {eventTypeCards.map((item) => {
                            const active = eventTypes.includes(item.id);

                            return (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => toggleEventType(item.id)}
                                className={cx(
                                  "rounded-2xl border p-4 text-left transition-all duration-200",
                                  active
                                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={cx(
                                      "flex h-10 w-10 items-center justify-center rounded-2xl",
                                      active
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 text-slate-600"
                                    )}
                                  >
                                    {item.icon}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={cx(
                                          "text-sm font-bold",
                                          active
                                            ? "text-indigo-700"
                                            : "text-slate-900"
                                        )}
                                      >
                                        {item.label}
                                      </div>
                                      {active ? (
                                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                          {t("common.filter")}
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="mt-1 text-xs leading-5 text-slate-500">
                                      {item.desc}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                        {t("createTrip.events.subtitle")}
                      </div>
                    )}
                  </div>
                </SectionBlock>

                <SectionBlock
                  title={t("createTrip.generate.summary")}
                  subtitle={t("createTrip.generate.readyToGenerate")}
                  right={
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {notes.length}/300
                    </span>
                  }
                >
                  <label className="block">
                    <textarea
                      value={notes}
                      maxLength={300}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("createTrip.destination.placeholder")}
                      className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                  </label>
                </SectionBlock>

                {err ? <Alert type="error">{err}</Alert> : null}

                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {t("createTrip.generate.readyToGenerate")}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 py-4 text-base font-black text-white shadow-lg shadow-sky-200/60 transition hover:-translate-y-0.5 hover:from-sky-400 hover:to-blue-500 hover:shadow-xl sm:w-auto sm:px-8"
                  >
                    <Wand2 size={16} />
                    {loading ? t("createTrip.generate.generating") : t("createTrip.generate.button")}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => nav("/trips")}
                  >
                    {t("nav.myTrips")}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                    onClick={resetForm}
                  >
                    <RefreshCw size={16} />
                    {t("common.reset")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-7">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <div className="relative overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
              <div className="absolute inset-0">
                <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
              </div>

              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  {t("createTrip.generate.summary")}
                </div>

                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-2xl font-black tracking-tight sm:text-3xl">
                      {previewTitle}
                    </div>
                    <div className="mt-2 text-sm text-white/75">
                      {startDate} → {endDate} • {t("createTrip.preferences.pace")}: {t(`createTrip.preferences.paceOptions.${pace === "packed" ? "fast" : pace}`)} • {t("createTrip.preferences.budget")}: {t(`createTrip.preferences.budgetOptions.${budget === "low" ? "budget" : budget === "high" ? "luxury" : "midRange"}`)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <GlassPill>
                      {daysCount ? `${daysCount} ${t("common.days")}` : t("common.datesNotSet")}
                    </GlassPill>
                    {tripMode === "multi" && multiCityPlaces.length ? (
                      <GlassPill>{multiCityPlaces.length} {t("createTrip.tripType.multiCity")}</GlassPill>
                    ) : null}
                    {travelerCount ? <GlassPill>{travelerSummary}</GlassPill> : null}
                    {includeEvents ? <GlassPill>{t("createTrip.events.title")}</GlassPill> : null}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(interests.length ? interests : [null])
                    .slice(0, 6)
                    .map((x) => (
                      <GlassPill key={x ?? "custom"} className="capitalize">
                        {x ? t(`createTrip.interests.${x}`) : t("createTrip.customTrip")}
                      </GlassPill>
                    ))}

                  {includeEvents &&
                    eventTypes.slice(0, 4).map((x) => (
                      <GlassPill key={`event-${x}`} className="capitalize">
                        {t(`createTrip.events.types.${x}`)}
                      </GlassPill>
                    ))}
                </div>
              </div>
            </div>

            <CardBody className="space-y-6 bg-linear-to-b from-white to-slate-50/60">
              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewCard
                  title={t("createTrip.dates.title")}
                  text={t("createTrip.dates.subtitle")}
                />
                <PreviewCard
                  title={t("createTrip.preferences.pace")}
                  text={t("createTrip.preferences.subtitle")}
                />
                <PreviewCard
                  title={t("createTrip.travelers.title")}
                  text={t("createTrip.travelers.subtitle")}
                />
                <PreviewCard
                  title={t("createTrip.generate.readyToGenerate")}
                  text={t("createTrip.generate.summary")}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <MiniInfo
                  label={tripMode === "multi" ? t("createTrip.tripType.title") : t("createTrip.destination.title")}
                  value={
                    tripMode === "multi"
                      ? t("createTrip.tripType.multiCity")
                      : destination || t("createTrip.destination.placeholder")
                  }
                />
                <MiniInfo label={t("createTrip.preferences.pace")} value={t(`createTrip.preferences.paceOptions.${pace === "packed" ? "fast" : pace}`)} />
                <MiniInfo label={t("createTrip.preferences.budget")} value={t(`createTrip.preferences.budgetOptions.${budget === "low" ? "budget" : budget === "high" ? "luxury" : "midRange"}`)} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <MiniInfo label={t("createTrip.travelers.total")} value={travelerSummary} />
                <MiniInfo label={t("createTrip.generate.summary")} value={tripEnergy} />
              </div>

              {tripMode === "multi" && multiCityPlaces.length ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-slate-900">
                      {t("createTrip.tripType.multiCity")}
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {multiCityPlaces.length} {t("createTrip.tripType.multiCity")}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {multiCityPlaces.map((city, index) => (
                      <span
                        key={city.id}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        {index + 1}. {city.placeName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {(sourceTab || travelerCount || tripType) && (
                <div className="grid gap-3 md:grid-cols-3">
                  {sourceTab ? <MiniInfo label={t("createTrip.destination.label")} value={sourceTab} /> : null}
                  {travelerCount ? (
                    <MiniInfo label={t("createTrip.travelers.total")} value={`${travelerCount}`} />
                  ) : null}
                  {tripType ? <MiniInfo label={t("createTrip.tripType.title")} value={tripType} /> : null}
                </div>
              )}

              {includeEvents ? (
                <div className="rounded-3xl border border-indigo-100 bg-linear-to-r from-indigo-50 to-sky-50 p-4 text-sm text-slate-600">
                  <div className="mb-1 font-bold text-slate-900">
                    {t("createTrip.events.title")}
                  </div>
                  {eventSummary}
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                  <div className="mb-1 font-bold text-slate-900">
                    {t("createTrip.events.subtitle")}
                  </div>
                  {t("createTrip.events.subtitle")}
                </div>
              )}

              {notes.trim() ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                  <div className="mb-2 font-bold text-slate-900">{t("createTrip.generate.summary")}</div>
                  {notes.trim()}
                </div>
              ) : null}

              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {t("createTrip.generate.readyToGenerate")}
              </div>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader
              title={t("createTrip.destination.mapTitle")}
              subtitle={
                mapQuery
                  ? `${t("createTrip.destination.mapSubtitle")} ${mapQuery}`
                  : t("createTrip.destination.subtitle")
              }
              right={
                mapQuery ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {t("createTrip.generate.readyToGenerate")}
                  </Badge>
                ) : (
                  <Badge className="border-slate-200 bg-slate-100 text-slate-600">
                    {t("createTrip.destination.subtitle")}
                  </Badge>
                )
              }
            />

            <CardBody className="space-y-4 bg-linear-to-b from-white to-slate-50/60">
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
                <MapTilerMap query={mapQuery} height={400} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                {tripMode === "multi"
                  ? t("createTrip.destination.mapSubtitle")
                  : t("createTrip.destination.mapTitle")}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ title, subtitle, right, children, tone = "default" }) {
  const toneClass =
    tone === "indigo"
      ? "border-indigo-100 bg-linear-to-br from-indigo-50 via-white to-sky-50"
      : "border-slate-200 bg-white";

  const accentBarClass =
    tone === "indigo"
      ? "bg-linear-to-b from-indigo-500 to-sky-500"
      : "bg-linear-to-b from-sky-500 to-blue-600";

  return (
    <section className={`relative overflow-hidden rounded-3xl border p-4 pl-5 shadow-sm ${toneClass}`}>
      <div
        className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${accentBarClass}`}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ModeCard({ active, tone, title, text, onClick }) {
  const activeClasses =
    tone === "indigo"
      ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100"
      : "border-sky-500 bg-sky-50 shadow-md shadow-sky-100";

  const titleActive = tone === "indigo" ? "text-indigo-700" : "text-sky-700";
  const dotActive = tone === "indigo" ? "bg-indigo-600" : "bg-sky-600";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group rounded-2xl border px-4 py-4 text-left transition-all duration-200",
        active
          ? activeClasses
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div
            className={cx(
              "text-sm font-bold",
              active ? titleActive : "text-slate-900"
            )}
          >
            {title}
          </div>
          <div className="mt-1 text-xs text-slate-500">{text}</div>
        </div>
        <div
          className={cx("h-3 w-3 rounded-full", active ? dotActive : "bg-slate-300")}
        />
      </div>
    </button>
  );
}

function TravelerRow({
  title,
  subtitle,
  value,
  onDecrease,
  onIncrease,
  disableDecrease,
  disableIncrease,
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrease}
          disabled={disableDecrease}
          className={cx(
            "grid h-10 w-10 place-items-center rounded-2xl border text-lg font-bold transition",
            disableDecrease
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          −
        </button>

        <div className="min-w-10 text-center text-lg font-black text-slate-900">
          {value}
        </div>

        <button
          type="button"
          onClick={onIncrease}
          disabled={disableIncrease}
          className={cx(
            "grid h-10 w-10 place-items-center rounded-2xl border text-lg font-bold transition",
            disableIncrease
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          +
        </button>
      </div>
    </div>
  );
}

function TopHeroStat({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 text-white">
        {icon}
      </div>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function MiniInsight({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}

function GlassPill({ children, className = "" }) {
  return (
    <span
      className={cx(
        "rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md",
        className
      )}
    >
      {children}
    </span>
  );
}

function PreviewCard({ title, text }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1.5 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}