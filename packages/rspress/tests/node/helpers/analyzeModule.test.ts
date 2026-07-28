import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";
import { analyzeModule } from "~node/helpers/analyzeModule";
import type { ModuleCache } from "~node/helpers/analyzeModule";
import type { PathWithAllowedExt } from "~shared/types";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

// A fresh cache per call: these tests exercise what gets extracted, not the
// cache itself (see the "module cache" describe block below).
const analyze = (fixture: string) =>
	analyzeModule({
		filePath: path.basename(fixture) as PathWithAllowedExt,
		absolutePath: path.join(FIXTURES_DIR, fixture) as PathWithAllowedExt,
		moduleCache: new Map(),
	});

describe("analyzeModule", () => {
	it("returns the file's source alongside its dependencies", () => {
		const { content, dependencies } = analyze("valid/SimpleComponent.tsx");

		expect(content).toContain("export function SimpleComponent");
		expect(dependencies).toEqual([]);
	});

	it("extracts external and local imports, in source order", () => {
		// collectDemoFiles walks these in order; a stable order keeps the
		// resulting `files` keys deterministic across builds.
		const { dependencies } = analyze("valid/MultiFile/App.tsx");

		expect(dependencies).toEqual(["react", "./Button"]);
	});

	it("extracts dependencies from every re-export form", () => {
		const { dependencies } = analyze("valid/ReexportIndex.tsx");

		// export { Button } from './Button'
		expect(dependencies).toContain("./Button");
		// export { default as SimpleComponent } from './SimpleComponent'
		expect(dependencies).toContain("./SimpleComponent");
		// export * from './ComponentWithImports'
		expect(dependencies).toContain("./ComponentWithImports");
	});

	it("skips type-only imports, keeping value imports from the same specifier", () => {
		const { dependencies } = analyze("valid/WithTypeOnlyImports.tsx");

		// `import type { ReactNode } from "react"` is dropped, but the
		// mixed `import { useState, type FC } from "react"` keeps "react"
		// because its importKind is "value".
		expect(dependencies).toContain("react");
		expect(dependencies).toContain("./SimpleComponent");
		// The fixture references `./SimpleComponentTypes` in all three
		// type-only forms — `import type`, `export type { } from`, and
		// `export type * from` — so the specifier only stays dropped if every
		// branch in `extractSourcePath` skips its kind, even though the file
		// itself exists on disk.
		expect(dependencies).not.toContain("./SimpleComponentTypes");
	});

	/**
	 * This cache is what lets `remarkPlugin` re-walk a demo's full graph on
	 * every MDX compile without doubling every disk read the build-time scan
	 * already did — and, since it's keyed by each file's own mtime rather than
	 * the entry's, what makes an edit to a file a demo merely *imports* show up
	 * without a dev-server restart (the bug this cache exists to fix).
	 */
	describe("module cache", () => {
		const withTempFile = (
			content: string,
			run: (absolutePath: PathWithAllowedExt) => void,
		) => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), "analyzeModule-"));
			const absolutePath = path.join(dir, "Module.tsx") as PathWithAllowedExt;
			fs.writeFileSync(absolutePath, content);

			try {
				run(absolutePath);
			} finally {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		};

		it("re-reads a file only once across repeated calls with an unchanged mtime", () => {
			withTempFile("export const v = 1;", (absolutePath) => {
				const moduleCache: ModuleCache = new Map();
				const readFileSync = vi.spyOn(fs, "readFileSync");

				try {
					analyzeModule({ filePath: "Module.tsx", absolutePath, moduleCache });
					analyzeModule({ filePath: "Module.tsx", absolutePath, moduleCache });

					expect(readFileSync).toHaveBeenCalledTimes(1);
				} finally {
					readFileSync.mockRestore();
				}
			});
		});

		it("re-reads a file once its mtime changes on disk, even with the same cache", () => {
			withTempFile("export const v = 1;", (absolutePath) => {
				const moduleCache: ModuleCache = new Map();

				const first = analyzeModule({
					filePath: "Module.tsx",
					absolutePath,
					moduleCache,
				});
				expect(first.content).toContain("v = 1");
				const cachedMtimeMs = moduleCache.get(absolutePath)?.mtimeMs;

				fs.writeFileSync(absolutePath, "export const v = 2;");
				// Force a strictly later mtime than what got cached above: some
				// filesystems have coarse enough mtime resolution that two
				// back-to-back writes can otherwise land on the same value,
				// which would make this assertion flaky rather than proving the
				// cache actually keys on mtime.
				const forced = new Date((cachedMtimeMs ?? 0) + 1000);
				fs.utimesSync(absolutePath, forced, forced);

				const second = analyzeModule({
					filePath: "Module.tsx",
					absolutePath,
					moduleCache,
				});
				expect(second.content).toContain("v = 2");
			});
		});
	});
});
