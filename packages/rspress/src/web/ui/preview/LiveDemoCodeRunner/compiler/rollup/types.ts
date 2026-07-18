// oxlint-disable-next-line import/default -- type-only import of a CDN-loaded UMD package, no real default export to resolve
import type rollup from "@rollup/browser";

type Rollup = typeof rollup;

// rollup is loaded with html script tag
// see builderConfig.html.tags in plugin
declare global {
	interface Window {
		rollup: Rollup;
	}
}
