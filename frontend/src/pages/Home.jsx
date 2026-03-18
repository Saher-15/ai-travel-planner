import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Baby, Calendar, Compass, FolderKanban,
  MapPin, PlaneTakeoff, Search, Sparkles, Users, Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import CityAutoComplete from "../components/CityAutoComplete.jsx";

const cx = (...c) => c.filter(Boolean).join(" ");

// ─── Static data ─────────────────────────────────────────────────────────────

const HERO_BG =
  "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1920&q=80";

const DESTINATIONS = [
  { city: "Barcelona", country: "Spain",   emoji: "🇪🇸", photo: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80" },
  { city: "Paris",     country: "France",  emoji: "🇫🇷", photo: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&q=80" },
  { city: "Tokyo",     country: "Japan",   emoji: "🇯🇵", photo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80" },
  { city: "New York",  country: "USA",     emoji: "🇺🇸", photo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80" },
  { city: "Dubai",     country: "UAE",     emoji: "🇦🇪", photo: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80" },
  { city: "Rome",      country: "Italy",   emoji: "🇮🇹", photo: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80" },
  { city: "Bali",      country: "Indonesia",emoji:"🇮🇩", photo: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80" },
  { city: "London",    country: "UK",      emoji: "🇬🇧", photo: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80" },
];

const LABEL_CLS  = "mb-1.5 block text-xs font-semibold text-slate-500";
const DATE_CLS   = "w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.12)]";
const SELECT_CLS = "w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.12)]";

const TAB_BTN_COLOR = {
  sky:     "data-[active=true]:border-sky-500    data-[active=true]:text-sky-600",
  indigo:  "data-[active=true]:border-indigo-500  data-[active=true]:text-indigo-600",
  emerald: "data-[active=true]:border-emerald-500 data-[active=true]:text-emerald-600",
  amber:   "data-[active=true]:border-amber-500   data-[active=true]:text-amber-600",
  violet:  "data-[active=true]:border-violet-500  data-[active=true]:text-violet-600",
};

const SEARCH_BTN_COLOR = {
  sky:     "bg-sky-600 hover:bg-sky-500",
  indigo:  "bg-indigo-600 hover:bg-indigo-500",
  emerald: "bg-emerald-600 hover:bg-emerald-500",
  amber:   "bg-amber-500 hover:bg-amber-400",
  violet:  "bg-violet-600 hover:bg-violet-500",
};

function SearchBtn({ color, children }) {
  return (
    <button type="submit"
      className={cx(
        "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg",
        SEARCH_BTN_COLOR[color]
      )}>
      <Search size={15} />{children}
    </button>
  );
}

// ─── QuickSearch ──────────────────────────────────────────────────────────────

function QuickSearch() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [tab, setTab] = useState("hotels");

  const today    = new Date().toISOString().split("T")[0];
  const nextWeek = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })();

  // Hotels
  const [hotelDest,     setHotelDest]     = useState("");
  const [checkIn,       setCheckIn]       = useState(today);
  const [checkOut,      setCheckOut]      = useState(nextWeek);
  const [hotelAdults,   setHotelAdults]   = useState(2);
  const [hotelChildren, setHotelChildren] = useState(0);

  // Flights
  const [flightFrom, setFlightFrom] = useState("");
  const [flightTo,   setFlightTo]   = useState("");
  const [flightDate, setFlightDate] = useState(nextWeek);
  const [flightPax,  setFlightPax]  = useState(1);

  // Cars — own dates so switching tabs doesn't reset hotel dates
  const [carDest,    setCarDest]    = useState("");
  const [carPickup,  setCarPickup]  = useState(today);
  const [carDropoff, setCarDropoff] = useState(nextWeek);

  // Attractions / Plan
  const [attrDest, setAttrDest] = useState("");
  const [aiDest,   setAiDest]   = useState("");

  const TABS = [
    { id: "hotels",      emoji: "🏨", label: t("nav.hotels"),      color: "sky"     },
    { id: "flights",     emoji: "✈️", label: t("nav.flights"),     color: "indigo"  },
    { id: "attractions", emoji: "🎯", label: t("nav.attractions"), color: "emerald" },
    { id: "cars",        emoji: "🚗", label: t("nav.cars"),        color: "amber"   },
    { id: "plan",        emoji: "🤖", label: t("nav.createTrip"),  color: "violet"  },
  ];

  const active = TABS.find(tb => tb.id === tab);

  function go(path, params = {}) {
    const q = new URLSearchParams(params).toString();
    nav(q ? `${path}?${q}` : path);
  }

  // Reusable date field cell
  function DateField({ label, value, onChange, min }) {
    return (
      <div>
        <label className={LABEL_CLS}>{label}</label>
        <div className="relative">
          <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="date" value={value} min={min} onChange={e => onChange(e.target.value)} required className={DATE_CLS} />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_32px_-8px_rgba(15,23,42,0.18)]">

      {/* ── Tab bar ── */}
      <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/60 px-2 pt-1 sm:px-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-active={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cx(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-semibold transition sm:px-4 sm:text-sm",
              "border-transparent text-slate-500 hover:text-slate-700",
              TAB_BTN_COLOR[item.color]
            )}
          >
            <span>{item.emoji}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Forms ── */}
      <div className="p-4 sm:p-5">

        {/* Hotels */}
        {tab === "hotels" && (
          <form onSubmit={e => { e.preventDefault(); go("/hotels", { destination: hotelDest, checkin: checkIn, checkout: checkOut, adults: hotelAdults, children: hotelChildren }); }}
            className="space-y-3">
            <div>
              <label className={LABEL_CLS}>{t("hotels.destination")}</label>
              <CityAutoComplete label="" value={hotelDest} onChange={setHotelDest}
                onSelect={i => setHotelDest(i.placeName)} placeholder={t("hotels.destinationPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DateField label={t("hotels.checkIn")}  value={checkIn}  onChange={setCheckIn}  min={today} />
              <DateField label={t("hotels.checkOut")} value={checkOut} onChange={setCheckOut} min={checkIn} />
              {/* Adults */}
              <div>
                <label className={LABEL_CLS}>{t("hotels.adults")}</label>
                <div className="relative">
                  <Users size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={hotelAdults} onChange={e => setHotelAdults(Number(e.target.value))} className={SELECT_CLS}>
                    {[1,2,3,4,5,6].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? t("hotels.adult") : t("hotels.adults")}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Children */}
              <div>
                <label className={LABEL_CLS}>{t("hotels.childrenLabel")}</label>
                <div className="relative">
                  <Baby size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={hotelChildren} onChange={e => setHotelChildren(Number(e.target.value))} className={SELECT_CLS}>
                    {[0,1,2,3,4].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? t("hotels.child") : t("hotels.childrenLabel")}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <SearchBtn color={active.color}>{t("hotels.searchButton")}</SearchBtn>
          </form>
        )}

        {/* Flights */}
        {tab === "flights" && (
          <form onSubmit={e => { e.preventDefault(); go("/flights", { from: flightFrom, destination: flightTo, depart: flightDate, adults: flightPax }); }}
            className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLS}>{t("flights.from")}</label>
                <CityAutoComplete label="" value={flightFrom} onChange={setFlightFrom}
                  onSelect={i => setFlightFrom(i.placeName)} placeholder={t("flights.fromPlaceholder")} />
              </div>
              <div>
                <label className={LABEL_CLS}>{t("flights.to")}</label>
                <CityAutoComplete label="" value={flightTo} onChange={setFlightTo}
                  onSelect={i => setFlightTo(i.placeName)} placeholder={t("flights.toPlaceholder")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DateField label={t("flights.departure")} value={flightDate} onChange={setFlightDate} min={today} />
              <div>
                <label className={LABEL_CLS}>{t("flights.passengers")}</label>
                <div className="relative">
                  <Users size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={flightPax} onChange={e => setFlightPax(Number(e.target.value))} className={SELECT_CLS}>
                    {[1,2,3,4,5,6].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? t("flights.passenger") : t("flights.passengersLabel")}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <SearchBtn color={active.color}>{t("flights.searchButton")}</SearchBtn>
          </form>
        )}

        {/* Attractions */}
        {tab === "attractions" && (
          <form onSubmit={e => { e.preventDefault(); go("/attractions", { destination: attrDest }); }}
            className="space-y-3">
            <div>
              <label className={LABEL_CLS}>{t("attractions.destination")}</label>
              <CityAutoComplete label="" value={attrDest} onChange={setAttrDest}
                onSelect={i => setAttrDest(i.placeName)} placeholder={t("attractions.destinationPlaceholder")} />
            </div>
            <SearchBtn color={active.color}>{t("attractions.searchButton")}</SearchBtn>
          </form>
        )}

        {/* Cars */}
        {tab === "cars" && (
          <form onSubmit={e => { e.preventDefault(); go("/cars", { destination: carDest, checkin: carPickup, checkout: carDropoff }); }}
            className="space-y-3">
            <div>
              <label className={LABEL_CLS}>{t("cars.pickupLocation")}</label>
              <CityAutoComplete label="" value={carDest} onChange={setCarDest}
                onSelect={i => setCarDest(i.placeName)} placeholder={t("cars.locationPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DateField label={t("cars.pickupDate")}  value={carPickup}  onChange={setCarPickup}  min={today} />
              <DateField label={t("cars.dropoffDate")} value={carDropoff} onChange={setCarDropoff} min={carPickup} />
            </div>
            <SearchBtn color={active.color}>{t("cars.searchButton")}</SearchBtn>
          </form>
        )}

        {/* Plan with AI */}
        {tab === "plan" && (
          <form onSubmit={e => { e.preventDefault(); nav(aiDest ? `/create?destination=${encodeURIComponent(aiDest)}` : "/create"); }}
            className="space-y-3">
            <div>
              <label className={LABEL_CLS}>{t("home.quickSearch.destination")}</label>
              <CityAutoComplete label="" value={aiDest} onChange={setAiDest}
                onSelect={i => setAiDest(i.placeName)} placeholder={t("home.quickSearch.destinationPlaceholder")} />
            </div>
            <SearchBtn color={active.color}>{t("home.quickSearch.planButton")}</SearchBtn>
          </form>
        )}

      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { t } = useTranslation();
  const nav = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = t("home.pageTitle");
  }, [t]);

  const goToCreate = (destination) => nav(`/create?destination=${encodeURIComponent(destination)}`);

  const FEATURES = [
    { icon: <Wand2 size={22} />,       title: t("home.features.list.0.title"), text: t("home.features.list.0.text"), bg: "bg-sky-500" },
    { icon: <Compass size={22} />,     title: t("home.features.list.1.title"), text: t("home.features.list.1.text"), bg: "bg-indigo-500" },
    { icon: <FolderKanban size={22} />,title: t("home.features.list.2.title"), text: t("home.features.list.2.text"), bg: "bg-emerald-500" },
    { icon: <MapPin size={22} />,      title: t("home.features.list.3.title"), text: t("home.features.list.3.text"), bg: "bg-violet-500" },
  ];

  const STEPS = t("home.howItWorks.steps", { returnObjects: true });

  const TRUST = [
    { icon: <Sparkles size={18} />,      value: "AI-Powered",   label: "Smart itinerary generation" },
    { icon: <PlaneTakeoff size={18} />,  value: "100+ Cities",  label: "Destinations worldwide" },
    { icon: <FolderKanban size={18} />,  value: "Free to Use",  label: "No credit card needed" },
    { icon: <Compass size={18} />,       value: "Instant",      label: "Trip ready in seconds" },
  ];

  return (
    <div>

      {/* ── Hero ── */}
      <section className="relative -mx-4 -mt-8 overflow-hidden md:-mx-6">
        {/* Background */}
        <img src={HERO_BG} alt="Travel" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-b from-slate-900/70 via-slate-900/55 to-slate-900/80" />

        <div className="relative px-4 pb-0 pt-16 sm:px-6 sm:pt-20 md:pt-24">
          {/* Headline */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              {t("home.badge")}
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {t("home.hero.title1")}
              <span className="mt-1 block bg-linear-to-r from-sky-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                {t("home.hero.title2")}
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
              {t("home.hero.description")}
            </p>
          </div>

          {/* Search card — overlaps the hero bottom */}
          <div className="mx-auto mt-10 max-w-5xl">
            <QuickSearch />
          </div>
        </div>

        {/* Bottom fade into page background */}
        <div className="h-16 bg-linear-to-b from-transparent to-slate-50" />
      </section>

      {/* ── Trust strip ── */}
      <section className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TRUST.map((item) => (
          <div key={item.value} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              {item.icon}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900">{item.value}</div>
              <div className="truncate text-xs text-slate-500">{item.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Popular Destinations ── */}
      <section className="mt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600">{t("home.destinations.badge")}</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {t("home.destinations.title")}
            </h2>
          </div>
          <button onClick={() => nav("/create")}
            className="flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700">
            {t("home.destinations.startBlankTrip")} <ArrowRight size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {DESTINATIONS.map((d) => (
            <button
              key={d.city}
              onClick={() => goToCreate(d.city)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-3/4 overflow-hidden">
                <img src={d.photo} alt={d.city}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy" />
              </div>
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              {/* Hover overlay CTA */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow">
                  Plan trip →
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                <div className="text-sm font-black text-white">{d.city}</div>
                <div className="text-xs text-white/75">{d.emoji} {d.country}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Why use us ── */}
      <section className="mt-16">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-600">{t("home.features.badge")}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {t("home.features.title")}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className={cx("inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md", f.bg)}>
                {f.icon}
              </div>
              <div className="mt-4 text-base font-black text-slate-900">{f.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-500">{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mt-16">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-600">{t("home.howItWorks.badge")}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {t("home.howItWorks.title")}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="absolute -right-px top-8 hidden h-0.5 w-8 bg-linear-to-r from-sky-200 to-transparent sm:block" style={{ right: "-2rem" }} />
              )}
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 text-lg font-black text-white shadow-md shadow-sky-200/60">
                {step.number}
              </div>
              <div className="mt-4 text-base font-black text-slate-900">{step.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-500">{step.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="relative mt-16 overflow-hidden rounded-3xl bg-linear-to-br from-sky-600 via-blue-600 to-indigo-700 px-8 py-12 text-white shadow-[0_20px_60px_-20px_rgba(37,99,235,0.5)] sm:px-12">
        <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-8 -right-8 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="max-w-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-white/70">{t("home.cta.badge")}</div>
            <h3 className="mt-2 text-2xl font-black sm:text-3xl">{t("home.cta.title")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/80">{t("home.cta.description")}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <button onClick={() => nav("/create")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-sky-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              <PlaneTakeoff size={16} />
              {t("home.cta.createTrip")}
            </button>
            <button onClick={() => nav("/trips")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20">
              {t("home.cta.myTrips")}
            </button>
          </div>
        </div>
      </section>

      <div className="h-8" />
    </div>
  );
}
