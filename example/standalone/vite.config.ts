import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(() => ({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@wcrichto/rust-editor/dist/lib.css": path.resolve(
        __dirname,
        "rust-editor-placeholder.css"
      ),
      "@wcrichto/rust-editor": path.resolve(
        __dirname,
        "rust-editor-placeholder.js"
      )
    }
  }
}));
