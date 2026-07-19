import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";
import { collectDemoFiles } from "~node/helpers/collectDemoFiles";
import type { PathWithAllowedExt } from "~shared/types";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

const collect = (fixture: string) =>
	collectDemoFiles({
		absolutePath: path.join(FIXTURES_DIR, fixture) as PathWithAllowedExt,
	});

const filePathsOf = (fixture: string) =>
	Object.keys(collect(fixture).files).sort();

describe("collectDemoFiles", () => {
	describe("reachability", () => {
		it("collects a lone entry file with no imports", () => {
			const { files, externalImports } = collect("valid/SimpleComponent.tsx");

			expect(Object.keys(files)).toEqual(["SimpleComponent.tsx"]);
			expect(files["SimpleComponent.tsx"]).toContain(
				"export function SimpleComponent",
			);
			expect(externalImports.size).toBe(0);
		});

		it("collects external packages instead of treating them as local files", () => {
			const { files, externalImports } = collect(
				"valid/ComponentWithImports.tsx",
			);

			expect(Object.keys(files)).toEqual(["ComponentWithImports.tsx"]);
			expect(externalImports.has("react")).toBe(true);
		});

		it("collects local imports alongside the entry", () => {
			const { files, externalImports } = collect("valid/MultiFile/App.tsx");

			expect(Object.keys(files).sort()).toEqual(["App.tsx", "Button.tsx"]);
			expect(externalImports.has("react")).toBe(true);
		});

		it("excludes a type-only import's file, even though it exists on disk", () => {
			// `./SimpleComponentTypes` is a real file (tsc needs it to
			// typecheck the fixture) but is only ever imported with
			// `import type`, so it must never show up in `files` — proving
			// the specifier is dropped before resolution, not merely absent.
			const { files, externalImports } = collect(
				"valid/WithTypeOnlyImports.tsx",
			);

			expect(Object.keys(files).sort()).toEqual([
				"SimpleComponent.tsx",
				"WithTypeOnlyImports.tsx",
			]);
			expect(externalImports.has("react")).toBe(true);
		});

		it("follows re-exports (`export { x } from`, `export * from`)", () => {
			expect(filePathsOf("valid/ReexportIndex.tsx")).toEqual([
				"Button.tsx",
				"ComponentWithImports.tsx",
				"ReexportIndex.tsx",
				"SimpleComponent.tsx",
			]);
		});

		it("reads a shared dependency once, not once per importer", () => {
			const { files } = collect("valid/Diamond/App.tsx");

			// A diamond (App → Left, Right; both → theme) is ordinary, not an error
			expect(Object.keys(files).sort()).toEqual([
				"App.tsx",
				"Left.tsx",
				"Right.tsx",
				"theme.ts",
			]);
			expect(files["theme.ts"]).toContain("rebeccapurple");
		});
	});

	describe("circular imports", () => {
		// Cycles are legal in ES modules and Rollup bundles them correctly, so
		// they're collected like anything else rather than rejected. The walk
		// must simply terminate.
		it("collects a cycle through the entry file itself (A → B → A)", () => {
			expect(filePathsOf("valid/CircularEntry/A.tsx")).toEqual([
				"A.tsx",
				"B.tsx",
			]);
		});

		it("reads the entry once even when the cycle points back at it", () => {
			// The entry is seeded into `visited` before the walk starts. Drop
			// that and the result is still correct — B's import of A just
			// re-enqueues it — so only the read count catches the regression.
			const readFileSync = vi.spyOn(fs, "readFileSync");

			try {
				collect("valid/CircularEntry/A.tsx");

				const entryReads = readFileSync.mock.calls.filter(([target]) =>
					String(target).endsWith("CircularEntry/A.tsx"),
				);

				expect(entryReads).toHaveLength(1);
			} finally {
				readFileSync.mockRestore();
			}
		});

		it("collects a cycle between two non-entry files", () => {
			expect(filePathsOf("valid/Circular/App.tsx")).toEqual([
				"App.tsx",
				"even.ts",
				"odd.ts",
			]);
		});
	});

	describe("file keys", () => {
		it("keys same-named files in different folders distinctly", () => {
			// Keyed by base name, `buttons/styles.ts` and `cards/styles.ts` would
			// collide and one would silently overwrite the other's contents.
			//
			// The exact keys are the build→runtime contract, so they're asserted
			// literally: relative to the entry's directory and posix-separated,
			// which on Windows is `path.relative`'s backslashes normalised.
			const { files } = collect("valid/SharedNames/App.tsx");

			expect(Object.keys(files).sort()).toEqual([
				"App.tsx",
				"buttons/styles.ts",
				"cards/styles.ts",
			]);
			expect(files["buttons/styles.ts"]).toContain("BUTTON_STYLES");
			expect(files["cards/styles.ts"]).toContain("CARD_STYLES");
		});
	});

	describe("import resolution", () => {
		it("resolves a directory import to its index file", () => {
			expect(filePathsOf("valid/IndexDir/App.tsx")).toEqual([
				"App.tsx",
				"Widget/index.tsx",
			]);
		});

		it("resolves through a directory whose name contains a dot", () => {
			// A dot in a parent directory must not be mistaken for the file's
			// own extension — otherwise any project living under a path like
			// `~/my.app/` fails to resolve at all.
			expect(filePathsOf("valid/DottedDir.tsx")).toEqual([
				"DottedDir.tsx",
				"dotted.dir/Nested.tsx",
			]);
		});

		it("throws a helpful error when an import can't be resolved", () => {
			expect(() => collect("invalid/MissingImport.tsx")).toThrow(
				/Couldn't resolve `\.\/DoesNotExist`/,
			);
		});

		it("throws, naming the file, when a demo file has a syntax error", () => {
			expect(() => collect("invalid/InvalidSyntax.tsx")).toThrow(
				/Failed to parse `InvalidSyntax\.tsx`/,
			);
		});
	});
});
