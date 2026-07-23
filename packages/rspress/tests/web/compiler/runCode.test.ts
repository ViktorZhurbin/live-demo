import { describe, expect, it, vi } from "vitest";
import type { LiveDemoFiles } from "~shared/types";
import { runCode } from "~web/compiler/runCode";

// Mock the virtual modules import - must be inline due to hoisting.
// `react/jsx-runtime` is included because Sucrase's automatic JSX runtime
// emits an import for it; the plugin ships it in `defaultModules` for the
// same reason (see plugin.ts).
const renderToString = (tag: unknown, props: { children?: unknown }) => {
	const children = props?.children;
	const inner = Array.isArray(children) ? children.join("") : (children ?? "");

	return `<${String(tag)}>${inner}</${String(tag)}>`;
};

// The mock resolves synchronously, so there is nothing to preload; the real
// module awaits its thunks here (see getVirtualModulesCode.ts). Spied so the
// tests below can assert *which* externals runCode asks it to resolve.
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

describe("runCode", () => {
	/**
	 * `getImport` is called synchronously during module evaluation and can't
	 * await, so `runCode` has to know every external a demo's files reference —
	 * including ones discovered by walking imports at compile time, not just
	 * the build step's static list — before it evaluates anything.
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

			await runCode({ files, entryFileName: "App.tsx" });

			expect(loadImportsMock).toHaveBeenCalledTimes(1);

			const [importNames] = loadImportsMock.mock.calls[0];

			// `react` is written by the author; `react/jsx-runtime` is emitted by
			// Sucrase's automatic runtime and must be preloaded just the same.
			expect([...importNames].sort()).toEqual(["react", "react/jsx-runtime"]);
		});

		it("does not treat a demo's own local files as externals", async () => {
			loadImportsMock.mockClear();

			const files: LiveDemoFiles = {
				"App.tsx": `import { Button } from "./Button"; export default () => Button();`,
				"Button.tsx": `export const Button = () => "click";`,
			};

			await runCode({ files, entryFileName: "App.tsx" });

			const [importNames] = loadImportsMock.mock.calls[0];

			expect(importNames).not.toContain("./Button");
			expect(importNames).not.toContain("Button.tsx");
		});

		it("resolves externals before evaluating, so getImport never sees an unresolved one", async () => {
			const order: string[] = [];
			loadImportsMock.mockClear();
			loadImportsMock.mockImplementationOnce(async () => {
				order.push("loadImports");
			});

			const files: LiveDemoFiles = {
				"App.tsx": `import { useState } from "react"; export default () => useState;`,
			};

			// Evaluation is synchronous once it starts, so `loadImports` resolving
			// after `runCode` returns would mean `getImport` ran against an
			// unresolved external instead.
			await runCode({ files, entryFileName: "App.tsx" });
			order.push("runCode returned");

			expect(order).toEqual(["loadImports", "runCode returned"]);
		});
	});

	it("runs a single file with no dependencies", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `export default function App() { return 'Hello'; }`,
		};

		const App = await runCode({ files, entryFileName: "App.tsx" });

		expect((App as () => string)()).toBe("Hello");
	});

	it("resolves a local file dependency", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `
        import { greet } from "./greet";
        export default function App() { return greet('World'); }
      `,
			"greet.tsx": `export function greet(name: string) { return 'Hello, ' + name; }`,
		};

		const App = await runCode({ files, entryFileName: "App.tsx" });

		expect((App as (props: object) => string)({})).toBe("Hello, World");
	});

	it("transpiles TypeScript and JSX-only syntax", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `
        interface Props { value: number }
        export default function App(props: Props) { return props.value * 2; }
      `,
		};

		const App = await runCode({ files, entryFileName: "App.tsx" });

		expect((App as (props: { value: number }) => number)({ value: 21 })).toBe(
			42,
		);
	});

	it("transpiles JSX via react/jsx-runtime from the virtual module", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `export default function App() { return <div>Hello</div>; }`,
		};

		const App = await runCode({ files, entryFileName: "App.tsx" });

		expect((App as (props: object) => string)({})).toBe("<div>Hello</div>");
	});

	it("renders JSX in a demo that never imports React", async () => {
		// The headline case: inline demos are short snippets that don't import
		// React. Under the classic runtime this only worked because a `React`
		// binding was injected invisibly into every demo.
		const files: LiveDemoFiles = {
			"App.jsx": `export default function App() { return <span>No import needed</span>; }`,
		};

		const App = await runCode({ files, entryFileName: "App.jsx" });

		expect((App as (props: object) => string)({})).toBe(
			"<span>No import needed</span>",
		);
	});

	describe("entry export forms", () => {
		// Every published doc teaches the *named* export form. Until these cases
		// existed, that syntax had zero coverage at this level — every other
		// fixture here used `export default`.
		it("accepts a named arrow-function export as the demo component", async () => {
			const files: LiveDemoFiles = {
				"App.jsx": `export const App = () => <div>Hello World</div>;`,
			};

			const App = await runCode({ files, entryFileName: "App.jsx" });

			expect((App as (props: object) => string)({})).toBe(
				"<div>Hello World</div>",
			);
		});

		it("accepts a named function-declaration export", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `export function App() { return "NAMED_FN"; }`,
			};

			const App = await runCode({ files, entryFileName: "App.tsx" });

			expect((App as (props: object) => string)({})).toBe("NAMED_FN");
		});

		it("accepts a named export alongside an external import", async () => {
			// The shape of guide/inline/preDefinedImports.mdx: a named export whose
			// body depends on an import resolved via the virtual module.
			const files: LiveDemoFiles = {
				"App.jsx": `
          import { useState } from "react";
          export const App = () => {
            const [value] = useState();
            return <div>{String(value)}</div>;
          };
        `,
			};

			const App = await runCode({ files, entryFileName: "App.jsx" });

			expect((App as (props: object) => string)({})).toBe("<div>null</div>");
		});

		it("uses the last export when the entry exports several", async () => {
			// Intended behavior, not an accident: with several exports the entry
			// component is the last one in source order. Documented on
			// `getEntryResult` in moduleRunner.ts.
			const files: LiveDemoFiles = {
				"App.jsx": `
          export const App = () => "FIRST";
          export const Other = () => "SECOND";
        `,
			};

			const App = await runCode({ files, entryFileName: "App.jsx" });

			expect((App as () => string)()).toBe("SECOND");
		});

		it("accepts a named export that pulls in a local file", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `
          import { label } from "./label";
          export const App = () => label;
        `,
				"label.ts": `export const label = "FROM_LOCAL";`,
			};

			const App = await runCode({ files, entryFileName: "App.tsx" });

			expect((App as () => string)()).toBe("FROM_LOCAL");
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

			const App = await runCode({ files, entryFileName: "App.tsx" });

			expect((App as () => number)()).toBe(3);
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

			const App = await runCode({ files, entryFileName: "App.tsx" });

			expect((App as () => string)()).toBe("id:7");
		});

		it("runs a .ts entry file", async () => {
			const files: LiveDemoFiles = {
				"App.ts": `
          const label: string = "TS_ENTRY";
          export default function App(): string { return label; }
        `,
			};

			const App = await runCode({ files, entryFileName: "App.ts" });

			expect((App as () => string)()).toBe("TS_ENTRY");
		});

		it("leaves a plain .js module alone", async () => {
			const files: LiveDemoFiles = {
				"App.jsx": `
          import { shout } from "./util";
          export default function App() { return shout("hi"); }
        `,
				"util.js": `export const shout = (s) => s.toUpperCase();`,
			};

			const App = await runCode({ files, entryFileName: "App.jsx" });

			expect((App as () => string)()).toBe("HI");
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

		const App = await runCode({ files, entryFileName: "App.tsx" });

		expect((App as () => string)()).toBe("WIDGET");
	});

	it("throws IMPORT_NOT_RESOLVED naming the importer for a broken local import", async () => {
		const files: LiveDemoFiles = {
			"App.tsx": `import { X } from "./DoesNotExist"; export default () => X;`,
		};

		await expect(runCode({ files, entryFileName: "App.tsx" })).rejects.toThrow(
			/Couldn't resolve `\.\/DoesNotExist` from `App\.tsx`/,
		);
	});

	describe("named imports a package doesn't export", () => {
		/**
		 * Sucrase's CommonJS interop compiles a named import to a property read
		 * (`_react.usestate`), so `moduleRunner`'s `wrapExternal` Proxy is what
		 * catches a bad one now, on the read itself — see its docblock. That
		 * fires at module *evaluation*, not at call time, so these fixtures read
		 * the missing name at the top level rather than inside a closure that
		 * `runCode` never invokes (it hands the exported function back
		 * uncalled).
		 */
		it("throws UNDEFINED_NAMED_IMPORT naming the import and the package", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `import { usestate } from "react"; export default usestate;`,
			};

			await expect(
				runCode({ files, entryFileName: "App.tsx" }),
			).rejects.toThrow(/Import 'usestate' from 'react' is undefined/);
		});

		it("checks named imports in a demo's local files too, not just its entry", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `import { useCounter } from "./useCounter"; export default useCounter;`,
				"useCounter.ts": `import { useStateTypo } from "react"; export const useCounter = useStateTypo;`,
			};

			await expect(
				runCode({ files, entryFileName: "App.tsx" }),
			).rejects.toThrow(/Import 'useStateTypo' from 'react' is undefined/);
		});

		it("throws for a typo'd member read off a namespace import", async () => {
			// Sucrase compiles this through its wildcard interop rather than to a
			// direct property read — same trap, but reached the way a
			// library-heavy demo (`import * as THREE`) actually reaches it.
			const files: LiveDemoFiles = {
				"App.tsx": `import * as React from "react"; export default React.usestate;`,
			};

			await expect(
				runCode({ files, entryFileName: "App.tsx" }),
			).rejects.toThrow(/Import 'usestate' from 'react' is undefined/);
		});

		it("allows default and namespace imports, which have no names to check", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": `import * as React from "react"; export default () => String(typeof React);`,
			};

			const App = await runCode({ files, entryFileName: "App.tsx" });

			expect((App as () => string)()).toBe("object");
		});

		it("ignores type-only imports, which are erased before evaluation", async () => {
			const files: LiveDemoFiles = {
				"App.tsx": [
					`import type { ReactNode } from "react";`,
					`import { type Dispatch, useState } from "react";`,
					`export default function App(): ReactNode {`,
					`  const [n] = useState(0);`,
					`  const unused: Dispatch<number> | undefined = undefined;`,
					`  return String(n) + String(unused);`,
					`}`,
				].join("\n"),
			};

			const App = await runCode({ files, entryFileName: "App.tsx" });

			expect((App as () => string)()).toBe("nullundefined");
		});
	});

	it("runs files that import each other circularly", async () => {
		// tests/fixtures/valid/Circular's shape: mutually recursive functions,
		// only invoked after both modules finish their own initial evaluation.
		// See collectDemoFiles.ts's docblock for the semantics this now relies
		// on (Node's partial-exports, not a bundler's).
		const files: LiveDemoFiles = {
			"App.tsx": `
          import { isEven } from "./even";
          export default function App() { return isEven(4) ? "EVEN" : "ODD"; }
        `,
			"even.ts": `
          import { isOdd } from "./odd";
          export function isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }
        `,
			"odd.ts": `
          import { isEven } from "./even";
          export function isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }
        `,
		};

		const App = await runCode({ files, entryFileName: "App.tsx" });

		expect((App as () => string)()).toBe("EVEN");
	});
});
