import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, Users, Search } from "lucide-react";
import { Card, CardBody, Badge } from "../components/UI.jsx";
import CityAutoComplete from "../components/CityAutoComplete.jsx";

const POPULAR = [
  { city: "Paris", country: "France", emoji: "🗼" },
  { city: "Rome", country: "Italy", emoji: "🏛️" },
  { city: "Barcelona", country: "Spain", emoji: "🌊" },
  { city: "Amsterdam", country: "Netherlands", emoji: "🌷" },
  { city: "Dubai", country: "UAE", emoji: "🌆" },
  { city: "New York", country: "USA", emoji: "🗽" },
];

function buildHotelUrl({ destination, checkIn, checkOut, adults, rooms }) {
  const aid = import.meta.env.VITE_BOOKING_AID;
  const params = new URLSearchParams({
    ss: destination || "",
    checkin: checkIn || "",
    checkout: checkOut || "",
    group_adults: String(adults || 1),
    no_rooms: String(rooms || 1),
    lang: "en-gb",
  });
  if (aid) params.set("aid", aid);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function Hotels() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [checkIn, setCheckIn] = useState(searchParams.get("checkin") || todayStr());
  const [checkOut, setCheckOut] = useState(searchParams.get("checkout") || tomorrowStr());
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 1);
  const [rooms] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = t("hotels.pageTitle");
  }, [t]);

  const handleSearch = (e) => {
    e.preventDefault();
    const url = buildHotelUrl({ destination, checkIn, checkOut, adults, rooms });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePopular = (city) => {
    setDestination(city);
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg sm:rounded-4xl sm:shadow-[0_30px_100px_-35px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(to_bottom_right,#f8fbff,#ffffff,#f2f8ff)]" />
        <div className="absolute -left-10 top-0 hidden h-72 w-72 rounded-full bg-sky-200/30 blur-3xl sm:block" />
        <div className="absolute right-0 top-16 hidden h-80 w-80 rounded-full bg-indigo-200/25 blur-3xl sm:block" />

        <div className="relative px-4 py-8 sm:px-10 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="bg-sky-50 text-sky-700">🏨 {t("hotels.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {t("hotels.title")}
            </h1>
            <p className="mt-3 text-base text-slate-500">{t("hotels.subtitle")}</p>
          </div>

          {/* Search form */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:rounded-3xl sm:p-5"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Destination */}
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("hotels.destination")}
                </label>
                <CityAutoComplete
                  label=""
                  value={destination}
                  onChange={setDestination}
                  onSelect={(item) => setDestination(item.placeName)}
                  placeholder={t("hotels.destinationPlaceholder")}
                />
              </div>

              {/* Check-in */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("hotels.checkIn")}
                </label>
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="date"
                    value={checkIn}
                    min={todayStr()}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* Check-out */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("hotels.checkOut")}
                </label>
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || todayStr()}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("hotels.guests")}
                </label>
                <div className="relative">
                  <Users
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? t("hotels.adult") : t("hotels.adults")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">{t("hotels.affiliateNote")}</p>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-lg sm:w-auto"
              >
                <Search size={15} />
                {t("hotels.searchButton")}
              </button>
            </div>
          </form>

          {/* Popular destinations */}
          <div className="mx-auto mt-6 max-w-4xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {t("hotels.popular")}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {POPULAR.map((p) => (
                <button
                  key={p.city}
                  type="button"
                  onClick={() => handlePopular(p.city)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  <span>{p.emoji}</span>
                  {p.city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why book */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-black tracking-tight text-slate-900">{t("hotels.whyTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("hotels.whySubtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: "💰", title: t("hotels.why.0.title"), text: t("hotels.why.0.text") },
            { icon: "🏨", title: t("hotels.why.1.title"), text: t("hotels.why.1.text") },
            { icon: "✅", title: t("hotels.why.2.title"), text: t("hotels.why.2.text") },
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
