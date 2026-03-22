import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "AI Travel Planner",
        short_name: "TravelAI",
        description: "Plan your perfect trip with AI-powered itineraries",
        theme_color: "#0284c7",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // Cache trip pages and API responses for offline access
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "weather-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 3 }, // 3h
            },
          },
          {
            urlPattern: /\/api\/trips\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "trips-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 }, // 24h
            },
          },
        ],
      },
    }),
  ],

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
