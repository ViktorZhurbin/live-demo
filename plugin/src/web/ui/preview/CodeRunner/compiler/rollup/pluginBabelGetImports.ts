import type { Plugin } from "@rollup/browser";
import { babelPluginTraverse } from "../babel/babelPluginTraverse";

export const pluginBabelGetImports = (): Plugin => {
	const { transform, availablePresets } = window.Babel;

	return {
		name: "babel-get-imports",
		renderChunk(code, chunk, options, meta) {
			// console.log(this.parse(code));
			const fileResult = transform(code, {
				sourceType: "module",
				presets: [availablePresets.env],
				plugins: [babelPluginTraverse()],
			});

			return {
				code: fileResult?.code ?? code,
				map: null,
			};
		},
	};
};
