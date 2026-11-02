import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: false,
      registerType: "prompt",
      manifest: {
        name: "Buddy — วางแผนงบประมาณ",
        short_name: "Buddy",
        description: "วางแผนและตรวจสอบงบประมาณรายเดือน",
        lang: "th",
        theme_color: "#f4f5f2",
        background_color: "#f4f5f2",
        display: "standalone",
        // start_url, scope and id default to Vite's `base`, so the same
        // config works on localhost ("/") and on GitHub Pages ("/<repo>/").
        icons: [
          {
            src: "buddy-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "buddy-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "buddy-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{css,html,ico,js,png,svg,webp,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});
