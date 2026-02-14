import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === "https://tiles.openskimap.org" ||
              url.origin === "https://tiles.openfreemap.org" ||
              url.origin === "https://services.arcgisonline.com",
            handler: "NetworkFirst",
            options: {
              cacheName: `tiles-cache-v2`,
              expiration: {
                maxEntries: 50000,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                purgeOnQuotaError: true,
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],

  // Define global constants
  define: {
    BUILD_TIMESTAMP: JSON.stringify(Date.now().toString()),
  },

  // Development server configuration
  server: {
    port: 8080,
    open: true,
  },

  // Build configuration
  build: {
    outDir: "dist",
    sourcemap: true,
  },

  // Resolve configuration
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json", ".css"],
  },
});
