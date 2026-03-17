import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Mail, ShieldCheck, KeyRound } from "lucide-react";
import { api } from "../api/client";
import { Card, CardHeader, CardBody, Input, Button, Alert, Badge } from "../components/UI";
import { useTranslation } from "react-i18next";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export default function ForgotPassword() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => normalizeEmail(email).length > 0 && !loading, [email, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(""); setErr("");
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) { setErr(t("forgotPassword.errors.enterEmail")); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: cleanEmail });
      setMsg(data?.message || t("forgotPassword.errors.resetLinkSent"));
    } catch (e2) {
      setErr(e2?.response?.data?.message || t("forgotPassword.errors.somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-4xl border border-slate-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-linear-to-br from-sky-50 via-white to-indigo-50" />
        <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative grid gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <div className="lg:col-span-8">
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">{t("forgotPassword.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{t("forgotPassword.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{t("forgotPassword.description")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <InfoStat icon={<Mail size={18} />} title={t("forgotPassword.stats.emailReset")} text={t("forgotPassword.stats.emailResetText")} />
              <InfoStat icon={<ShieldCheck size={18} />} title={t("forgotPassword.stats.safeAccess")} text={t("forgotPassword.stats.safeAccessText")} />
              <InfoStat icon={<KeyRound size={18} />} title={t("forgotPassword.stats.quickRecovery")} text={t("forgotPassword.stats.quickRecoveryText")} />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-4xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-bold text-slate-900">{t("forgotPassword.tip.title")}</div>
              <div className="mt-3 text-sm leading-6 text-slate-600">{t("forgotPassword.tip.text")}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("forgotPassword.form.title")} subtitle={t("forgotPassword.form.subtitle")} />
            <CardBody className="space-y-6 bg-linear-to-b from-white to-slate-50/60">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <div className="text-lg font-bold text-slate-900">{t("forgotPassword.form.accountEmail")}</div>
                    <div className="text-sm text-slate-500">{t("forgotPassword.form.accountEmailSubtitle")}</div>
                  </div>
                  <Input label={t("common.email")} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())} autoComplete="email" />
                </div>

                {msg ? <Alert type="success">{msg}</Alert> : null}
                {err ? <Alert type="error">{err}</Alert> : null}

                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {t("forgotPassword.form.checkEmail")}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link to="/login" className="text-sm font-semibold text-slate-700 transition hover:text-sky-700">
                    {t("forgotPassword.form.backToLogin")}
                  </Link>
                  <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
                    {loading ? t("forgotPassword.form.sending") : t("forgotPassword.form.sendResetLink")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("forgotPassword.howItWorks.title")} subtitle={t("forgotPassword.howItWorks.subtitle")} />
            <CardBody className="bg-linear-to-b from-white to-slate-50/60">
              <div className="space-y-4">
                <StepCard number="1" title={t("forgotPassword.howItWorks.step1Title")} text={t("forgotPassword.howItWorks.step1Text")} />
                <StepCard number="2" title={t("forgotPassword.howItWorks.step2Title")} text={t("forgotPassword.howItWorks.step2Text")} />
                <StepCard number="3" title={t("forgotPassword.howItWorks.step3Title")} text={t("forgotPassword.howItWorks.step3Text")} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoStat({ icon, title, text }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">{icon}</div>
      <div className="mt-3 text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{text}</div>
    </div>
  );
}

function StepCard({ number, title, text }) {
  return (
    <div className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-sm font-black text-white">{number}</div>
      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
      </div>
    </div>
  );
}
