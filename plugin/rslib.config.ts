import { pluginReact } from "@rsbuild/plugin-react";
import { type LibConfig, defineConfig } from "@rslib/core";

const sharedConfig: LibConfig = {
	format: "esm",
	syntax: "es2020",
	dts: { bundle: true },
};

export default defineConfig({
	lib: [
		{
			...sharedConfig,
			source: {
				entry: { index: "src/cli/index.ts" },
			},
			output: {
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
				target: "web",
				distPath: { root: "dist/web" },
				externals: ["@types/react"],
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
