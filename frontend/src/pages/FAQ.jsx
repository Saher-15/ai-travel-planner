import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function FAQItem({ q, a, open, onToggle }) {
  return (
    <div className={`overflow-hidden rounded-3xl border bg-white transition-all duration-200 ${open ? "border-sky-200 bg-sky-50/50 shadow-sm" : "border-slate-200 shadow-sm"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6">
        <span className="text-sm font-bold text-slate-900 sm:text-base">{q}</span>
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-black leading-none transition-all duration-200 ${open ? "bg-sky-500 text-white shadow-md shadow-sky-200/60" : "bg-slate-100 text-slate-500"}`}>
          {open ? "−" : "+"}
        </span>
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-sky-100 px-5 py-4 text-sm leading-7 text-slate-600 sm:px-6">{a}</div>
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
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ── Dark header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white shadow-xl sm:px-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -bottom-8 left-8 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70">
            {t("faq.badge")}
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t("faq.title")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-white/60">{t("faq.description")}</p>
        </div>
      </div>

      {/* ── FAQ items ── */}
      <div className="space-y-2">
        {faqs.map((item, index) => (
          <FAQItem
            key={index}
            q={item.q}
            a={item.a}
            open={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
          />
        ))}
      </div>

      {/* ── Help card ── */}
      <div className="rounded-3xl border border-sky-100 bg-linear-to-br from-sky-50 to-indigo-50 p-6">
        <div className="text-sm font-bold text-slate-900">{t("faq.stillNeedHelp")}</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("faq.stillNeedHelpText")}</p>
        <div className="mt-4">
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-200/50 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-200/60"
          >
            {t("faq.contactSupport")}
          </Link>
        </div>
      </div>

    </div>
  );
}
