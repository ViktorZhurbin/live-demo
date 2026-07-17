import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as rollupBrowser from "@rollup/browser";
import type { LiveDemoFiles } from "shared/types";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { bundleCode } from "web/ui/preview/LiveDemoCodeRunner/compiler/bundleCode";
import { getFnFromString } from "web/ui/preview/LiveDemoCodeRunner/compiler/getFnFromString";

// Mock the virtual modules import - must be inline due to hoisting
vi.mock("_live_demo_virtual_modules", () => ({
	default: (moduleName: string) => {
		if (moduleName === "react") {
			return {
				useState: () => [null, () => {}],
				createElement: (tag: string, _props: unknown, ...children: unknown[]) =>
					`<${tag}>${children.join("")}</${tag}>`,
			};
		}
		throw new Error(`Can't resolve ${moduleName}`);
	},
}));

// rollup is loaded from CDN in production (see htmlTags.ts); @rollup/browser
// gives tests the same window.rollup shape without needing a real browser.
beforeAll(() => {
	window.rollup = rollupBrowser as typeof window.rollup;

	// @rollup/browser fetches its wasm binary at runtime. In a real browser
	// that's a same-origin request the CDN serves; here it resolves to a
	// file:// URL, which Node's fetch doesn't support, so read it off disk.
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (input, init) => {
		const url =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.href
					: input.url;

		if (url.startsWith("file://")) {
			const buffer = fs.readFileSync(fileURLToPath(url));
			return new Response(buffer);
		}

		return originalFetch(input, init);
	};
});

describe("bundleCode", () => {
	it("bundles a single file with no dependencies", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `export default function App() { return 'Hello'; }`,
		};

		const code = await bundleCode({ files, entryFileName: "App.tsx" });

		expect(code).toContain("exports.default");
	});

	it("inlines local file dependencies into a single bundle", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `
        import { Button } from "./Button";
        export default function App() { return Button; }
      `,
			"Button.tsx": `export function Button() { return 'click me'; }`,
		};

		const code = await bundleCode({ files, entryFileName: "App.tsx" });

		expect(code).toContain("click me");
		// Local import must be resolved away, not left as a require/import
		expect(code).not.toMatch(/require\(["']\.\/Button["']\)/);
	});

	it("rewrites external imports to __get_import calls", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `
        import { useState } from "react";
        export default function App() { return useState; }
      `,
		};

		const code = await bundleCode({ files, entryFileName: "App.tsx" });

		expect(code).toContain("__get_import('react', false)");
	});

	it("produces a bundle that getFnFromString can execute end-to-end", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `
        import { greet } from "./greet";
        export default function App() { return greet('World'); }
      `,
			"greet.tsx": `export function greet(name: string) { return 'Hello, ' + name; }`,
		};

		const code = await bundleCode({ files, entryFileName: "App.tsx" });
		const fn = getFnFromString(code);

		expect(fn({})).toBe("Hello, World");
	});

	it("transpiles TypeScript and JSX-only syntax as part of the bundle", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `
        interface Props { value: number }
        export default function App(props: Props) { return props.value * 2; }
      `,
		};

		const code = await bundleCode({ files, entryFileName: "App.tsx" });
		const fn = getFnFromString(code);

		expect(fn({ value: 21 })).toBe(42);
	});

	it("transpiles JSX to React.createElement calls resolvable via the virtual module", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `export default function App() { return <div>Hello</div>; }`,
		};

		const code = await bundleCode({ files, entryFileName: "App.tsx" });
		const fn = getFnFromString(code);

		expect(fn({})).toBe("<div>Hello</div>");
	});
});
