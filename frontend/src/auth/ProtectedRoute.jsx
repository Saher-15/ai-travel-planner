import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children }) {
  const { loading, isLoggedIn, user } = useAuth();
  const loc = useLocation();

  if (loading) {
    return <div className="text-sm text-slate-600">Checking session…</div>;
  }

  // Not logged in → redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  // Logged in but NOT verified → block access
  if (user && !user.verified) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-4 rounded-xl bg-yellow-50 border border-yellow-300 text-yellow-800 text-center space-y-3">
        <div className="font-bold text-lg">Email Not Verified</div>
        <p>You must verify your email before accessing this page.</p>

        <Link
          to="/profile"
          className="underline font-semibold text-yellow-900"
        >
          Go to Profile →
        </Link>
      </div>
    );
  }

  // Verified user → allow access
  return children;
}
