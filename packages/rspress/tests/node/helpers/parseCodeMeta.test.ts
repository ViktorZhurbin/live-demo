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

	it("ignores a file= token with an empty value", () => {
		expect(parseCodeMeta("file= live")).toEqual({
			isLive: true,
			file: undefined,
		});
	});
});
