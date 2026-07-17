import type { TransformOptions } from "@babel/core";

export const babelTransformCode = (code: string, filename: string) => {
	const { availablePresets, transform } = window.Babel;

	const presets: TransformOptions["presets"] = [
		// classic runtime emits `React.createElement`, relying on the `React`
		// identifier `babelPluginTraverse.ts` auto-imports; the automatic
		// runtime (Babel 8's new default) instead emits an implicit
		// `react/jsx-runtime` import that the virtual-module system, built
		// from statically-analyzed user imports, never sees
		[availablePresets.react, { pure: false, runtime: "classic" }],
	];

	if (filename.endsWith(".tsx")) {
		// no filename is passed to `transform` below, so preset-typescript's
		// extension-based detection never kicks in; a null filename already
		// gets its permissive (JSX-allowed) parsing rules by default, which is
		// what `allExtensions`/`isTSX` (removed in Babel 8) used to force
		presets.push(availablePresets.typescript);
	}

	const fileResult = transform(code, { presets });

	return fileResult?.code ?? code;
};
