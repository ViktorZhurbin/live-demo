import type babel from "@babel/standalone";

type Babel = typeof babel;

// @babel/standalone is loaded with html script tag
// see builderConfig.html.tags in pluginPlayground
declare global {
	interface Window {
		Babel: Babel;
	}
}
