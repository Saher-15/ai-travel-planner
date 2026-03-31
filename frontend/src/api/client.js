import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 30_000,
});

// ── Token storage (for iOS PWA — WebKit blocks cross-site cookies) ────────────

const TOKEN_KEY   = "auth_token";
const REFRESH_KEY = "auth_refresh";

export const tokenStore = {
  getAccess:      ()        => localStorage.getItem(TOKEN_KEY),
  getRefresh:     ()        => localStorage.getItem(REFRESH_KEY),
  setTokens:      (a, r)    => { localStorage.setItem(TOKEN_KEY, a); if (r) localStorage.setItem(REFRESH_KEY, r); },
  clearTokens:    ()        => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); },
};

// ── Attach Authorization header when a token is stored ───────────────────────
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Attach a human-readable message to every rejected response
function attachUserMessage(err) {
  err.userMessage =
    err?.response?.data?.message ||
    err?.response?.data?.details?.message ||
    err?.message ||
    "Something went wrong. Please try again.";
}

// ── Silent token refresh on 401 ───────────────────────────────────────────────
let _refreshPromise = null;

async function tryRefresh() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = api
    .post(
      "/auth/refresh",
      // Send stored refresh token in body for iOS PWA (cookie may be blocked)
      { refreshToken: tokenStore.getRefresh() || undefined },
      { withCredentials: true, _retry: true },
    )
    .then((res) => {
      // Store new tokens if returned in body (iOS PWA path)
      const { accessToken, refreshToken } = res.data || {};
      if (accessToken) tokenStore.setTokens(accessToken, refreshToken);
    })
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

api.interceptors.response.use(
  (res) => {
    // Persist tokens returned by login / refresh (iOS PWA path)
    const { accessToken, refreshToken } = res.data || {};
    if (accessToken) tokenStore.setTokens(accessToken, refreshToken);
    return res;
  },
  async (err) => {
    const original = err.config;

    // Only attempt silent refresh once per request and only on 401
    if (
      err?.response?.status === 401 &&
      !original?._retry &&
      !original?.url?.includes("/auth/")
    ) {
      original._retry = true;
      try {
        await tryRefresh();
        // Retry the original request — interceptor will attach new token
        return api(original);
      } catch {
        tokenStore.clearTokens();
        window.dispatchEvent(new Event("auth:expired"));
      }
    }

    attachUserMessage(err);
    return Promise.reject(err);
  }
);
