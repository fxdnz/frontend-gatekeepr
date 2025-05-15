import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Remove or comment out the base URL for development
  // base: '/static/dist/',  // ❌ Remove this line for dev server
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/auth": "http://localhost:8000",
    },
  },
  build: {
    // Keep base only for production builds
    base: "/static/dist/", // ✅ Only used when building for Django
    outDir: "../gatekeepr/static/dist",
    emptyOutDir: true,
  },
});
