import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await api.get("/auth/me");
      const u = data?.user || null;

      if (u) setUser(normalizeUser(u));
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({
      loading,
      user,
      userId: user?.id || null,
      isLoggedIn: Boolean(user?.id),
      refresh,
      logout,
    }),
    [loading, user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

function normalizeUser(u) {
  return {
    id: u.id || u._id || null,
    name: u.name || "",
    email: u.email || "",
    verified: Boolean(u.verified),
  };
}


export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
