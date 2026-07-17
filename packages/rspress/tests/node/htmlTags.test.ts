import { htmlTags } from "node/htmlTags";
import { describe, expect, it } from "vitest";
import pkg from "../../package.json";

/**
 * Babel and Rollup run in the browser from CDN <script> tags, pinned by URL in
 * htmlTags.ts. Those CDN versions — not package.json — are what actually runs
 * at runtime. The devDependencies exist only so the test suite exercises the
 * *same* build the browser loads; if the two drift, tests pass against a
 * Babel/Rollup the browser never runs (see CLAUDE.md / UPGRADE.md).
 *
 * This test mechanically enforces that invariant: bump a CDN URL and you must
 * bump the matching exact devDependency in the same commit, or this fails.
 */
const getCdnSrcs = () =>
	htmlTags
		.map((tag) => tag.attrs?.src)
		.filter((src): src is string => typeof src === "string");

const versionFromCdn = (pkgName: string) => {
	const src = getCdnSrcs().find((s) => s.includes(`/npm/${pkgName}@`));
	const match = src?.match(new RegExp(`/npm/${pkgName}@([^/]+)/`));
	return match?.[1];
};

describe("htmlTags CDN / devDependency version invariant", () => {
	it.each([["@babel/standalone"], ["@rollup/browser"]])(
		"%s CDN version matches its exact devDependency",
		(pkgName) => {
			const cdnVersion = versionFromCdn(pkgName);
			const devDepVersion = (pkg.devDependencies as Record<string, string>)[
				pkgName
			];

			expect(
				cdnVersion,
				`no CDN <script> for ${pkgName} in htmlTags`,
			).toBeDefined();
			expect(devDepVersion, `${pkgName} must be a devDependency`).toBeDefined();

			// Must be an exact pin — no "^" / "~" — so the installed version can
			// never float away from the CDN URL.
			expect(
				devDepVersion,
				`${pkgName} devDependency must be an exact version (no ^/~)`,
			).toBe(cdnVersion);
		},
	);
});
