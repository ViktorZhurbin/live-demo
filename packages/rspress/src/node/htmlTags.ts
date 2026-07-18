// TODO: consider reading versions from `package.json` so CDN-pin drift shows up in `pnpm outdated`.

/**
 * HTML tags injected into the document head by Rspress plugin
 *
 * These scripts enable in-browser compilation of React code:
 * - Babel: Transpiles JSX and modern JS to browser-compatible code
 * - Rollup: Bundles modules and resolves imports in the browser
 *
 * Why CDN scripts?
 * - Babel and Rollup are large and only needed for interactive examples
 * - Loading from CDN keeps the main bundle small
 * - CDN versions are cached across sites
 *
 * Note: These only load on pages that use the LiveDemo component
 *
 * ## The versions below are the real runtime versions
 *
 * They are not tracked by `package.json` or `pnpm outdated -r`. The
 * `@babel/standalone` and `@rollup/browser` entries in `devDependencies`
 * exist only so the test suite exercises the *same* build the browser loads,
 * and must be **exact versions with no `^`/`~`, matching the URLs below
 * verbatim** — bump one, bump the other in the same commit.
 *
 * Drifting defeats the point: tests would pass against a Babel/Rollup the
 * browser never runs, and a newer major can break the compiler pipeline with
 * no build-time signal. `tests/node/htmlTags.test.ts` enforces this mechanically —
 * if it fails, fix the versions, not the test.
 */
export const htmlTags = [
	{
		tag: "script",
		head: true,
		attrs: {
			src: "https://cdn.jsdelivr.net/npm/@babel/standalone@8.0.4/babel.min.js",
		},
	},
	{
		tag: "script",
		head: true,
		attrs: {
			src: "https://cdn.jsdelivr.net/npm/@rollup/browser@4.62.2/dist/rollup.browser.min.js",
		},
	},
];
