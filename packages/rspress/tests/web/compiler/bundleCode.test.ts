import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";
import type { LiveDemoFiles } from "~shared/types";
import { bundleCode } from "~web/compiler/bundleCode";
import { getFnFromString } from "~web/compiler/getFnFromString";

// Mock the virtual modules import - must be inline due to hoisting.
// `react/jsx-runtime` is included because Babel's automatic JSX runtime emits
// an import for it; the plugin ships it in `defaultModules` for the same
// reason (see plugin.ts).
const renderToString = (tag: unknown, props: { children?: unknown }) => {
	const children = props?.children;
	const inner = Array.isArray(children) ? children.join("") : (children ?? "");

	return `<${String(tag)}>${inner}</${String(tag)}>`;
};

// The mock resolves synchronously, so there is nothing to preload; the real
// module awaits its thunks here (see getVirtualModulesCode.ts). Spied so the
// tests below can assert *which* externals bundleCode asks it to resolve.
const { loadImportsMock } = vi.hoisted(() => ({
	loadImportsMock: vi.fn<(importNames: readonly string[]) => Promise<void>>(
		async () => {},
	),
}));

vi.mock("_live_demo_virtual_modules", () => ({
	loadImports: loadImportsMock,
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

// Rollup is loaded lazily by bundleCode via ensureCompilerLoaded (see
// setup.ts / loadCompiler.ts); this shim only covers its wasm fetch.
beforeAll(() => {
	// @rollup/browser fetches its wasm binary at runtime. In a real browser
	// that's a same-origin request; here it resolves to a file:// URL, which
	// Node's fetch doesn't support, so read it off disk.
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
	/**
	 * The virtual module is one module for the whole site, so it can only stay
	 * off unrelated pages if each external is a lazily-imported chunk. That
	 * makes `bundleCode` responsible for resolving this demo's externals before
	 * `getFnFromString` evaluates the code — `getImport` is called synchronously
	 * during module init and cannot await. If `chunk.imports` ever stops being
	 * the list of externals, every demo breaks with "Can't resolve".
	 */
	describe("preloading externals", () => {
		it("asks loadImports for exactly the externals the demo imports", async () => {
			loadImportsMock.mockClear();

			const files: LiveDemoFiles = {
				"App.tsx": [
					`import { useState } from "react";`,
					`export default function App() {`,
					`  const [n] = useState(0);`,
					`  return <div>{n}</div>;`,
					`}`,
				].join("\n"),
			};

			await bundleCode({ files, entryFileName: "App.tsx" });

			expect(loadImportsMock).toHaveBeenCalledTimes(1);

			const [importNames] = loadImportsMock.mock.calls[0];

			// `react` is written by the author; `react/jsx-runtime` is emitted by
			// Babel's automatic runtime and must be preloaded just the same.
			expect([...importNames].sort()).toEqual(["react", "react/jsx-runtime"]);
		});

		it("does not treat a demo's own local files as externals", async () => {
			loadImportsMock.mockClear();

			const files: LiveDemoFiles = {
				"App.tsx": `import { Button } from "./Button"; export default () => Button();`,
				"Button.tsx": `export const Button = () => "click";`,
			};

			await bundleCode({ files, entryFileName: "App.tsx" });

			const [importNames] = loadImportsMock.mock.calls[0];

			expect(importNames).not.toContain("./Button");
			expect(importNames).not.toContain("Button.tsx");
		});

		it("resolves externals before returning, so evaluation can be synchronous", async () => {
			const order: string[] = [];
			loadImportsMock.mockClear();
			loadImportsMock.mockImplementationOnce(async () => {
				order.push("loadImports");
			});

			const files: LiveDemoFiles = {
				"App.tsx": `import { useState } from "react"; export default () => useState;`,
			};

			await bundleCode({ files, entryFileName: "App.tsx" });
			order.push("bundleCode returned");

			expect(order).toEqual(["loadImports", "bundleCode returned"]);
		});
	});

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

	describe("entry export forms", () => {
		// Every published doc teaches the *named* export form (see
		// babelPluginTraverse's ExportSpecifier visitor for the mechanism). Until
		// these cases existed, that syntax had zero coverage at the bundle level
		// — every other fixture here used `export default`.
		it("accepts a named arrow-function export as the demo component", async () => {
			const files: LiveDemoFiles = {
				"App.jsx": `export const App = () => <div>Hello World</div>;`,
			};

			const code = await bundleCode({ files, entryFileName: "App.jsx" });

			expect(getFnFromString(code)({})).toBe("<div>Hello World</div>");
		});

		it("accepts a named function-declaration export", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `export function App() { return "NAMED_FN"; }`,
			};

			const code = await bundleCode({ files, entryFileName: "App.tsx" });

			expect(getFnFromString(code)({})).toBe("NAMED_FN");
		});

		it("accepts a named export alongside an external import", async () => {
			// The shape of guide/inline/preDefinedImports.mdx: a named export whose
			// body depends on an import rewritten to __get_import.
			const files: LiveDemoFiles = {
				"App.jsx": `
          import { useState } from "react";
          export const App = () => {
            const [value] = useState();
            return <div>{String(value)}</div>;
          };
        `,
			};

			const code = await bundleCode({ files, entryFileName: "App.jsx" });

			expect(code).toContain("__get_import('react', false)");
			expect(getFnFromString(code)({})).toBe("<div>null</div>");
		});

		it("uses the last export when the entry exports several", async () => {
			// Intended behavior, not an accident: every export assigns to the same
			// `exports.default`, so the last one is the demo component. Documented
			// on the ExportSpecifier visitor in babelPluginTraverse.ts.
			const files: LiveDemoFiles = {
				"App.jsx": `
          export const App = () => "FIRST";
          export const Other = () => "SECOND";
        `,
			};

			const code = await bundleCode({ files, entryFileName: "App.jsx" });

			expect(getFnFromString(code)({})).toBe("SECOND");
		});

		it("accepts a named export that pulls in a local file", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `
          import { label } from "./label";
          export const App = () => label;
        `,
				"label.ts": `export const label = "FROM_LOCAL";`,
			};

			const code = await bundleCode({ files, entryFileName: "App.tsx" });

			expect(getFnFromString(code)({})).toBe("FROM_LOCAL");
		});
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
