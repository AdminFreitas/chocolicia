import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const plugins = [react(), tailwindcss()];

const resolve = {
  alias: {
    "@": path.resolve(import.meta.dirname, "client", "src"),
    "@shared": path.resolve(import.meta.dirname, "shared"),
    "@assets": path.resolve(import.meta.dirname, "attached_assets"),
  },
};

// Configuração padrão — usada pelo `vite build` (client) e `vite dev`
export default defineConfig(({ isSsrBuild }) => ({
  plugins,
  resolve,
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: isSsrBuild
    ? {
        // Build SSR — gera dist/server/entry-server.js
        ssr: true,
        rollupOptions: {
          input: path.resolve(import.meta.dirname, "client", "src", "entry-server.tsx"),
          output: { format: "esm" },
        },
        outDir: path.resolve(import.meta.dirname, "dist", "server"),
        emptyOutDir: true,
      }
    : {
        // Build cliente — gera dist/public/
        outDir: path.resolve(import.meta.dirname, "dist/public"),
        emptyOutDir: true,
      },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1", "chocolicia.site", "www.chocolicia.site"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
