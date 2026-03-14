import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthCtx = createContext(null);

function normalizeUser(u) {
  return {
    id: u?.id || u?._id || u?.userId || null,
    name: u?.name || "",
    email: u?.email || "",
    verified: Boolean(u?.verified),
    role: u?.role || "user",
  };
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUserState] = useState(null);

  const setUser = useCallback((u) => {
    setUserState(u ? normalizeUser(u) : null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await api.get("/auth/me", { withCredentials: true });

      // supports either { user: {...} } or direct user object
      const rawUser = data?.user || data || null;
      setUser(rawUser);
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.error("Auth refresh error:", err);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", null, { withCredentials: true });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
    }
  }, [setUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      loading,
      user,
      userId: user?.id || null,
      isLoggedIn: Boolean(user?.id),
      refresh,
      logout,
      setUser,
    }),
    [loading, user, refresh, logout, setUser]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}