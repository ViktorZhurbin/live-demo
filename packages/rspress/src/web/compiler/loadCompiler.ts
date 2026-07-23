import type { transform as SucraseTransform } from "sucrase";
import { LiveDemoError } from "~shared/errors";

/**
 * Lazily loads Sucrase and hands its `transform` function to the compiler
 * pipeline.
 *
 * It's only needed once a demo actually compiles, so it's pulled in with a
 * dynamic `import()` here instead of an eager CDN `<script>` in the document
 * head. The consuming site's bundler code-splits that import into an async
 * chunk that loads only on pages with a demo — every other page pays
 * nothing. Sucrase itself is small (~200 KB raw / ~40 KB brotli), but the
 * split is still worth it: nothing on a non-demo page should pay for it.
 *
 * `runCode` awaits `ensureCompilerLoaded()` before touching the pipeline; the
 * sync transform steps then read the singleton through `getTransform`. A
 * failed load clears the memo so the next edit retries, and throws
 * `COMPILER_LOAD_FAILED` — caught by `CodeRunner` into the preview overlay
 * instead of the old silent blank.
 */

let transform: typeof SucraseTransform | undefined;
let loading: Promise<void> | undefined;

export function ensureCompilerLoaded(): Promise<void> {
	loading ??= load();
	return loading;
}

async function load(): Promise<void> {
	try {
		({ transform } = await import("sucrase"));
	} catch (cause) {
		loading = undefined;
		throw new LiveDemoError("COMPILER_LOAD_FAILED", undefined, { cause });
	}
}

export function getTransform(): typeof SucraseTransform {
	if (!transform) throw new LiveDemoError("COMPILER_LOAD_FAILED");
	return transform;
}
