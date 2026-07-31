import path from "node:path";

import { describe, expect, it } from "vitest";
import { visitFilePaths } from "~node/visitFilePaths";
import type { UniqueImports } from "~shared/types";

const FIXTURES_DIR = path.join(__dirname, "../fixtures");

const mdxPath = (name: string) => path.join(FIXTURES_DIR, "mdx", name);

// Not exercising the `/`-prefixed form here: `docRoot` only matters for that
// one prefix, and every fixture below except `docRootPrefixDemo.mdx` uses
// `./`/`../`/`<root>/`, which ignore it. See its own test further down.
const DOC_ROOT = path.join(FIXTURES_DIR, "unused-doc-root");

const scan = (...names: string[]): UniqueImports => {
	const uniqueImports: UniqueImports = new Set();

	visitFilePaths({
		filePaths: names.map((name) => mdxPath(name)),
		uniqueImports,
		docRoot: DOC_ROOT,
		moduleCache: new Map(),
	});

	return uniqueImports;
};

describe("visitFilePaths", () => {
	it("folds a `file=` demo's external imports into uniqueImports", () => {
		// This fixture's entry imports `clsx`, which isn't in the plugin's
		// `defaultModules` — the only way it reaches `uniqueImports` is a scan.
		const uniqueImports = scan("nonDefaultExternalDemo.mdx");

		expect(uniqueImports.has("clsx")).toBe(true);
	});

	it("resolves a `file=` reference using the `<root>/` prefix, against process.cwd()", () => {
		expect(() => scan("rootPrefixDemo.mdx")).not.toThrow();
	});

	it("resolves a `file=` reference using the `/` prefix, against the passed-in docRoot", () => {
		const uniqueImports: UniqueImports = new Set();

		expect(() =>
			visitFilePaths({
				filePaths: [mdxPath("docRootPrefixDemo.mdx")],
				uniqueImports,
				docRoot: FIXTURES_DIR,
				moduleCache: new Map(),
			}),
		).not.toThrow();
	});

	it("leaves a `file=` block alone when its meta is missing the bare `live` word", () => {
		const uniqueImports = scan("fileMetaWithoutLive.mdx");

		expect(uniqueImports.size).toBe(0);
	});

	it("throws a clear error for a `file=` reference with no extension", () => {
		// `resolveFileInfo` would happily guess `.tsx` here, but core's real
		// `remarkFileCodeBlock` reads `file=` literally and has no such
		// guessing — this must fail at scan time with our message, not later
		// with core's unrelated ENOENT.
		expect(() => scan("fileMetaNoExtension.mdx")).toThrow(
			/file="\.\.\/valid\/SimpleComponent"/,
		);
	});

	it("throws a clear error for a `file=` reference with an unsupported extension", () => {
		expect(() => scan("fileMetaWrongExtension.mdx")).toThrow(
			/file="\.\.\/valid\/SimpleComponent\.py"/,
		);
	});

	describe("deprecated <code src>", () => {
		it("resolves a <code src> element without throwing", () => {
			expect(() => scan("deprecatedSrcDemo.mdx")).not.toThrow();
		});

		it("resolves a <code src> with no file extension, unlike the `file=` syntax", () => {
			expect(() => scan("extensionlessSrc.mdx")).not.toThrow();
		});
	});

	it("collects external imports from across the demo's module graph", () => {
		const uniqueImports = scan("multiFileDemo.mdx");

		expect(uniqueImports.has("react")).toBe(true);
	});

	/**
	 * An inline block has no file to collect, but the packages it imports still
	 * have to reach the virtual module or they can't resolve at runtime.
	 */
	it("collects an inline block's own external imports", () => {
		const uniqueImports = scan("inlineDemoWithImports.mdx");

		expect(uniqueImports.has("luxon")).toBe(true);
		// Second fence on the same page, and a different language.
		expect(uniqueImports.has("clsx")).toBe(true);

		// Inline demos are single-file: nothing to resolve `./helper` against.
		expect(uniqueImports.has("./helper")).toBe(false);
		// Erased by the runtime compiler, so it never needs to resolve.
		expect(uniqueImports.has("type-only-package")).toBe(false);
	});

	it("ignores an inline block that doesn't parse instead of failing the build", () => {
		// A syntax error in a live-edited code fence must stay a runtime error
		// in the preview pane, not take the whole docs build down.
		expect(() => scan("inlineDemoBrokenSyntax.mdx")).not.toThrow();
	});

	/**
	 * `_`-prefixed files are excluded from core's route table but still
	 * compiled (and so still transformed into demos) when a page imports them.
	 * Since `routeGenerated` fires once per process, missing this leaves the
	 * partial's externals out of the virtual module permanently — no restart
	 * recovers it.
	 */
	it("follows a page's `.mdx` imports, so a demo in a partial is scanned too", () => {
		const uniqueImports = scan("partialHost.mdx");

		expect(uniqueImports.has("luxon")).toBe(true);
	});

	it("ignores an imported `.mdx` that isn't on disk, leaving that to the MDX compile", () => {
		expect(() => scan("partialHost.mdx")).not.toThrow();
	});

	it("accumulates externals from multiple MDX files into the same set", () => {
		const uniqueImports = scan("externalDemo.mdx", "multiFileDemo.mdx");

		expect(uniqueImports.has("react")).toBe(true);
	});

	it("skips non-MDX file paths", () => {
		const uniqueImports: UniqueImports = new Set();

		visitFilePaths({
			filePaths: [path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx")],
			uniqueImports,
			docRoot: DOC_ROOT,
			moduleCache: new Map(),
		});

		expect(uniqueImports.size).toBe(0);
	});

	it("throws when a demo file's own imports can't be resolved, naming the importer and the MDX page", () => {
		// The failing import lives in MissingImport.tsx, not the MDX page.
		// The error must name both, or a site with many demos is a hunt.
		expect(() => scan("brokenImport.mdx")).toThrow(
			/Couldn't resolve `\.\/DoesNotExist` from `.*MissingImport\.tsx`\.[\s\S]*brokenImport\.mdx/,
		);
	});

	it("throws, naming the MDX page, when a `file=` reference itself points at a missing file", () => {
		expect(() => scan("missingSrc.mdx")).toThrow(
			/Couldn't resolve `\.\/DoesNotExist\.tsx` from `.*missingSrc\.mdx`/,
		);
	});
});
