import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Card, CardBody, Badge } from "../components/UI.jsx";
import CityAutoComplete from "../components/CityAutoComplete.jsx";

const VIATOR_PID = import.meta.env.VITE_VIATOR_PID || "";

const CATEGORIES = [
  { id: "tours", emoji: "🗺️", labelKey: "attractions.cat.tours" },
  { id: "museums", emoji: "🏛️", labelKey: "attractions.cat.museums" },
  { id: "food", emoji: "🍽️", labelKey: "attractions.cat.food" },
  { id: "outdoor", emoji: "🏔️", labelKey: "attractions.cat.outdoor" },
  { id: "nightlife", emoji: "🌙", labelKey: "attractions.cat.nightlife" },
  { id: "family", emoji: "👨‍👩‍👧", labelKey: "attractions.cat.family" },
];

const POPULAR = [
  { city: "Paris", emoji: "🗼" },
  { city: "Rome", emoji: "🏛️" },
  { city: "Tokyo", emoji: "⛩️" },
  { city: "New York", emoji: "🗽" },
  { city: "Barcelona", emoji: "🌊" },
  { city: "Dubai", emoji: "🌆" },
];

function buildViatorUrl(destination, category = "") {
  const base = "https://www.viator.com/searchResults/all";
  const params = new URLSearchParams({ text: destination || "" });
  if (VIATOR_PID) {
    params.set("pid", VIATOR_PID);
    params.set("mcid", "42383");
    params.set("medium", "api");
  }
  if (category) params.set("subcategoryId", category);
  return `${base}?${params.toString()}`;
}

export default function Attractions() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = t("attractions.pageTitle");
  }, [t]);

  const handleSearch = (e) => {
    e.preventDefault();
    const url = buildViatorUrl(destination, activeCategory);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_30%),linear-gradient(to_bottom_right,#f8fffc,#ffffff,#f2fff8)]" />
        <div className="absolute -left-10 top-0 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="bg-emerald-50 text-emerald-700">🎯 {t("attractions.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {t("attractions.title")}
            </h1>
            <p className="mt-3 text-base text-slate-500">{t("attractions.subtitle")}</p>
          </div>

          {/* Search form */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 max-w-2xl rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl backdrop-blur"
          >
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                {t("attractions.destination")}
              </label>
              <CityAutoComplete
                label=""
                value={destination}
                onChange={setDestination}
                onSelect={(item) => setDestination(item.placeName)}
                placeholder={t("attractions.destinationPlaceholder")}
              />
            </div>

            {/* Category filter */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                {t("attractions.category")}
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setActiveCategory((prev) => (prev === cat.id ? "" : cat.id))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      activeCategory === cat.id
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {cat.emoji} {t(cat.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">{t("attractions.poweredBy")}</p>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-lg"
              >
                <Search size={15} />
                {t("attractions.searchButton")}
              </button>
            </div>
          </form>

          {/* Popular destinations */}
          <div className="mx-auto mt-6 max-w-2xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {t("attractions.popular")}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {POPULAR.map((p) => (
                <button
                  key={p.city}
                  type="button"
                  onClick={() => setDestination(p.city)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {p.emoji} {p.city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category showcase */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-black tracking-tight text-slate-900">{t("attractions.exploreTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("attractions.exploreSubtitle")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Card
              key={cat.id}
              className="cursor-pointer border border-slate-200 bg-white/90 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                    {cat.emoji}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">{t(cat.labelKey)}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {t(`attractions.catDesc.${cat.id}`)}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
