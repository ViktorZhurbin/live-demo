/**
 * Resolve import paths to actual file paths with extensions
 *
 * JavaScript/TypeScript allows imports without extensions:
 * - import Button from './Button' → could be Button.tsx, Button.ts, Button.jsx, Button.js
 *
 * This is the **build-time** half of import resolution: it walks the
 * candidates from `getPossiblePaths` (`shared/pathHelpers.ts`) against the
 * real filesystem. The runtime half, `pluginResolveModules.ts`, walks the
 * same candidates against the in-memory `files` record. Both must agree —
 * change one, change the other, and see
 * `tests/integration/buildToRuntime.test.ts`, the only test spanning the seam.
 */
import fs from "node:fs";
import path from "node:path";

import { LiveDemoError } from "~shared/errors";
import { getPossiblePaths } from "~shared/pathHelpers";
import type { PathWithAllowedExt } from "~shared/types";

type ResolveFileInfo = {
	importPath: string;
	dirname: string;
	/** The file whose import statement (or `<code src>`) names `importPath`. */
	importer?: string;
	/** The MDX page that started the scan, if different from `importer`. */
	mdxPath?: string;
};

export function resolveFileInfo({
	dirname,
	importPath,
	importer,
	mdxPath,
}: ResolveFileInfo) {
	const absolutePath = path.join(dirname, importPath);

	let pathsToCheck: PathWithAllowedExt[];

	try {
		pathsToCheck = getPossiblePaths(absolutePath);
	} catch (err) {
		// `getPossiblePaths` only knows the path, not who imported it — add
		// that context here, the one place both are in scope. Match on the
		// code, not just the class: anything else it may one day throw isn't
		// necessarily an extension problem and must propagate unrelabeled.
		if (
			err instanceof LiveDemoError &&
			err.payload.code === "IMPORT_EXTENSION_NOT_SUPPORTED"
		) {
			throw new LiveDemoError("IMPORT_EXTENSION_NOT_SUPPORTED", {
				importPath,
				importer,
				mdxPath,
			});
		}
		throw err;
	}

	for (const candidate of pathsToCheck) {
		if (fs.existsSync(candidate)) {
			const fileName = path.basename(candidate) as PathWithAllowedExt;

			return { absolutePath: candidate, fileName };
		}
	}

	throw new LiveDemoError("IMPORT_NOT_RESOLVED", {
		importPath,
		importer,
		mdxPath,
	});
}
