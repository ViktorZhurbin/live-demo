import path from "node:path";

import { describe, expect, it } from "vitest";
import { resolveFileInfo } from "~node/helpers/resolveFileInfo";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

describe("resolveFileInfo", () => {
	it("should resolve file with explicit extension", () => {
		const result = resolveFileInfo({
			dirname: path.join(FIXTURES_DIR, "valid"),
			importPath: "./SimpleComponent.tsx",
		});

		expect(result.fileName).toBe("SimpleComponent.tsx");
		expect(result.absolutePath).toContain("SimpleComponent.tsx");
		expect(result.absolutePath).toContain("fixtures/valid");
	});

	it("should resolve file without extension", () => {
		const result = resolveFileInfo({
			dirname: path.join(FIXTURES_DIR, "valid"),
			importPath: "./SimpleComponent",
		});

		expect(result.fileName).toBe("SimpleComponent.tsx");
		expect(result.absolutePath).toContain("SimpleComponent.tsx");
	});

	it("should resolve file in nested directory", () => {
		const result = resolveFileInfo({
			dirname: path.join(FIXTURES_DIR, "valid/MultiFile"),
			importPath: "./Button",
		});

		expect(result.fileName).toBe("Button.tsx");
		expect(result.absolutePath).toContain("MultiFile/Button.tsx");
	});

	it("should resolve file with relative parent path", () => {
		const result = resolveFileInfo({
			dirname: path.join(FIXTURES_DIR, "valid/MultiFile"),
			importPath: "../SimpleComponent",
		});

		expect(result.fileName).toBe("SimpleComponent.tsx");
		expect(result.absolutePath).toContain("fixtures/valid/SimpleComponent.tsx");
	});

	it("should throw error for non-existent file", () => {
		expect(() =>
			resolveFileInfo({
				dirname: path.join(FIXTURES_DIR, "valid"),
				importPath: "./DoesNotExist",
			}),
		).toThrow("[LiveDemo]: Couldn't resolve `./DoesNotExist`");

		expect(() =>
			resolveFileInfo({
				dirname: path.join(FIXTURES_DIR, "valid"),
				importPath: "./DoesNotExist",
			}),
		).toThrow("Only .js(x) and .ts(x) files are supported");
	});

	it("should throw error for file with unsupported extension", () => {
		// This would throw an error from getPossiblePaths before fs.existsSync
		expect(() =>
			resolveFileInfo({
				dirname: path.join(FIXTURES_DIR, "valid"),
				importPath: "./file.py",
			}),
		).toThrow("Couldn't resolve");
	});

	it("resolves a directory import to its index file", () => {
		const result = resolveFileInfo({
			dirname: path.join(FIXTURES_DIR, "valid/IndexDir"),
			importPath: "./Widget",
		});

		expect(result.fileName).toBe("index.tsx");
		expect(result.absolutePath).toContain("IndexDir/Widget/index.tsx");
	});

	it("resolves through a directory whose name contains a dot", () => {
		// The dot in `dotted.dir` must not be read as the file's extension
		const result = resolveFileInfo({
			dirname: path.join(FIXTURES_DIR, "valid"),
			importPath: "./dotted.dir/Nested",
		});

		expect(result.fileName).toBe("Nested.tsx");
		expect(result.absolutePath).toContain("dotted.dir/Nested.tsx");
	});

	it("resolves from a directory whose own path contains a dot", () => {
		const result = resolveFileInfo({
			dirname: path.join(FIXTURES_DIR, "valid/dotted.dir"),
			importPath: "../SimpleComponent",
		});

		expect(result.fileName).toBe("SimpleComponent.tsx");
	});

	it("resolves tsx before ts when both exist on disk", () => {
		// An extensionless import is genuinely ambiguous, so the precedence
		// (tsx, ts, jsx, js) is what decides it — pinned here against real
		// competing files rather than assumed.
		const dirname = path.join(FIXTURES_DIR, "valid/Precedence");
		const result = resolveFileInfo({ dirname, importPath: "./Ambiguous" });

		expect(result.fileName).toBe("Ambiguous.tsx");
	});

	it("resolves a file over a directory index of the same name", () => {
		const dirname = path.join(FIXTURES_DIR, "valid/Precedence");
		const result = resolveFileInfo({ dirname, importPath: "./Shadowed" });

		expect(result.absolutePath).toContain("Precedence/Shadowed.tsx");
	});
});
