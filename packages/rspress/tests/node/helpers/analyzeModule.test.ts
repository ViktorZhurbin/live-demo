import path from "node:path";

import { describe, expect, it } from "vitest";
import { analyzeModule } from "~node/helpers/analyzeModule";
import type { PathWithAllowedExt } from "~shared/types";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

const analyze = (fixture: string) =>
	analyzeModule({
		filePath: path.basename(fixture) as PathWithAllowedExt,
		absolutePath: path.join(FIXTURES_DIR, fixture) as PathWithAllowedExt,
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
});
