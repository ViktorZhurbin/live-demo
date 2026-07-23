import { describe, expect, it } from "vitest";
import { transformCode } from "~web/compiler/transformCode";

describe("transformCode", () => {
	describe("importSpecifiers", () => {
		it("extracts specifiers in source order, deduped", () => {
			const code = [
				`import { useState } from "react";`,
				`import { useState as useState2 } from "react";`,
				`import { greet } from "./greet";`,
				`export default function App() {`,
				`  const [n] = useState(0);`,
				`  return greet(String(n));`,
				`}`,
			].join("\n");

			const { importSpecifiers } = transformCode(code, "App.tsx");

			expect(importSpecifiers).toEqual(["react", "./greet"]);
		});

		it("includes the injected react/jsx-runtime for a file with JSX", () => {
			const code = `export default function App() { return <div>Hi</div>; }`;

			const { importSpecifiers } = transformCode(code, "App.tsx");

			expect(importSpecifiers).toContain("react/jsx-runtime");
		});

		it("omits react/jsx-runtime for a file with no JSX", () => {
			const code = `export default function App() { return "Hi"; }`;

			const { importSpecifiers } = transformCode(code, "App.tsx");

			expect(importSpecifiers).not.toContain("react/jsx-runtime");
		});

		/**
		 * `extractRequireSpecifiers` is anchored to the two shapes Sucrase
		 * emits (`var _x = require(...)` and a statement-position bare
		 * `require(...)`), so every import form has to be covered here: a
		 * Sucrase upgrade that changes an emit shape has to fail loudly in this
		 * suite rather than silently drop a specifier at runtime, where it
		 * would surface as an unresolvable import in a demo.
		 */
		it.each([
			["default", `import D from "pkg"; export default D;`],
			["namespace", `import * as N from "pkg"; export default N;`],
			["bare side-effect", `import "pkg"; export default 1;`],
			[
				"mixed default + named",
				`import D, { x } from "pkg"; export default [D, x];`,
			],
			["re-export named", `export { x } from "pkg";`],
			["re-export star", `export * from "pkg";`],
			["re-export default", `export { default } from "pkg";`],
			["re-export namespace", `export * as ns from "pkg";`],
			["indented import", `  import { x } from "pkg";\n  export default x;`],
			[
				"multiline import",
				`import {\n  x,\n  y,\n} from "pkg";\nexport default [x, y];`,
			],
		])("recovers the specifier from a %s import", (_form, code) => {
			expect(transformCode(code, "App.ts").importSpecifiers).toEqual(["pkg"]);
		});

		it("ignores the text `require(...)` in a comment or mid-line string", () => {
			const code = [
				`import { greet } from "./greet";`,
				`// installed with require('lodash') in older docs`,
				`const sample = "require('phantom-pkg')";`,
				`export default () => greet(sample);`,
			].join("\n");

			const { importSpecifiers } = transformCode(code, "App.ts");

			expect(importSpecifiers).toEqual(["./greet"]);
		});

		it("is still fooled by a string whose own line starts with require(...)", () => {
			// The documented limit of scanning emitted text instead of parsing
			// it (see transformCode.ts and CLAUDE.md's Limitations). Asserted so
			// the gap is a known, tested shape rather than folklore: it fails
			// loudly as EXTERNAL_IMPORT_NOT_FOUND downstream, never silently.
			const code = [
				"export const snippet = `",
				`require('phantom-pkg')`,
				"`;",
			].join("\n");

			const { importSpecifiers } = transformCode(code, "App.ts");

			expect(importSpecifiers).toEqual(["phantom-pkg"]);
		});

		it("drops type-only imports, which never reach the emitted require calls", () => {
			const code = [
				`import type { ReactNode } from "react";`,
				`import { type Dispatch, useState } from "react";`,
				`import { greet } from "./greet";`,
				`export default function App(): ReactNode {`,
				`  const [n] = useState(0);`,
				`  const unused: Dispatch<number> | undefined = undefined;`,
				`  return greet(String(n)) + String(unused);`,
				`}`,
			].join("\n");

			const { importSpecifiers } = transformCode(code, "App.tsx");

			// Only one `require("react")`, from the value import — the type-only
			// import and the type-only specifier both vanish before emit.
			expect(importSpecifiers).toEqual(["react", "./greet"]);
		});
	});

	describe("syntax errors", () => {
		it("throws PARSE_FAILED with a codeframe pointing at the offending line", () => {
			const code = ["const x = (", "  1 +", ");"].join("\n");

			let thrown: unknown;
			try {
				transformCode(code, "Broken.tsx");
			} catch (error) {
				thrown = error;
			}

			expect(thrown).toMatchObject({
				name: "LiveDemoError",
				payload: expect.objectContaining({ code: "PARSE_FAILED" }),
			});

			const message = (thrown as Error).message;
			expect(message).toContain("Broken.tsx");
			// The caret line and the offending source line both show up in the
			// formatted codeframe note.
			expect(message).toContain(");");
			expect(message).toMatch(/\^/);
		});
	});

	describe("TypeScript stripping", () => {
		it("strips type annotations from a plain .ts module", () => {
			const code = `export function add(a: number, b: number): number { return a + b; }`;

			const { code: output } = transformCode(code, "math.ts");

			expect(output).not.toContain(": number");
			expect(output).toContain("function add(a, b)");
		});

		it("strips interfaces and type aliases from a .ts module", () => {
			const code = [
				`export interface Entity { id: number }`,
				`export type Described = string;`,
				`export function describe<T extends Entity>(entity: T): Described {`,
				`  return "id:" + entity.id;`,
				`}`,
			].join("\n");

			const { code: output } = transformCode(code, "types.ts");

			expect(output).not.toContain("interface");
			expect(output).not.toContain("Described =");
		});
	});
});
