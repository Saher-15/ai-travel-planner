import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function FAQItem({ q, a, open, onToggle }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6">
        <span className="text-sm font-bold text-slate-900 sm:text-base">{q}</span>
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600 sm:px-6">{a}</div>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const faqs = t("faq.questions", { returnObjects: true });

  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-4xl border border-sky-100 bg-white/90 p-6 shadow-[0_20px_60px_-30px_rgba(2,132,199,0.35)] sm:p-8">
        <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
          {t("faq.badge")}
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{t("faq.title")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{t("faq.description")}</p>

        <div className="mt-8 grid gap-4">
          {faqs.map((item, index) => (
            <FAQItem key={index} q={item.q} a={item.a} open={openIndex === index} onToggle={() => setOpenIndex(openIndex === index ? -1 : index)} />
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="text-sm font-bold text-slate-900">{t("faq.stillNeedHelp")}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("faq.stillNeedHelpText")}</p>
          <div className="mt-4">
            <Link to="/contact" className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500">
              {t("faq.contactSupport")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
