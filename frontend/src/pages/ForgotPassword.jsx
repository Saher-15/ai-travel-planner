import { useState } from "react";
import { api } from "../api/client";
import { Card, CardHeader, CardBody, Input, Button, Alert } from "../components/UI";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMsg(data.message);
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader title="Forgot Password" subtitle="We'll send you a reset link" />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {msg && <Alert type="success">{msg}</Alert>}
            {err && <Alert type="error">{err}</Alert>}

            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
