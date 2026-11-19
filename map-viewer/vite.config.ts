import path from "node:path";
import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [deno(), preact(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname!, "src"),
    },
  },
  envDir: path.resolve(import.meta.dirname!, ".."),
  publicDir: path.resolve(import.meta.dirname!, "static"),
});
