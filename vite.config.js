import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(async ({ command, isPreview }) => {
  const plugins = [react()];
  if (command === "serve" && !isPreview) {
    const { areaEditorDevPlugin } = await import("./scripts/area-editor-dev-plugin.js");
    plugins.push(areaEditorDevPlugin());
  }
  return {
    plugins,
    publicDir: "public", // Ensure public directory is correctly set
    build: {
      assetsDir: "assets", // Ensure assets are served from the correct directory
    },
  };
});
