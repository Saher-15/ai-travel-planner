import React from "react";
import ReactDOM from "react-dom/client";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./auth/AuthProvider.jsx";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// ✅ Send cookies with requests (needed for /auth/me etc.)
axios.defaults.withCredentials = true;

// ✅ If your backend runs on a different origin, set baseURL:
// axios.defaults.baseURL = "http://localhost:5050";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);