import { describe, expect, it, vi } from "vitest";
import type { LiveDemoFiles } from "~shared/types";
import {
	createModuleRunner,
	getEntryResult,
	resolveLocalImport,
} from "~web/compiler/moduleRunner";

// Mock the virtual modules import - must be inline due to hoisting.
vi.mock("_live_demo_virtual_modules", () => ({
	default: (moduleName: string) => {
		if (moduleName === "react") return { useState: () => "STATE" };
		if (moduleName === "no-default-pkg") return { value: 42 }; // no `.default`
		// Stands in for a namespace-heavy library (three, ...): the shape most
		// exposed to `wrapExternal`'s Proxy, since demo code reaches members off
		// the namespace object itself rather than through named imports.
		if (moduleName === "namespace-pkg") {
			return { Mesh: "MESH", Vector3: "VECTOR3", REVISION: "1" };
		}
		throw new Error(`Can't resolve ${moduleName}`);
	},
}));

// `transpiled` holds hand-written CommonJS, standing in for what
// `transformCode` would actually produce — exercises the runner without
// depending on Sucrase being loaded.
const run = (files: LiveDemoFiles, transpiled: Record<string, string>) =>
	createModuleRunner(files, new Map(Object.entries(transpiled)));

describe("resolveLocalImport", () => {
	it("resolves an extensionless import against the importer's directory", () => {
		const files: LiveDemoFiles = { "components/Button.tsx": "" };

		expect(resolveLocalImport(files, "components", "./Button")).toBe(
			"components/Button.tsx",
		);
	});

	it("resolves a directory import to its index file", () => {
		const files: LiveDemoFiles = { "Widget/index.tsx": "" };

		expect(resolveLocalImport(files, "", "./Widget")).toBe("Widget/index.tsx");
	});

	it("returns undefined for a path that isn't part of the demo", () => {
		const files: LiveDemoFiles = { "App.tsx": "" };

		expect(resolveLocalImport(files, "", "./DoesNotExist")).toBeUndefined();
	});
});

