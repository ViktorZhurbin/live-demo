import path from "node:path";

import { describe, expect, it } from "vitest";
import { resolveFileMetaEntry } from "~node/helpers/resolveFileMetaEntry";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");
const VALID_DIR = path.join(FIXTURES_DIR, "valid");

// Base args shared by most cases; each test overrides only what it exercises.
const baseArgs = {
	docDirname: VALID_DIR,
	docRoot: FIXTURES_DIR,
	mdxPath: "/abs/guide.mdx",
};

/**
 * Captures a thrown value so the assertions stay outside the `catch` — the
 * shape `transformCode.test.ts` uses, and what keeps oxlint's
 * `vitest(no-conditional-expect)` satisfied.
 */
const catchThrown = (run: () => unknown): unknown => {
	try {
		run();
	} catch (error) {
		return error;
	}
	return undefined;
};

describe("resolveFileMetaEntry", () => {
	it("resolves a `./` reference against the MDX file's own directory", () => {
		const result = resolveFileMetaEntry({
			...baseArgs,
			file: "./SimpleComponent.tsx",
		});

		expect(result.fileName).toBe("SimpleComponent.tsx");
		expect(result.absolutePath).toBe(
			path.join(VALID_DIR, "SimpleComponent.tsx"),
		);
	});

	it("resolves a `../` reference against the MDX file's own directory", () => {
		const result = resolveFileMetaEntry({
			...baseArgs,
			docDirname: path.join(VALID_DIR, "MultiFile"),
			file: "../SimpleComponent.tsx",
		});

		expect(result.fileName).toBe("SimpleComponent.tsx");
		expect(result.absolutePath).toBe(
			path.join(VALID_DIR, "SimpleComponent.tsx"),
		);
	});

	it("resolves a `/` reference against the doc root", () => {
		const result = resolveFileMetaEntry({
			...baseArgs,
			docRoot: VALID_DIR,
			file: "/SimpleComponent.tsx",
		});

		expect(result.fileName).toBe("SimpleComponent.tsx");
		expect(result.absolutePath).toBe(
			path.join(VALID_DIR, "SimpleComponent.tsx"),
		);
	});

	it("resolves a `<root>/` reference against process.cwd()", () => {
		// Same technique as resolvePrefixedPath.test.ts: build the `<root>/`
		// value from a real cwd-relative path so this runs against the actual
		// filesystem rather than a stubbed cwd.
		const relativeToCwd = path.relative(
			process.cwd(),
			path.join(VALID_DIR, "SimpleComponent.tsx"),
		);

		const result = resolveFileMetaEntry({
			...baseArgs,
			file: `<root>/${relativeToCwd}`,
		});

		expect(result.fileName).toBe("SimpleComponent.tsx");
		expect(result.absolutePath).toBe(
			path.join(VALID_DIR, "SimpleComponent.tsx"),
		);
	});

	it("returns exactly `{ absolutePath, fileName }`", () => {
		const result = resolveFileMetaEntry({
			...baseArgs,
			file: "./SimpleComponent.tsx",
		});

		expect(Object.keys(result).sort()).toEqual(["absolutePath", "fileName"]);
	});

	it("throws FILE_META_EXTENSION_REQUIRED for an extensionless `file=`", () => {
		const thrown = catchThrown(() =>
			resolveFileMetaEntry({ ...baseArgs, file: "./Button" }),
		);

		expect(thrown).toMatchObject({
			name: "LiveDemoError",
			payload: expect.objectContaining({
				code: "FILE_META_EXTENSION_REQUIRED",
			}),
		});
	});

	it("throws FILE_META_EXTENSION_REQUIRED for an unsupported extension (.css)", () => {
		const thrown = catchThrown(() =>
			resolveFileMetaEntry({ ...baseArgs, file: "./Button.css" }),
		);

		expect(thrown).toMatchObject({
			name: "LiveDemoError",
			payload: expect.objectContaining({
				code: "FILE_META_EXTENSION_REQUIRED",
			}),
		});
	});

	it("throws FILE_META_EXTENSION_REQUIRED for an unsupported extension (.md)", () => {
		const thrown = catchThrown(() =>
			resolveFileMetaEntry({ ...baseArgs, file: "./readme.md" }),
		);

		expect(thrown).toMatchObject({
			name: "LiveDemoError",
			payload: expect.objectContaining({
				code: "FILE_META_EXTENSION_REQUIRED",
			}),
		});
	});

	it("does not extension-guess a supported extension that doesn't match what's on disk", () => {
		// `SimpleComponent` only exists as `.tsx`. A `.ts` reference has a
		// supported, explicit extension, so this module must hand it straight
		// to resolveFileInfo without stripping/guessing — which then fails to
		// find `SimpleComponent.ts` outright rather than falling back to the
		// `.tsx` file that exists.
		const thrown = catchThrown(() =>
			resolveFileMetaEntry({ ...baseArgs, file: "./SimpleComponent.ts" }),
		);

		expect(thrown).toMatchObject({
			name: "LiveDemoError",
			payload: expect.objectContaining({ code: "IMPORT_NOT_RESOLVED" }),
		});
	});

	it("throws UNSUPPORTED_FILE_PREFIX for a `file=` with no recognized prefix", () => {
		const thrown = catchThrown(() =>
			resolveFileMetaEntry({ ...baseArgs, file: "Button.tsx" }),
		);

		expect(thrown).toMatchObject({
			name: "LiveDemoError",
			payload: expect.objectContaining({ code: "UNSUPPORTED_FILE_PREFIX" }),
		});
	});
});
