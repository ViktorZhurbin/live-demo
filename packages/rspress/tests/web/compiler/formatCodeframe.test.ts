import { describe, expect, it } from "vitest";
import { formatCodeframe } from "~web/compiler/formatCodeframe";

// The column Sucrase reports is 1-based (verified against its `augmentError`
// output), so a caret for column N belongs under the Nth character of the
// rendered source line. Both helpers read the frame's own layout rather than
// hardcoding a gutter width, which varies with the line numbers shown.
const caretIndex = (frame: string) =>
	(frame.split("\n").find((line) => line.includes("^")) ?? "").indexOf("^");

const contentIndex = (frame: string, lineNumber: number) => {
	const rendered =
		frame
			.split("\n")
			.find((line) => line.trimStart().startsWith(`${lineNumber} | `)) ?? "";

	return rendered.indexOf("| ") + 2;
};

describe("formatCodeframe", () => {
	it("puts the caret under the reported column", () => {
		const source = ["const a = 1;", "const b = ;", "const c = 3;"].join("\n");

		const frame =
			formatCodeframe(source, "App.ts", { line: 2, column: 11 }) ?? "";

		expect(frame).toContain(",-[App.ts:2:11]");
		expect(caretIndex(frame)).toBe(contentIndex(frame, 2) + 10);
	});

	it("shows one line of context on either side", () => {
		const source = ["const a = 1;", "const b = ;", "const c = 3;"].join("\n");

		const frame =
			formatCodeframe(source, "App.ts", { line: 2, column: 11 }) ?? "";

		expect(frame).toContain("const a = 1;");
		expect(frame).toContain("const c = 3;");
	});

	it("indents the caret with tabs on a tab-indented line", () => {
		const source = ["function f() {", "\t\tconst b = ;", "}"].join("\n");

		const frame =
			formatCodeframe(source, "App.ts", { line: 2, column: 13 }) ?? "";
		const caretLine = frame.split("\n").find((line) => line.includes("^"));

		// The two tabs are copied from the source line, not expanded to spaces:
		// a tab is one column to the parser but renders as several, so
		// space-padding would drift left of the error.
		expect(caretLine).toContain("\t\t");
		expect(caretIndex(frame)).toBe(contentIndex(frame, 2) + 12);
	});

	it("renders a caret past the end of the line for an error at EOF", () => {
		const frame =
			formatCodeframe("const a = (", "App.ts", { line: 1, column: 12 }) ?? "";

		expect(caretIndex(frame)).toBe(contentIndex(frame, 1) + 11);
	});

	it("returns undefined without a location", () => {
		expect(
			formatCodeframe("const a = 1;", "App.ts", undefined),
		).toBeUndefined();
	});

	it("returns undefined for a location outside the source", () => {
		const source = "const a = 1;";

		expect(
			formatCodeframe(source, "App.ts", { line: 9, column: 1 }),
		).toBeUndefined();
		expect(
			formatCodeframe(source, "App.ts", { line: 1, column: 0 }),
		).toBeUndefined();
	});
});
