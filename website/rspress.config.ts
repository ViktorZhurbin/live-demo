import * as path from "node:path";
import { pluginPlayground } from "rspress-plugin-code-sandbox";
import { defineConfig } from "rspress/config";

export default defineConfig({
	root: path.join(__dirname, "docs"),
	plugins: [pluginPlayground()],

	title: "My Site",
	icon: "/rspress-icon.png",
	logo: {
		light: "/rspress-light-logo.png",
		dark: "/rspress-dark-logo.png",
	},

	themeConfig: {
		socialLinks: [
			{
				icon: "github",
				mode: "link",
				// TODO: Replace the link
				content: "https://github.com/web-infra-dev/rspress",
			},
		],
	},

	route: {
		exclude: ["**/snippets/**"],
	},

	builderConfig: {
		output: {
			cssModules: {
				localIdentName:
					process.env.NODE_ENV === "development"
						? "[folder]__[local]-[hash:base64:6]"
						: "[local]-[hash:base64:6]",
			},
		},
		performance: process.env.BUNDLE_ANALYZE
			? {
					bundleAnalyze: {
						analyzerMode: "static",
						openAnalyzer: true,
					},
				}
			: {},
	},
});
