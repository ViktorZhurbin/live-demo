import { loadImports } from "_live_demo_virtual_modules";
import { LiveDemoError } from "~shared/errors";
import { getDirName, isRelativeImport } from "~shared/pathHelpers";
import type { CodeRunnerProps } from "~web/ui/CodeRunner/CodeRunner";

import { ensureCompilerLoaded } from "./loadCompiler";
import {
	createModuleRunner,
	getEntryResult,
	resolveLocalImport,
} from "./moduleRunner";
import { transformCode } from "./transformCode";

type RunCode = Pick<CodeRunnerProps, "files" | "entryFileName">;

/**
 * Compile and run a demo's `files`, returning its exported component.
 *
 * Walks from `entryFileName` over `files`, transpiling every reachable file
 * to CommonJS (`transformCode`) exactly once. `getImport`
 * (`_live_demo_virtual_modules`) is synchronous by design, so every external
 * the walk turns up is awaited via `loadImports` *before* `moduleRunner`
 * evaluates anything — this is what makes an author's freshly-edited import
 * of a package the build step never saw still work.
 *
 * A named import the resolved package doesn't export is no longer checked
 * here: `moduleRunner`'s `wrapExternal` throws `UNDEFINED_NAMED_IMPORT` at
 * the point the demo actually reads the missing property (see its docblock).
 */
export const runCode = async ({ files, entryFileName }: RunCode) => {
	// Pulls Sucrase in (once) before anything below reads it; a load failure
	// throws here and lands in CodeRunner's catch → overlay.
	await ensureCompilerLoaded();

	const transpiled = new Map<string, string>();
	const externalImports = new Set<string>();

	const visited = new Set([entryFileName]);
	const queue = [entryFileName];

	// The queue grows as new local imports are discovered; `for...of` picks up
	// entries appended during iteration — same shape as `collectDemoFiles`'s
	// build-time walk, over `files` instead of the filesystem.
	for (const filePath of queue) {
		const { code, importSpecifiers } = transformCode(files[filePath], filePath);
		transpiled.set(filePath, code);

		const fromDir = getDirName(filePath);

		for (const specifier of importSpecifiers) {
			if (!isRelativeImport(specifier)) {
				externalImports.add(specifier);
				continue;
			}

			const resolved = resolveLocalImport(files, fromDir, specifier);

			// An unresolvable relative import fails fast here rather than at
			// evaluation, so a demo edited to import a nonexistent local file
			// errors before wastefully preloading its (possibly unrelated)
			// externals. `moduleRunner`'s own `require` throws the same error
			// if it's ever reached another way.
			if (!resolved) {
				throw new LiveDemoError("IMPORT_NOT_RESOLVED", {
					importPath: specifier,
					importer: filePath,
				});
			}

			if (!visited.has(resolved)) {
				visited.add(resolved);
				queue.push(resolved);
			}
		}
	}

	await loadImports([...externalImports]);

	const runner = createModuleRunner(files, transpiled);
	const { exports } = runner.evaluate(entryFileName);

	return getEntryResult(exports, entryFileName);
};
