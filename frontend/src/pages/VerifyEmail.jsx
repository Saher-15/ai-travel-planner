import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Card, CardHeader, CardBody, Button } from "../components/UI";

export default function VerifyEmail() {
  const { token } = useParams();
  const nav = useNavigate();
  const { refresh } = useAuth();

  const [msg, setMsg] = useState("Verifying your email...");
  const [error, setError] = useState(false);

  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function verify() {
      try {
        const { data } = await api.get(`/auth/verify/${token}`);
        setMsg(data.message);
        setError(false);

        // 🔥 Refresh user state so verified = true
        await refresh();

        setTimeout(() => nav("/login"), 1500);
      } catch (e) {
        setMsg(e?.response?.data?.message || "Verification failed");
        setError(true);
      }
    }

    verify();
  }, [token]);

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader title="Email Verification" />
        <CardBody>
          <div
            className={`p-4 rounded-xl text-center text-sm font-semibold ${
              error ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {msg}
          </div>

          <div className="mt-4 text-center">
            <Button onClick={() => nav("/login")}>Go to Login</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
