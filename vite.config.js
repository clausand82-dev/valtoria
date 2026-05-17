import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  publicDir: "public", // Ensure public directory is correctly set
  build: {
    assetsDir: "assets", // Ensure assets are served from the correct directory
  },
});
