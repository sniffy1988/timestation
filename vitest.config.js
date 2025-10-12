import { defineConfig } from "vitest/config";

import path from "path";
import babel from "vite-plugin-babel";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  test: {
    browser: {
      provider: "playwright",
      enabled: true,
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    coverage: {
      enabled: true,
      exclude: ["public/*", "wasm/*"],
      provider: "istanbul",
      reporter: ["text", "json"],
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
    viteStaticCopy({
      targets: [{ src: "./wasm/*.{js,wasm}", dest: "wasm" }],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@test": path.resolve(__dirname, "./test"),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
