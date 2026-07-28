/**
 * Resolves a fenced code block's `file="..."` value to its entry file's
 * `{ absolutePath, fileName }`, validating the explicit-extension rule
 * `file=` imposes before handing off to `resolvePrefixedPath`/`resolveFileInfo`.
 *
 * Shared because the same reference gets resolved from two places now: the
 * build-time scan (`visitFilePaths`, walking just for external imports) and
 * `remarkPlugin` (per MDX compile, walking for `files`). Keeping the
 * extension check and prefix resolution in one place means those two callers
 * can't quietly drift on what a given `file=` value resolves to.
 */
import { LiveDemoError } from "~shared/errors";
import { getFileExt, isAllowedExt } from "~shared/pathHelpers";

import { resolveFileInfo } from "./resolveFileInfo";
import { resolvePrefixedPath } from "./resolvePrefixedPath";

type ResolveFileMetaEntry = {
	/** The raw, still-prefixed `file="..."` value. */
	file: string;
	/** Directory of the MDX file carrying the reference — base for `./`/`../`. */
	docDirname: string;
	/** Resolved doc root (mirrors `config.root`) — base for the `/`-prefixed form. */
	docRoot: string;
	mdxPath: string;
};

export const resolveFileMetaEntry = ({
	file,
	docDirname,
	docRoot,
	mdxPath,
}: ResolveFileMetaEntry) => {
	// Unlike the deprecated `<code src>`, `file=` can't rely on
	// `resolveFileInfo`'s extension-guessing — core reads this path literally,
	// so guessing here would just move the failure to a later, unrelated
	// ENOENT at MDX-compile time (see `resolveFileInfo`'s docblock).
	const ext = getFileExt(file);
	if (ext === undefined || !isAllowedExt(ext)) {
		throw new LiveDemoError("FILE_META_EXTENSION_REQUIRED", {
			importPath: file,
			importer: mdxPath,
			mdxPath,
		});
	}

	const { dirname, importPath } = resolvePrefixedPath({
		filePath: file,
		docDirname,
		docRoot,
		importer: mdxPath,
		mdxPath,
	});

	return resolveFileInfo({ importPath, dirname, importer: mdxPath, mdxPath });
};
