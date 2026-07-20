import type babelStandalone from "@babel/standalone";
// oxlint-disable-next-line import/default -- @rollup/browser has no real default export; the type is only used for `typeof`
import type rollupBrowser from "@rollup/browser";
import { LiveDemoError } from "~shared/errors";

type Babel = typeof babelStandalone;
type Rollup = typeof rollupBrowser;

/**
 * Lazily loads Babel and Rollup and hands them to the compiler pipeline.
 *
 * Both are ~MB-sized and only ever needed once a demo actually compiles, so
 * they're pulled in with dynamic `import()` here instead of eager CDN
 * `<script>`s in the document head. The consuming site's bundler code-splits
 * these two imports into async chunks that load only on pages with a demo —
 * every other page pays nothing.
 *
 * `bundleCode` awaits `ensureCompilerLoaded()` before touching the pipeline;
 * the sync plugin steps then read the singletons through `getBabel`/
 * `getRollup`. A failed load clears the memo so the next edit retries, and
 * throws `COMPILER_LOAD_FAILED` — caught by `CodeRunner` into the preview
 * overlay instead of the old silent blank.
 */

let babel: Babel | undefined;
let rollup: Rollup | undefined;
let loading: Promise<void> | undefined;

export function ensureCompilerLoaded(): Promise<void> {
	loading ??= load();
	return loading;
}

async function load(): Promise<void> {
	try {
		const [babelModule, rollupModule] = await Promise.all([
			import("@babel/standalone"),
			import("@rollup/browser"),
		]);

		// @babel/standalone is UMD: the bundler wraps it as `{ default: Babel }`.
		// @rollup/browser is ESM with named exports (no default), so its
		// namespace already is the `{ rollup, ... }` shape `Rollup` describes.
		babel =
			(babelModule as { default?: Babel }).default ?? (babelModule as Babel);
		rollup = rollupModule as unknown as Rollup;
	} catch (cause) {
		loading = undefined;
		throw new LiveDemoError("COMPILER_LOAD_FAILED", undefined, { cause });
	}
}

export function getBabel(): Babel {
	if (!babel) throw new LiveDemoError("COMPILER_LOAD_FAILED");
	return babel;
}

export function getRollup(): Rollup {
	if (!rollup) throw new LiveDemoError("COMPILER_LOAD_FAILED");
	return rollup;
}
