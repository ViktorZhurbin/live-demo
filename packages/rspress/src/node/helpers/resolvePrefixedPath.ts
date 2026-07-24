/**
 * Maps a `file="..."` path to the `{ dirname, importPath }` pair
 * `resolveFileInfo` expects, honoring the same prefixes @rspress/core's own
 * `remarkFileCodeBlock` supports: `./`/`../` (relative to the MDX file),
 * `/` (relative to the doc root), and `<root>/` (relative to `cwd()`). Doing
 * this ourselves, ahead of core, is what lets the pre-scan
 * (`visitFilePaths.ts`) agree with what core will actually read — see that
 * file's module docblock.
 */
import { LiveDemoError } from "~shared/errors";

const ROOT_PREFIX = "<root>/";

type ResolvePrefixedPath = {
	/** The raw, still-prefixed `file="..."` value. */
	filePath: string;
	/** Directory of the MDX file carrying the reference — base for `./`/`../`. */
	docDirname: string;
	/** Resolved doc root (mirrors `config.root`) — base for the `/`-prefixed form. */
	docRoot: string;
	importer?: string;
	mdxPath?: string;
};

export const resolvePrefixedPath = ({
	filePath,
	docDirname,
	docRoot,
	importer,
	mdxPath,
}: ResolvePrefixedPath): { dirname: string; importPath: string } => {
	if (filePath.startsWith(ROOT_PREFIX)) {
		return {
			dirname: process.cwd(),
			importPath: filePath.slice(ROOT_PREFIX.length),
		};
	}

	if (filePath.startsWith("./") || filePath.startsWith("../")) {
		return { dirname: docDirname, importPath: filePath };
	}

	if (filePath.startsWith("/")) {
		return { dirname: docRoot, importPath: filePath.slice(1) };
	}

	throw new LiveDemoError("UNSUPPORTED_FILE_PREFIX", {
		importPath: filePath,
		importer,
		mdxPath,
	});
};
