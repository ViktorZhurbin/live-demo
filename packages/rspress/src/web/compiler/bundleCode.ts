import { isRelativeImport } from "~shared/pathHelpers";
import type { CodeRunnerProps } from "~web/ui/CodeRunner/CodeRunner";

import { pluginBabelTransform } from "./rollup/pluginBabelTransform";
import { pluginBabelTransformImportsExports } from "./rollup/pluginBabelTransformImportsExports";
import { pluginResolveModules } from "./rollup/pluginResolveModules";

type BundleCode = Pick<CodeRunnerProps, "files" | "entryFileName">;

/**
 * Bundle a demo's `files` into a single module with `@rollup/browser`,
 * wiring the three rollup plugins that make that work in a browser instead of
 * on disk: resolving imports against the in-memory `files` record instead of
 * a filesystem, and transpiling with Babel instead of Rollup's own loaders.
 * `getFnFromString` evaluates the resulting code.
 */
export const bundleCode = async ({ files, entryFileName }: BundleCode) => {
	const bundle = await window.rollup.rollup({
		input: entryFileName,
		plugins: [
			pluginResolveModules(files),
			pluginBabelTransform(),
			pluginBabelTransformImportsExports(),
		],
		external: (source) => {
			// `Object.hasOwn`, not a truthy index: `files["constructor"]` is
			// truthy via the prototype chain. Extensions aren't checked here —
			// `pluginResolveModules`'s `resolveId` does the real
			// `getPossiblePaths` walk.
			const isResolvable =
				isRelativeImport(source) || Object.hasOwn(files, source);

			return !isResolvable;
		},
	});

	const { output } = await bundle.generate({
		generatedCode: "es2015",
	});

	return output[0].code;
};
