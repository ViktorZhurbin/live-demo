import getImport from "_live_demo_virtual_modules";
import { LiveDemoError } from "~shared/errors";
import {
	getDirName,
	getPossiblePaths,
	isRelativeImport,
	resolveRelativePath,
} from "~shared/pathHelpers";
import type { LiveDemoFiles } from "~shared/types";

/**
 * Resolve a relative import against the directory it was imported from, the
 * same way build-time `resolveFileInfo.ts` resolves it against the
 * filesystem. `getPossiblePaths` is the single definition of the candidate
 * list — never re-implement it here.
 */
export function resolveLocalImport(
	files: LiveDemoFiles,
	fromDir: string,
	specifier: string,
): string | undefined {
	const filePath = resolveRelativePath(fromDir, specifier);

	for (const candidate of getPossiblePaths(filePath)) {
		if (Object.hasOwn(files, candidate)) return candidate;
	}

	return undefined;
}

/**
 * Evaluates a demo's already-transpiled files as a small CommonJS graph,
 * in-memory: `require` resolves relative specifiers against `files` and runs
 * each module at most once via `new Function`, caching `module.exports`.
 * Everything else (react, lodash, ...) falls through to `getImport`, already
 * resolved by `runCode` before evaluation starts (`getImport` is
 * synchronous — see `getVirtualModulesCode.ts`).
 *
 * External modules arrive as real ES namespace objects from the browser's
 * own `import()`, not Babel's CJS convention, so a bare `getImport` result
 * can't be handed to `require`'s callers as-is: Babel's `_interopRequireDefault`
 * only reads `.default` when it sees an `__esModule` marker, and a package
 * with no real `default` export needs the whole module to stand in for one
 * instead. `wrapExternal` below fakes both, so the same interop helpers Babel
 * generates for local `require()` calls also work for external ones.
 *
 * **Not sandboxed.** `new Function` runs the demo in the host origin with
 * full DOM/global access. Accepted for a docs tool whose demo authors are as
 * trusted as the docs themselves (see the package CLAUDE.md).
 */
export function createModuleRunner(
	files: LiveDemoFiles,
	transpiled: Map<string, string>,
) {
	const cache = new Map<string, { exports: Record<string, unknown> }>();

	function requireModule(specifier: string, importerPath: string): unknown {
		if (!isRelativeImport(specifier)) {
			return wrapExternal(getImport(specifier));
		}

		const resolved = resolveLocalImport(
			files,
			getDirName(importerPath),
			specifier,
		);

		if (!resolved) {
			throw new LiveDemoError("IMPORT_NOT_RESOLVED", {
				importPath: specifier,
				importer: importerPath,
			});
		}

		return evaluate(resolved).exports;
	}

	function evaluate(filePath: string) {
		const cached = cache.get(filePath);
		if (cached) return cached;

		const module = { exports: {} as Record<string, unknown> };
		// Seed the cache before running the body: a cycle's `require` call
		// back into this module gets this (still-filling-in) object instead of
		// recursing, which is what lets it terminate.
		cache.set(filePath, module);

		const run = new Function(
			"require",
			"module",
			"exports",
			transpiled.get(filePath) ?? "",
		) as (
			require: (specifier: string) => unknown,
			module: { exports: Record<string, unknown> },
			exports: Record<string, unknown>,
		) => void;

		run(
			(specifier) => requireModule(specifier, filePath),
			module,
			module.exports,
		);

		return module;
	}

	return { evaluate };
}

function wrapExternal(resolved: unknown): Record<string, unknown> {
	const hasDefault =
		resolved != null && typeof resolved === "object" && "default" in resolved;

	return {
		__esModule: true,
		...(resolved as object),
		default: hasDefault ? (resolved as { default: unknown }).default : resolved,
	};
}

/**
 * The entry file's exported component: its default export if it has one,
 * otherwise its last named export — every export assigns a property on the
 * same `exports` object, so "last" means last in source order. Named exports
 * are the documented form (`export const App = ...`), so this is the common
 * case, not a fallback for a mistake.
 */
export function getEntryResult(
	moduleExports: Record<string, unknown>,
	entryFileName?: string,
) {
	if (moduleExports.default !== undefined) return moduleExports.default;

	const lastKey = Object.keys(moduleExports).at(-1);

	if (lastKey === undefined) {
		throw new LiveDemoError("NO_DEFAULT_EXPORT", { entryFileName });
	}

	return moduleExports[lastKey];
}
