import { describe, expect, it, vi } from "vitest";
import { getFnFromString } from "~web/compiler/getFnFromString";

// Mock the virtual modules import - must be inline due to hoisting
vi.mock("_live_demo_virtual_modules", () => ({
	default: (moduleName: string, _getDefault?: boolean) => {
		if (moduleName === "react") {
			return { createElement: () => ({}) };
		}
		throw new Error(`Can't resolve ${moduleName}`);
	},
}));

describe("getFnFromString", () => {
	it("should execute code with default export", () => {
		const code = `
      const MyComponent = () => 'Hello World';
      exports.default = MyComponent;
    `;

		const result = getFnFromString(code);

		expect(result).toBeDefined();
		expect(typeof result).toBe("function");
		expect(result({})).toBe("Hello World");
	});

	// Guards a fresh `exportsStub` per call rather than one hoisted to module
	// scope, which would leak one call's default export into the next.
	it("should isolate execution context", () => {
		const code1 = `
      const message = 'First';
      exports.default = () => message;
    `;

		const code2 = `
      const message = 'Second';
      exports.default = () => message;
    `;

		const fn1 = getFnFromString(code1);
		const fn2 = getFnFromString(code2);

		expect(fn1({})).toBe("First");
		expect(fn2({})).toBe("Second");
	});

	it("throws when the bundle produces no default export", () => {
		const code = `
      const MyComponent = () => 'Test';
      // No exports.default
    `;

		expect(() => getFnFromString(code)).toThrow(/no default export/);
	});

	it("names the entry file in the error when one is given", () => {
		const code = `const MyComponent = () => 'Test';`;

		expect(() => getFnFromString(code, "App.tsx")).toThrow(
			/`App\.tsx` has no default export/,
		);
	});

	// memo()/forwardRef() components are objects, not functions. The guard here
	// is `== null` for exactly that reason, and callers must not narrow it back
	// to `typeof === "function"` — that rejects a valid demo as "no default
	// export".
	it("returns an object default export as-is", () => {
		const code = `
      exports.default = { $$typeof: Symbol.for('react.memo'), type: () => 'Memo' };
    `;

		const result = getFnFromString(code, "App.tsx");

		expect(typeof result).toBe("object");
		expect(result).toMatchObject({ $$typeof: Symbol.for("react.memo") });
	});

	it("should handle components that use getImport for dependencies", () => {
		const code = `
      const deps = __get_import('react', false);
      exports.default = () => typeof deps;
    `;

		const result = getFnFromString(code);

		expect(result({})).toBe("object");
	});
});
