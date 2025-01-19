import type { Plugin } from "@rollup/browser";
import type rollup from "@rollup/browser";

import { ENTRY_FILE_BASE, Language } from "@shared/constants";
import { isRelativeImport, prepareFileNameWithExt } from "@shared/pathHelpers";
import type { Files } from "@shared/types";

type Rollup = typeof rollup;

// rollup is loaded with html script tag
// see builderConfig.html.tags in pluginPlayground
declare global {
	interface Window {
		rollup: Rollup;
	}
}

type GetBundledCode = {
	files: Files;
};

export const getRollupBundledCode = async ({ files }: GetBundledCode) => {
	const entryFilename = Object.keys(files).find((name) =>
		name.includes(ENTRY_FILE_BASE),
	);

	const bundle = await window.rollup.rollup({
		input: entryFilename,
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
				const fileName = prepareFileNameWithExt(source, Language.tsx);

				if (Object.hasOwn(files, fileName)) {
					return fileName;
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
