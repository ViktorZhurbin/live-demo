import type { Plugin } from "@rollup/browser";
import type rollup from "@rollup/browser";
import {
	getPossiblePaths,
	isRelativeImport,
	stripRelativeImport,
} from "@shared/pathHelpers";
import type { Files } from "@shared/types";
import type { CodeRunnerProps } from "../CodeRunner";

type Rollup = typeof rollup;

// rollup is loaded with html script tag
// see builderConfig.html.tags in pluginPlayground
declare global {
	interface Window {
		rollup: Rollup;
	}
}

type GetBundledCode = Pick<CodeRunnerProps, "files" | "entryFileName">;

export const getRollupBundledCode = async ({
	files,
	entryFileName,
}: GetBundledCode) => {
	const bundle = await window.rollup.rollup({
		input: entryFileName,
		plugins: [loaderPlugin(files)],
		external: (source) => {
			const isLocal = isRelativeImport(source) || files[source];

			return !isLocal;
		},
	});

	const { output } = await bundle.generate({
		compact: false,
		strict: false,
		exports: "named",
		format: "commonjs",
		generatedCode: "es2015",
		plugins: [],
	});

	const bundledCode = output[0].code;

	return bundledCode;
};

// Based off of https://rollupjs.org/faqs/#how-do-i-run-rollup-itself-in-a-browser
// Resolve and load modules to be bundled
function loaderPlugin(files: Files): Plugin {
	return {
		name: "relative-imports-loader",
		resolveId(source) {
			if (Object.hasOwn(files, source)) {
				return source;
			}

			// resolve file name from the relative import
			if (isRelativeImport(source)) {
				const fileName = stripRelativeImport(source);

				// same helper should be used in `getFilesAndImports`
				const pathsToCheck = getPossiblePaths(fileName);

				for (const checkedPath of pathsToCheck) {
					if (Object.hasOwn(files, checkedPath)) {
						return checkedPath;
					}
				}
			}

			return null;
		},
		load(fileName) {
			// use fileName resolved above to load its code for bundling
			if (Object.hasOwn(files, fileName)) {
				return files[fileName];
			}
		},
	};
}
