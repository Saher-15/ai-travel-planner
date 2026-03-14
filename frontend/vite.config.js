import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "https://ai-travel-planner-server.onrender.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-router": ["react-router-dom"],
          "vendor-map":    ["@maptiler/sdk", "@maptiler/client"],
          "vendor-i18n":   ["i18next", "react-i18next"],
          "vendor-icons":  ["lucide-react"],
        },
      },
    },
  },
});
