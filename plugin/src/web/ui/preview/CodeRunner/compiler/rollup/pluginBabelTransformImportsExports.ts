import type { Plugin } from "@rollup/browser";
import { babelPluginTraverse } from "../babel/babelPluginTraverse";

/**
 * Transforms bundled code:
 * - replaces external imports with calls to getImport helper
 * which uses _playground_virtual_modules to resolve them
 * - updates export to always use `exports.default`
 * which is then used to get the component function
 */
export const pluginBabelTransformImportsExports = (): Plugin => {
	const { transform } = window.Babel;

	return {
		name: "babel-transform-imports-exports",
		renderChunk(code, chunk, options, meta) {
			const fileResult = transform(code, {
				sourceType: "module",
				plugins: [babelPluginTraverse()],
			});

			return {
				code: fileResult?.code ?? code,
				map: null,
			};
		},
	};
};
