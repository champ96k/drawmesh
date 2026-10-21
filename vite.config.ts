import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // NOTE: `includeAssets` is globbed separately from `workbox.globPatterns`
      // and therefore bypasses `globIgnores`. Only list the icons here — the
      // fonts are picked up by `globPatterns` and honour the ignore rule.
      includeAssets: ["icons/*.png", "icons/*.svg", "favicon.svg"],
      manifest: {
        name: "DrawMesh",
        short_name: "DrawMesh",
        description:
          "A local-first, offline-capable whiteboard. Your drawings never leave this device.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#ffffff",
        theme_color: "#5b57d6",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,json}"],
        // The CJK face is ~13 MB across 200 subset files. It stays on disk
        // and is fetched on demand, but is not precached, so the first
        // install stays small.
        globIgnores: ["fonts/Xiaolai/**", "**/Xiaolai/**"],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 2500,
  },
});
