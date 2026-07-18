import path from "node:path";

import { describe, expect, it, vi } from "vitest";
import { visitFilePaths } from "~node/visitFilePaths";
import type { DemoDataByPath, UniqueImports } from "~shared/types";

const FIXTURES_DIR = path.join(__dirname, "../fixtures");

const mdxPath = (name: string) => path.join(FIXTURES_DIR, "mdx", name);

describe("visitFilePaths", () => {
	it("populates demoDataByPath for a <code src> element, keyed by the raw import path", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("externalDemo.mdx")],
			uniqueImports,
			demoDataByPath,
		});

		const demo = demoDataByPath["../valid/SimpleComponent.tsx"];
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

		const appDemo = demoDataByPath["../valid/MultiFile/App.tsx"];
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

		expect(Object.keys(demoDataByPath).sort()).toEqual([
			"../valid/ComponentWithImports.tsx",
			"../valid/MultiFile/App.tsx",
		]);
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

	it("accumulates data across multiple MDX files into the same collections", () => {
		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		visitFilePaths({
			filePaths: [mdxPath("externalDemo.mdx"), mdxPath("multiFileDemo.mdx")],
			uniqueImports,
			demoDataByPath,
		});

		expect(Object.keys(demoDataByPath).sort()).toEqual([
			"../valid/ComponentWithImports.tsx",
			"../valid/MultiFile/App.tsx",
			"../valid/SimpleComponent.tsx",
		]);
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

	it("logs and rethrows when a demo file's own imports can't be resolved", () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const uniqueImports: UniqueImports = new Set();
		const demoDataByPath: DemoDataByPath = {};

		expect(() =>
			visitFilePaths({
				filePaths: [mdxPath("brokenImport.mdx")],
				uniqueImports,
				demoDataByPath,
			}),
		).toThrow("Couldn't resolve `./DoesNotExist`");

		expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

		consoleErrorSpy.mockRestore();
	});
});
