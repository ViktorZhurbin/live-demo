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
			// Only .ts: the build pipeline, module graph, and compiler are the
			// deterministic logic these unit tests target. .tsx files are React
			// components exercised (if at all) via integration/e2e, so including
			// them here would just drown the number in untested UI.
			include: ["src/**/*.ts"],
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
