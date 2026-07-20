import path from "node:path";

import { describe, expect, it } from "vitest";
import { demoRefKey } from "~node/helpers/demoRefKey";
import { visitFilePaths } from "~node/visitFilePaths";
import type { DemoDataByRef, UniqueImports } from "~shared/types";

const FIXTURES_DIR = path.join(__dirname, "../fixtures");

const mdxPath = (name: string) => path.join(FIXTURES_DIR, "mdx", name);

// Demos are keyed by the raw `<code src>` reference: the MDX file plus the
// verbatim src string. Tests look them up the same way the remark plugin
// does (see `demoRefKey`), not by the resolved file path.
const refKey = (mdxName: string, src: string) =>
	demoRefKey(mdxPath(mdxName), src);

describe("visitFilePaths", () => {
	it("populates demoDataByRef for a <code src> element, keyed by its raw reference", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [mdxPath("externalDemo.mdx")],
			uniqueImports,
			demoDataByRef,
		});

		const demo =
			demoDataByRef[refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx")];
		expect(demo).toBeDefined();
		expect(demo.entryFileName).toBe("SimpleComponent.tsx");
		expect(demo.files["SimpleComponent.tsx"]).toContain("SimpleComponent");
	});

	it("resolves a <code src> with no file extension, as taught by getStarted.mdx", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [mdxPath("extensionlessSrc.mdx")],
			uniqueImports,
			demoDataByRef,
		});

		const demo =
			demoDataByRef[refKey("extensionlessSrc.mdx", "../valid/SimpleComponent")];
		expect(demo).toBeDefined();
		expect(demo.entryFileName).toBe("SimpleComponent.tsx");
		expect(demo.files["SimpleComponent.tsx"]).toContain("SimpleComponent");
	});

	it("includes every file from the demo's module graph, not just the entry", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByRef,
		});

		const appDemo =
			demoDataByRef[refKey("multiFileDemo.mdx", "../valid/MultiFile/App.tsx")];
		expect(appDemo.entryFileName).toBe("App.tsx");
		expect(Object.keys(appDemo.files).sort()).toEqual([
			"App.tsx",
			"Button.tsx",
		]);
	});

	it("captures multiple <code src> elements from the same MDX file independently", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByRef,
		});

		expect(Object.keys(demoDataByRef).sort()).toEqual(
			[
				refKey("multiFileDemo.mdx", "../valid/MultiFile/App.tsx"),
				refKey("multiFileDemo.mdx", "../valid/ComponentWithImports.tsx"),
			].sort(),
		);
	});

	it("keys demos by their raw reference so an identical <code src> string from different pages doesn't collide", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [
				mdxPath("collidingSrc/a/page.mdx"),
				mdxPath("collidingSrc/b/page.mdx"),
			],
			uniqueImports,
			demoDataByRef,
		});

		// Same src string, different MDX page; the page path in the key keeps
		// them apart.
		const demoA =
			demoDataByRef[refKey("collidingSrc/a/page.mdx", "./SimpleComponent.tsx")];
		const demoB =
			demoDataByRef[refKey("collidingSrc/b/page.mdx", "./SimpleComponent.tsx")];

		expect(demoA).toBeDefined();
		expect(demoB).toBeDefined();
		expect(demoA).not.toBe(demoB);
		expect(demoA.files["SimpleComponent.tsx"]).toContain(">A<");
		expect(demoB.files["SimpleComponent.tsx"]).toContain(">B<");
	});

	it("collects external imports from across the demo's module graph", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByRef,
		});

		expect(uniqueImports.has("react")).toBe(true);
	});

	/**
	 * The sitewide set says what the virtual module can resolve; the per-demo
	 * list says what *this* demo should start downloading at mount. Folding one
	 * into the other loses that, which is how a counter demo ended up waiting
	 * on another page's three.js.
	 */
	it("records each demo's own externals alongside the sitewide set", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByRef,
		});

		const appDemo =
			demoDataByRef[refKey("multiFileDemo.mdx", "../valid/MultiFile/App.tsx")];

		expect(appDemo.externalImports).toEqual(["react"]);
		// `./Button` ships in `files`; only bare specifiers are externals.
		expect(appDemo.externalImports).not.toContain("./Button");
	});

	it("keeps one demo's externals out of another's", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [mdxPath("externalDemo.mdx"), mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByRef,
		});

		const simple =
			demoDataByRef[refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx")];

		// SimpleComponent imports nothing external, so it must stay empty even
		// though other demos in the same scan contributed to `uniqueImports`.
		expect(simple.externalImports).toEqual([]);
		expect(uniqueImports.has("react")).toBe(true);
	});

	it("accumulates data across multiple MDX files into the same collections", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [mdxPath("externalDemo.mdx"), mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByRef,
		});

		expect(Object.keys(demoDataByRef).sort()).toEqual(
			[
				refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx"),
				refKey("multiFileDemo.mdx", "../valid/MultiFile/App.tsx"),
				refKey("multiFileDemo.mdx", "../valid/ComponentWithImports.tsx"),
			].sort(),
		);
	});

	it("skips non-MDX file paths without touching demoDataByRef", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		visitFilePaths({
			filePaths: [path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx")],
			uniqueImports,
			demoDataByRef,
		});

		expect(demoDataByRef).toEqual({});
		expect(uniqueImports.size).toBe(0);
	});

	it("throws when a demo file's own imports can't be resolved, naming the importer and the MDX page", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		// The failing import lives in MissingImport.tsx, not the MDX page.
		// The error must name both, or a site with many demos is a hunt.
		expect(() =>
			visitFilePaths({
				filePaths: [mdxPath("brokenImport.mdx")],
				uniqueImports,
				demoDataByRef,
			}),
		).toThrow(
			/Couldn't resolve `\.\/DoesNotExist` from `.*MissingImport\.tsx`\.[\s\S]*brokenImport\.mdx/,
		);
	});

	it("throws, naming the MDX page, when a <code src> itself points at a missing file", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByRef: DemoDataByRef = {};

		// The scan is the phase that resolves `<code src>` against disk, so a
		// genuinely missing src is a build error caught here. remarkPlugin no
		// longer re-resolves and would only warn (see its test).
		expect(() =>
			visitFilePaths({
				filePaths: [mdxPath("missingSrc.mdx")],
				uniqueImports,
				demoDataByRef,
			}),
		).toThrow(
			/Couldn't resolve `\.\/DoesNotExist\.tsx` from `.*missingSrc\.mdx`/,
		);
	});
});
