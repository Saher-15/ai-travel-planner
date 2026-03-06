import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Alert, Button, Card, CardBody, CardHeader, Input } from "../components/UI.jsx";

export default function Register() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Strong password validation
  function isStrongPassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pw);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    // Confirm password check
    if (password !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }

    // Strong password check
    if (!isStrongPassword(password)) {
      setErr(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
      );
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        confirmPassword,
      });

      setOk("Account created. You can login now.");
      setTimeout(() => nav("/login"), 600);
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader
          title="Create your account"
          subtitle="Register to save and manage your trips"
        />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />

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
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />

            {err ? <Alert type="error">{err}</Alert> : null}
            {ok ? <Alert type="success">{ok}</Alert> : null}

            <div className="flex items-center justify-between gap-3">
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? "Creating..." : "Create account"}
              </Button>

              <Link
                to="/login"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Already have an account →
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
