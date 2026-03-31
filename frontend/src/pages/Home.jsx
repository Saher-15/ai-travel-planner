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
  { city: "Barcelona", country: "Spain",     emoji: "🇪🇸", photo: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80" },
  { city: "Paris",     country: "France",    emoji: "🇫🇷", photo: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&q=80" },
  { city: "Tokyo",     country: "Japan",     emoji: "🇯🇵", photo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80" },
  { city: "New York",  country: "USA",       emoji: "🇺🇸", photo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80" },
  { city: "Dubai",     country: "UAE",       emoji: "🇦🇪", photo: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80" },
  { city: "Rome",      country: "Italy",     emoji: "🇮🇹", photo: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80" },
  { city: "Bali",      country: "Indonesia", emoji: "🇮🇩", photo: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80" },
  { city: "London",    country: "UK",        emoji: "🇬🇧", photo: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80" },
];

const LABEL_CLS  = "mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400";
const DATE_CLS   = "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]";
const SELECT_CLS = "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus:border-sky-400 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] appearance-none";

const TAB_ACTIVE = {
  sky:     "border-sky-500 text-sky-600 bg-sky-50/80",
  indigo:  "border-indigo-500 text-indigo-600 bg-indigo-50/80",
  emerald: "border-emerald-500 text-emerald-600 bg-emerald-50/80",
  amber:   "border-amber-500 text-amber-600 bg-amber-50/80",
  violet:  "border-violet-500 text-violet-600 bg-violet-50/80",
};

const SEARCH_BTN_COLOR = {
  sky:     "from-sky-500 to-blue-600 shadow-sky-500/30 hover:shadow-sky-500/50",
  indigo:  "from-indigo-500 to-violet-600 shadow-indigo-500/30 hover:shadow-indigo-500/50",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30 hover:shadow-emerald-500/50",
  amber:   "from-amber-400 to-orange-500 shadow-amber-500/30 hover:shadow-amber-500/50",
  violet:  "from-violet-500 to-purple-600 shadow-violet-500/30 hover:shadow-violet-500/50",
};

function SearchBtn({ color, children }) {
  return (
    <button type="submit" className={cx(
      "mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r py-4 text-sm font-bold text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:shadow-md",
      SEARCH_BTN_COLOR[color]
    )}>
      <Search size={15} strokeWidth={2.5} />{children}
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

  const [hotelDest,     setHotelDest]     = useState("");
  const [checkIn,       setCheckIn]       = useState(today);
  const [checkOut,      setCheckOut]      = useState(nextWeek);
  const [hotelAdults,   setHotelAdults]   = useState(2);
  const [hotelChildren, setHotelChildren] = useState(0);
  const [flightFrom,    setFlightFrom]    = useState("");
  const [flightTo,      setFlightTo]      = useState("");
  const [flightDate,    setFlightDate]    = useState(nextWeek);
  const [flightPax,     setFlightPax]     = useState(1);
  const [carDest,       setCarDest]       = useState("");
  const [carPickup,     setCarPickup]     = useState(today);
  const [carDropoff,    setCarDropoff]    = useState(nextWeek);
  const [attrDest,      setAttrDest]      = useState("");
  const [aiDest,        setAiDest]        = useState("");

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
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_48px_-12px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/5">

      {/* ── Tab bar ── */}
      <div className="flex overflow-x-auto border-b border-slate-100 no-scrollbar">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cx(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-bold transition-all duration-150 sm:px-5 sm:text-sm",
              tab === item.id
                ? TAB_ACTIVE[item.color]
                : "border-transparent text-slate-400 hover:text-slate-700"
            )}
          >
            <span className="text-base leading-none">{item.emoji}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Forms ── */}
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        {tab === "hotels" && (
          <form onSubmit={e => { e.preventDefault(); go("/hotels", { destination: hotelDest, checkin: checkIn, checkout: checkOut, adults: hotelAdults, children: hotelChildren }); }}
            className="space-y-4">
            <div>
              <label className={LABEL_CLS}>{t("hotels.destination")}</label>
              <CityAutoComplete label="" value={hotelDest} onChange={setHotelDest}
                onSelect={i => setHotelDest(i.placeName)} placeholder={t("hotels.destinationPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DateField label={t("hotels.checkIn")}  value={checkIn}  onChange={setCheckIn}  min={today} />
              <DateField label={t("hotels.checkOut")} value={checkOut} onChange={setCheckOut} min={checkIn} />
              <div>
                <label className={LABEL_CLS}>{t("hotels.adults")}</label>
                <div className="relative">
                  <Users size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={hotelAdults} onChange={e => setHotelAdults(Number(e.target.value))} className={SELECT_CLS}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? t("hotels.adult") : t("hotels.adults")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>{t("hotels.childrenLabel")}</label>
                <div className="relative">
                  <Baby size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={hotelChildren} onChange={e => setHotelChildren(Number(e.target.value))} className={SELECT_CLS}>
                    {[0,1,2,3,4].map(n => <option key={n} value={n}>{n} {n === 1 ? t("hotels.child") : t("hotels.childrenLabel")}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <SearchBtn color={active.color}>{t("hotels.searchButton")}</SearchBtn>
          </form>
        )}

        {tab === "flights" && (
          <form onSubmit={e => { e.preventDefault(); go("/flights", { from: flightFrom, destination: flightTo, depart: flightDate, adults: flightPax }); }}
            className="space-y-4">
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
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? t("flights.passenger") : t("flights.passengersLabel")}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <SearchBtn color={active.color}>{t("flights.searchButton")}</SearchBtn>
          </form>
        )}

        {tab === "attractions" && (
          <form onSubmit={e => { e.preventDefault(); go("/attractions", { destination: attrDest }); }}
            className="space-y-4">
            <div>
              <label className={LABEL_CLS}>{t("attractions.destination")}</label>
              <CityAutoComplete label="" value={attrDest} onChange={setAttrDest}
                onSelect={i => setAttrDest(i.placeName)} placeholder={t("attractions.destinationPlaceholder")} />
            </div>
            <SearchBtn color={active.color}>{t("attractions.searchButton")}</SearchBtn>
          </form>
        )}

        {tab === "cars" && (
          <form onSubmit={e => { e.preventDefault(); go("/cars", { destination: carDest, checkin: carPickup, checkout: carDropoff }); }}
            className="space-y-4">
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

        {tab === "plan" && (
          <form onSubmit={e => { e.preventDefault(); nav(aiDest ? `/create?destination=${encodeURIComponent(aiDest)}` : "/create"); }}
            className="space-y-4">
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
    { icon: <Wand2 size={20} />,        title: t("home.features.list.0.title"), text: t("home.features.list.0.text"), from: "from-sky-500",     to: "to-blue-600"    },
    { icon: <Compass size={20} />,      title: t("home.features.list.1.title"), text: t("home.features.list.1.text"), from: "from-indigo-500",  to: "to-violet-600"  },
    { icon: <FolderKanban size={20} />, title: t("home.features.list.2.title"), text: t("home.features.list.2.text"), from: "from-emerald-500", to: "to-teal-600"    },
    { icon: <MapPin size={20} />,       title: t("home.features.list.3.title"), text: t("home.features.list.3.text"), from: "from-violet-500",  to: "to-purple-600"  },
  ];

  const STEPS = t("home.howItWorks.steps", { returnObjects: true });

  const TRUST = [
    { icon: <Sparkles size={16} />,     value: "AI-Powered",  label: "Smart itinerary generation" },
    { icon: <PlaneTakeoff size={16} />, value: "100+ Cities", label: "Destinations worldwide"     },
    { icon: <FolderKanban size={16} />, value: "Free to Use", label: "No credit card needed"      },
    { icon: <Compass size={16} />,      value: "Instant",     label: "Trip ready in seconds"      },
  ];

  return (
    <div className="space-y-0">

      {/* ── Hero ── */}
      <section className="relative -mx-4 -mt-8 overflow-hidden md:-mx-6">
        <img src={HERO_BG} alt="Travel" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-b from-slate-900/75 via-slate-900/60 to-slate-900/85" />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

        <div className="relative px-4 pb-0 pt-16 sm:px-6 sm:pt-22 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {t("home.badge")}
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {t("home.hero.title1")}
              <span className="mt-2 block bg-linear-to-r from-sky-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
                {t("home.hero.title2")}
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {t("home.hero.description")}
            </p>

            {/* CTA row */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => nav("/create")}
                className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-sky-500/35 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-sky-500/45 active:translate-y-0">
                <PlaneTakeoff size={16} strokeWidth={2.5} />
                {t("home.cta.createTrip")}
                <ArrowRight size={14} strokeWidth={2.5} />
              </button>
              <button onClick={() => nav("/hotels")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/18 hover:border-white/30">
                <Compass size={16} />
                Browse Destinations
              </button>
            </div>
          </div>

          {/* Search widget */}
          <div className="mx-auto mt-12 max-w-4xl">
            <QuickSearch />
          </div>
        </div>

        <div className="h-20 bg-linear-to-b from-transparent to-slate-50" />
      </section>

      {/* ── Trust strip ── */}
      <section className="relative -mt-2 px-0">
        <div className="flex overflow-x-auto no-scrollbar gap-3 pb-1">
          {TRUST.map((item) => (
            <div key={item.value}
              className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-200">
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">{item.value}</div>
                <div className="text-[11px] text-slate-400">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Popular Destinations ── */}
      <section className="mt-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-500">{t("home.destinations.badge")}</p>
            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {t("home.destinations.title")}
            </h2>
          </div>
          <button onClick={() => nav("/create")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600">
            {t("home.destinations.startBlankTrip")} <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 xl:grid-cols-8">
          {DESTINATIONS.map((d) => (
            <button key={d.city} onClick={() => goToCreate(d.city)}
              className="group relative overflow-hidden rounded-3xl shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-900/20">
              <div className="aspect-3/4 overflow-hidden bg-slate-200">
                <img src={d.photo} alt={d.city}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                  loading="lazy" />
              </div>
              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
              {/* Hover pill */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                <span className="rounded-2xl bg-white px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-lg">
                  Plan trip →
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3.5 text-left">
                <div className="text-base font-black leading-tight text-white">{d.city}</div>
                <div className="mt-0.5 text-[11px] font-medium text-white/70">{d.emoji} {d.country}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="-mx-4 md:-mx-6 mt-20 bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-16 md:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400">{t("home.features.badge")}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              {t("home.features.title")}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="group relative overflow-hidden rounded-3xl border border-white/8 bg-white/5 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/8 hover:shadow-2xl hover:shadow-black/40">
                {/* Glow */}
                <div className={cx("absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20 bg-linear-to-br", f.from, f.to)} />
                <div className="relative">
                  <div className={cx("inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg", f.from, f.to)}>
                    {f.icon}
                  </div>
                  <div className="mt-5 text-base font-black text-white">{f.title}</div>
                  <div className="mt-2 text-sm leading-relaxed text-white/55">{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mt-20">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-500">{t("home.howItWorks.badge")}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            {t("home.howItWorks.title")}
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition hover:shadow-md">
              {/* Ghost number */}
              <div className="pointer-events-none absolute -bottom-3 -right-2 select-none text-9xl font-black leading-none text-slate-50">
                {step.number}
              </div>
              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className="absolute right-0 top-10 hidden h-px w-6 bg-linear-to-r from-sky-200 to-transparent sm:block" style={{ right: "-1.5rem" }} />
              )}
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 text-xl font-black text-white shadow-md shadow-sky-200/70">
                  {step.number}
                </div>
                <div className="mt-5 text-base font-black text-slate-900">{step.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="relative mt-20 overflow-hidden rounded-3xl bg-linear-to-br from-sky-600 via-blue-700 to-indigo-800 px-6 py-12 text-white shadow-[0_24px_80px_-20px_rgba(37,99,235,0.55)] sm:px-10 sm:py-16 lg:px-14">
        {/* Orbs */}
        <div className="absolute -left-14 -top-14 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-linear-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-white/75">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {t("home.cta.badge")}
            </div>
            <h3 className="mt-4 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">{t("home.cta.title")}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/75 sm:text-base">{t("home.cta.description")}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <button onClick={() => nav("/create")}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-sky-700 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0">
              <PlaneTakeoff size={16} />
              {t("home.cta.createTrip")}
            </button>
            <button onClick={() => nav("/trips")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/18 hover:border-white/35">
              {t("home.cta.myTrips")}
            </button>
          </div>
        </div>
      </section>

      <div className="h-10" />
    </div>
  );
}
