import type { TransformOptions } from "@babel/core";

export const babelTransformCode = (code: string, filename: string) => {
	const { availablePresets, transform } = window.Babel;

	const presets: TransformOptions["presets"] = [
		// The automatic runtime emits an implicit `react/jsx-runtime` import,
		// which `babelPluginTraverse.ts` rewrites to a `__get_import` call like
		// any other external. That resolves because `react/jsx-runtime` is one
		// of the plugin's `defaultModules` — demo authors never write the
		// import, so it can't be discovered by scanning their code.
		//
		// Pinned explicitly rather than relying on it being Babel 8's default:
		// the classic runtime needs a `React` identifier in scope, which is why
		// this used to auto-inject one into every demo. Switching back would
		// silently reintroduce that requirement.
		[availablePresets.react, { pure: false, runtime: "automatic" }],
	];

	// Both TypeScript extensions, not just `.tsx`: a plain `.ts` helper next to
	// a component is ordinary, and without the preset its type annotations
	// reach the parser as syntax errors.
	if (filename.endsWith(".ts") || filename.endsWith(".tsx")) {
		// no filename is passed to `transform` below, so preset-typescript's
		// extension-based detection never kicks in; a null filename already
		// gets its permissive (JSX-allowed) parsing rules by default, which is
		// what `allExtensions`/`isTSX` (removed in Babel 8) used to force
		presets.push(availablePresets.typescript);
	}

	const fileResult = transform(code, { presets });

	return fileResult?.code ?? code;
};
