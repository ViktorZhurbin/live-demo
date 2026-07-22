import getImport, { loadImports } from "_live_demo_virtual_modules";
import { LiveDemoError } from "~shared/errors";
import { getDirName, isRelativeImport } from "~shared/pathHelpers";
import type { CodeRunnerProps } from "~web/ui/CodeRunner/CodeRunner";

import { babelTransformCode } from "./babel/babelTransformCode";
import { ensureCompilerLoaded } from "./loadCompiler";
import {
	createModuleRunner,
	getEntryResult,
	resolveLocalImport,
} from "./moduleRunner";

type RunCode = Pick<CodeRunnerProps, "files" | "entryFileName">;

/**
 * Compile and run a demo's `files`, returning its exported component.
 *
 * Walks from `entryFileName` over `files`, transpiling every reachable file
 * to CommonJS (`babelTransformCode`) exactly once. `getImport`
 * (`_live_demo_virtual_modules`) is synchronous by design, so every external
 * the walk turns up is awaited via `loadImports` *before* `moduleRunner`
 * evaluates anything — this is what makes an author's freshly-edited import
 * of a package the build step never saw still work.
 */
export const runCode = async ({ files, entryFileName }: RunCode) => {
	// Pulls Babel in (once) before anything below reads it; a load failure
	// throws here and lands in CodeRunner's catch → overlay.
	await ensureCompilerLoaded();

	const transpiled = new Map<string, string>();
	const externalImports = new Set<string>();
	const externalNamedImports = new Map<string, Set<string>>();

	const visited = new Set([entryFileName]);
	const queue = [entryFileName];

	// The queue grows as new local imports are discovered; `for...of` picks up
	// entries appended during iteration — same shape as `collectDemoFiles`'s
	// build-time walk, over `files` instead of the filesystem.
	for (const filePath of queue) {
		const { code, importSpecifiers, namedImports } = babelTransformCode(
			files[filePath],
			filePath,
		);
		transpiled.set(filePath, code);

		const fromDir = getDirName(filePath);

		for (const specifier of importSpecifiers) {
			if (!isRelativeImport(specifier)) {
				externalImports.add(specifier);

				const names = externalNamedImports.get(specifier) ?? new Set<string>();

				for (const name of namedImports.get(specifier) ?? []) {
					names.add(name);
				}

				externalNamedImports.set(specifier, names);
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

	assertNamedImportsExist(externalNamedImports);

	const runner = createModuleRunner(files, transpiled);
	const { exports } = runner.evaluate(entryFileName);

	return getEntryResult(exports, entryFileName);
};

/**
 * Fail on a named import the package doesn't export, before any demo code
 * runs. Babel's CommonJS interop turns `import { usestate } from 'react'` into
 * a property read that quietly yields `undefined`, so without this the demo
 * dies later at the use site with an opaque TypeError naming neither the
 * import nor the package.
 *
 * Runs after `loadImports`, so `getImport` can read the resolved module
 * synchronously. It throws EXTERNAL_IMPORT_NOT_FOUND itself for a package
 * that never resolved, which is the same error evaluation would have hit.
 */
function assertNamedImportsExist(namedImportsByPkg: Map<string, Set<string>>) {
	for (const [pkg, names] of namedImportsByPkg) {
		if (names.size === 0) continue;

		const resolved = getImport(pkg) as Record<string, unknown>;

		for (const importName of names) {
			if (resolved[importName] === undefined) {
				throw new LiveDemoError("UNDEFINED_NAMED_IMPORT", { importName, pkg });
			}
		}
	}
}