describe("createModuleRunner", () => {
	it("evaluates a single file with no dependencies", () => {
		const files: LiveDemoFiles = { "App.tsx": "" };
		const runner = run(files, {
			"App.tsx": `exports.default = () => "Hello";`,
		});

		const { exports } = runner.evaluate("App.tsx");
		expect((exports.default as () => string)()).toBe("Hello");
	});

	it("evaluates a local dependency only once and caches its exports", () => {
		// If `require` re-ran the module on every call, `a` and `b` would be
		// two different `{}` objects instead of the same cached one.
		const files: LiveDemoFiles = { "App.tsx": "", "shared.ts": "" };
		const runner = run(files, {
			"App.tsx": `
        const a = require("./shared");
        const b = require("./shared");
        exports.default = () => a === b;
      `,
			"shared.ts": `exports.value = {};`,
		});

		const { exports } = runner.evaluate("App.tsx");
		expect((exports.default as () => boolean)()).toBe(true);
	});

	it("resolves a local require relative to the importing file's directory", () => {
		const files: LiveDemoFiles = {
			"App.tsx": "",
			"components/Button.tsx": "",
			"components/styles.ts": "",
			"styles.ts": "",
		};
		const runner = run(files, {
			"App.tsx": `exports.default = require("./components/Button").default;`,
			"components/Button.tsx": `exports.default = require("./styles").label;`,
			"components/styles.ts": `exports.label = "NESTED";`,
			"styles.ts": `exports.label = "ROOT";`,
		});

		const { exports } = runner.evaluate("App.tsx");
		expect(exports.default).toBe("NESTED");
	});

	it("throws IMPORT_NOT_RESOLVED for a relative import that isn't part of the demo", () => {
		const files: LiveDemoFiles = { "App.tsx": "" };
		const runner = run(files, {
			"App.tsx": `require("./DoesNotExist");`,
		});

		expect(() => runner.evaluate("App.tsx")).toThrow(/Couldn't resolve/);
	});

	it("resolves a circular local require via Node's partial-exports semantics", () => {
		// Mirrors tests/fixtures/valid/Circular: mutually recursive functions,
		// only called after both modules finish their own initial evaluation.
		// `exports.isEven = isEven` is written before `require("./odd")` here to
		// prove the cache-before-fill mechanism (`evaluate`'s `cache.set` ahead of
		// running the body) tolerates it either way — real Sucrase output emits
		// the require first (see the actual-compiler version of this scenario in
		// runCode.test.ts), but nothing here depends on that specific order.
		const files: LiveDemoFiles = { "even.ts": "", "odd.ts": "" };
		const runner = run(files, {
			"even.ts": `
        exports.isEven = isEven;
        const odd = require("./odd");
        function isEven(n) { return n === 0 ? true : odd.isOdd(n - 1); }
      `,
			"odd.ts": `
        exports.isOdd = isOdd;
        const even = require("./even");
        function isOdd(n) { return n === 0 ? false : even.isEven(n - 1); }
      `,
		});

		const { exports } = runner.evaluate("even.ts");
		expect((exports.isEven as (n: number) => boolean)(4)).toBe(true);
	});

	it("resolves an external default import, preferring a real .default", () => {
		const files: LiveDemoFiles = { "App.tsx": "" };
		const runner = run(files, {
			"App.tsx": `exports.default = require("react").useState;`,
		});

		const { exports } = runner.evaluate("App.tsx");
		expect((exports.default as () => string)()).toBe("STATE");
	});

	it("treats the whole module as the default when it has no .default", () => {
		const files: LiveDemoFiles = { "App.tsx": "" };
		const runner = run(files, {
			"App.tsx": `exports.default = require("no-default-pkg").default.value;`,
		});

		const { exports } = runner.evaluate("App.tsx");
		expect(exports.default).toBe(42);
	});

	it("surfaces the virtual module's own error for an unresolvable external", () => {
		const files: LiveDemoFiles = { "App.tsx": "" };
		const runner = run(files, { "App.tsx": `require("left-pad");` });

		expect(() => runner.evaluate("App.tsx")).toThrow(/Can't resolve left-pad/);
	});

	/**
	 * `wrapExternal`'s Proxy is the whole `UNDEFINED_NAMED_IMPORT` check since
	 * the Sucrase swap (see its docblock). It traps *every* property read on an
	 * external, not just the ones a named import compiles to, so these cover
	 * both halves of that: the reads it must catch, and the reads it must let
	 * through for a namespace-heavy package to work at all.
	 */
	describe("external property access", () => {
		const evaluateApp = (source: string) =>
			run({ "App.tsx": "" }, { "App.tsx": source }).evaluate("App.tsx");

		it("throws UNDEFINED_NAMED_IMPORT for a missing member off a namespace", () => {
			expect(() =>
				evaluateApp(`exports.default = require("namespace-pkg").Mehs;`),
			).toThrow(/Import 'Mehs' from 'namespace-pkg' is undefined/);
		});

		it("reads existing members off a namespace normally", () => {
			const { exports } = evaluateApp(
				`const N = require("namespace-pkg"); exports.default = [N.Mesh, N.REVISION].join("/");`,
			);

			expect(exports.default).toBe("MESH/1");
		});

		it("supports the enumeration `import * as N` compiles to", () => {
			// Sucrase's `_interopRequireWildcard` copies the module with a
			// `for...in` loop plus `Object.prototype.hasOwnProperty.call`, so the
			// trap has to survive both without throwing.
			const { exports } = evaluateApp(`
				const _pkg = require("namespace-pkg");
				const copy = {};
				for (const key in _pkg) {
					if (Object.prototype.hasOwnProperty.call(_pkg, key)) copy[key] = _pkg[key];
				}
				exports.default = [copy.Mesh, Object.keys({ ..._pkg }).includes("Vector3")].join("/");
			`);

			expect(exports.default).toBe("MESH/true");
		});

		it("lets `then` through so awaiting a namespace doesn't reject", async () => {
			const { exports } = evaluateApp(
				`exports.default = Promise.resolve(require("namespace-pkg"));`,
			);

			await expect(exports.default).resolves.toMatchObject({ Mesh: "MESH" });
		});

		it("lets symbol keys through", () => {
			const { exports } = evaluateApp(
				`exports.default = Object.prototype.toString.call(require("namespace-pkg"));`,
			);

			expect(exports.default).toBe("[object Object]");
		});

		it("throws on feature detection of a missing export, the accepted regression", () => {
			// Documented tradeoff of moving the check to the read site: the old
			// up-front check let `pkg.maybeThing` quietly be `undefined`. Asserted
			// so the behavior is a decision on record, not an accident.
			expect(() =>
				evaluateApp(
					`exports.default = require("namespace-pkg").maybeThing ? 1 : 0;`,
				),
			).toThrow(/Import 'maybeThing' from 'namespace-pkg' is undefined/);
		});
	});
});

describe("getEntryResult", () => {
	it("prefers a default export", () => {
		expect(getEntryResult({ default: "DEFAULT", App: "NAMED" })).toBe(
			"DEFAULT",
		);
	});

	it("falls back to the last named export when there's no default", () => {
		expect(getEntryResult({ App: "FIRST", Other: "SECOND" })).toBe("SECOND");
	});

	// memo()/forwardRef() components are objects, not functions. Guarding on
	// `!== undefined` (not a function check) is what lets those through.
	it("returns an object default export as-is", () => {
		const component = { $$typeof: Symbol.for("react.memo") };
		expect(getEntryResult({ default: component })).toBe(component);
	});

	it("throws NO_DEFAULT_EXPORT when there are no exports at all", () => {
		expect(() => getEntryResult({}, "App.tsx")).toThrow(
			/`App\.tsx` has no default export/,
		);
	});
});
