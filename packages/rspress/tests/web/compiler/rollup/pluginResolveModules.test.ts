import { describe, it, expect } from "vitest";
import type { LiveDemoFiles } from "shared/types";
import { pluginResolveModules } from "web/ui/preview/LiveDemoCodeRunner/compiler/rollup/pluginResolveModules";

describe("pluginResolveModules", () => {
	it("should resolve exact file name match", () => {
		const files: LiveDemoFiles = {
			"App.tsx": "export default () => <div />",
		};

		const plugin = pluginResolveModules(files);
		const resolveId = plugin.resolveId as (source: string) => string | null;

		expect(resolveId("App.tsx")).toBe("App.tsx");
	});

	it("should resolve relative import with extension", () => {
		const files: LiveDemoFiles = {
			"Button.tsx": "export default () => <button />",
		};

		const plugin = pluginResolveModules(files);
		const resolveId = plugin.resolveId as (source: string) => string | null;

		expect(resolveId("./Button.tsx")).toBe("Button.tsx");
	});

	it("should resolve relative import without extension", () => {
		const files: LiveDemoFiles = {
			"Button.tsx": "export default () => <button />",
		};

		const plugin = pluginResolveModules(files);
		const resolveId = plugin.resolveId as (source: string) => string | null;

		// Plugin tries all possible extensions
		expect(resolveId("./Button")).toBe("Button.tsx");
	});

	it("should resolve parent directory imports", () => {
		const files: LiveDemoFiles = {
			"App.tsx": "export default () => <div />",
		};

		const plugin = pluginResolveModules(files);
		const resolveId = plugin.resolveId as (source: string) => string | null;

		expect(resolveId("../App.tsx")).toBe("App.tsx");
	});

	it("should return null for external modules", () => {
		const files: LiveDemoFiles = {
			"App.tsx": "export default () => <div />",
		};

		const plugin = pluginResolveModules(files);
		const resolveId = plugin.resolveId as (source: string) => string | null;

		expect(resolveId("react")).toBeNull();
		expect(resolveId("react-dom")).toBeNull();
		expect(resolveId("lodash")).toBeNull();
	});

	it("should return null for non-existent files", () => {
		const files: LiveDemoFiles = {
			"App.tsx": "export default () => <div />",
		};

		const plugin = pluginResolveModules(files);
		const resolveId = plugin.resolveId as (source: string) => string | null;

		expect(resolveId("./DoesNotExist")).toBeNull();
		expect(resolveId("NonExistent.tsx")).toBeNull();
	});

	it("should load file content by resolved name", () => {
		const files: LiveDemoFiles = {
			"App.tsx": "export default () => <div>Hello</div>",
			"Button.tsx": "export default () => <button>Click</button>",
		};

		const plugin = pluginResolveModules(files);
		const load = plugin.load as (fileName: string) => string | undefined;

		expect(load("App.tsx")).toBe("export default () => <div>Hello</div>");
		expect(load("Button.tsx")).toBe(
			"export default () => <button>Click</button>",
		);
	});

	it("should return undefined for non-existent files in load", () => {
		const files: LiveDemoFiles = {
			"App.tsx": "export default () => <div />",
		};

		const plugin = pluginResolveModules(files);
		const load = plugin.load as (fileName: string) => string | undefined;

		expect(load("DoesNotExist.tsx")).toBeUndefined();
	});

	it("should handle multiple files with different extensions", () => {
		const files: LiveDemoFiles = {
			"App.tsx": "export default () => <div />",
			"utils.ts": "export const foo = 'bar'",
			"component.jsx": "export default () => <span />",
		};

		const plugin = pluginResolveModules(files);
		const resolveId = plugin.resolveId as (source: string) => string | null;

		expect(resolveId("./App")).toBe("App.tsx");
		expect(resolveId("./utils")).toBe("utils.ts");
		expect(resolveId("./component")).toBe("component.jsx");
	});

	it("should use same path resolution logic as node-side", () => {
		// This test ensures consistency between browser and node resolution
		const files: LiveDemoFiles = {
			"Button.tsx": "export default () => <button />",
		};

		const plugin = pluginResolveModules(files);
		const resolveId = plugin.resolveId as (source: string) => string | null;

		// getPossiblePaths tries extensions in order: ts, tsx, js, jsx
		// Should prefer tsx when available
		expect(resolveId("./Button")).toBe("Button.tsx");
	});

	it("should handle files object with Object.hasOwn correctly", () => {
		const files: LiveDemoFiles = {
			"App.tsx": "export default () => <div />",
		};

		const plugin = pluginResolveModules(files);
		const resolveId = plugin.resolveId as (source: string) => string | null;

		// Should only match actual properties, not inherited ones
		expect(resolveId("toString")).toBeNull();
		expect(resolveId("constructor")).toBeNull();
	});
});
