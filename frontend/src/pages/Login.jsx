import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import {
  Alert, Badge, Button, Card, CardBody, CardHeader, Input,
} from "../components/UI.jsx";
import { useAuth } from "../auth/AuthProvider";
import { useTranslation } from "react-i18next";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder = "••••••••" }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete="current-password"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-sky-600"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const nav = useNavigate();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    return normalizeEmail(email) && password.trim().length > 0 && !loading;
  }, [email, password, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = normalizeEmail(email);
    const cleanPassword = password;
    setErr("");

    if (!cleanEmail || !cleanPassword.trim()) {
      setErr(t("login.errors.enterCredentials"));
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email: cleanEmail, password: cleanPassword }, { withCredentials: true });
      await refresh();
      const loggedInUser = data?.user;
      if (loggedInUser?.verified === false) { nav("/profile"); } else { nav("/"); }
    } catch (e2) {
      if (e2?.response?.status === 429) {
        setErr(t("login.errors.tooManyAttempts"));
      } else {
        setErr(e2?.response?.data?.message || t("login.errors.loginFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-4xl border border-slate-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-linear-to-br from-sky-50 via-white to-indigo-50" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative grid gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <div className="lg:col-span-8">
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">{t("login.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{t("login.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{t("login.description")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <HeroStat icon={<LockKeyhole size={18} />} title={t("login.stats.trips")} value={t("login.stats.saved")} subtitle={t("login.stats.yourItineraries")} />
              <HeroStat icon={<Sparkles size={18} />} title={t("login.stats.planner")} value={t("login.stats.ai")} subtitle={t("login.stats.generateSmarter")} />
              <HeroStat icon={<ShieldCheck size={18} />} title={t("login.stats.access")} value={t("login.stats.secure")} subtitle={t("login.stats.manageAccount")} />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-4xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-bold text-slate-900">{t("login.whySignIn")}</div>
              <div className="mt-4 grid gap-3">
                <MiniInfo title={t("login.benefits.savedItineraries")} text={t("login.benefits.savedItinerariesText")} />
                <MiniInfo title={t("login.benefits.aiGeneration")} text={t("login.benefits.aiGenerationText")} />
                <MiniInfo title={t("login.benefits.profileSupport")} text={t("login.benefits.profileSupportText")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("login.form.title")} subtitle={t("login.form.subtitle")} />
            <CardBody className="space-y-6 bg-linear-to-b from-white to-slate-50/60">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <div className="text-lg font-bold text-slate-900">{t("login.form.accountDetails")}</div>
                    <div className="text-sm text-slate-500">{t("login.form.accountDetailsSubtitle")}</div>
                  </div>
                  <div className="space-y-5">
                    <Input label={t("common.email")} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())} autoComplete="email" />
                    <PasswordField label={t("common.password")} value={password} onChange={(e) => setPassword(e.target.value)} show={showPassword} onToggle={() => setShowPassword((prev) => !prev)} />
                  </div>
                </div>

                {err ? <Alert type="error">{err}</Alert> : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">{t("login.form.secureLogin")}</div>
                  <Link to="/forgot-password" className="text-sm font-semibold text-sky-700 transition hover:text-sky-900">
                    {t("login.form.forgotPassword")}
                  </Link>
                </div>

                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {t("login.form.signInInfo")}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link to="/register" className="text-sm font-semibold text-slate-700 transition hover:text-sky-700">
                    {t("login.form.createAccount")}
                  </Link>
                  <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
                    {loading ? t("login.form.loggingIn") : t("login.form.loginButton")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("login.whatYouGet.title")} subtitle={t("login.whatYouGet.subtitle")} />
            <CardBody className="bg-linear-to-b from-white to-slate-50/60">
              <div className="space-y-4">
                <StepCard number="1" title={t("login.whatYouGet.step1Title")} text={t("login.whatYouGet.step1Text")} />
                <StepCard number="2" title={t("login.whatYouGet.step2Title")} text={t("login.whatYouGet.step2Text")} />
                <StepCard number="3" title={t("login.whatYouGet.step3Title")} text={t("login.whatYouGet.step3Text")} />
              </div>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("login.needAccount.title")} subtitle={t("login.needAccount.subtitle")} />
            <CardBody className="bg-linear-to-b from-white to-slate-50/60">
              <div className="rounded-3xl border border-sky-100 bg-linear-to-r from-sky-50 to-indigo-50 p-5">
                <div className="text-base font-bold text-slate-900">{t("login.needAccount.newHere")}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{t("login.needAccount.description")}</div>
                <div className="mt-5">
                  <Link to="/register" className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-md">
                    {t("login.needAccount.createAccount")}
                  </Link>
                </div>
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
    <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">{icon}</div>
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
    <div className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-sm font-black text-white">{number}</div>
      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
      </div>
    </div>
  );
}
