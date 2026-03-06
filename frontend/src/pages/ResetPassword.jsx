import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Card, CardHeader, CardBody, Input, Button, Alert } from "../components/UI";

export default function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function isStrongPassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pw);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (newPassword !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setErr("Password must be 8+ chars and include uppercase, lowercase, number, and special character");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, {
        newPassword,
        confirmPassword,
      });

      setMsg(data.message);
      setTimeout(() => nav("/login"), 1000);
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader title="Reset Password" subtitle="Enter your new password" />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {msg && <Alert type="success">{msg}</Alert>}
            {err && <Alert type="error">{err}</Alert>}

            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
