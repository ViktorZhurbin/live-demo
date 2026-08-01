import * as path from "node:path";

import { defineConfig } from "@rspress/core";
import { pluginPlayground } from "@rspress/plugin-playground";

export default defineConfig({
	llms: true,
	root: path.join(__dirname, "docs"),

	plugins: [
		pluginPlayground({
			// Upstream's routeGenerated scan collects imports from inline
			// `jsx/tsx playground` fences and `<code src>` elements only. A
			// `file=` fence has an empty body in the raw MDX it parses (core's
			// remarkFileCodeBlock fills it later, inside the compile it doesn't
			// see), so its imports are never collected. Declare them here.
			include: [
				"@react-three/drei",
				"@react-three/fiber",
				"@react-three/postprocessing",
				"three",
			],
		}),
	],

	title: "Live Demo",
	icon: "/icon-dark.svg",

	logoText: "Live Demo",
	logo: {
		light: "/icon-light.svg",
		dark: "/icon-dark.svg",
	},

	themeConfig: {
		enableScrollToTop: true,
		socialLinks: [
			{
				icon: "github",
				mode: "link",
				content: "https://github.com/ViktorZhurbin/live-demo",
			},
		],
	},

	route: {
		cleanUrls: true,
		exclude: ["**/snippets/**"],
	},

	builderConfig: {
		// rspress enables rspack's persistent cache by default (baked into its
		// internal rsbuild config, not visible here) via performance.buildCache.
		// It intermittently fails to save on macOS with ENOTEMPTY removing its
		// .temp dir, so disable it — dev rebuilds still use the in-memory cache.
		performance: {
			buildCache: false,
		},
		tools: {
			rspack: {
				module: {
					rules: [
						{
							resourceQuery: /raw/,
							type: "asset/source",
						},
					],
				},
			},
		},
	},
});
