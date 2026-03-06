import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Alert, Button, Card, CardBody, CardHeader, Input } from "../components/UI.jsx";
import { useAuth } from "../auth/AuthProvider";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { refresh } = useAuth();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await api.post("/auth/login", { email, password });

      // Refresh user state
      await refresh();

      // Redirect based on verification status
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (user?.verified === false) {
        nav("/profile"); // force them to verify
      } else {
        nav("/"); // verified → allow creating trips
      }

    } catch (e2) {
      setErr(e2?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader
          title="Welcome back"
          subtitle="Login to generate and save your trips"
        />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {err && <Alert type="error">{err}</Alert>}

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Forgot password?
              </Link>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? "Logging in..." : "Login"}
              </Button>

              <Link
                to="/register"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Create account →
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
