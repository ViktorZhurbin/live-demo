import type babel from "@babel/standalone";

type Babel = typeof babel;

// @babel/standalone is loaded with html script tag
// see builderConfig.html.tags in pluginPlayground
declare global {
	interface Window {
		Babel: Babel;
	}
}

export const babelTransformCode = (code: string, filename: string) => {
	const { availablePresets, transform } = window.Babel;

	const presetsJsx = [
		[availablePresets.react, { pure: false }],
		// [availablePresets.env, { modules: "commonjs" }],
	];

	const presetsTsx = presetsJsx.concat([
		[availablePresets.typescript, { allExtensions: true, isTSX: true }],
	]);

	const presets = filename.endsWith(".tsx") ? presetsTsx : presetsJsx;

	const fileResult = transform(code, { presets });

	return fileResult?.code ?? code;
};
