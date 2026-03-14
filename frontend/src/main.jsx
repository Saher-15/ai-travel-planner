import React from "react";
import ReactDOM from "react-dom/client";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./auth/AuthProvider.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import axios from "axios";
import "./i18n.js";

// ✅ Send cookies with requests (needed for /auth/me etc.)
axios.defaults.withCredentials = true;

// Apply RTL/LTR direction based on saved language
const savedLang = localStorage.getItem("lang") || "en";
document.documentElement.lang = savedLang;
document.documentElement.dir = savedLang === "he" ? "rtl" : "ltr";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);