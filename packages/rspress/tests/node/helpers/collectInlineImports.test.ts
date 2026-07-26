import { describe, expect, it } from "vitest";
import { collectInlineImports } from "~node/helpers/collectInlineImports";
import { LiveDemoLanguage } from "~shared/constants";

describe("collectInlineImports", () => {
	it("collects bare specifiers and skips relative ones", () => {
		const imports = collectInlineImports({
			lang: LiveDemoLanguage.jsx,
			code: [
				`import { DateTime } from "luxon";`,
				`import clsx from "clsx";`,
				`import { helper } from "./helper";`,
				`import { other } from "../other";`,
				`export default () => <div />;`,
			].join("\n"),
		});

		expect(imports).toEqual(["luxon", "clsx"]);
	});

	it("collects re-export forms, which also need resolving", () => {
		const imports = collectInlineImports({
			lang: LiveDemoLanguage.js,
			code: [
				`export { format } from "date-fns";`,
				`export * from "ramda";`,
			].join("\n"),
		});

		expect(imports).toEqual(["date-fns", "ramda"]);
	});

	it("skips type-only imports, which the runtime compiler erases", () => {
		const imports = collectInlineImports({
			lang: LiveDemoLanguage.tsx,
			code: [
				`import type { Settings } from "type-only-package";`,
				`export type { Other } from "type-only-reexport";`,
				`import { type Partial, useStore } from "zustand";`,
				`const x: Settings = useStore();`,
			].join("\n"),
		});

		// `zustand` survives: a mixed import still has a value binding.
		expect(imports).toEqual(["zustand"]);
	});

	it("returns no imports for code that doesn't parse, rather than throwing", () => {
		// The whole point of the lenient parse — see the module docblock.
		expect(() =>
			collectInlineImports({
				lang: LiveDemoLanguage.jsx,
				code: `import { DateTime } from "luxon";\nexport default () => <div>{</div>;`,
			}),
		).not.toThrow();
	});

	it("parses TypeScript syntax that would be a syntax error as plain JS", () => {
		// The fence's language picks the parser's language; getting this wrong
		// would silently drop every import in a `tsx` block.
		const imports = collectInlineImports({
			lang: LiveDemoLanguage.tsx,
			code: [
				`import { useState } from "react";`,
				`const value = useState<number>(0) satisfies unknown;`,
				`export default () => <div>{value}</div>;`,
			].join("\n"),
		});

		expect(imports).toEqual(["react"]);
	});
});
