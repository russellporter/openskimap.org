import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const buildTimestamp = Date.now().toString();

function leanPWA(): Plugin {
  return {
    name: "openskimap-pwa",
    apply: "build",
    generateBundle(_options, bundle) {
      const generatedAssets = Object.keys(bundle)
        .filter((fileName) => /\.(?:css|html|ico|js|png|svg)$/.test(fileName))
        .map((fileName) => `/${fileName}`);
      const precacheURLs = [
        "/",
        "/manifest.webmanifest",
        "/pwa-192.png",
        "/pwa-512.png",
        "/pwa-maskable-512.png",
        ...generatedAssets,
      ];
      const serviceWorker = readFileSync(
        new URL("./src/service-worker.js", import.meta.url),
        "utf8",
      )
        .replace("__BUILD_ID__", buildTimestamp)
        .replace(
          "__PRECACHE_URLS__",
          JSON.stringify([...new Set(precacheURLs)]),
        );

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: serviceWorker,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), leanPWA()],

  // Define global constants
  define: {
    BUILD_TIMESTAMP: JSON.stringify(buildTimestamp),
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
