import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

/**
 * Wraps a route so it is accessible only to logged-in users with role "admin".
 * - Not logged in → redirect to /login (preserving the intended destination)
 * - Logged in but not admin → redirect to / (silently, no info leak)
 */
export default function AdminRoute({ children }) {
  const { loading, isLoggedIn, user } = useAuth();
  const loc = useLocation();

  if (loading) {
    return <div className="text-sm text-slate-600">Checking session…</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
