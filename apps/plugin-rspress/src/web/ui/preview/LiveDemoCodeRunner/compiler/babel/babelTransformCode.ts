import type { TransformOptions } from "@babel/core";

export const babelTransformCode = (code: string, filename: string) => {
	const { availablePresets, transform } = window.Babel;

	const presets: TransformOptions["presets"] = [
		[availablePresets.react, { pure: false }],
	];

	if (filename.endsWith(".tsx")) {
		presets.push([
			availablePresets.typescript,
			{ allExtensions: true, isTSX: true },
		]);
	}

	const fileResult = transform(code, { presets });

	return fileResult?.code ?? code;
};
