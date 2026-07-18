import { describe, expect, it } from "vitest";
import {
	getDirName,
	getFileExt,
	getPossiblePaths,
	isRelativeImport,
	resolveRelativePath,
} from "~shared/pathHelpers";

describe("pathHelpers", () => {
	describe("isRelativeImport", () => {
		it("should return true for ./ imports", () => {
			expect(isRelativeImport("./Button")).toBe(true);
			expect(isRelativeImport("./components/Button")).toBe(true);
			expect(isRelativeImport("./Button.tsx")).toBe(true);
		});

		it("should return true for ../ imports", () => {
			expect(isRelativeImport("../Button")).toBe(true);
			expect(isRelativeImport("../../components/Button")).toBe(true);
			expect(isRelativeImport("../Button.tsx")).toBe(true);
		});

		it("should return false for absolute imports", () => {
			expect(isRelativeImport("react")).toBe(false);
			expect(isRelativeImport("@/components/Button")).toBe(false);
			expect(isRelativeImport("lodash")).toBe(false);
		});

		it("should return false for paths without ./ or ../", () => {
			expect(isRelativeImport("Button")).toBe(false);
			expect(isRelativeImport("components/Button")).toBe(false);
		});
	});

	describe("getDirName", () => {
		it("returns the directory portion of a nested path", () => {
			expect(getDirName("components/Button.tsx")).toBe("components");
			expect(getDirName("a/b/c.ts")).toBe("a/b");
		});

		it("returns an empty string for a bare file name", () => {
			expect(getDirName("Button.tsx")).toBe("");
		});
	});

	describe("resolveRelativePath", () => {
		it("resolves an import against the importing file's directory", () => {
			expect(resolveRelativePath("components", "./Button")).toBe(
				"components/Button",
			);
			expect(resolveRelativePath("a/b", "./c")).toBe("a/b/c");
		});

		it("walks up for ../ imports", () => {
			expect(resolveRelativePath("a/b", "../c")).toBe("a/c");
			expect(resolveRelativePath("a/b/c", "../../d")).toBe("a/d");
		});

		it("resolves against the root when the importer is top-level", () => {
			expect(resolveRelativePath("", "./Button")).toBe("Button");
			expect(resolveRelativePath(".", "./Button")).toBe("Button");
		});

		it("keeps leading ../ when the import climbs above the base", () => {
			// The entry's own directory is the base, but a demo may legitimately
			// import a file that lives above it; that file's key keeps the `../`.
			expect(resolveRelativePath("", "../shared/theme")).toBe(
				"../shared/theme",
			);
			expect(resolveRelativePath("a", "../../b")).toBe("../b");
		});

		it("leaves inner dots in path segments alone", () => {
			expect(resolveRelativePath("", "./dotted.dir/Nested")).toBe(
				"dotted.dir/Nested",
			);
		});
	});

	describe("getFileExt", () => {
		it("should extract extension from filename", () => {
			expect(getFileExt("Button.tsx")).toBe("tsx");
			expect(getFileExt("Button.jsx")).toBe("jsx");
			expect(getFileExt("Button.ts")).toBe("ts");
			expect(getFileExt("Button.js")).toBe("js");
		});

		it("should handle files without extension", () => {
			expect(getFileExt("Button")).toBeUndefined();
		});

		it("takes the last dot, so multi-dot names keep their real extension", () => {
			expect(getFileExt("Button.test.tsx")).toBe("tsx");
			expect(getFileExt("styles.module.ts")).toBe("ts");
		});

		it("ignores dots in parent directories", () => {
			// Reading the extension off the whole path would yield "app/Button"
			// here and make the file unresolvable.
			expect(getFileExt("/Users/me/my.app/Button.tsx")).toBe("tsx");
			expect(getFileExt("/Users/me/my.app/Button")).toBeUndefined();
			expect(getFileExt("dotted.dir/Nested.tsx")).toBe("tsx");
		});

		it("treats a dotfile as a name, not an extension", () => {
			expect(getFileExt(".gitignore")).toBeUndefined();
		});

		it("should handle paths with directories", () => {
			expect(getFileExt("components/Button.tsx")).toBe("tsx");
		});
	});

	describe("getPossiblePaths", () => {
		it("should return single path when extension is provided and valid", () => {
			expect(getPossiblePaths("Button.tsx")).toEqual(["Button.tsx"]);
			expect(getPossiblePaths("Button.jsx")).toEqual(["Button.jsx"]);
			expect(getPossiblePaths("Button.ts")).toEqual(["Button.ts"]);
			expect(getPossiblePaths("Button.js")).toEqual(["Button.js"]);
		});

		it("expands an extensionless import to file and index candidates", () => {
			const result = getPossiblePaths("Button");

			expect(result).toEqual([
				"Button.tsx",
				"Button.ts",
				"Button.jsx",
				"Button.js",
				"Button/index.tsx",
				"Button/index.ts",
				"Button/index.jsx",
				"Button/index.js",
			]);
		});

		it("prefers a direct file over a directory index", () => {
			const result = getPossiblePaths("Button");

			expect(result.indexOf("Button.tsx")).toBeLessThan(
				result.indexOf("Button/index.tsx"),
			);
		});

		it("prefers tsx, then ts, then jsx, then js", () => {
			// Components are the common case in a demo, so the JSX-capable
			// extension of each language wins; TypeScript beats JavaScript.
			const result = getPossiblePaths("Button");
			const rank = (ext: string) =>
				result.findIndex((candidate) => candidate === `Button.${ext}`);

			expect(rank("tsx")).toBeLessThan(rank("ts"));
			expect(rank("ts")).toBeLessThan(rank("jsx"));
			expect(rank("jsx")).toBeLessThan(rank("js"));
		});

		it("should work with paths containing directories", () => {
			const result = getPossiblePaths("components/Button");

			expect(result).toContain("components/Button.tsx");
			expect(result).toContain("components/Button/index.tsx");
		});

		it("expands paths whose parent directory contains a dot", () => {
			const result = getPossiblePaths("my.app/Button");

			expect(result).toContain("my.app/Button.tsx");
		});

		it("should throw error for unsupported extensions", () => {
			expect(() => getPossiblePaths("Button.py")).toThrow(
				"Couldn't resolve `Button.py`",
			);
			expect(() => getPossiblePaths("Button.py")).toThrow(
				"Only .js(x) and .ts(x) files are supported",
			);
		});

		it("rejects an inherited Object property posing as an extension", () => {
			// `fileExt in LiveDemoLanguage` would accept "constructor" here and
			// treat `Button.constructor` as a resolvable source file.
			expect(() => getPossiblePaths("Button.constructor")).toThrow(
				"Couldn't resolve",
			);
			expect(() => getPossiblePaths("Button.toString")).toThrow(
				"Couldn't resolve",
			);
		});

		it("should handle absolute paths without extension", () => {
			const result = getPossiblePaths("/absolute/path/Button");

			expect(result).toContain("/absolute/path/Button.tsx");
		});

		it("should handle absolute paths with extension", () => {
			expect(getPossiblePaths("/absolute/path/Button.tsx")).toEqual([
				"/absolute/path/Button.tsx",
			]);
		});
	});
});
