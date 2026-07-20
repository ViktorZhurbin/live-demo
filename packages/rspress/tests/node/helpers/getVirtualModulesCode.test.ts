import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";
import { getVirtualModulesCode } from "~node/helpers/getVirtualModulesCode";

describe("getVirtualModulesCode", () => {
	it("should generate virtual module code with single import", () => {
		const imports = new Set(["react"]);
		const result = getVirtualModulesCode(imports);

		expect(result).toContain("importsMap.set('react', () => import('react'))");
		expect(result).toContain("function getImport(importName, getDefault)");
		expect(result).toContain("export default getImport");
	});

	it("should generate virtual module code with multiple imports", () => {
		const imports = new Set(["react", "react-dom", "lodash"]);
		const result = getVirtualModulesCode(imports);

		expect(result).toContain("importsMap.set('react', () => import('react'))");
		expect(result).toContain(
			"importsMap.set('react-dom', () => import('react-dom'))",
		);
		expect(result).toContain(
			"importsMap.set('lodash', () => import('lodash'))",
		);
	});

	it("should handle empty imports set", () => {
		const imports = new Set<string>([]);
		const result = getVirtualModulesCode(imports);

		// Should still include the getImport function
		expect(result).toContain("function getImport(importName, getDefault)");
		expect(result).toContain("export default getImport");

		// Should not register anything
		expect(result).not.toContain("importsMap.set(");
	});

	it("should handle imports with special characters in names", () => {
		const imports = new Set(["@testing-library/react", "@babel/core"]);
		const result = getVirtualModulesCode(imports);

		expect(result).toContain(
			"importsMap.set('@testing-library/react', () => import('@testing-library/react'))",
		);
		expect(result).toContain(
			"importsMap.set('@babel/core', () => import('@babel/core'))",
		);
	});

	it("should handle imports with slashes", () => {
		const imports = new Set(["rspress/theme"]);
		const result = getVirtualModulesCode(imports);

		expect(result).toContain(
			"importsMap.set('rspress/theme', () => import('rspress/theme'))",
		);
	});

	// The whole point of the thunks: a static `import * as` here made the
	// consuming bundler pull every external on the site into the demo-runtime
	// chunk, so a demo importing nothing paid for another page's three.js.
	it("should never emit a static import for an external", () => {
		const imports = new Set(["react", "three"]);
		const result = getVirtualModulesCode(imports);

		expect(result).not.toContain("import * as");
		expect(result).not.toMatch(/^import\s/m);
	});

	it("should expose loadImports for resolving thunks up front", () => {
		const imports = new Set(["react"]);
		const result = getVirtualModulesCode(imports);

		expect(result).toContain("export async function loadImports(importNames)");
		// getImport must read the resolved map, not the thunk map — returning a
		// thunk to a demo would hand it a function where a module is expected.
		expect(result).toContain("const result = resolvedMap.get(importName)");
	});

	it("should generate code that includes error handling", () => {
		const imports = new Set(["react"]);
		const result = getVirtualModulesCode(imports);

		expect(result).toContain("if (!result)");
		expect(result).toContain("throw new Error");
		expect(result).toContain("Can't resolve");
	});

	it("should include default export handling logic", () => {
		const imports = new Set(["react"]);
		const result = getVirtualModulesCode(imports);

		expect(result).toContain('if (getDefault && typeof result === "object")');
		expect(result).toContain("return result.default || result");
	});

	/**
	 * Everything above asserts on the generated *text*. This block runs it.
	 *
	 * The module is assembled by string concatenation and never type-checked or
	 * parsed by the build, so a syntax error in it would pass every assertion
	 * above and only surface as a broken demo in the browser. Node's own
	 * builtins stand in for demo externals — they're real modules with a real
	 * default/namespace split, so `getImport`'s behaviour is exercised for
	 * real rather than against a hand-written stub.
	 */
	describe("executing the generated module", () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "live-demo-vm-"));

		afterAll(() => {
			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		let moduleCount = 0;

		const evaluateModule = async (imports: Set<string>) => {
			// A fresh filename per call: Node caches ES modules by URL, so reusing
			// one would hand back the previous test's already-resolved maps.
			const filePath = path.join(tempDir, `vm-${moduleCount++}.mjs`);
			fs.writeFileSync(filePath, getVirtualModulesCode(imports));

			return (await import(filePath)) as {
				default: (name: string, getDefault?: boolean) => unknown;
				loadImports: (names: readonly string[]) => Promise<void>;
			};
		};

		it("is valid JS that resolves an import after loadImports", async () => {
			const { default: getImport, loadImports } = await evaluateModule(
				new Set(["node:path"]),
			);

			await loadImports(["node:path"]);

			expect(getImport("node:path")).toHaveProperty("join");
		});

		it("throws for an import that isn't in the map", async () => {
			const { default: getImport, loadImports } = await evaluateModule(
				new Set(["node:path"]),
			);

			await loadImports(["node:os"]);

			expect(() => getImport("node:os")).toThrow(/Can't resolve/);
		});

		it("throws for a known import that was never loaded", async () => {
			const { default: getImport } = await evaluateModule(
				new Set(["node:path"]),
			);

			// Registered in importsMap, but loadImports was never called, so the
			// thunk is unresolved — this is what a missed preload looks like.
			expect(() => getImport("node:path")).toThrow(/Can't resolve/);
		});

		it("unwraps the default export when asked", async () => {
			const { default: getImport, loadImports } = await evaluateModule(
				new Set(["node:path"]),
			);

			await loadImports(["node:path"]);

			const asDefault = getImport("node:path", true) as { join?: unknown };

			expect(asDefault.join).toBeTypeOf("function");
		});

		it("loads each import once across repeated calls", async () => {
			const { default: getImport, loadImports } = await evaluateModule(
				new Set(["node:path", "node:os"]),
			);

			await loadImports(["node:path"]);
			await loadImports(["node:path", "node:os"]);

			expect(getImport("node:path")).toHaveProperty("join");
			expect(getImport("node:os")).toHaveProperty("platform");
		});
	});
});
