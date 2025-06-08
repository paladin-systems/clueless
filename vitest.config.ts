import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  esbuild: {
    target: "node14",
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    // Include files that should be treated as test files
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    // Exclude certain directories
    exclude: ["node_modules", "dist", "build", "coverage", "src/main.ts", "src/preload.ts"],
    // Mock Electron APIs for renderer tests
    alias: {
      "@": resolve(__dirname, "./src"),
    },
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "src/main.ts",
        "src/preload.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "dist/",
        "build/",
      ],
    },
    // Timeout for tests
    testTimeout: 10000,
    // Global test environment setup
    globalSetup: undefined,
    // Reporter configuration
    reporters: ["default", "html"],
    // Output directory for test results
    outputFile: {
      html: "./coverage/test-results.html",
      json: "./coverage/test-results.json",
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  // Vite configuration for testing
  define: {
    global: "globalThis",
  },
});
