import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  FolderKanban,
  Globe2,
  MapPinned,
  PlaneTakeoff,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button, Card, CardBody, Badge } from "../components/UI.jsx";
import { useTranslation } from "react-i18next";

const cx = (...c) => c.filter(Boolean).join(" ");

const STOCK = {
  hero: [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1526779259212-939e64788e3c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  ],
  visual:
    "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1600&q=80",
};

export default function Home() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const nav = useNavigate();
  const [a, b, c] = useMemo(() => STOCK.hero, []);

  const goToCreate = (payload = {}) => {
    const params = new URLSearchParams();
    if (payload.destination) params.set("destination", payload.destination);
    if (payload.travelers) params.set("travelers", payload.travelers);
    if (payload.tripType) params.set("tripType", payload.tripType);
    const query = params.toString();
    nav(query ? `/create?${query}` : "/create");
  };

  const features = [
    { title: t("home.features.list.0.title"), text: t("home.features.list.0.text"), icon: <Wand2 size={20} /> },
    { title: t("home.features.list.1.title"), text: t("home.features.list.1.text"), icon: <Compass size={20} /> },
    { title: t("home.features.list.2.title"), text: t("home.features.list.2.text"), icon: <FolderKanban size={20} /> },
    { title: t("home.features.list.3.title"), text: t("home.features.list.3.text"), icon: <MapPinned size={20} /> },
  ];

  const highlights = t("home.highlights", { returnObjects: true });

  const stats = [
    { label: t("home.stats.generationSpeed"), value: t("home.stats.fast"), sub: t("home.stats.quickItinerary"), icon: <Sparkles size={18} /> },
    { label: t("home.stats.dailyStructure"), value: t("home.stats.threeBlocks"), sub: t("home.stats.morningAfternoonEvening"), icon: <Globe2 size={18} /> },
    { label: t("home.stats.tripManagement"), value: t("home.stats.easy"), sub: t("home.stats.saveRevisit"), icon: <FolderKanban size={18} /> },
    { label: t("home.stats.experience"), value: t("home.stats.premium"), sub: t("home.stats.modernDesign"), icon: <PlaneTakeoff size={18} /> },
  ];

  const steps = t("home.howItWorks.steps", { returnObjects: true });
  const travelModes = t("home.planningStyles.modes", { returnObjects: true });
  const destinations = t("home.destinations.list", { returnObjects: true });
  const plannerBenefits = t("home.focusedIdentity.benefits", { returnObjects: true });
  const featureBadges = t("home.featureBadges", { returnObjects: true });

  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(to_bottom_right,#f8fbff,#ffffff,#f2f8ff)]" />
          <div className="absolute -left-10 top-0 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-indigo-200/25 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-100/30 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-size-[32px_32px] opacity-40" />
        </div>

        <div className="relative grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-12 lg:px-10 lg:py-14">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.9)]" />
              {t("home.badge")}
            </div>

            <div className="mt-6 max-w-3xl">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-7xl">
                {t("home.hero.title1")}
                <span className="mt-2 block bg-gradient-to-r from-sky-700 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
                  {t("home.hero.title2")}
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                {t("home.hero.description")}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur"
                >
                  <span className="text-emerald-600">✓</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                onClick={() => nav("/create")}
              >
                <PlaneTakeoff size={16} />
                {t("home.hero.startPlanning")}
              </Button>

              <Button
                variant="secondary"
                className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                onClick={() => nav("/trips")}
              >
                <FolderKanban size={16} />
                {t("home.hero.exploreTrips")}
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">
                    {item.icon}
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <div className="grid gap-4 sm:grid-cols-2">
                <PhotoCard
                  src={a}
                  className="min-h-60 sm:row-span-2 sm:min-h-full"
                  badge={t("home.photoCards.topDestinations")}
                  caption={t("home.photoCards.inspiredPlanning")}
                />
                <PhotoCard src={b} className="min-h-[10.625rem]" badge={t("home.photoCards.cultureFood")} caption={t("home.photoCards.inspiredPlanning")} />
                <PhotoCard src={c} className="min-h-[10.625rem]" badge={t("home.photoCards.natureEscape")} caption={t("home.photoCards.inspiredPlanning")} />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoCard
                  title={t("home.infoCard.focusedPlanning")}
                  subtitle={t("home.infoCard.noBookings")}
                  badge={t("home.infoCard.clearIdentity")}
                />
                <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-600 to-blue-700 p-4 text-white shadow-lg">
                  <div className="text-sm font-bold">{t("home.infoCard.premiumPlanner")}</div>
                  <div className="mt-1 text-xs text-white/80">
                    {t("home.infoCard.strongVisuals")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm sm:px-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {featureBadges.map((item) => (
            <span
              key={item}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {t("home.howItWorks.badge")}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            {t("home.howItWorks.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
            {t("home.howItWorks.description")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <Card
              key={step.number}
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-28px_rgba(15,23,42,0.3)]"
            >
              <CardBody className="relative space-y-4">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-100 blur-2xl transition duration-300 group-hover:bg-sky-200" />
                <div className="relative">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-sm font-black text-white shadow-sm">
                    {step.number}
                  </div>
                  <div className="mt-4 text-lg font-black text-slate-900">
                    {step.title}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    {step.text}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {t("home.planningStyles.badge")}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            {t("home.planningStyles.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
            {t("home.planningStyles.description")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {travelModes.map((mode) => (
            <Card
              key={mode.title}
              className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-28px_rgba(15,23,42,0.3)]"
            >
              <CardBody className="space-y-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-2xl shadow-sm">
                  {mode.icon}
                </div>
                <div className="text-lg font-black text-slate-900">{mode.title}</div>
                <div className="text-sm leading-6 text-slate-600">{mode.text}</div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              {t("home.destinations.badge")}
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              {t("home.destinations.title")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
              {t("home.destinations.description")}
            </p>
          </div>

          <Button
            variant="secondary"
            className="inline-flex items-center gap-2 text-xs sm:text-sm"
            onClick={() => nav("/create")}
          >
            <ArrowRight size={16} />
            {t("home.destinations.startBlankTrip")}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {destinations.map((d) => (
            <Card
              key={d.name}
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-28px_rgba(15,23,42,0.3)]"
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src={STOCK.hero[destinations.indexOf(d) % STOCK.hero.length] || STOCK.visual}
                  alt={d.name}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
                  <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    {d.badge}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-lg font-black text-white">{d.name}</div>
                  <div className="text-xs text-white/80">{d.tag}</div>
                </div>
              </div>

              <CardBody className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    {t("home.destinations.inspirationReady")}
                  </span>
                  <Badge>{d.badge}</Badge>
                </div>

                <Button
                  className="inline-flex w-full items-center justify-center gap-2"
                  onClick={() =>
                    goToCreate({
                      destination: d.name,
                      travelers: "2",
                      tripType: "round",
                    })
                  }
                >
                  <MapPinned size={16} />
                  {t("home.destinations.planDestination")}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {t("home.features.badge")}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            {t("home.features.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
            {t("home.features.description")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-28px_rgba(15,23,42,0.3)]"
            >
              <CardBody className="relative">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-100 blur-2xl transition duration-300 group-hover:bg-sky-200" />
                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm">
                    {f.icon}
                  </div>
                  <div className="text-lg font-black text-slate-900">{f.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{f.text}</div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Card className="h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <CardBody className="flex h-full flex-col justify-between space-y-6">
              <div>
                <div className="inline-flex rounded-full border border-slate-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {t("home.focusedIdentity.badge")}
                </div>

                <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
                  {t("home.focusedIdentity.title")}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {t("home.focusedIdentity.description")}
                </p>
              </div>

              <div className="space-y-3">
                {plannerBenefits.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <span className="mt-0.5 text-emerald-600">●</span>
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              <div>
                <Button
                  variant="secondary"
                  className="inline-flex items-center gap-2"
                  onClick={() => nav("/create")}
                >
                  <PlaneTakeoff size={16} />
                  {t("home.focusedIdentity.buildTrip")}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)]">
            <img
              src={STOCK.visual}
              alt="Travel inspiration"
              className="h-[27.5rem] w-full object-cover transition duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />

            <div className="absolute left-5 right-5 top-5 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {t("home.visual.inspirationFirst")}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {t("home.visual.aiPlanning")}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {t("home.visual.premiumUX")}
              </span>
            </div>

            <div className="absolute bottom-5 left-5 right-5">
              <div className="max-w-xl rounded-3xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
                <div className="text-sm font-semibold uppercase tracking-wide text-white/80">
                  {t("home.visual.visualExperience")}
                </div>
                <div className="mt-2 text-2xl font-black">
                  {t("home.visual.title")}
                </div>
                <div className="mt-2 text-sm leading-6 text-white/85">
                  {t("home.visual.description")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-800 p-8 text-white shadow-[0_20px_80px_-30px_rgba(15,23,42,0.5)] sm:p-10">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-10 -right-5 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-size-[30px_30px] opacity-20" />
        </div>

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              {t("home.cta.badge")}
            </div>
            <h3 className="mt-4 text-3xl font-black tracking-tight">
              {t("home.cta.title")}
            </h3>
            <p className="mt-2 text-sm leading-7 text-white/80 sm:text-base">
              {t("home.cta.description")}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              onClick={() => nav("/create")}
            >
              <PlaneTakeoff size={16} />
              {t("home.cta.createTrip")}
            </Button>

            <Button
              variant="secondary"
              className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
              onClick={() => nav("/trips")}
            >
              {t("home.cta.myTrips")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PhotoCard({ src, badge, caption, className = "" }) {
  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      <img
        src={src}
        alt={badge}
        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      <div className="absolute left-3 right-3 top-3 flex justify-between">
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {badge}
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white/95 backdrop-blur">
          {caption}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, subtitle, badge }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
        </div>
        <Badge>{badge}</Badge>
      </div>
    </div>
  );
}
