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
	importPath: string; // Relative import (e.g., "./Button", "../utils/helper")
	dirname: string; // Directory to resolve from
};

/**
 * Resolve a relative import path to an absolute file path
 *
 * Tries common extensions: .tsx, .ts, .jsx, .js (and index files)
 *
 * @param dirname - Directory to resolve from (usually MDX file's directory)
 * @param importPath - Relative import path (e.g., "./Button", "../utils")
 * @returns Object with absolutePath and fileName
 * @throws Error if file cannot be resolved
 */
export function resolveFileInfo({ dirname, importPath }: ResolveFileInfo) {
	const absolutePath = path.join(dirname, importPath);

	const pathsToCheck = getPossiblePaths(absolutePath);

	for (const absolutePath of pathsToCheck) {
		if (fs.existsSync(absolutePath)) {
			const fileName = path.basename(absolutePath) as PathWithAllowedExt;

			return { absolutePath, fileName };
		}
	}

	throw new LiveDemoError("IMPORT_NOT_RESOLVED", { importPath });
}
