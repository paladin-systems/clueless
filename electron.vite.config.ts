import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
// electron.vite.config.ts
import { bytecodePlugin, defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin({ transformArrowFunctions: true })],
    build: {
      outDir: "dist/electron",
      emptyOutDir: false, // Keep main outputs when building preload
      lib: {
        // Specify multiple entry points for the main process environment
        entry: [path.resolve(__dirname, "src/main.ts")],
        formats: ["cjs"],
        // Adjust fileName to handle multiple entry points
        fileName: (format, entryName) => {
          if (entryName === "main") {
            return "main.js";
          }
          // Fallback or default naming convention if needed
          return `${entryName}.js`;
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin({ transformArrowFunctions: true })],
    build: {
      outDir: "dist/electron",
      emptyOutDir: false, // Keep main outputs when building preload
      lib: {
        entry: path.resolve(__dirname, "src/preload.ts"),
        formats: ["cjs"],
        fileName: () => "preload.js",
      },
    },
  },
  renderer: {
    root: ".",
    build: {
      outDir: "dist/renderer",
      rollupOptions: {
        input: path.resolve(__dirname, "index.html"),
      },
    },
    // Add Tailwind CSS plugin to process utility directives
    plugins: [react(), tailwindcss()],
  },
});
