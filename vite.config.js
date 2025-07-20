import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/api": "https://gatekeepr-backend.onrender.com/", // Keep if you still need API proxying
      "/auth": "https://gatekeepr-backend.onrender.com/", // Same here for auth if needed
    },
  },
  build: {
    // No need for base or outDir specific to Django
    base: "", // Empty base for the dev build and production build
    outDir: "dist", // Default output folder for Vite
    emptyOutDir: true,
  },
});
