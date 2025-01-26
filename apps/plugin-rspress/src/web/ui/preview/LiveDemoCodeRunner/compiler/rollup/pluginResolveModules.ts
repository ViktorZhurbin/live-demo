import type { Plugin } from "@rollup/browser";
import {
	getPossiblePaths,
	isRelativeImport,
	stripRelativeImport,
} from "shared/pathHelpers";
import type { LiveDemoFiles } from "shared/types";

/**
 * Resolve and load in-memory files to be bundled
 *
 * Based off of @link https://rollupjs.org/faqs/#how-do-i-run-rollup-itself-in-a-browser
 * */
export const pluginResolveModules = (files: LiveDemoFiles): Plugin => {
	return {
		name: "resolve-modules",
		resolveId(source) {
			if (Object.hasOwn(files, source)) {
				return source;
			}

			// resolve file name from the relative import
			if (isRelativeImport(source)) {
				const fileName = stripRelativeImport(source);

				// same helper should be used in node/, check `getFilesAndImports`
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
