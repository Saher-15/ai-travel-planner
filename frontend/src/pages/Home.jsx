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
  { city: "Paris",     country: "France",    emoji: "🇫🇷", photo: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=85" },
  { city: "Tokyo",     country: "Japan",     emoji: "🇯🇵", photo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=85" },
  { city: "New York",  country: "USA",       emoji: "🇺🇸", photo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=85" },
  { city: "Dubai",     country: "UAE",       emoji: "🇦🇪", photo: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=85" },
  { city: "Barcelona", country: "Spain",     emoji: "🇪🇸", photo: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&q=85" },
  { city: "Rome",      country: "Italy",     emoji: "🇮🇹", photo: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=85" },
  { city: "Bali",      country: "Indonesia", emoji: "🇮🇩", photo: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=85" },
  { city: "London",    country: "UK",        emoji: "🇬🇧", photo: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=85" },
];

// Single accent color for all interactive elements — professional consistency
const FIELD_CLS = "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-3 focus:ring-blue-100";
const LABEL_CLS = "mb-1.5 block text-xs font-semibold text-slate-500";

// ─── QuickSearch widget ───────────────────────────────────────────────────────

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
    { id: "hotels",      icon: "🏨", label: t("nav.hotels")      },
    { id: "flights",     icon: "✈️", label: t("nav.flights")     },
    { id: "attractions", icon: "🎯", label: t("nav.attractions") },
    { id: "cars",        icon: "🚗", label: t("nav.cars")        },
    { id: "plan",        icon: "✨", label: t("nav.createTrip")  },
  ];

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
          <input type="date" value={value} min={min} onChange={e => onChange(e.target.value)} required className={FIELD_CLS} />
        </div>
      </div>
    );
  }

  function SelectField({ label, icon, value, onChange, options }) {
    return (
      <div>
        <label className={LABEL_CLS}>{label}</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
          <select value={value} onChange={e => onChange(e.target.value)} className={cx(FIELD_CLS, "appearance-none")}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/8">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-slate-100 no-scrollbar">
        {TABS.map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)}
            className={cx(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-150",
              tab === item.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}>
            <span>{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Forms */}
      <div className="px-5 py-5 sm:px-6 sm:py-6">
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
              <SelectField label={t("hotels.adults")} icon={<Users size={14} />} value={hotelAdults}
                onChange={v => setHotelAdults(Number(v))}
                options={[1,2,3,4,5,6].map(n => ({ value: n, label: `${n} ${n === 1 ? t("hotels.adult") : t("hotels.adults")}` }))} />
              <SelectField label={t("hotels.childrenLabel")} icon={<Baby size={14} />} value={hotelChildren}
                onChange={v => setHotelChildren(Number(v))}
                options={[0,1,2,3,4].map(n => ({ value: n, label: `${n} ${n === 1 ? t("hotels.child") : t("hotels.childrenLabel")}` }))} />
            </div>
            <SearchBtn>{t("hotels.searchButton")}</SearchBtn>
          </form>
        )}
        {tab === "flights" && (
          <form onSubmit={e => { e.preventDefault(); go("/flights", { from: flightFrom, destination: flightTo, depart: flightDate, adults: flightPax }); }}
            className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
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
              <SelectField label={t("flights.passengers")} icon={<Users size={14} />} value={flightPax}
                onChange={v => setFlightPax(Number(v))}
                options={[1,2,3,4,5,6].map(n => ({ value: n, label: `${n} ${n === 1 ? t("flights.passenger") : t("flights.passengersLabel")}` }))} />
            </div>
            <SearchBtn>{t("flights.searchButton")}</SearchBtn>
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
            <SearchBtn>{t("attractions.searchButton")}</SearchBtn>
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
            <SearchBtn>{t("cars.searchButton")}</SearchBtn>
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
            <SearchBtn>{t("home.quickSearch.planButton")}</SearchBtn>
          </form>
        )}
      </div>
    </div>
  );
}

function SearchBtn({ children }) {
  return (
    <button type="submit"
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]">
      <Search size={15} />
      {children}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, center = false }) {
  return (
    <div className={center ? "text-center" : ""}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
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
    { icon: <Wand2 size={22} />,        title: t("home.features.list.0.title"), text: t("home.features.list.0.text") },
    { icon: <Compass size={22} />,      title: t("home.features.list.1.title"), text: t("home.features.list.1.text") },
    { icon: <FolderKanban size={22} />, title: t("home.features.list.2.title"), text: t("home.features.list.2.text") },
    { icon: <MapPin size={22} />,       title: t("home.features.list.3.title"), text: t("home.features.list.3.text") },
  ];

  const STEPS = t("home.howItWorks.steps", { returnObjects: true });

  const STATS = [
    { value: "50K+",  label: "Trips planned"        },
    { value: "100+",  label: "Destinations"          },
    { value: "4.9★",  label: "Average rating"        },
    { value: "Free",  label: "Always free to use"    },
  ];

  return (
    <div>

      {/* ── Hero ── */}
      <section className="relative -mx-4 -mt-8 overflow-hidden md:-mx-6">
        <img src={HERO_BG} alt="Travel" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-b from-slate-900/80 via-slate-900/65 to-slate-900/90" />

        <div className="relative px-4 pb-0 pt-16 sm:px-8 sm:pt-24 md:pt-32">
          <div className="mx-auto max-w-2xl text-center">

            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {t("home.badge")}
            </div>

            <h1 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
              {t("home.hero.title1")}
              <span className="block bg-linear-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
                {t("home.hero.title2")}
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              {t("home.hero.description")}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => nav("/create")}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-700 active:scale-[0.98]">
                <PlaneTakeoff size={16} />
                {t("home.cta.createTrip")}
              </button>
              <button onClick={() => nav("/hotels")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
                Browse Destinations
              </button>
            </div>
          </div>

          {/* Search widget */}
          <div className="mx-auto mt-10 max-w-4xl">
            <QuickSearch />
          </div>
        </div>

        <div className="h-16 bg-linear-to-b from-transparent to-white" />
      </section>

      {/* ── Stats bar ── */}
      <section className="border-b border-slate-100 bg-white py-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.value} className="text-center">
              <div className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Popular Destinations ── */}
      <section className="mt-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <SectionHeader eyebrow={t("home.destinations.badge")} title={t("home.destinations.title")} />
          <button onClick={() => nav("/create")}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition hover:text-blue-800">
            {t("home.destinations.startBlankTrip")} <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {DESTINATIONS.map((d) => (
            <button key={d.city} onClick={() => goToCreate(d.city)}
              className="group relative overflow-hidden rounded-2xl bg-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/15">
              <div className="aspect-video overflow-hidden">
                <img src={d.photo} alt={d.city}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy" />
              </div>
              <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="text-base font-bold text-white">{d.city}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/65">
                  <span>{d.emoji}</span>
                  <span>{d.country}</span>
                </div>
              </div>
              {/* Hover CTA */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md">
                  Plan trip →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mt-20">
        <div className="mb-10">
          <SectionHeader eyebrow={t("home.features.badge")} title={t("home.features.title")} center />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div key={f.title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {f.icon}
              </div>
              <div className="mt-5">
                <div className="text-sm font-bold text-slate-900">{f.title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.text}</p>
              </div>
              <div className="mt-5 text-xs font-bold text-blue-600">0{i + 1}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mt-20">
        <div className="mb-10">
          <SectionHeader eyebrow={t("home.howItWorks.badge")} title={t("home.howItWorks.title")} center />
        </div>

        {/* Connecting line (desktop) */}
        <div className="relative">
          <div className="absolute left-0 right-0 top-5 hidden h-px bg-slate-100 sm:block" />
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="relative flex flex-col items-center text-center sm:px-4">
                {/* Step circle — sits on the line */}
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-sm font-black text-white shadow-md shadow-blue-200/60">
                  {step.number}
                </div>
                <div className="mt-5 text-sm font-bold text-slate-900">{step.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="relative mt-20 overflow-hidden rounded-2xl bg-slate-900 px-8 py-12 text-white sm:px-12 sm:py-16">
        {/* Subtle blue glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-lg">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">{t("home.cta.badge")}</span>
            </div>
            <h3 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{t("home.cta.title")}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{t("home.cta.description")}</p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <button onClick={() => nav("/create")}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98]">
              <PlaneTakeoff size={16} />
              {t("home.cta.createTrip")}
            </button>
            <button onClick={() => nav("/trips")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white">
              {t("home.cta.myTrips")}
            </button>
          </div>
        </div>
      </section>

      <div className="h-12" />
    </div>
  );
}
