/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { rustEditorVitePlugin } from "@wcrichto/rust-editor/dist/build-utils.cjs";
import fs from "fs";
import { resolve } from "path";
import path from "path";
import { PluginOption, defineConfig } from "vite";

let manifest = JSON.parse(fs.readFileSync("package.json", "utf-8"));
let alias = {};
let plugins: PluginOption[] = [react()];

if (process.env.RUST_EDITOR !== undefined) {
  let serverUrl = !process.argv.includes("--watch")
    ? "https://rust-book.cs.brown.edu/quiz"
    : "http://localhost:3000/quiz";

  plugins.push(rustEditorVitePlugin({ serverUrl }));
} else {
  alias["@wcrichto/rust-editor"] = path.resolve(
    __dirname,
    "rust-editor-placeholder.js"
  );
}

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.tsx"),
      name: "Quiz",
      formats: ["es"],
    },
    rollupOptions: {
      external: Object.keys(manifest.dependencies || {}),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  resolve: { alias },
  plugins,
  test: {
    environment: "jsdom",
    setupFiles: "tests/setup.ts",
    deps: {
      inline: [/^(?!.*vitest).*$/],
    },
  },
}));
