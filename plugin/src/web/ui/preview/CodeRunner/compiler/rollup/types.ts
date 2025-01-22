import type rollup from "@rollup/browser";

type Rollup = typeof rollup;

// rollup is loaded with html script tag
// see builderConfig.html.tags in pluginPlayground
declare global {
	interface Window {
		rollup: Rollup;
	}
}
