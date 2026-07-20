import { describe, expect, it } from "vitest";
import { parseProps } from "~web/context/parseProps";
import type { LiveDemoStringifiedProps } from "~web/types";

describe("parseProps", () => {
	it("should parse stringified props correctly", () => {
		const stringifiedProps: LiveDemoStringifiedProps = {
			files: JSON.stringify({ "App.tsx": "export default () => <div />" }),
			entryFileName: JSON.stringify("App.tsx"),
			options: JSON.stringify({}),
		};

		const result = parseProps(stringifiedProps);

		expect(result.files).toEqual({ "App.tsx": "export default () => <div />" });
		expect(result.entryFileName).toBe("App.tsx");
		expect(result.options).toEqual({});
	});

	it("should handle empty objects", () => {
		const stringifiedProps: LiveDemoStringifiedProps = {
			files: JSON.stringify({}),
			entryFileName: JSON.stringify(""),
			options: JSON.stringify({}),
		};

		const result = parseProps(stringifiedProps);

		expect(result.files).toEqual({});
		expect(result.entryFileName).toBe("");
		expect(result.options).toEqual({});
	});

	it("throws, naming the offending prop, on malformed JSON", () => {
		const stringifiedProps = {
			files: "{invalid json}",
			entryFileName: JSON.stringify("App.tsx"),
			options: JSON.stringify({}),
		};

		expect(() => parseProps(stringifiedProps as any)).toThrow(
			/Failed to parse LiveDemo prop `files`/,
		);
	});
});
