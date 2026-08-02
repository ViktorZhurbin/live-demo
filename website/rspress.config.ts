import * as path from "node:path";

import { liveDemoPluginRspress } from "@live-demo/rspress";
import { defineConfig } from "@rspress/core";

export default defineConfig({
	root: path.join(__dirname, "docs"),

	plugins: [
		liveDemoPluginRspress({
			ui: {
				resizablePanels: {
					autoSaveId: "live-demo-docs",
					defaultPanelSizes: { editor: "55%", preview: "45%" },
				},
			},
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
