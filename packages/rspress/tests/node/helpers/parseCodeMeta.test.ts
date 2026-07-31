import { describe, expect, it } from "vitest";
import { parseCodeMeta } from "~node/helpers/parseCodeMeta";

describe("parseCodeMeta", () => {
	it("returns isLive: false and no file for null/undefined meta", () => {
		expect(parseCodeMeta(null)).toEqual({ isLive: false, file: undefined });
		expect(parseCodeMeta(undefined)).toEqual({
			isLive: false,
			file: undefined,
		});
	});

	it("matches the bare 'live' word among other tokens", () => {
		expect(parseCodeMeta("live")).toEqual({ isLive: true, file: undefined });
		expect(parseCodeMeta("live title=Foo")).toEqual({
			isLive: true,
			file: undefined,
		});
	});

	it("doesn't match 'live' as a substring of another token", () => {
		expect(parseCodeMeta("live-off").isLive).toBe(false);
		expect(parseCodeMeta("alive").isLive).toBe(false);
		expect(parseCodeMeta("livestream").isLive).toBe(false);
	});

	it("matches 'playground' as an alias for 'live'", () => {
		expect(parseCodeMeta("playground")).toEqual({
			isLive: true,
			file: undefined,
		});
		expect(parseCodeMeta('file="./Button.tsx" playground')).toEqual({
			isLive: true,
			file: "./Button.tsx",
		});
	});

	it("extracts a file= value alongside live", () => {
		expect(parseCodeMeta('file="./Button.tsx" live')).toEqual({
			isLive: true,
			file: "./Button.tsx",
		});
	});

	it("extracts file= without live, for the 'left alone' case", () => {
		expect(parseCodeMeta('file="./Button.tsx"')).toEqual({
			isLive: false,
			file: "./Button.tsx",
		});
	});

	it("strips single, double, and backtick quotes around the file value", () => {
		expect(parseCodeMeta("file='./Button.tsx' live").file).toBe("./Button.tsx");
		expect(parseCodeMeta("file=`./Button.tsx` live").file).toBe("./Button.tsx");
	});

	// The tokenizer is quote-aware precisely so someone else's quoted value
	// can't smuggle in a bare `live`, which would turn a plain code block into
	// an editable demo with no way for the author to see why.
	it("doesn't match a trigger word inside another token's quoted value", () => {
		expect(parseCodeMeta('title="A live demo"').isLive).toBe(false);
		expect(parseCodeMeta('title="the playground page"').isLive).toBe(false);
		expect(parseCodeMeta('live title="A live demo"').isLive).toBe(true);
	});

	it("keeps a quoted file= value containing spaces in one piece", () => {
		expect(parseCodeMeta('file="./my demo.tsx" live').file).toBe(
			"./my demo.tsx",
		);
	});

	// @rspress/core's own parseFileFromMeta returns on its first match. Both
	// halves have to name the same file or the page renders one file's source
	// against another file's module graph.
	it("takes the first file= when there are several, matching core", () => {
		expect(parseCodeMeta('file="./A.tsx" file="./B.tsx" live').file).toBe(
			"./A.tsx",
		);
	});

	it("ignores a file= token with an empty value", () => {
		expect(parseCodeMeta("file= live")).toEqual({
			isLive: true,
			file: undefined,
		});
	});
});
