import path from "node:path";

import { readAndParseFile } from "node/helpers/readAndParseFile";
import type { PathWithAllowedExt } from "shared/types";
import { describe, expect, it } from "vitest";

/**
 * This module does three things of its own: reads the file, parses it as an ES
 * module, and converts OXC's non-throwing error reporting into a thrown error.
 * Tests here cover those. Asserting the *shape* of the AST would only be
 * testing oxc-parser; what we do with the AST is `analyzeModule`'s test.
 */

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

const read = (fixture: string, filePath?: string) =>
	readAndParseFile({
		filePath: filePath ?? path.basename(fixture),
		absolutePath: path.join(FIXTURES_DIR, fixture) as PathWithAllowedExt,
	});

describe("readAndParseFile", () => {
	it("returns the file's source verbatim", () => {
		const { code } = read("valid/SimpleComponent.tsx");

		expect(code).toContain("export function SimpleComponent");
		expect(code).toContain("Hello World");
	});

	it("parses as an ES module, so top-level import/export is legal syntax", () => {
		// Parsed with `sourceType: "module"`. Under the "script" default the
		// import below is a syntax error, which would throw here.
		const { ast } = read("valid/ComponentWithImports.tsx");

		expect(ast.sourceType).toBe("module");
		expect(ast.body.some((node) => node.type === "ImportDeclaration")).toBe(
			true,
		);
	});

	it("throws on invalid syntax instead of returning a partial AST", () => {
		// OXC reports syntax errors on `parsed.errors` rather than throwing, so
		// without the explicit check a broken file yields a partial AST and
		// silently drops the imports it couldn't parse.
		expect(() => read("invalid/InvalidSyntax.tsx")).toThrow(
			/Failed to parse `InvalidSyntax\.tsx`/,
		);
	});

	it("names the file by filePath, not its path on disk, when reporting errors", () => {
		// filePath is the demo-relative key; it's what a user sees in an error,
		// so it must be used verbatim rather than re-derived from absolutePath.
		expect(() =>
			read("invalid/InvalidSyntax.tsx", "nested/Renamed.tsx"),
		).toThrow(/Failed to parse `nested\/Renamed\.tsx`/);
	});
});
