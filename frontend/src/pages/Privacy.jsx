import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

function Section({ number, title, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 border-l-4 border-l-sky-500 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-blue-600 text-xs font-black text-white shadow-md shadow-sky-200/50">
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function Privacy() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const s = (key) => t(`privacy.sections.${key}`, { returnObjects: true });

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ── Dark header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white shadow-xl sm:px-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -bottom-8 left-8 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70">
            🔒 {t("privacy.badge")}
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t("privacy.title")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-white/60">{t("privacy.description")}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/50">
            Last updated: {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="space-y-3">
        <Section number="1" title={s("1").title}>
          <p>{s("1").p1}</p>
          <p>{s("1").p2}</p>
        </Section>

        <Section number="2" title={s("2").title}>
          <p>{s("2").intro}</p>
          <ul className="list-disc space-y-2 pl-5">
            {s("2").items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </Section>

        <Section number="3" title={s("3").title}>
          <p>{s("3").p1}</p>
          <p>{s("3").p2}</p>
        </Section>

        <Section number="4" title={s("4").title}>
          <p>{s("4").p1}</p>
        </Section>

        <Section number="5" title={s("5").title}>
          <p>{s("5").p1}</p>
        </Section>

        <Section number="6" title={s("6").title}>
          <p>{s("6").p1}</p>
        </Section>

        <Section number="7" title={s("7").title}>
          <p>{s("7").p1}</p>
        </Section>
      </div>

      {/* ── Contact CTA ── */}
      <div className="rounded-3xl border border-sky-100 bg-linear-to-br from-sky-50 to-indigo-50 p-6">
        <div className="text-sm font-bold text-slate-900">{t("privacy.questions")}</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("privacy.questionsText")}</p>
        <div className="mt-4">
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-200/50 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-200/60"
          >
            {t("privacy.contactUs")}
          </Link>
        </div>
      </div>

    </div>
  );
}
