import type babelStandalone from "@babel/standalone";
import { LiveDemoError } from "~shared/errors";

type Babel = typeof babelStandalone;

/**
 * Lazily loads Babel and hands it to the compiler pipeline.
 *
 * It's ~MB-sized and only ever needed once a demo actually compiles, so it's
 * pulled in with a dynamic `import()` here instead of an eager CDN `<script>`
 * in the document head. The consuming site's bundler code-splits that import
 * into an async chunk that loads only on pages with a demo — every other
 * page pays nothing.
 *
 * `runCode` awaits `ensureCompilerLoaded()` before touching the pipeline; the
 * sync transform steps then read the singleton through `getBabel`. A failed
 * load clears the memo so the next edit retries, and throws
 * `COMPILER_LOAD_FAILED` — caught by `CodeRunner` into the preview overlay
 * instead of the old silent blank.
 */

let babel: Babel | undefined;
let loading: Promise<void> | undefined;

export function ensureCompilerLoaded(): Promise<void> {
	loading ??= load();
	return loading;
}

async function load(): Promise<void> {
	try {
		const babelModule = await import("@babel/standalone");

		// @babel/standalone is UMD: the bundler wraps it as `{ default: Babel }`.
		babel =
			(babelModule as { default?: Babel }).default ?? (babelModule as Babel);
	} catch (cause) {
		loading = undefined;
		throw new LiveDemoError("COMPILER_LOAD_FAILED", undefined, { cause });
	}
}

export function getBabel(): Babel {
	if (!babel) throw new LiveDemoError("COMPILER_LOAD_FAILED");
	return babel;
}
