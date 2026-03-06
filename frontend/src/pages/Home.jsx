import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, Badge } from "../components/UI.jsx";

const cx = (...c) => c.filter(Boolean).join(" ");

const STOCK = {
  hero: [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1526779259212-939e64788e3c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1518684079-4c3b23f1f3f4?auto=format&fit=crop&w=1600&q=80",
  ],
  map: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1600&q=80",
};

const features = [
  {
    title: "AI day-by-day plan",
    text: "Generate a realistic itinerary with morning, afternoon, and evening activities that feel balanced and usable.",
    icon: "✨",
  },
  {
    title: "Smart pacing",
    text: "Switch between relaxed, moderate, or packed travel styles and let the plan adapt automatically.",
    icon: "⚡",
  },
  {
    title: "Save & manage trips",
    text: "Keep all your trips in one place, revisit them anytime, and manage your planning with ease.",
    icon: "📁",
  },
  {
    title: "Map preview",
    text: "Explore destinations visually and make the planning experience feel more interactive and real.",
    icon: "🗺️",
  },
];

const stats = [
  { k: "Fast Output", v: "10–30s", d: "average trip generation" },
  { k: "Daily Structure", v: "3 Blocks", d: "morning / afternoon / evening" },
  { k: "Your Library", v: "Unlimited", d: "saved trips in your account" },
];

const highlights = [
  "Beautiful modern planning experience",
  "Built with clean reusable UI components",
  "Perfect for portfolio, recruiters, and demo presentations",
];

export default function Home() {
  const nav = useNavigate();
  const [a, b, c] = useMemo(() => STOCK.hero, []);

  return (
    <div className="space-y-16">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_20px_80px_-30px_rgba(15,23,42,0.25)]">
        {/* background layers */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-slate-50 via-white to-slate-100" />
          <div className="absolute -top-24 -left-15 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute -right-20 top-20 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
          <div className="absolute -bottom-22.5 left-1/3 h-72 w-72 rounded-full bg-cyan-100/40 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.8),transparent_35%)]" />
        </div>

        <div className="relative grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-12 lg:px-10 lg:py-14">
          {/* LEFT */}
          <div className="lg:col-span-6 lg:pr-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              AI-powered itinerary planner
            </div>

            <div className="mt-6 max-w-2xl">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Turn travel ideas
                <span className="mt-1 block bg-linear-to-r from-slate-900 via-slate-700 to-slate-400 bg-clip-text text-transparent">
                  into stunning trip plans.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Build a complete day-by-day travel itinerary in minutes. Choose your destination,
                travel dates, pace, and preferences — then let AI generate a polished plan you can save,
                manage, and explore visually.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto" onClick={() => nav("/create")}>
                Start Planning
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => nav("/trips")}
              >
                Explore My Trips
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm"
                >
                  <span className="text-emerald-600">✓</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <div
                  key={s.k}
                  className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {s.k}
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{s.v}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{s.d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <PhotoCard
                src={a}
                className="min-h-60 sm:row-span-2 sm:min-h-full"
                badge="Top Destinations"
              />
              <PhotoCard src={b} className="min-h-42.5" badge="Food & Culture" />
              <PhotoCard src={c} className="min-h-42.5" badge="Nature & Escape" />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Trip setup</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Destination • dates • pace • budget
                    </div>
                  </div>
                  <Badge>Smart inputs</Badge>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm">
                <div className="text-sm font-bold">Premium experience</div>
                <div className="mt-1 text-xs text-slate-300">
                  Modern travel planner feel for your portfolio project
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / VALUE BAR */}
      <section className="grid gap-4 md:grid-cols-3">
        <TrustItem
          title="Secure access"
          text="Authentication flow with protected routes and account-based trip management."
          icon="🔐"
        />
        <TrustItem
          title="Modern interface"
          text="Reusable UI components, clean spacing, and polished product-style presentation."
          icon="🎨"
        />
        <TrustItem
          title="Built to impress"
          text="A strong showcase project for GitHub, interviews, and recruiter demos."
          icon="🚀"
        />
      </section>

      {/* FEATURES */}
      <section className="space-y-6">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            Powerful features
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            Everything you need to plan with confidence
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Designed to make your app feel like a real platform, not just a simple form.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.35)]"
            >
              <CardBody className="relative">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-slate-100 blur-2xl transition duration-300 group-hover:bg-slate-200" />
                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-xl text-white shadow-sm">
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

      {/* SHOWCASE */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Card className="h-full overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
            <CardBody className="flex h-full flex-col justify-between space-y-6">
              <div>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  Product feel
                </div>

                <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
                  Make your travel app look like a serious SaaS product
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  A strong hero section, polished cards, trust sections, and a destination showcase
                  instantly make your project feel more premium and recruiter-ready.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  "Strong visual first impression",
                  "Better storytelling for your product",
                  "Cleaner feature presentation",
                  "Higher-quality portfolio appearance",
                ].map((item) => (
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
                <Button variant="secondary" onClick={() => nav("/create")}>
                  Build My Trip
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <div className="group relative overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)]">
            <img
              src={STOCK.map}
              alt="Map preview"
              className="h-105 w-full object-cover transition duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/75 via-slate-900/20 to-transparent" />

            <div className="absolute left-5 right-5 top-5 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                Destination Preview
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                Visual Planning
              </span>
            </div>

            <div className="absolute bottom-5 left-5 right-5">
              <div className="max-w-xl rounded-3xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
                <div className="text-sm font-semibold uppercase tracking-wide text-white/80">
                  Interactive feel
                </div>
                <div className="mt-2 text-2xl font-black">
                  See your destination before you even generate the plan
                </div>
                <div className="mt-2 text-sm leading-6 text-white/85">
                  Combine itinerary generation with strong visuals to create a travel platform that
                  feels modern, engaging, and premium.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden rounded-4xl border border-slate-200 bg-slate-900 p-8 text-white shadow-[0_20px_80px_-30px_rgba(15,23,42,0.6)] sm:p-10">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-15 -right-5 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              Ready to begin?
            </div>
            <h3 className="mt-4 text-3xl font-black tracking-tight">
              Start building your next unforgettable trip
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-300 sm:text-base">
              Choose your destination, select your dates, and let your AI travel planner create
              a polished itinerary that looks and feels professional.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={() => nav("/create")}>
              Create Trip
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto border-white/20 bg-white/10 text-white hover:bg-white/15"
              onClick={() => nav("/trips")}
            >
              My Trips
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PhotoCard({ src, badge, className = "" }) {
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
      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
      <div className="absolute left-3 right-3 top-3 flex justify-between">
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {badge}
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white/95 backdrop-blur">
          Inspiring places, smarter planning
        </div>
      </div>
    </div>
  );
}

function TrustItem({ title, text, icon }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg text-white shadow-sm">
        {icon}
      </div>
      <div className="text-lg font-black text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}