/// <reference types="vitest" />
import fs from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";
import { builtinModules } from 'module';

let manifest = JSON.parse(fs.readFileSync("package.json", "utf-8"));
export default defineConfig({
  build: {
    target: "node16",
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["cjs"],      
    },
    rollupOptions: {
      external: Object.keys(manifest.dependencies || {}).concat(builtinModules),      
    },
    minify: false,
  },
  resolve: {
    conditions: ["node"]
  },
  test: {
    environment: "node",
    deps: {
      inline: [/^(?!.*vitest).*$/],
    },
  },
});
