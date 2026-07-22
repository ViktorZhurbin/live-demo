/**
 * Collect every file a demo needs, starting from its entry file
 *
 * This is a reachability walk, not a bundler. It answers exactly two
 * questions, which are the only two the build step actually needs:
 *
 * 1. Which local files must ship with this demo? (the entry plus everything
 *    transitively imported from it)
 * 2. Which external packages does it reference? (so they can be re-exported
 *    from the generated virtual module)
 *
 * Deliberately *not* done here: resolving imports for evaluation, ordering
 * modules, or assigning module ids. `web/compiler/moduleRunner.ts` does all
 * of that in the browser at demo-render time and keeps its own bookkeeping;
 * duplicating it here would mean maintaining two resolvers that must agree.
 * An earlier version did keep that apparatus — a module `id` and a `mapping`
 * of relative path → id — and nothing at runtime ever read either. If you
 * find yourself re-adding it, the runtime already has it.
 *
 * The one thing both sides *must* agree on is how a file is keyed — see
 * `toFilePath` below, and `tests/integration/buildToRuntime.test.ts`, the
 * only test that spans the build→runtime seam.
 */
import path from "node:path";

import { isRelativeImport } from "~shared/pathHelpers";
import type { LiveDemoFiles, PathWithAllowedExt } from "~shared/types";

import { analyzeModule } from "./analyzeModule";
import { resolveFileInfo } from "./resolveFileInfo";

type CollectDemoFiles = {
	absolutePath: PathWithAllowedExt;
	/** The MDX page this demo was reached from, for error context on a failed nested import. */
	mdxPath?: string;
};

/**
 * Walk a demo's imports and collect its files and external packages
 *
 * Circular imports are not rejected: they're legal in ES modules, and the
 * runtime's CommonJS require graph (`web/compiler/moduleRunner.ts`) resolves
 * them with Node's own partial-exports semantics rather than a bundler's —
 * a value read by property access after the cycle unwinds (the common case:
 * mutually recursive functions, see `buildToRuntime.test.ts`'s "circularly"
 * case) sees the fully-initialized module; a value used immediately at
 * module-eval time, before the cycle unwinds, would see whatever `exports`
 * existed at that moment, same as any other CJS require cycle. The walk
 * itself is cycle-safe either way — `visited` means a file is enqueued at
 * most once however many other files import it.
 */
export const collectDemoFiles = ({
	absolutePath: entryPath,
	mdxPath,
}: CollectDemoFiles): {
	files: LiveDemoFiles;
	externalImports: Set<string>;
} => {
	const files: LiveDemoFiles = {};
	const externalImports = new Set<string>();

	const visited = new Set<string>([entryPath]);
	const queue: PathWithAllowedExt[] = [entryPath];

	// Each file is keyed by its path relative to the entry file's directory,
	// posix-style. Keying by base name alone would let `buttons/styles.ts` and
	// `cards/styles.ts` overwrite each other; the runtime resolver
	// (`pluginResolveModules`) resolves imports against these same keys.
	const entryDir = path.dirname(entryPath);
	const toFilePath = (absolutePath: string) =>
		path.relative(entryDir, absolutePath).split(path.sep).join("/");

	// The queue grows as new imports are discovered; `for...of` picks up
	// entries appended during iteration.
	for (const absolutePath of queue) {
		const filePath = toFilePath(absolutePath) as PathWithAllowedExt;
		const { content, dependencies } = analyzeModule({ absolutePath, filePath });

		files[filePath] = content;

		const dirname = path.dirname(absolutePath);

		for (const dep of dependencies) {
			// External package (react, lodash): provided by the virtual module,
			// never part of the demo's own files.
			if (!isRelativeImport(dep)) {
				externalImports.add(dep);
				continue;
			}

			// Relative import: a local file that has to ship with the demo.
			// Example: "./Button" → "/absolute/path/to/Button.tsx"
			const child = resolveFileInfo({
				importPath: dep,
				dirname,
				importer: absolutePath,
				mdxPath,
			});

			if (!visited.has(child.absolutePath)) {
				visited.add(child.absolutePath);
				queue.push(child.absolutePath);
			}
		}
	}

	return { files, externalImports };
};
