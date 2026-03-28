import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 30_000,
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
    .post("/auth/refresh", null, { withCredentials: true, _retry: true })
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
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
        // Retry the original request with new access token cookie
        return api(original);
      } catch {
        // Refresh failed → user must log in again
        // Fire a custom event so AuthProvider can clear user state
        window.dispatchEvent(new Event("auth:expired"));
      }
    }

    attachUserMessage(err);
    return Promise.reject(err);
  }
);
