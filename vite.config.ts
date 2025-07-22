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
      },
    }),
  ],

  // Define global constants
  define: {
    ENABLE_SERVICE_WORKER: JSON.stringify(
      process.env.NODE_ENV === "production"
    ),
  },

  // Development server configuration
  server: {
    port: 3000,
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
