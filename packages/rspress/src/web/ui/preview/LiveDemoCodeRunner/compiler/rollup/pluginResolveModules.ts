import type { Plugin } from "@rollup/browser";
import {
	getDirName,
	getPossiblePaths,
	isRelativeImport,
	resolveRelativePath,
} from "shared/pathHelpers";
import type { LiveDemoFiles } from "shared/types";

/**
 * Resolve and load in-memory files to be bundled
 *
 * `files` is keyed by each file's path relative to the entry file's
 * directory (see `collectDemoFiles`), so a relative import has to be
 * resolved against the *importing* file's directory — resolving it against
 * the root would make `components/Button.tsx`'s `./styles` import look for
 * `styles.ts` at the top level instead of `components/styles.ts`.
 *
 * Based off of @link https://rollupjs.org/faqs/#how-do-i-run-rollup-itself-in-a-browser
 * */
export const pluginResolveModules = (files: LiveDemoFiles): Plugin => {
	return {
		name: "resolve-modules",
		resolveId(source, importer) {
			if (Object.hasOwn(files, source)) {
				return source;
			}

			if (!isRelativeImport(source)) {
				return null;
			}

			// The entry has no importer, so relative imports in it resolve
			// against the root of `files`.
			const fromDir = importer ? getDirName(importer) : "";
			const filePath = resolveRelativePath(fromDir, source);

			// `getPossiblePaths` is the single definition of the resolution
			// rules; `resolveFileInfo.ts` probes the same candidates against
			// the filesystem at build time. Only the substrate differs — never
			// re-implement the candidate list here.
			for (const checkedPath of getPossiblePaths(filePath)) {
				if (Object.hasOwn(files, checkedPath)) {
					return checkedPath;
				}
			}

			return null;
		},
		load(filePath) {
			// use the path resolved in resolveId to load its code for bundling
			if (Object.hasOwn(files, filePath)) {
				return files[filePath];
			}
		},
	};
};
