import type { LiveDemoFiles } from "shared/types";
import { describe, expect, it } from "vitest";
import { pluginResolveModules } from "web/ui/preview/LiveDemoCodeRunner/compiler/rollup/pluginResolveModules";

type ResolveId = (source: string, importer?: string) => string | null;
type Load = (filePath: string) => string | undefined;

const resolverFor = (files: LiveDemoFiles) => {
	const plugin = pluginResolveModules(files);

	return {
		resolveId: plugin.resolveId as ResolveId,
		load: plugin.load as Load,
	};
};

describe("pluginResolveModules", () => {
	describe("resolveId", () => {
		it("resolves an exact file key", () => {
			const { resolveId } = resolverFor({ "App.tsx": "" });

			expect(resolveId("App.tsx")).toBe("App.tsx");
		});

		it("resolves a relative import with an explicit extension", () => {
			const { resolveId } = resolverFor({ "Button.tsx": "" });

			expect(resolveId("./Button.tsx")).toBe("Button.tsx");
		});

		it("resolves a relative import without an extension", () => {
			const { resolveId } = resolverFor({ "Button.tsx": "" });

			expect(resolveId("./Button")).toBe("Button.tsx");
		});

		it("resolves a directory import to its index file", () => {
			const { resolveId } = resolverFor({ "Widget/index.tsx": "" });

			expect(resolveId("./Widget")).toBe("Widget/index.tsx");
		});

		it("returns null for external modules", () => {
			const { resolveId } = resolverFor({ "App.tsx": "" });

			expect(resolveId("react")).toBeNull();
			expect(resolveId("react-dom")).toBeNull();
			expect(resolveId("lodash")).toBeNull();
		});

		it("returns null for files that aren't part of the demo", () => {
			const { resolveId } = resolverFor({ "App.tsx": "" });

			expect(resolveId("./DoesNotExist")).toBeNull();
			expect(resolveId("NonExistent.tsx")).toBeNull();
		});

		it("matches only own properties, never inherited ones", () => {
			const { resolveId } = resolverFor({ "App.tsx": "" });

			expect(resolveId("toString")).toBeNull();
			expect(resolveId("constructor")).toBeNull();
		});

		it("handles multiple files with different extensions", () => {
			const { resolveId } = resolverFor({
				"App.tsx": "",
				"utils.ts": "",
				"component.jsx": "",
			});

			expect(resolveId("./App")).toBe("App.tsx");
			expect(resolveId("./utils")).toBe("utils.ts");
			expect(resolveId("./component")).toBe("component.jsx");
		});
	});

	describe("resolution relative to the importing file", () => {
		// Files are keyed by path relative to the entry's directory, so a
		// sibling import inside a subfolder only resolves if the importer's
		// directory is taken into account.
		const nested: LiveDemoFiles = {
			"App.tsx": "",
			"components/Button.tsx": "",
			"components/styles.ts": "",
			"styles.ts": "",
		};

		it("resolves a sibling import against the importer's directory", () => {
			// `styles.ts` also exists at the root; resolving against the root
			// instead of the importer would silently pick that one up.
			const { resolveId } = resolverFor(nested);

			expect(resolveId("./styles", "components/Button.tsx")).toBe(
				"components/styles.ts",
			);
		});

		it("resolves a parent import from a nested importer", () => {
			const { resolveId } = resolverFor(nested);

			expect(resolveId("../styles", "components/Button.tsx")).toBe("styles.ts");
		});

		it("resolves a descending import from the entry", () => {
			const { resolveId } = resolverFor(nested);

			expect(resolveId("./components/Button", "App.tsx")).toBe(
				"components/Button.tsx",
			);
		});

		it("keeps same-named files in different folders distinct", () => {
			const { resolveId } = resolverFor({
				"App.tsx": "",
				"buttons/styles.ts": "",
				"cards/styles.ts": "",
			});

			expect(resolveId("./styles", "buttons/Button.tsx")).toBe(
				"buttons/styles.ts",
			);
			expect(resolveId("./styles", "cards/Card.tsx")).toBe("cards/styles.ts");
		});

		it("resolves against the root when there is no importer (entry)", () => {
			const { resolveId } = resolverFor(nested);

			expect(resolveId("./App")).toBe("App.tsx");
		});
	});

	describe("load", () => {
		it("loads file content by its resolved key", () => {
			const { load } = resolverFor({
				"App.tsx": "export default () => <div>Hello</div>",
				"components/Button.tsx": "export default () => <button>Click</button>",
			});

			expect(load("App.tsx")).toBe("export default () => <div>Hello</div>");
			expect(load("components/Button.tsx")).toBe(
				"export default () => <button>Click</button>",
			);
		});

		it("returns undefined for a key it doesn't have", () => {
			const { load } = resolverFor({ "App.tsx": "" });

			expect(load("DoesNotExist.tsx")).toBeUndefined();
		});
	});
});
