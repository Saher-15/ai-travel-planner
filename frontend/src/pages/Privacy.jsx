import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

function Section({ title, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-black tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export default function Privacy() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const s = (key) => t(`privacy.sections.${key}`, { returnObjects: true });

  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-4xl border border-sky-100 bg-white/90 p-6 shadow-[0_20px_60px_-30px_rgba(2,132,199,0.35)] sm:p-8">
        <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
          {t("privacy.badge")}
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{t("privacy.title")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{t("privacy.description")}</p>

        <div className="mt-8 grid gap-4">
          <Section title={s("1").title}>
            <p>{s("1").p1}</p>
            <p>{s("1").p2}</p>
          </Section>

          <Section title={s("2").title}>
            <p>{s("2").intro}</p>
            <ul className="list-disc space-y-2 pl-5">
              {s("2").items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </Section>

          <Section title={s("3").title}>
            <p>{s("3").p1}</p>
            <p>{s("3").p2}</p>
          </Section>

          <Section title={s("4").title}>
            <p>{s("4").p1}</p>
          </Section>

          <Section title={s("5").title}>
            <p>{s("5").p1}</p>
          </Section>

          <Section title={s("6").title}>
            <p>{s("6").p1}</p>
          </Section>

          <Section title={s("7").title}>
            <p>{s("7").p1}</p>
          </Section>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="text-sm font-bold text-slate-900">{t("privacy.questions")}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("privacy.questionsText")}</p>
          <div className="mt-4">
            <Link to="/contact" className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500">
              {t("privacy.contactUs")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
