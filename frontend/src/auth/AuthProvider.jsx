import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, tokenStore } from "../api/client";

const AuthCtx = createContext(null);
const SESSION_HINT = "auth_session";

function normalizeUser(u) {
  return {
    id: u?.id || u?._id || u?.userId || null,
    name: u?.name || "",
    firstName: u?.firstName || "",
    lastName: u?.lastName || "",
    email: u?.email || "",
    verified: Boolean(u?.verified),
    role: u?.role || "user",
    nationality: u?.nationality || "",
    phone: u?.phone || "",
    dateOfBirth: u?.dateOfBirth || "",
    travelStyle: u?.travelStyle || "",
    preferredCurrency: u?.preferredCurrency || "",
    plan: u?.plan || "free",
    planExpiresAt: u?.planExpiresAt || null,
    paymentProvider: u?.paymentProvider || null,
  };
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUserState] = useState(null);
  // Track if a refresh is already in flight to avoid concurrent calls
  const refreshingRef = useRef(null);

  const setUser = useCallback((u) => {
    if (u) {
      localStorage.setItem(SESSION_HINT, "1");
      setUserState(normalizeUser(u));
    } else {
      localStorage.removeItem(SESSION_HINT);
      setUserState(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    // Skip the /auth/me call (and its 401 console noise) when we have no
    // evidence of a session — no stored token and no session hint flag.
    const hasToken = Boolean(tokenStore.getAccess());
    const hasHint  = Boolean(localStorage.getItem(SESSION_HINT));
    if (!hasToken && !hasHint) {
      setLoading(false);
      return;
    }

    // Deduplicate concurrent refresh calls
    if (refreshingRef.current) return refreshingRef.current;

    setLoading(true);
    const promise = api
      .get("/auth/me", { withCredentials: true })
      .then(({ data }) => {
        const rawUser = data?.user || data || null;
        setUser(rawUser);
      })
      .catch((err) => {
        if (err?.response?.status !== 401) {
          console.error("Auth refresh error:", err);
        }
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
        refreshingRef.current = null;
      });

    refreshingRef.current = promise;
    return promise;
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      // Send refresh token in body so the server can revoke the session
      // even on iOS where cross-site cookies are blocked.
      await api.post(
        "/auth/logout",
        { refreshToken: tokenStore.getRefresh() || undefined },
        { withCredentials: true },
      );
    } catch {
      // best-effort — client-side cleanup always happens
    } finally {
      tokenStore.clearTokens();
      setUser(null);
    }
  }, [setUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for silent-refresh failure from api/client.js
  useEffect(() => {
    function handleExpiry() { setUser(null); }
    window.addEventListener("auth:expired", handleExpiry);
    return () => window.removeEventListener("auth:expired", handleExpiry);
  }, [setUser]);

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
