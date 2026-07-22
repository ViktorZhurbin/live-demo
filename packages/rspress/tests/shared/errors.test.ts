import { describe, expect, it } from "vitest";
import { formatSplicedMessage, LiveDemoError, toPayload } from "~shared/errors";
import { errorMessages } from "~shared/errors/messages";
import type { ErrorCode, ErrorTokens } from "~shared/errors/types";

// Minimal valid tokens for each code, just enough to construct one.
const sampleTokens: { [K in ErrorCode]: ErrorTokens[K] } = {
	IMPORT_NOT_RESOLVED: { importPath: "./Button" },
	IMPORT_EXTENSION_NOT_SUPPORTED: { importPath: "./styles.css" },
	PARSE_FAILED: { filePath: "Button.tsx", errorMessage: "Unexpected token" },
	NO_DEFAULT_EXPORT: { entryFileName: "App.tsx" },
	PROP_PARSE_FAILED: { key: "files" },
	PROVIDER_MISSING: undefined,
	UNDEFINED_NAMED_IMPORT: { importName: "usestate", pkg: "react" },
	EXTERNAL_IMPORT_NOT_FOUND: { importName: "lodash" },
	COMPILER_LOAD_FAILED: undefined,
	UNEXPECTED: undefined,
};

describe("errorMessages", () => {
	it.each(Object.keys(sampleTokens) as ErrorCode[])(
		"%s produces a payload with a non-empty title and message",
		(code) => {
			const content = errorMessages[code](sampleTokens[code] as never);

			expect(content.title).toBeTruthy();
			expect(content.message).toBeTruthy();
		},
	);
});

describe("LiveDemoError", () => {
	it("formats .message as multi-line text prefixed [live-demo]", () => {
		const error = new LiveDemoError("IMPORT_NOT_RESOLVED", {
			importPath: "./Button",
		});

		expect(error.message).toMatch(/^\[live-demo\] Import couldn't be resolved/);
		expect(error.message).toContain("Couldn't resolve `./Button`.");
		expect(error.message).toContain("Hint:");
	});

	it("stores the structured payload alongside the message", () => {
		const error = new LiveDemoError("PROP_PARSE_FAILED", { key: "files" });

		expect(error.payload).toEqual({
			code: "PROP_PARSE_FAILED",
			title: "Prop parse failed",
			message: "Failed to parse LiveDemo prop `files`.",
			hint: expect.any(String),
		});
	});

	it("keeps the cause when provided", () => {
		const cause = new SyntaxError("Unexpected token");
		const error = new LiveDemoError(
			"PROP_PARSE_FAILED",
			{ key: "files" },
			{ cause },
		);

		expect(error.cause).toBe(cause);
	});
});

describe("formatSplicedMessage", () => {
	it("joins message and hint on one line", () => {
		const content = errorMessages.PARSE_FAILED({
			filePath: "Button.tsx",
			errorMessage: "Unexpected token",
		});

		expect(formatSplicedMessage(content)).toBe(
			"Failed to parse `Button.tsx`: Unexpected token Fix the syntax error in this file.",
		);
	});

	it("returns just the message when there's no hint", () => {
		const content = errorMessages.EXTERNAL_IMPORT_NOT_FOUND({
			importName: "lodash",
		});

		expect(formatSplicedMessage(content)).toBe("Can't resolve lodash.");
	});

	// getVirtualModulesCode.ts splices this one unescaped inside a real
	// template literal in generated code. A backtick or a `${...}` in the
	// wording would close or hijack that literal, turning the virtual module
	// into a syntax error that breaks every demo on every page at once.
	it("keeps spliced messages free of template-literal syntax", () => {
		const spliced = formatSplicedMessage(
			errorMessages.EXTERNAL_IMPORT_NOT_FOUND({ importName: "lodash" }),
		);

		expect(spliced).not.toContain("`");
		expect(spliced).not.toContain("${");
	});
});

describe("toPayload", () => {
	it("returns the LiveDemoError's own payload", () => {
		const error = new LiveDemoError("NO_DEFAULT_EXPORT", {
			entryFileName: "App.tsx",
		});

		expect(toPayload(error)).toBe(error.payload);
	});

	it("wraps a foreign Error as UNEXPECTED, keeping its raw message", () => {
		const error = new Error("boom");

		expect(toPayload(error)).toEqual({
			code: "UNEXPECTED",
			title: "Unexpected error",
			message: "boom",
		});
	});

	it("wraps a non-Error throw as UNEXPECTED via String()", () => {
		expect(toPayload("boom")).toEqual({
			code: "UNEXPECTED",
			title: "Unexpected error",
			message: "boom",
		});
	});
});
