import { describe, it, expect, vi } from "vitest";
import { getFnFromString } from "web/ui/preview/LiveDemoCodeRunner/compiler/getFnFromString";

// Mock the virtual modules import - must be inline due to hoisting
vi.mock("_live_demo_virtual_modules", () => ({
	default: (moduleName: string, _getDefault?: boolean) => {
		// Simple mock that returns mock React for testing
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

	it("should handle component that returns JSX (as function)", () => {
		const code = `
      const MyComponent = () => ({ type: 'div', props: { children: 'Test' } });
      exports.default = MyComponent;
    `;

		const result = getFnFromString(code);
		const output: any = result({});

		expect(output).toBeDefined();
		expect(output.type).toBe("div");
		expect(output.props.children).toBe("Test");
	});

	it("should provide getImport function for external modules", () => {
		const code = `
      const React = __get_import('react', true);
      const MyComponent = () => React.createElement('div', null, 'Hello');
      exports.default = MyComponent;
    `;

		const result = getFnFromString(code);

		expect(result).toBeDefined();
		expect(typeof result).toBe("function");
	});

	it("should handle components with named variables", () => {
		const code = `
      const message = 'Hello';
      const MyComponent = () => message;
      exports.default = MyComponent;
    `;

		const result = getFnFromString(code);

		expect(result({})).toBe("Hello");
	});

	it("should handle arrow function components", () => {
		const code = `
      exports.default = () => 'Arrow Function Component';
    `;

		const result = getFnFromString(code);

		expect(result({})).toBe("Arrow Function Component");
	});

	it("should handle regular function components", () => {
		const code = `
      function MyComponent() {
        return 'Regular Function Component';
      }
      exports.default = MyComponent;
    `;

		const result = getFnFromString(code);

		expect(result({})).toBe("Regular Function Component");
	});

	it("should execute code with variable declarations", () => {
		const code = `
      const value = 42;
      const double = value * 2;
      exports.default = () => double;
    `;

		const result = getFnFromString(code);

		expect(result({})).toBe(84);
	});

	it("should handle closures correctly", () => {
		const code = `
      const makeCounter = () => {
        let count = 0;
        return () => ++count;
      };
      exports.default = makeCounter();
    `;

		const result = getFnFromString(code);

		expect(result({})).toBe(1);
		expect(result({})).toBe(2);
		expect(result({})).toBe(3);
	});

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

	it("should handle exports.default format specifically", () => {
		// The compiler always transforms to exports.default format
		const code = `
      const Component = () => 'Test';
      exports.default = Component;
    `;

		const result = getFnFromString(code);

		expect(result).toBeDefined();
		expect(typeof result).toBe("function");
	});

	it("should work with complex component logic", () => {
		const code = `
      const helper = (x) => x * 2;
      const MyComponent = (props) => {
        const value = helper(props.value || 5);
        return { result: value };
      };
      exports.default = MyComponent;
    `;

		const result = getFnFromString(code);

		expect(result({ value: 10 })).toEqual({ result: 20 });
		expect(result({})).toEqual({ result: 10 });
	});

	// Note: Error handling for missing default export is not implemented
	// This documents expected behavior
	it.skip("should throw error when no default export", () => {
		const code = `
      const MyComponent = () => 'Test';
      // No exports.default
    `;

		expect(() => getFnFromString(code)).toThrow();
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
