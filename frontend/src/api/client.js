import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 30_000,
});

// Attach a human-readable message to every rejected response so callers can
// do `err.userMessage` instead of re-parsing the shape everywhere.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    err.userMessage =
      err?.response?.data?.message ||
      err?.response?.data?.details?.message ||
      err?.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(err);
  }
);
