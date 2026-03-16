import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, Users, ArrowLeftRight, Search } from "lucide-react";
import { Card, CardBody, Badge } from "../components/UI.jsx";
import CityAutoComplete from "../components/CityAutoComplete.jsx";

const MARKER = "508405";

const POPULAR_ROUTES = [
  { from: "Tel Aviv", to: "London", emoji: "🇬🇧" },
  { from: "Tel Aviv", to: "Paris", emoji: "🇫🇷" },
  { from: "Tel Aviv", to: "New York", emoji: "🇺🇸" },
  { from: "Tel Aviv", to: "Dubai", emoji: "🇦🇪" },
  { from: "Tel Aviv", to: "Rome", emoji: "🇮🇹" },
  { from: "Tel Aviv", to: "Bangkok", emoji: "🇹🇭" },
];

function buildFlightUrl({ origin, destination, departDate, returnDate, adults, tripType }) {
  const params = new URLSearchParams({
    origin_name: origin || "",
    destination_name: destination || "",
    depart_date: departDate || "",
    adults: String(adults || 1),
    marker: MARKER,
  });
  if (tripType === "round" && returnDate) {
    params.set("return_date", returnDate);
  }
  return `https://jetradar.com/flights/?${params.toString()}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function nextWeekStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

function twoWeeksStr() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

export default function Flights() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [tripType, setTripType] = useState("round");
  const [origin, setOrigin] = useState(searchParams.get("from") || "");
  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [departDate, setDepartDate] = useState(nextWeekStr());
  const [returnDate, setReturnDate] = useState(twoWeeksStr());
  const [adults, setAdults] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = t("flights.pageTitle");
  }, [t]);

  const swapCities = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const url = buildFlightUrl({ origin, destination, departDate, returnDate, adults, tripType });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePopular = (route) => {
    setOrigin(route.from);
    setDestination(route.to);
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_30%),linear-gradient(to_bottom_right,#f8f9ff,#ffffff,#f2f8ff)]" />
        <div className="absolute -left-10 top-0 h-72 w-72 rounded-full bg-indigo-200/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="bg-indigo-50 text-indigo-700">✈️ {t("flights.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {t("flights.title")}
            </h1>
            <p className="mt-3 text-base text-slate-500">{t("flights.subtitle")}</p>
          </div>

          {/* Search form */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 max-w-4xl rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl backdrop-blur"
          >
            {/* Trip type toggle */}
            <div className="mb-4 flex gap-2">
              {["round", "oneway"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTripType(type)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                    tripType === type
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {type === "round" ? t("flights.roundTrip") : t("flights.oneWay")}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* From */}
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("flights.from")}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <CityAutoComplete
                      label=""
                      value={origin}
                      onChange={setOrigin}
                      onSelect={(item) => setOrigin(item.placeName)}
                      placeholder={t("flights.fromPlaceholder")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={swapCities}
                    title="Swap"
                    className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-indigo-600"
                  >
                    <ArrowLeftRight size={14} />
                  </button>
                </div>
              </div>

              {/* To */}
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("flights.to")}
                </label>
                <CityAutoComplete
                  label=""
                  value={destination}
                  onChange={setDestination}
                  onSelect={(item) => setDestination(item.placeName)}
                  placeholder={t("flights.toPlaceholder")}
                />
              </div>

              {/* Passengers */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("flights.passengers")}
                </label>
                <div className="relative">
                  <Users
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? t("flights.passenger") : t("flights.passengersLabel")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dates row */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("flights.departure")}
                </label>
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="date"
                    value={departDate}
                    min={todayStr()}
                    onChange={(e) => setDepartDate(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {tripType === "round" && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                    {t("flights.return")}
                  </label>
                  <div className="relative">
                    <Calendar
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="date"
                      value={returnDate}
                      min={departDate || todayStr()}
                      onChange={(e) => setReturnDate(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">{t("flights.affiliateNote")}</p>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-lg"
              >
                <Search size={15} />
                {t("flights.searchButton")}
              </button>
            </div>
          </form>

          {/* Popular routes */}
          <div className="mx-auto mt-6 max-w-4xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {t("flights.popularRoutes")}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {POPULAR_ROUTES.map((r) => (
                <button
                  key={r.to}
                  type="button"
                  onClick={() => handlePopular(r)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <span>{r.emoji}</span>
                  {r.from} → {r.to}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why section */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-black tracking-tight text-slate-900">{t("flights.whyTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("flights.whySubtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: "🔍", title: t("flights.why.0.title"), text: t("flights.why.0.text") },
            { icon: "💸", title: t("flights.why.1.title"), text: t("flights.why.1.text") },
            { icon: "⚡", title: t("flights.why.2.title"), text: t("flights.why.2.text") },
          ].map((item, i) => (
            <Card key={i} className="border border-slate-200 bg-white/90">
              <CardBody>
                <div className="text-3xl">{item.icon}</div>
                <div className="mt-3 text-sm font-extrabold text-slate-900">{item.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-500">{item.text}</div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
