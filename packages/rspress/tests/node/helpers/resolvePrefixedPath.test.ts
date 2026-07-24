import path from "node:path";

import { describe, expect, it } from "vitest";
import { resolvePrefixedPath } from "~node/helpers/resolvePrefixedPath";

describe("resolvePrefixedPath", () => {
	it("resolves a `./` reference against the MDX file's own directory", () => {
		const result = resolvePrefixedPath({
			filePath: "./Button.tsx",
			docDirname: "/docs/guide",
			docRoot: "/docs",
		});

		expect(result).toEqual({
			dirname: "/docs/guide",
			importPath: "./Button.tsx",
		});
	});

	it("resolves a `../` reference against the MDX file's own directory", () => {
		const result = resolvePrefixedPath({
			filePath: "../snippets/Button.tsx",
			docDirname: "/docs/guide",
			docRoot: "/docs",
		});

		expect(result).toEqual({
			dirname: "/docs/guide",
			importPath: "../snippets/Button.tsx",
		});
	});

	it("resolves a `/` reference against docRoot, stripping the leading slash", () => {
		const result = resolvePrefixedPath({
			filePath: "/snippets/Button.tsx",
			docDirname: "/docs/guide",
			docRoot: "/docs",
		});

		expect(result).toEqual({
			dirname: "/docs",
			importPath: "snippets/Button.tsx",
		});
	});

	it("resolves a `<root>/` reference against process.cwd(), stripping the prefix", () => {
		const result = resolvePrefixedPath({
			filePath: "<root>/website/docs/snippets/Button.tsx",
			docDirname: "/docs/guide",
			docRoot: "/docs",
		});

		expect(result).toEqual({
			dirname: process.cwd(),
			importPath: "website/docs/snippets/Button.tsx",
		});
	});

	it("resolves `<root>/` to a real file relative to this process's cwd", () => {
		// Exercises the prefix against the real filesystem, unlike the pure
		// string-mapping assertions above.
		const relativeToCwd = path.relative(
			process.cwd(),
			path.join(__dirname, "../../fixtures/valid/SimpleComponent.tsx"),
		);

		const result = resolvePrefixedPath({
			filePath: `<root>/${relativeToCwd}`,
			docDirname: "/irrelevant",
			docRoot: "/irrelevant",
		});

		expect(path.join(result.dirname, result.importPath)).toBe(
			path.join(__dirname, "../../fixtures/valid/SimpleComponent.tsx"),
		);
	});

	it("throws a clear error for a path with no recognized prefix", () => {
		expect(() =>
			resolvePrefixedPath({
				filePath: "Button.tsx",
				docDirname: "/docs/guide",
				docRoot: "/docs",
			}),
		).toThrow(/must start with .*\.\/.*\.\.\/.*\/.*<root>\//);
	});

	it("names the importer and MDX page in an unsupported-prefix error", () => {
		expect(() =>
			resolvePrefixedPath({
				filePath: "~/Button.tsx",
				docDirname: "/docs/guide",
				docRoot: "/docs",
				importer: "/abs/guide.mdx",
				mdxPath: "/abs/guide.mdx",
			}),
		).toThrow(/file="~\/Button\.tsx"/);
	});
});
