import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: [
      "**/generate.integration.test.ts",
      "**/generate.zip.test.ts",
      "**/generate.lazy.zip.test.ts",
      "**/*.skiptest.ts"
    ],
    setupFiles: ["./src/test/globalSetup.ts"],
  testTimeout: 20000,
    hookTimeout: 15000,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
