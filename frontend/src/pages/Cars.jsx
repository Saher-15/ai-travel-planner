import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Car, Calendar, Search } from "lucide-react";
import { Card, CardBody, Badge } from "../components/UI.jsx";
import CityAutoComplete from "../components/CityAutoComplete.jsx";

const RENTALCARS_CODE = import.meta.env.VITE_RENTALCARS_CODE || "";

const POPULAR = [
  { city: "Paris", emoji: "🇫🇷" },
  { city: "Rome", emoji: "🇮🇹" },
  { city: "Barcelona", emoji: "🇪🇸" },
  { city: "Amsterdam", emoji: "🇳🇱" },
  { city: "Dubai", emoji: "🇦🇪" },
  { city: "New York", emoji: "🇺🇸" },
];

function buildCarsUrl({ destination, pickupDate, dropoffDate }) {
  const params = new URLSearchParams({
    pickUpName: destination || "",
    pickUpDate: pickupDate || "",
    dropOffDate: dropoffDate || "",
    dropOffName: destination || "",
  });
  if (RENTALCARS_CODE) params.set("affiliateCode", RENTALCARS_CODE);
  return `https://www.rentalcars.com/SearchResults.do?${params.toString()}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function nextWeekStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

export default function Cars() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [pickupDate, setPickupDate] = useState(searchParams.get("checkin") || todayStr());
  const [dropoffDate, setDropoffDate] = useState(searchParams.get("checkout") || nextWeekStr());

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = t("cars.pageTitle");
  }, [t]);

  const handleSearch = (e) => {
    e.preventDefault();
    const url = buildCarsUrl({ destination, pickupDate, dropoffDate });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.08),transparent_30%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.08),transparent_30%),linear-gradient(to_bottom_right,#fffdf5,#ffffff,#fffbeb)]" />
        <div className="absolute -left-10 top-0 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-orange-200/15 blur-3xl" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="bg-amber-50 text-amber-700">🚗 {t("cars.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {t("cars.title")}
            </h1>
            <p className="mt-3 text-base text-slate-500">{t("cars.subtitle")}</p>
          </div>

          {/* Search form */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 max-w-3xl rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl backdrop-blur"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Pick-up location */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("cars.pickupLocation")}
                </label>
                <CityAutoComplete
                  label=""
                  value={destination}
                  onChange={setDestination}
                  onSelect={(item) => setDestination(item.placeName)}
                  placeholder={t("cars.locationPlaceholder")}
                />
              </div>

              {/* Pick-up date */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("cars.pickupDate")}
                </label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={pickupDate}
                    min={todayStr()}
                    onChange={(e) => setPickupDate(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </div>
              </div>

              {/* Drop-off date */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  {t("cars.dropoffDate")}
                </label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={dropoffDate}
                    min={pickupDate || todayStr()}
                    onChange={(e) => setDropoffDate(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">{t("cars.affiliateNote")}</p>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-lg"
              >
                <Search size={15} />
                {t("cars.searchButton")}
              </button>
            </div>
          </form>

          {/* Popular locations */}
          <div className="mx-auto mt-6 max-w-3xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {t("cars.popular")}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {POPULAR.map((p) => (
                <button
                  key={p.city}
                  type="button"
                  onClick={() => setDestination(p.city)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                >
                  {p.emoji} {p.city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why rent */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-black tracking-tight text-slate-900">{t("cars.whyTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("cars.whySubtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: "🌍", title: t("cars.why.0.title"), text: t("cars.why.0.text") },
            { icon: "💰", title: t("cars.why.1.title"), text: t("cars.why.1.text") },
            { icon: "🛡️", title: t("cars.why.2.title"), text: t("cars.why.2.text") },
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
