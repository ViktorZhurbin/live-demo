import type { Plugin } from "@rollup/browser";
import {
	getPossiblePaths,
	isRelativeImport,
	stripRelativeImport,
} from "@shared/pathHelpers";
import type { Files } from "@shared/types";

// Based off of https://rollupjs.org/faqs/#how-do-i-run-rollup-itself-in-a-browser
// Resolve and load modules to be bundled
export const pluginResolveModules = (files: Files): Plugin => {
	return {
		name: "resolve-modules",
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
			// use fileName resolved in resolveId to load its code for bundling
			if (Object.hasOwn(files, fileName)) {
				return files[fileName];
			}
		},
	};
};
