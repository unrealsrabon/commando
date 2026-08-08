import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is served from a project page: https://<user>.github.io/commando/
// so assets must be referenced under that sub-path in production.
// Override with COMMANDO_BASE at build time if the repo name differs.
const base = process.env.COMMANDO_BASE ?? "/commando/";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? base : "/",
  build: {
    target: "es2021",
    outDir: "dist",
    sourcemap: false,
  },
}));
