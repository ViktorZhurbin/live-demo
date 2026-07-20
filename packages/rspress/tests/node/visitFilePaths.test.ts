import path from "node:path";

import { describe, expect, it } from "vitest";
import { visitFilePaths } from "~node/visitFilePaths";
import type { DemoDataByPath, UniqueImports } from "~shared/types";

const FIXTURES_DIR = path.join(__dirname, "../fixtures");

const mdxPath = (name: string) => path.join(FIXTURES_DIR, "mdx", name);
const validPath = (name: string) => path.join(FIXTURES_DIR, "valid", name);

describe("visitFilePaths", () => {
	it("populates demoDataByPath for a <code src> element, keyed by the entry file's absolute path", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("externalDemo.mdx")],
			uniqueImports,
			demoDataByPath,
		});

		const demo = demoDataByPath[validPath("SimpleComponent.tsx")];
		expect(demo).toBeDefined();
		expect(demo.entryFileName).toBe("SimpleComponent.tsx");
		expect(demo.files["SimpleComponent.tsx"]).toContain("SimpleComponent");
	});

	it("resolves a <code src> with no file extension, as taught by getStarted.mdx", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("extensionlessSrc.mdx")],
			uniqueImports,
			demoDataByPath,
		});

		const demo = demoDataByPath[validPath("SimpleComponent.tsx")];
		expect(demo).toBeDefined();
		expect(demo.entryFileName).toBe("SimpleComponent.tsx");
		expect(demo.files["SimpleComponent.tsx"]).toContain("SimpleComponent");
	});

	it("includes every file from the demo's module graph, not just the entry", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByPath,
		});

		const appDemo = demoDataByPath[validPath("MultiFile/App.tsx")];
		expect(appDemo.entryFileName).toBe("App.tsx");
		expect(Object.keys(appDemo.files).sort()).toEqual([
			"App.tsx",
			"Button.tsx",
		]);
	});

	it("captures multiple <code src> elements from the same MDX file independently", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByPath,
		});

		expect(Object.keys(demoDataByPath).sort()).toEqual(
			[
				validPath("ComponentWithImports.tsx"),
				validPath("MultiFile/App.tsx"),
			].sort(),
		);
	});

	it("keys demos by absolute path so an identical <code src> string from different directories doesn't collide", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [
				mdxPath("collidingSrc/a/page.mdx"),
				mdxPath("collidingSrc/b/page.mdx"),
			],
			uniqueImports,
			demoDataByPath,
		});

		const demoA = demoDataByPath[mdxPath("collidingSrc/a/SimpleComponent.tsx")];
		const demoB = demoDataByPath[mdxPath("collidingSrc/b/SimpleComponent.tsx")];

		expect(demoA).toBeDefined();
		expect(demoB).toBeDefined();
		expect(demoA).not.toBe(demoB);
		expect(demoA.files["SimpleComponent.tsx"]).toContain(">A<");
		expect(demoB.files["SimpleComponent.tsx"]).toContain(">B<");
	});

	it("collects external imports from across the demo's module graph", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByPath,
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
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByPath,
		});

		const appDemo = demoDataByPath[validPath("MultiFile/App.tsx")];

		expect(appDemo.externalImports).toEqual(["react"]);
		// `./Button` ships in `files`; only bare specifiers are externals.
		expect(appDemo.externalImports).not.toContain("./Button");
	});

	it("keeps one demo's externals out of another's", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("externalDemo.mdx"), mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByPath,
		});

		const simple = demoDataByPath[validPath("SimpleComponent.tsx")];

		// SimpleComponent imports nothing external, so it must stay empty even
		// though other demos in the same scan contributed to `uniqueImports`.
		expect(simple.externalImports).toEqual([]);
		expect(uniqueImports.has("react")).toBe(true);
	});

	it("accumulates data across multiple MDX files into the same collections", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("externalDemo.mdx"), mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByPath,
		});

		expect(Object.keys(demoDataByPath).sort()).toEqual(
			[
				validPath("ComponentWithImports.tsx"),
				validPath("MultiFile/App.tsx"),
				validPath("SimpleComponent.tsx"),
			].sort(),
		);
	});

	it("skips non-MDX file paths without touching demoDataByPath", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx")],
			uniqueImports,
			demoDataByPath,
		});

		expect(demoDataByPath).toEqual({});
		expect(uniqueImports.size).toBe(0);
	});

	it("throws when a demo file's own imports can't be resolved, naming the importer and the MDX page", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		// The failing import lives in MissingImport.tsx, not the MDX page —
		// the error must name both, or a site with many demos is a hunt.
		expect(() =>
			visitFilePaths({
				filePaths: [mdxPath("brokenImport.mdx")],
				uniqueImports,
				demoDataByPath,
			}),
		).toThrow(
			/Couldn't resolve `\.\/DoesNotExist` from `.*MissingImport\.tsx`\.[\s\S]*brokenImport\.mdx/,
		);
	});
});
