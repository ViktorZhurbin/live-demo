import { defineConfig } from "tsdown";

export default defineConfig([
	// Browser-side: React components
	{
		entry: ["./src/web/index.ts"],
		platform: "browser",
		outDir: "dist/web",
		deps: { neverBundle: ["@types/react", "_live_demo_virtual_modules"] },
		// package.json's "./web/index.css" export expects this exact filename.
		css: { fileName: "index.css" },
		dts: true,
		hash: false,
	},
	// Rspress plugin
	{
		entry: ["./src/plugin/index.ts"],
		platform: "node",
		deps: {
			neverBundle: ["_live_demo_virtual_modules"],
			// @rspress/core's RspressPlugin type transitively references
			// @rsbuild/core's vendored CJS .d.ts files, which rolldown-plugin-dts
			// refuses to bundle. Keep the import type-only instead of inlined.
			dts: { neverBundle: ["@rspress/core"] },
		},
		outDir: "dist",
		dts: true,
		hash: false,
	},
]);
