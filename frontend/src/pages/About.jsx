import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Globe, ShieldCheck, Zap } from "lucide-react";

export default function About() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-4xl border border-slate-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-linear-to-br from-sky-50 via-white to-indigo-50" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14 text-center">
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
            {t("about.badge")}
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {t("about.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            {t("about.subtitle")}
          </p>
        </div>
      </section>

      {/* About text */}
      <section className="rounded-4xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mx-auto max-w-3xl space-y-4 text-sm leading-7 text-slate-600">
          <p>{t("about.p1")}</p>
          <p>{t("about.p2")}</p>
        </div>
      </section>

      {/* Tech cards */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-black tracking-tight text-slate-900">{t("about.techTitle", "Built with modern technology")}</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl border border-sky-100 bg-linear-to-br from-sky-50 to-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <Zap size={20} />
            </div>
            <div className="mt-4 text-base font-extrabold text-slate-900">{t("about.frontendTitle")}</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">{t("about.frontendText")}</div>
          </div>
          <div className="rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Globe size={20} />
            </div>
            <div className="mt-4 text-base font-extrabold text-slate-900">{t("about.backendTitle")}</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">{t("about.backendText")}</div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: <Sparkles size={18} />, color: "sky", title: t("about.value1Title", "AI-Powered"), text: t("about.value1Text", "Intelligent itineraries tailored to your travel style, budget and interests.") },
            { icon: <ShieldCheck size={18} />, color: "emerald", title: t("about.value2Title", "Free to Use"), text: t("about.value2Text", "No subscriptions, no hidden fees. Plan your trip for free, forever.") },
            { icon: <Globe size={18} />, color: "violet", title: t("about.value3Title", "100+ Destinations"), text: t("about.value3Text", "Covering cities across every continent with rich local recommendations.") },
          ].map((item, i) => (
            <div key={i} className={`rounded-3xl border border-${item.color}-100 bg-${item.color}-50/60 p-5`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-${item.color}-100 text-${item.color}-600`}>
                {item.icon}
              </div>
              <div className="mt-3 text-sm font-extrabold text-slate-900">{item.title}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{item.text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
