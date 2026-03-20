import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
    },
  },

  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":  ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-map":    ["@maptiler/sdk", "@maptiler/client"],
          "vendor-i18n":   ["i18next", "react-i18next"],
          "vendor-icons":  ["lucide-react"],
          "vendor-http":   ["axios"],
        },
      },
    },
  },

  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "axios"],
  },
});
