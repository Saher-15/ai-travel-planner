import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";
import { Button, Card, CardBody, CardHeader } from "../components/UI.jsx";

export default function Profile() {
  const nav = useNavigate();
  const { user, refresh, logout } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState(null);

  const showMessage = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  // Strong password validation
  function isStrongPassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pw);
  }

  const onSaveProfile = async () => {
    try {
      await api.put("/auth/update-profile", { name, email });
      await refresh();
      showMessage("Profile updated successfully");
    } catch (err) {
      showMessage(err.response?.data?.message || "Update failed", "error");
    }
  };

  const onChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showMessage("New passwords do not match", "error");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      showMessage(
        "Password must be 8+ chars and include uppercase, lowercase, number, and special character",
        "error"
      );
      return;
    }

    try {
      await api.post("/auth/change-password", {
        oldPassword,
        newPassword,
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      showMessage("Password changed successfully");
    } catch (err) {
      showMessage(err.response?.data?.message || "Password change failed", "error");
    }
  };

  const onResendVerification = async () => {
    try {
      const { data } = await api.post("/auth/resend-verification");
      showMessage(data.message);
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to resend email", "error");
    }
  };

  const onLogout = async () => {
    await logout();
    nav("/login");
  };

  return (
    <Card>
      <CardHeader
        title="Profile & Settings"
        subtitle="Manage your account information"
      />

      <CardBody className="space-y-6">

        {msg && (
          <div
            className={`p-3 rounded-xl text-sm ${
              msg.type === "error"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Email Verification Status */}
        {!user?.verified && (
          <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-4 space-y-3">
            <div className="text-sm font-extrabold text-yellow-800">
              Your email is not verified
            </div>

            <Button onClick={onResendVerification}>
              Resend Verification Email
            </Button>
          </div>
        )}

        {/* Profile Info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm font-extrabold text-slate-900">Profile Information</div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              className="w-full rounded-xl border p-2"
              value={name}
              // onChange={(e) => setName(e.target.value)}
            />

            <label className="text-sm font-medium">Email</label>
            <input
              className="w-full rounded-xl border p-2"
              value={email}
              // onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* <Button onClick={onSaveProfile}>Save Changes</Button> */}
        </div>

        {/* Change Password */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm font-extrabold text-slate-900">Change Password</div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Current Password</label>
            <input
              type="password"
              className="w-full rounded-xl border p-2"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />

            <label className="text-sm font-medium">New Password</label>
            <input
              type="password"
              className="w-full rounded-xl border p-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <label className="text-sm font-medium">Confirm New Password</label>
            <input
              type="password"
              className="w-full rounded-xl border p-2"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button variant="primary" onClick={onChangePassword}>
            Update Password
          </Button>
        </div>

        <Button variant="danger" onClick={onLogout}>
          Logout
        </Button>
      </CardBody>
    </Card>
  );
}
