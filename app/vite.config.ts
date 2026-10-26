import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// BASE lets the same build run at a domain root or under /crophealth-ai/ on GitHub Pages.
export default defineConfig({
  base: process.env.BASE ?? "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "CropHealth AI",
        short_name: "CropHealth",
        description: "Offline AI crop disease checks for Central Valley growers.",
        theme_color: "#14361f",
        background_color: "#f6f4ee",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // The model (~9 MB) and WASM runtime (~11 MB) are precached so scans work with no signal.
        globPatterns: ["**/*.{js,css,html,svg,png,json,onnx,wasm,mjs}"],
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: /tile\.openstreetmap\.org/, handler: "CacheFirst", options: { cacheName: "map-tiles", expiration: { maxEntries: 800 } } },
        ],
      },
    }),
  ],
});
