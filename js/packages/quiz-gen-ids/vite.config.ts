/// <reference types="vitest" />
import fs from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";

let manifest = JSON.parse(fs.readFileSync("package.json", "utf-8"));
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      fileName: "main",
      formats: ["cjs"],
    },
    rollupOptions: {
      external: Object.keys(manifest.dependencies || {}),
    },
    minify: false,
  },
  test: {
    environment: "node",
    deps: {
      inline: [/^(?!.*vitest).*$/],
    },
  },
});
