import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { api } from "../api/client.js";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input } from "../components/UI.jsx";
import { useTranslation } from "react-i18next";

function PasswordField({ label, value, onChange, show, onToggle, placeholder = "••••••••", autoComplete = "new-password" }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={onChange} autoComplete={autoComplete}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
        <button type="button" onClick={onToggle} aria-label={show ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-sky-600">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function Requirement({ ok, text }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 text-sm transition ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>
      {text}
    </div>
  );
}

export default function Register() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function isStrongPassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pw);
  }

  const passwordChecks = useMemo(() => ({
    minLength: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
    matches: password.length > 0 && confirmPassword.length > 0 && password === confirmPassword,
  }), [password, confirmPassword]);

  const canSubmit = useMemo(() => !loading && name.trim().length > 0 && email.trim().length > 0 && password.trim().length > 0 && confirmPassword.trim().length > 0,
    [name, email, password, confirmPassword, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setOk("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) { setErr(t("register.errors.fillAllFields")); return; }
    if (password !== confirmPassword) { setErr(t("register.errors.passwordsNoMatch")); return; }
    if (!isStrongPassword(password)) { setErr(t("register.errors.weakPassword")); return; }

    setLoading(true);
    try {
      await api.post("/auth/register", { name: name.trim(), email: email.trim().toLowerCase(), password, confirmPassword }, { withCredentials: false });
      setOk(t("register.errors.accountCreated"));
      setTimeout(() => nav("/login"), 700);
    } catch (e2) {
      setErr(e2?.response?.data?.message || t("register.errors.registerFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-indigo-50" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative grid gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <div className="lg:col-span-8">
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">{t("register.badge")}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{t("register.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{t("register.description")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <HeroStat icon={<Sparkles size={18} />} title={t("register.stats.trips")} value={t("register.stats.smart")} subtitle={t("register.stats.buildBetter")} />
              <HeroStat icon={<UserPlus size={18} />} title={t("register.stats.library")} value={t("register.stats.saved")} subtitle={t("register.stats.keepPlans")} />
              <HeroStat icon={<ShieldCheck size={18} />} title={t("register.stats.account")} value={t("register.stats.secure")} subtitle={t("register.stats.protectedAccess")} />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-bold text-slate-900">{t("register.whyCreate")}</div>
              <div className="mt-4 grid gap-3">
                <MiniInfo title={t("register.benefits.generateSmarter")} text={t("register.benefits.generateSmarterText")} />
                <MiniInfo title={t("register.benefits.saveEverything")} text={t("register.benefits.saveEverythingText")} />
                <MiniInfo title={t("register.benefits.manageSecurely")} text={t("register.benefits.manageSecurelyText")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("register.form.title")} subtitle={t("register.form.subtitle")} />
            <CardBody className="space-y-6 bg-gradient-to-b from-white to-slate-50/60">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <div className="text-lg font-bold text-slate-900">{t("register.form.personalDetails")}</div>
                    <div className="text-sm text-slate-500">{t("register.form.personalDetailsSubtitle")}</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label={t("common.name")} placeholder={t("register.form.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                    <Input label={t("common.email")} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())} autoComplete="email" />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <div className="text-lg font-bold text-slate-900">{t("register.form.securitySetup")}</div>
                    <div className="text-sm text-slate-500">{t("register.form.securitySetupSubtitle")}</div>
                  </div>
                  <div className="space-y-5">
                    <PasswordField label={t("common.password")} value={password} onChange={(e) => setPassword(e.target.value)} show={showPassword} onToggle={() => setShowPassword((p) => !p)} placeholder={t("register.form.passwordPlaceholder")} />
                    <PasswordField label={t("register.form.confirmPassword")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} show={showConfirmPassword} onToggle={() => setShowConfirmPassword((p) => !p)} placeholder={t("register.form.confirmPasswordPlaceholder")} />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-800">{t("passwordRequirements.title")}</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Requirement ok={passwordChecks.minLength} text={t("passwordRequirements.minLength")} />
                    <Requirement ok={passwordChecks.upper} text={t("passwordRequirements.uppercase")} />
                    <Requirement ok={passwordChecks.lower} text={t("passwordRequirements.lowercase")} />
                    <Requirement ok={passwordChecks.number} text={t("passwordRequirements.number")} />
                    <Requirement ok={passwordChecks.special} text={t("passwordRequirements.special")} />
                    <Requirement ok={passwordChecks.matches} text={t("passwordRequirements.match")} />
                  </div>
                </div>

                {err ? <Alert type="error">{err}</Alert> : null}
                {ok ? <Alert type="success">{ok}</Alert> : null}

                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {t("register.form.registerInfo")}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link to="/login" className="text-sm font-semibold text-slate-700 transition hover:text-sky-700">
                    {t("register.form.alreadyAccount")}
                  </Link>
                  <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
                    {loading ? t("register.form.creating") : t("register.form.createButton")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("register.whatNext.title")} subtitle={t("register.whatNext.subtitle")} />
            <CardBody className="bg-gradient-to-b from-white to-slate-50/60">
              <div className="space-y-4">
                <StepCard number="1" title={t("register.whatNext.step1Title")} text={t("register.whatNext.step1Text")} />
                <StepCard number="2" title={t("register.whatNext.step2Title")} text={t("register.whatNext.step2Text")} />
                <StepCard number="3" title={t("register.whatNext.step3Title")} text={t("register.whatNext.step3Text")} />
              </div>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("register.alreadyMember.title")} subtitle={t("register.alreadyMember.subtitle")} />
            <CardBody className="bg-gradient-to-b from-white to-slate-50/60">
              <div className="rounded-[1.5rem] border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50 p-5">
                <div className="text-base font-bold text-slate-900">{t("register.alreadyMember.welcomeBack")}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{t("register.alreadyMember.description")}</div>
                <div className="mt-5">
                  <Link to="/login" className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-md">
                    {t("register.alreadyMember.goToLogin")}
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
