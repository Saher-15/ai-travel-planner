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
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-indigo-50" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative grid gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <div className="lg:col-span-8">
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">{t("contact.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{t("contact.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{t("contact.description")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <HeroStat icon={<Sparkles size={18} />} title={t("contact.stats.tripHelp")} value={t("contact.stats.ai")} subtitle={t("contact.stats.plannerGuidance")} />
              <HeroStat icon={<LifeBuoy size={18} />} title={t("contact.stats.support")} value={t("contact.stats.support247")} subtitle={t("contact.stats.messageAnytime")} />
              <HeroStat icon={<MessageSquareText size={18} />} title={t("contact.stats.replies")} value={t("contact.stats.profile")} subtitle={t("contact.stats.trackResponses")} />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-bold text-slate-900">{t("contact.whatHelp.title")}</div>
              <div className="mt-4 grid gap-3">
                <MiniInfo title={t("contact.whatHelp.tripPlanning")} text={t("contact.whatHelp.tripPlanningText")} />
                <MiniInfo title={t("contact.whatHelp.accountSupport")} text={t("contact.whatHelp.accountSupportText")} />
                <MiniInfo title={t("contact.whatHelp.featureRequests")} text={t("contact.whatHelp.featureRequestsText")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("contact.form.title")} subtitle={t("contact.form.subtitle")} />
            <CardBody className="space-y-6 bg-gradient-to-b from-white to-slate-50/60">
              {msg ? <Alert type={msg.type}>{msg.text}</Alert> : null}

              <form onSubmit={onSubmit} className="space-y-6">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-sm"><User size={18} /></div>
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

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-sm"><Mail size={18} /></div>
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
                        className="w-full resize-none rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
                      <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>{t("contact.form.beSpecific")}</span>
                        <span>{t("contact.form.wordsCharacters", { words: messageWords, chars: messageLength })}</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
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
            <CardBody className="bg-gradient-to-b from-white to-slate-50/60">
              <div className="space-y-4">
                <StepCard number="1" title={t("contact.howSupport.step1Title")} text={t("contact.howSupport.step1Text")} />
                <StepCard number="2" title={t("contact.howSupport.step2Title")} text={t("contact.howSupport.step2Text")} />
                <StepCard number="3" title={t("contact.howSupport.step3Title")} text={t("contact.howSupport.step3Text")} />
              </div>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("contact.tips.title")} subtitle={t("contact.tips.subtitle")} />
            <CardBody className="bg-gradient-to-b from-white to-slate-50/60">
              <div className="space-y-3 text-sm text-slate-600">
                <TipItem text={t("contact.tips.tip1")} />
                <TipItem text={t("contact.tips.tip2")} />
                <TipItem text={t("contact.tips.tip3")} />
                <TipItem text={t("contact.tips.tip4")} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon, title, value, subtitle }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">{icon}</div>
      <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
    </div>
  );
}

function MiniInfo({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}

function StepCard({ number, title, text }) {
  return (
    <div className="flex gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-sm font-black text-white">{number}</div>
      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
      </div>
    </div>
  );
}

function TipItem({ text }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
      <div>{text}</div>
    </div>
  );
}
