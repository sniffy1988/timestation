import { defineConfig } from "vite";

import path from "path";
import babel from "vite-plugin-babel";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  build: {
    minify: "terser",
    rollupOptions: {
      external: [/wasm\/.*\.js/],
    },
  },
  plugins: [
    babel({
      babelConfig: {
        babelrc: false,
        configFile: false,
        presets: [
          ["@babel/preset-typescript", { allowDeclareFields: true }],
        ],
        plugins: [
          ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
        ],
        sourceMaps: "inline",
      },
      filter: /\.[jt]sx?$/,
    }),
    VitePWA({
      devOptions: {
        enabled: true,
        type: "module",
      },
      registerType: "autoUpdate",
      strategies: "injectManifest",
      injectRegister: false,
      srcDir: "./src/shared",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{css,js,html,ico,png,svg,wasm,woff2}"],
      },
      manifest: {
        name: "Time Station Emulator",
        short_name: "Time Station Emulator",
        description:
          'Turns almost any phone or tablet into a low-frequency radio transmitter broadcasting a time signal that can synchronize most radio-controlled ("atomic") clocks and watches. Runs entirely in your browser with no installation or signup.',
        theme_color: "#202020",
        background_color: "#202020",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
    viteStaticCopy({
      targets: [{ src: "./wasm/*.{js,wasm}", dest: "wasm" }],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
