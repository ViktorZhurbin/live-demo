import { pluginReact } from "@rsbuild/plugin-react";
import { type LibConfig, defineConfig } from "@rslib/core";

const sharedConfig: LibConfig = {
	format: "esm",
	syntax: "es2020",
	dts: { bundle: true },
	output: {
		cleanDistPath: true,
	},
};

export default defineConfig({
	lib: [
		{
			...sharedConfig,
			source: {
				entry: { index: "src/cli/index.ts" },
			},
			output: {
				...sharedConfig.output,
				target: "node",
				distPath: { root: "dist/cli" },
				externals: ["@mdx-js/mdx"],
			},
		},
		{
			...sharedConfig,
			source: {
				entry: { index: "src/web/index.ts" },
			},
			output: {
				...sharedConfig.output,
				target: "web",
				distPath: { root: "dist/web" },
				externals: ["@types/react", "_playground_virtual_modules"],
			},
			plugins: [pluginReact()],
		},
	],

	performance: process.env.BUNDLE_ANALYZE
		? {
				bundleAnalyze: {
					analyzerMode: "static",
					openAnalyzer: true,
				},
			}
		: {},
});
