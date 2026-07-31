/**
 * Read a single source file and extract the paths it imports
 *
 * This is deliberately just "source plus its import paths" — resolving those
 * paths, deciding which are local, and following them is `collectDemoFiles`'s
 * job, and evaluating them is `web/compiler/moduleRunner.ts`'s at runtime.
 *
 * Cached per `(absolutePath, mtimeMs)`: every demo's graph is walked once by
 * the build-time scan (`visitFilePaths`, in `routeGenerated`, for its
 * externals-only pass) and again by `remarkPlugin` on every MDX compile
 * after that (for `files`). Keying by mtime means a stale entry gets
 * re-read the next time *this file* is walked — it doesn't by itself make
 * that walk happen sooner; see `packages/rspress/CLAUDE.md`'s "Deliberately
 * not handled" section for what does and doesn't trigger a recompile.
 */
import fs from "node:fs";

import type { PathWithAllowedExt } from "~shared/types";

import { extractSourcePath } from "./extractSourcePath";
import { readAndParseFile } from "./readAndParseFile";

/**
 * Per plugin-instance, not module-level, so two plugin instances (e.g. two
 * `vitest` runs in the same process) never share cached file contents — see
 * this package's CLAUDE.md, "Build-time state is per plugin instance", for
 * why `uniqueImports` follows the same rule.
 */
export type ModuleCache = Map<
	string,
	{ mtimeMs: number; content: string; dependencies: string[] }
>;

type AnalyzeModule = {
	filePath: PathWithAllowedExt;
	absolutePath: PathWithAllowedExt;
	moduleCache: ModuleCache;
};

/**
 * Read a file and list every path it imports or re-exports, both relative
 * (`./Button`) and external (`react`).
 */
export const analyzeModule = ({
	filePath,
	absolutePath,
	moduleCache,
}: AnalyzeModule): { content: string; dependencies: string[] } => {
	const mtimeMs = fs.statSync(absolutePath).mtimeMs;

	const cached = moduleCache.get(absolutePath);
	if (cached && cached.mtimeMs === mtimeMs) {
		return { content: cached.content, dependencies: cached.dependencies };
	}

	const { code, ast } = readAndParseFile({ filePath, absolutePath });

	const dependencies: string[] = [];
	for (const statement of ast.body) {
		const sourcePath = extractSourcePath(statement);
		if (sourcePath) {
			dependencies.push(sourcePath);
		}
	}

	moduleCache.set(absolutePath, { mtimeMs, content: code, dependencies });
	return { content: code, dependencies };
};
