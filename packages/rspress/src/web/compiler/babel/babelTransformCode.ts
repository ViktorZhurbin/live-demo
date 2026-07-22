import type { PluginItem, TransformOptions } from "@babel/core";

import { getBabel } from "../loadCompiler";

type TransformedFile = {
	code: string;
	/**
	 * Every import specifier this file references, relative and external
	 * alike, in source order — including ones Babel itself injects (the
	 * automatic JSX runtime's `react/jsx-runtime`). `moduleRunner`'s walk uses
	 * this to discover the rest of the demo's reachable files and its
	 * externals, without a second parse.
	 */
	importSpecifiers: string[];
	/**
	 * Named imports only (`import { a } from 'pkg'`), keyed by specifier.
	 * `runCode` checks these against the resolved package so a name it doesn't
	 * export fails with UNDEFINED_NAMED_IMPORT instead of becoming `undefined`
	 * and surfacing later as an opaque TypeError. Default and namespace
	 * imports are absent by design: there's nothing to check on them.
	 */
	namedImports: Map<string, Set<string>>;
};

/**
 * Transpile one file straight to CommonJS: JSX/TS presets, then
 * `transform-modules-commonjs` turn every surviving `import`/`export` into
 * plain `require(...)`/`exports.x = ...`. `moduleRunner`'s `require` supplies
 * the CJS globals (`require`, `module`, `exports`) each file's `new
 * Function` call expects.
 *
 * One Babel pass, not two: `transform-modules-commonjs` and the JSX preset
 * both run inside the same traversal, so a specifier the *preset* inserts
 * (the jsx-runtime import) is still in the tree by the time the commonjs
 * plugin — and the specifier-collecting visitor above — see it.
 */
export const babelTransformCode = (
	code: string,
	filename: string,
): TransformedFile => {
	const { availablePresets, availablePlugins, transform } = getBabel();

	const presets: TransformOptions["presets"] = [
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

	const importSpecifiers: string[] = [];
	const namedImports = new Map<string, Set<string>>();
	const collectImportSpecifiers = (): PluginItem => ({
		visitor: {
			ImportDeclaration(path) {
				const { node } = path;

				// Type-only imports are erased before evaluation, so they name
				// neither a file to walk nor an export to check. Build-time
				// `analyzeModule.ts` skips them for the same reason. This
				// visitor runs ahead of preset-typescript (plugins before
				// presets), so they're still in the tree here.
				if (node.importKind === "type") return;

				const pkg = node.source.value;
				importSpecifiers.push(pkg);

				for (const specifier of node.specifiers) {
					if (
						specifier.type !== "ImportSpecifier" ||
						specifier.importKind === "type"
					) {
						continue;
					}

					const { imported } = specifier;
					const name =
						imported.type === "Identifier" ? imported.name : imported.value;

					const names = namedImports.get(pkg) ?? new Set<string>();
					names.add(name);
					namedImports.set(pkg, names);
				}
			},
		},
	});

	const fileResult = transform(code, {
		presets,
		plugins: [
			collectImportSpecifiers,
			availablePlugins["transform-modules-commonjs"],
		],
	});

	return { code: fileResult?.code ?? code, importSpecifiers, namedImports };
};
