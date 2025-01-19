import type babel from "@babel/standalone";
import { Files } from "../../../../../shared/types";

type Babel = typeof babel;

// @babel/standalone is loaded with html script tag
// see builderConfig.html.tags in pluginPlayground
declare global {
	interface Window {
		Babel: Babel;
	}
}

type GetBabelTransformedFiles = {
	files: Files;
};

export function getBabelTransformedFiles({ files }: GetBabelTransformedFiles) {
	const { availablePresets, transform } = window.Babel;

	const presetsJsx = [[availablePresets.react, { pure: false }]];

	const presetsTsx = presetsJsx.concat([
		[availablePresets.typescript, { allExtensions: true, isTSX: true }],
	]);

	return Object.keys(files).reduce<Files>((acc, fileName) => {
		const code = files[fileName];
		const presets = fileName.endsWith(".tsx") ? presetsTsx : presetsJsx;

		const fileResult = transform(code, { presets });

		if (fileResult?.code) {
			acc[fileName] = fileResult.code;
		}

		return acc;
	}, {});
}
