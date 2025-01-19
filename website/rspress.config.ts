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
				content: "https://github.com/web-infra-dev/rspress",
			},
		],
	},
});