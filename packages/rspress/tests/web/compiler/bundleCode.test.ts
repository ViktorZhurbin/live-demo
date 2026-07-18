import fs from "node:fs";
import { fileURLToPath } from "node:url";

import * as rollupBrowser from "@rollup/browser";
import type { LiveDemoFiles } from "shared/types";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { bundleCode } from "web/ui/preview/LiveDemoCodeRunner/compiler/bundleCode";
import { getFnFromString } from "web/ui/preview/LiveDemoCodeRunner/compiler/getFnFromString";

// Mock the virtual modules import - must be inline due to hoisting.
// `react/jsx-runtime` is included because Babel's automatic JSX runtime emits
// an import for it; the plugin ships it in `defaultModules` for the same
// reason (see plugin.ts).
const renderToString = (tag: unknown, props: { children?: unknown }) => {
	const children = props?.children;
	const inner = Array.isArray(children) ? children.join("") : (children ?? "");

	return `<${String(tag)}>${inner}</${String(tag)}>`;
};

vi.mock("_live_demo_virtual_modules", () => ({
	default: (moduleName: string) => {
		if (moduleName === "react") {
			return { useState: () => [null, () => {}] };
		}
		if (moduleName === "react/jsx-runtime") {
			return {
				jsx: renderToString,
				jsxs: renderToString,
				Fragment: "fragment",
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

	it("transpiles JSX via react/jsx-runtime from the virtual module", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `export default function App() { return <div>Hello</div>; }`,
		};

		const code = await bundleCode({ files, entryFileName: "App.tsx" });

		expect(code).toContain("__get_import('react/jsx-runtime', false)");
		expect(getFnFromString(code)({})).toBe("<div>Hello</div>");
	});

	it("renders JSX in a demo that never imports React", async () => {
		// The headline case: inline demos are short snippets that don't import
		// React. Under the classic runtime this only worked because a `React`
		// binding was injected invisibly into every demo.
		const files: LiveDemoFiles = {
			"App.jsx": `export default function App() { return <span>No import needed</span>; }`,
		};

		const code = await bundleCode({ files, entryFileName: "App.jsx" });

		expect(code).not.toContain("__get_import('react', true)");
		expect(getFnFromString(code)({})).toBe("<span>No import needed</span>");
	});

	describe("TypeScript in every supported extension", () => {
		// Type annotations have to be stripped per file extension, and a
		// fixture that merely *ends* in .ts proves nothing unless it actually
		// contains TypeScript syntax — that's how the `.ts` case stayed broken
		// while the suite was green.
		it("strips annotations from a plain .ts module", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `
          import { add } from "./math";
          export default function App() { return add(1, 2); }
        `,
				"math.ts": `export function add(a: number, b: number): number { return a + b; }`,
			};

			const code = await bundleCode({ files, entryFileName: "App.tsx" });

			expect(getFnFromString(code)({})).toBe(3);
		});

		it("strips richer type-only syntax from a .ts module", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `
          import { describe } from "./types";
          export default function App() { return describe({ id: 7 }); }
        `,
				"types.ts": `
          export interface Entity { id: number }
          export type Described = string;
          export function describe<T extends Entity>(entity: T): Described {
            return "id:" + entity.id;
          }
        `,
			};

			const code = await bundleCode({ files, entryFileName: "App.tsx" });

			expect(getFnFromString(code)({})).toBe("id:7");
		});

		it("runs a .ts entry file", async () => {
			const files: LiveDemoFiles = {
				"App.ts": `
          const label: string = "TS_ENTRY";
          export default function App(): string { return label; }
        `,
			};

			const code = await bundleCode({ files, entryFileName: "App.ts" });

			expect(getFnFromString(code)({})).toBe("TS_ENTRY");
		});

		it("leaves a plain .js module alone", async () => {
			const files: LiveDemoFiles = {
				"App.jsx": `
          import { shout } from "./util";
          export default function App() { return shout("hi"); }
        `,
				"util.js": `export const shout = (s) => s.toUpperCase();`,
			};

			const code = await bundleCode({ files, entryFileName: "App.jsx" });

			expect(getFnFromString(code)({})).toBe("HI");
		});
	});

	describe("multi-directory demos", () => {
		it("bundles same-named files from different folders without collapsing them", async () => {
			// The build step keys these by relative path precisely so they stay
			// distinct; this asserts the browser half agrees and each importer
			// gets its own neighbour, not whichever file was keyed last.
			const files: LiveDemoFiles = {
				"App.tsx": `
          import { label as buttonLabel } from "./buttons/label";
          import { label as cardLabel } from "./cards/label";
          export default function App() { return buttonLabel + "|" + cardLabel; }
        `,
				"buttons/label.ts": `export const label = "BUTTON";`,
				"cards/label.ts": `export const label = "CARD";`,
			};

			const code = await bundleCode({ files, entryFileName: "App.tsx" });
			const fn = getFnFromString(code);

			expect(fn({})).toBe("BUTTON|CARD");
		});

		it("resolves a nested file's sibling import relative to its own folder", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `
          import { Button } from "./components/Button";
          export default function App() { return Button(); }
        `,
				"components/Button.tsx": `
          import { style } from "./style";
          export function Button() { return style; }
        `,
				"components/style.ts": `export const style = "NESTED_STYLE";`,
				// A same-named file at the root must not win over the sibling
				"style.ts": `export const style = "ROOT_STYLE";`,
			};

			const code = await bundleCode({ files, entryFileName: "App.tsx" });
			const fn = getFnFromString(code);

			expect(fn({})).toBe("NESTED_STYLE");
		});

		it("resolves a directory import to its index file", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `
          import Widget from "./Widget";
          export default function App() { return Widget(); }
        `,
				"Widget/index.tsx": `export default function Widget() { return "WIDGET"; }`,
			};

			const code = await bundleCode({ files, entryFileName: "App.tsx" });
			const fn = getFnFromString(code);

			expect(fn({})).toBe("WIDGET");
		});
	});
});
