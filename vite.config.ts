import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      // Shim Tauri APIs so the app renders in a plain browser (e.g. Vercel).
      // The shims delegate to the real Tauri packages at runtime when
      // window.__TAURI_INTERNALS__ is present, so a single build works for
      // both the desktop app and the web preview.
      "@tauri-apps/api/core": path.resolve(__dirname, "src/lib/tauri-shim-core.ts"),
      "@tauri-apps/api/event": path.resolve(__dirname, "src/lib/tauri-shim-event.ts"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
