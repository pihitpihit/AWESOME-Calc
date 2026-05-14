import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@modyfi/vite-plugin-yaml";

// GitHub Pages base path. The repo is served at /AWESOME-Calc/.
// Override locally with VITE_BASE=/ for `vite preview`.
const base = process.env.VITE_BASE ?? "/AWESOME-Calc/";

export default defineConfig({
  base,
  plugins: [react(), yaml()],
  // ../data/*.yaml 임포트 허용
  server: { fs: { allow: [".."] } },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
