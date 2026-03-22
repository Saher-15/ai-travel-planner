import { useState, useEffect, useMemo } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthProvider";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input } from "../components/UI.jsx";
import { LifeBuoy, Mail, MessageSquareText, Send, Sparkles, User } from "lucide-react";
import { useTranslation } from "react-i18next";

function countWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

export default function Contact() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setForm((prev) => ({ ...prev, name: user?.name || prev.name, email: user?.email || prev.email }));
  }, [user]);

  function updateField(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }

  const subjectLength = form.subject.trim().length;
  const messageLength = form.message.trim().length;
  const messageWords = countWords(form.message);

  const canSubmit = useMemo(() => !loading && form.name.trim().length > 0 && form.email.trim().length > 0 && form.subject.trim().length > 0 && form.message.trim().length > 0, [form, loading]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setMsg({ type: "error", text: t("contact.errors.fillAllFields") });
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/contact", { name: form.name.trim(), email: form.email.trim(), subject: form.subject.trim(), message: form.message.trim() });
      setMsg({ type: "success", text: data?.message || t("contact.errors.messageSent") });
      setForm((prev) => ({ ...prev, subject: "", message: "" }));
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.message || t("contact.errors.sendFailed") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-sky-950 px-6 py-8 text-white shadow-xl sm:px-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-8 left-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t("contact.badge")}
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{t("contact.title")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">{t("contact.description")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { icon: "✉️", label: "Reply in your Profile inbox" },
              { icon: "🤖", label: "AI trip planning help" },
              { icon: "🔒", label: "Account & security support" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                {item.icon} {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("contact.form.title")} subtitle={t("contact.form.subtitle")} />
            <CardBody className="space-y-6 bg-linear-to-b from-white to-slate-50/60">
              {msg ? <Alert type={msg.type}>{msg.text}</Alert> : null}

              <form onSubmit={onSubmit} className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-sm"><User size={18} /></div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{t("contact.form.yourInfo")}</div>
                      <div className="text-sm text-slate-500">{t("contact.form.yourInfoSubtitle")}</div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label={t("common.name")} placeholder={t("contact.form.namePlaceholder")} required value={form.name} onChange={(e) => updateField("name", e.target.value)} />
                    <Input label={t("common.email")} type="email" placeholder={t("contact.form.emailPlaceholder")} required value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-sm"><Mail size={18} /></div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{t("contact.form.messageDetails")}</div>
                      <div className="text-sm text-slate-500">{t("contact.form.messageDetailsSubtitle")}</div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Input label={t("common.subject")} placeholder={t("contact.form.subjectPlaceholder")} required value={form.subject} onChange={(e) => updateField("subject", e.target.value)} />
                      <div className="text-right text-xs text-slate-500">{subjectLength} {t("contact.form.characters")}</div>
                    </div>
                    <label className="block">
                      <div className="mb-1.5 text-sm font-semibold text-slate-700">{t("common.message")}</div>
                      <textarea required rows={7} value={form.message} onChange={(e) => updateField("message", e.target.value)} placeholder={t("contact.form.messagePlaceholder")}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
                      <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>{t("contact.form.beSpecific")}</span>
                        <span>{t("contact.form.wordsCharacters", { words: messageWords, chars: messageLength })}</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {t("contact.form.repliesNote")}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">{t("contact.form.clearMessages")}</div>
                  <Button type="submit" disabled={!canSubmit} className="inline-flex items-center gap-2">
                    <Send size={16} />
                    {loading ? t("contact.form.sending") : t("contact.form.sendMessage")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("contact.howSupport.title")} subtitle={t("contact.howSupport.subtitle")} />
            <CardBody className="space-y-3 bg-linear-to-b from-white to-slate-50/60">
              {[
                { num: "1", title: t("contact.howSupport.step1Title"), text: t("contact.howSupport.step1Text") },
                { num: "2", title: t("contact.howSupport.step2Title"), text: t("contact.howSupport.step2Text") },
                { num: "3", title: t("contact.howSupport.step3Title"), text: t("contact.howSupport.step3Text") },
              ].map((s) => (
                <div key={s.num} className="flex gap-3.5 rounded-2xl border border-slate-100 bg-white p-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-linear-to-br from-sky-500 to-blue-600 text-xs font-black text-white shadow-sm">
                    {s.num}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{s.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{s.text}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("contact.tips.title")} subtitle={t("contact.tips.subtitle")} />
            <CardBody className="space-y-2 bg-linear-to-b from-white to-slate-50/60">
              {[t("contact.tips.tip1"), t("contact.tips.tip2"), t("contact.tips.tip3"), t("contact.tips.tip4")].map((tip) => (
                <div key={tip} className="flex items-start gap-2.5 rounded-xl px-1 py-1.5 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  {tip}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
