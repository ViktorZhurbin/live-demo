import { loadImports } from "_live_demo_virtual_modules";

/**
 * Start loading a demo's externals before anything needs them.
 *
 * The externals live behind `() => import(...)` thunks in the virtual module
 * (see `getVirtualModulesCode.ts`), so nothing fetches them until someone
 * asks. `runCode` asks — but only once Babel has loaded and the demo's files
 * have been walked and transpiled, which puts a demo's heaviest dependency at
 * the end of a serial chain. The build step already knows what a `<code src>`
 * demo imports, so `CodeRunner` calls this at mount and the two downloads
 * overlap.
 *
 * Rejections are swallowed on purpose: this is a head start, not the
 * resolution path. `runCode` awaits `loadImports` for real and surfaces a
 * failure there, naming the import the demo actually asked for — reporting it
 * from here would race that with a less specific message, and would fire even
 * for a package the user's edits have since removed. Left unhandled it would
 * also log a rejection on a page that goes on to work fine.
 *
 * Returns the settled promise so that guarantee is testable; callers are meant
 * to ignore it.
 */
export function prefetchImports(
	importNames: string[] | undefined,
): Promise<void> {
	if (!importNames?.length) return Promise.resolve();

	return loadImports(importNames).catch(() => {});
}
