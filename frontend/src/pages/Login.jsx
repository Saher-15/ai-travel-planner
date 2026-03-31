import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../api/client.js";
import { Alert, Button } from "../components/UI.jsx";
import { useAuth } from "../auth/AuthProvider";
import { useTranslation } from "react-i18next";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export default function Login() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const nav = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(
    () => normalizeEmail(email) && password.trim().length > 0 && !loading,
    [email, password, loading]
  );

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !password.trim()) { setErr(t("login.errors.enterCredentials")); return; }
    setErr("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email: cleanEmail, password }, { withCredentials: true });
      // Set user directly from login response — avoids a second /auth/me round-trip
      // that is timing-sensitive on iOS (localStorage token commit vs. request interceptor).
      setUser(data.user);
      nav(data?.user?.verified === false ? "/profile" : "/");
    } catch (e2) {
      setErr(e2?.response?.status === 429
        ? t("login.errors.tooManyAttempts")
        : e2?.response?.data?.message || t("login.errors.loginFailed"));
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
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to your travel planner account</p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)]">
          <form onSubmit={onSubmit} className="p-6 sm:p-8">
            <div className="space-y-5">
              {/* Email */}
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

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">{t("common.password")}</label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-sky-600 transition hover:text-sky-800">
                    {t("login.form.forgotPassword")}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-sky-600"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            </div>

            {err ? <div className="mt-5"><Alert type="error">{err}</Alert></div> : null}

            <Button type="submit" disabled={!canSubmit} className="mt-6 w-full justify-center py-3 text-base font-bold">
              {loading ? "Signing in…" : t("login.form.loginButton")}
            </Button>
          </form>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 text-center sm:px-8">
            <span className="text-sm text-slate-500">Don&apos;t have an account?{" "}</span>
            <Link to="/register" className="text-sm font-bold text-sky-600 transition hover:text-sky-800">
              Create one free
            </Link>
          </div>
        </div>

        {/* Trust line */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Secure login · Your data is never sold
        </p>
      </div>
    </div>
  );
}
