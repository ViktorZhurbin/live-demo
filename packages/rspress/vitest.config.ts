import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts",
        "**/*.test.{ts,tsx}",
        "tests/**",
      ],
    },
  },
  resolve: {
    alias: {
      node: path.resolve(__dirname, "./src/node"),
      shared: path.resolve(__dirname, "./src/shared"),
      web: path.resolve(__dirname, "./src/web"),
    },
  },
});
