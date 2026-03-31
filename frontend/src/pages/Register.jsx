import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../api/client.js";
import { Alert, Button } from "../components/UI.jsx";
import PasswordStrengthBar from "../components/PasswordStrengthBar.jsx";
import { useTranslation } from "react-i18next";

function PasswordField({ label, value, onChange, show, onToggle, placeholder = "••••••••", autoComplete = "new-password" }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-sky-600"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}


function isStrongPassword(pw) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pw);
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

  const canSubmit = useMemo(
    () => !loading && name.trim() && email.trim() && password && confirmPassword,
    [name, email, password, confirmPassword, loading]
  );

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
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-lg shadow-sky-200">
            <span className="text-2xl">✈️</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-1.5 text-sm text-slate-500">Start planning smarter trips with AI</p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)]">
          <form onSubmit={onSubmit} className="p-6 sm:p-8">
            <div className="space-y-5">
              {/* Name + Email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">{t("common.name")}</label>
                  <input
                    type="text"
                    placeholder="Alex Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">{t("common.email")}</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    autoComplete="email"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* Passwords */}
              <PasswordField
                label={t("common.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                placeholder="Min. 8 characters"
              />
              <PasswordField
                label={t("register.form.confirmPassword")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />

              <PasswordStrengthBar password={password} confirmPassword={confirmPassword} />
            </div>

            {err ? <div className="mt-5"><Alert type="error">{err}</Alert></div> : null}
            {ok  ? <div className="mt-5"><Alert type="success">{ok}</Alert></div> : null}

            <Button type="submit" disabled={!canSubmit} className="mt-6 w-full justify-center py-3 text-base font-bold">
              {loading ? t("register.form.creating") : t("register.form.createButton")}
            </Button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              By signing up you agree to our{" "}
              <Link to="/terms" className="font-semibold text-slate-500 hover:text-sky-600">Terms</Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-semibold text-slate-500 hover:text-sky-600">Privacy Policy</Link>.
            </p>
          </form>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 text-center sm:px-8">
            <span className="text-sm text-slate-500">Already have an account?{" "}</span>
            <Link to="/login" className="text-sm font-bold text-sky-600 transition hover:text-sky-800">
              Sign in
            </Link>
          </div>
        </div>

        {/* Trust line */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Free forever · No credit card required
        </p>
      </div>
    </div>
  );
}
