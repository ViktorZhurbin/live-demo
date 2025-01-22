const { availablePresets, transform } = window.Babel;

const presetsJsx = [[availablePresets.react, { pure: false }]];

const presetsTsx = presetsJsx.concat([
	[availablePresets.typescript, { allExtensions: true, isTSX: true }],
]);

export const babelTransformCode = (code: string, filename: string) => {
	const presets = filename.endsWith(".tsx") ? presetsTsx : presetsJsx;

	const fileResult = transform(code, { presets });

	return fileResult?.code ?? code;
};
