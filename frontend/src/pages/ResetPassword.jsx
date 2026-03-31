import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import PasswordStrengthBar from "../components/PasswordStrengthBar.jsx";
import { api } from "../api/client";
import { Card, CardHeader, CardBody, Button, Alert, Badge } from "../components/UI";
import { useTranslation } from "react-i18next";

function PasswordField({ label, value, onChange, show, onToggle, placeholder = "••••••••", autoComplete = "new-password" }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
        <button type="button" onClick={onToggle} aria-label={show ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-sky-600">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { token } = useParams();
  const nav = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function isStrongPassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pw);
  }

  const canSubmit = useMemo(() => (
    !loading && Boolean(token) && newPassword.trim().length > 0 && confirmPassword.trim().length > 0
  ), [loading, token, newPassword, confirmPassword]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(""); setErr("");
    if (!token) { setErr(t("resetPassword.errors.invalidToken")); return; }
    if (newPassword !== confirmPassword) { setErr(t("resetPassword.errors.noMatch")); return; }
    if (!isStrongPassword(newPassword)) { setErr(t("resetPassword.errors.weak")); return; }
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { newPassword, confirmPassword });
      setMsg(data?.message || t("resetPassword.errors.resetSuccess"));
      setTimeout(() => nav("/login"), 1000);
    } catch (e2) {
      setErr(e2?.response?.data?.message || t("resetPassword.errors.resetFailed"));
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
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">{t("resetPassword.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{t("resetPassword.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{t("resetPassword.description")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <InfoStat icon={<LockKeyhole size={18} />} title={t("resetPassword.stats.protected")} text={t("resetPassword.stats.protectedText")} />
              <InfoStat icon={<ShieldCheck size={18} />} title={t("resetPassword.stats.strongPassword")} text={t("resetPassword.stats.strongPasswordText")} />
              <InfoStat icon={<Eye size={18} />} title={t("resetPassword.stats.easyReview")} text={t("resetPassword.stats.easyReviewText")} />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-4xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-bold text-slate-900">{t("resetPassword.tip.title")}</div>
              <div className="mt-3 text-sm leading-6 text-slate-600">{t("resetPassword.tip.text")}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("resetPassword.form.title")} subtitle={t("resetPassword.form.subtitle")} />
            <CardBody className="space-y-6 bg-linear-to-b from-white to-slate-50/60">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <div className="text-lg font-bold text-slate-900">{t("resetPassword.form.newPasswordTitle")}</div>
                    <div className="text-sm text-slate-500">{t("resetPassword.form.newPasswordSubtitle")}</div>
                  </div>
                  <div className="space-y-5">
                    <PasswordField label={t("resetPassword.form.newPassword")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} show={showNewPassword} onToggle={() => setShowNewPassword((v) => !v)} />
                    <PasswordField label={t("resetPassword.form.confirmPassword")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} show={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} />
                  </div>
                </div>

                <PasswordStrengthBar password={newPassword} confirmPassword={confirmPassword} />

                {msg ? <Alert type="success">{msg}</Alert> : null}
                {err ? <Alert type="error">{err}</Alert> : null}

                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {t("resetPassword.form.redirectNote")}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link to="/login" className="text-sm font-semibold text-slate-700 transition hover:text-sky-700">
                    {t("resetPassword.form.backToLogin")}
                  </Link>
                  <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
                    {loading ? t("resetPassword.form.updating") : t("resetPassword.form.resetButton")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("resetPassword.securityChecklist.title")} subtitle={t("resetPassword.securityChecklist.subtitle")} />
            <CardBody className="bg-linear-to-b from-white to-slate-50/60">
              <div className="space-y-4">
                <SideStep number="1" title={t("resetPassword.securityChecklist.step1Title")} text={t("resetPassword.securityChecklist.step1Text")} />
                <SideStep number="2" title={t("resetPassword.securityChecklist.step2Title")} text={t("resetPassword.securityChecklist.step2Text")} />
                <SideStep number="3" title={t("resetPassword.securityChecklist.step3Title")} text={t("resetPassword.securityChecklist.step3Text")} />
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

function SideStep({ number, title, text }) {
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
