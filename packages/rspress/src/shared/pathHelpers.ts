import { LiveDemoLanguage } from "./constants";
import { LiveDemoError } from "./errors";
import type { PathWithAllowedExt } from "./types";

/** starting with ./ or ../  */
const relativeImportRegex = /^\.{1,2}\//;

export const isRelativeImport = (importPath: string) =>
	relativeImportRegex.test(importPath);

/**
 * Directory portion of a posix-style path, or "" for a bare file name.
 * Mirrors `path.dirname` for the subset of paths used as `files` keys —
 * this also runs in the browser, where `node:path` isn't available.
 */
export const getDirName = (filePath: string) => {
	const lastSlash = filePath.lastIndexOf("/");

	return lastSlash === -1 ? "" : filePath.slice(0, lastSlash);
};

/**
 * Resolve a relative import against the directory it was imported from,
 * producing the same posix-style key the build step assigns to each file.
 *
 * Leading `..` segments are preserved: a demo may import a file that sits
 * above its entry file's directory, and that file's key keeps the `../`
 * prefix so both sides agree on it.
 *
 * @example resolveRelativePath("x", "./utils") // "x/utils"
 * @example resolveRelativePath("x/y", "../utils") // "x/utils"
 * @example resolveRelativePath("", "../shared/theme") // "../shared/theme"
 */
export const resolveRelativePath = (fromDir: string, importPath: string) => {
	const segments = fromDir === "" || fromDir === "." ? [] : fromDir.split("/");

	for (const segment of importPath.split("/")) {
		if (segment === "" || segment === ".") continue;

		if (segment !== "..") {
			segments.push(segment);
			continue;
		}

		// Climbing above the base is legitimate (see doc comment), so keep the
		// `..` rather than popping a segment that isn't there.
		if (segments.length === 0 || segments.at(-1) === "..") {
			segments.push("..");
		} else {
			segments.pop();
		}
	}

	return segments.join("/");
};

/**
 * Extension of the file a path points at, or `undefined` if it has none.
 *
 * Reads the extension off the *base name*, not the whole path: a dot in a
 * parent directory (`/Users/my.app/Button`) must not be mistaken for the
 * file's extension. Likewise only the last dot counts, so `Button.test.tsx`
 * is a `tsx` file.
 */
export const getFileExt = (filePath: string) => {
	const baseName = filePath.slice(filePath.lastIndexOf("/") + 1);
	const lastDot = baseName.lastIndexOf(".");

	// `<= 0` also rejects dotfiles (".gitignore" has no extension, it *is* a name)
	return lastDot <= 0 ? undefined : baseName.slice(lastDot + 1);
};

/**
 * Whether a string is one of the supported source extensions.
 *
 * Uses `Object.hasOwn` rather than `in`: `"constructor" in LiveDemoLanguage`
 * is `true` via the prototype chain, which would make `Button.constructor`
 * look like a resolvable source file.
 */
export const isAllowedExt = (fileExt: string): fileExt is LiveDemoLanguage =>
	Object.hasOwn(LiveDemoLanguage, fileExt);

/**
 * Candidate file paths an import could refer to, in resolution order.
 *
 * An import with an explicit supported extension resolves to itself.
 * An extensionless import expands to `<path>.<ext>` for every supported
 * extension, then to `<path>/index.<ext>` — so `./Button` finds either
 * `Button.tsx` or `Button/index.tsx`.
 */
export const getPossiblePaths = (filePath: string): PathWithAllowedExt[] => {
	const fileExt = getFileExt(filePath);

	if (fileExt === undefined) {
		const extensions = Object.keys(LiveDemoLanguage);

		return [
			...extensions.map((ext) => `${filePath}.${ext}` as PathWithAllowedExt),
			...extensions.map(
				(ext) => `${filePath}/index.${ext}` as PathWithAllowedExt,
			),
		];
	}

	if (isAllowedExt(fileExt)) {
		return [filePath] as PathWithAllowedExt[];
	}

	throw new LiveDemoError("IMPORT_NOT_RESOLVED", { importPath: filePath });
};
