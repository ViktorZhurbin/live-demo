import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";
import { demoRefKey } from "~node/helpers/demoRefKey";
import { visitFilePaths } from "~node/visitFilePaths";
import type { DemoDataByRef, UniqueImports } from "~shared/types";
import { bundleCode } from "~web/compiler/bundleCode";
import { getFnFromString } from "~web/compiler/getFnFromString";

/**
 * The build step (node/) and the browser bundler (web/) never meet in the
 * unit tests: one produces the `files` record, the other consumes it, and
 * each is tested against its own hand-written fixtures. That seam is exactly
 * where a key-format change goes wrong — a build step keying files one way
 * and a resolver expecting another passes both halves' tests and still
 * renders nothing.
 *
 * These tests run a real fixture all the way through: MDX scan → module
 * graph → `files` → Rollup/Babel → executed component.
 */

const renderToString = (tag: unknown, props: { children?: unknown }) => {
	const children = props?.children;
	const inner = Array.isArray(children) ? children.join("") : (children ?? "");

	return `<${String(tag)}>${inner}</${String(tag)}>`;
};

vi.mock("_live_demo_virtual_modules", () => ({
	loadImports: async () => {},
	default: (moduleName: string) => {
		// Mirrors the plugin's `defaultModules`, which is what a real page's
		// virtual module is seeded with
		if (moduleName === "react") return {};
		if (moduleName === "react/jsx-runtime") {
			return {
				jsx: renderToString,
				jsxs: renderToString,
				Fragment: "fragment",
			};
		}
		throw new Error(`Can't resolve ${moduleName}`);
	},
}));

const FIXTURES_DIR = path.join(__dirname, "../fixtures");

beforeAll(() => {
	// @rollup/browser (loaded lazily by bundleCode) fetches its wasm binary at
	// runtime; under Node that resolves to a file:// URL, which fetch doesn't
	// support.
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (input, init) => {
		const url =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.href
					: input.url;

		if (url.startsWith("file://")) {
			return new Response(fs.readFileSync(fileURLToPath(url)));
		}

		return originalFetch(input, init);
	};
});

const buildDemo = (mdxFixture: string, demoPathUnderValid: string) => {
	const uniqueImports: UniqueImports = new Set();
	const demoDataByRef: DemoDataByRef = {};

	const mdxPath = path.join(FIXTURES_DIR, "mdx", mdxFixture);
	visitFilePaths({ filePaths: [mdxPath], uniqueImports, demoDataByRef });

	// Every fixture here references its demo as `../valid/<pathUnderValid>`, so
	// its stored key is the ref built from that src string (see `demoRefKey`).
	const key = demoRefKey(mdxPath, `../valid/${demoPathUnderValid}`);
	const demo = demoDataByRef[key];
	expect(demo, `no demo data for ${key}`).toBeDefined();

	return { demo, uniqueImports };
};

describe("build-time output feeds the runtime bundler", () => {
	it("runs a flat single-file demo end to end", async () => {
		const { demo } = buildDemo("externalDemo.mdx", "SimpleComponent.tsx");

		const code = await bundleCode(demo);
		const component = getFnFromString(code);

		expect(component({})).toBe("<div>Hello World</div>");
	});

	it("runs a demo with files in subfolders sharing a base name", async () => {
		const { demo } = buildDemo("nestedDemo.mdx", "SharedNames/App.tsx");

		// The build step must hand over distinct keys...
		expect(Object.keys(demo.files).sort()).toEqual([
			"App.tsx",
			"buttons/styles.ts",
			"cards/styles.ts",
		]);
		expect(demo.entryFileName).toBe("App.tsx");

		// ...and the runtime must resolve each import back to the right one.
		const code = await bundleCode(demo);
		const component = getFnFromString(code);

		expect(component({})).toBe("<div>BUTTON_STYLESCARD_STYLES</div>");
	});

	it("every file key the build emits is reachable by the runtime resolver", async () => {
		const { demo } = buildDemo("nestedDemo.mdx", "SharedNames/App.tsx");

		const code = await bundleCode(demo);

		// Nothing may survive as an unresolved bare import — that would mean
		// Rollup treated a local file as an external package.
		expect(code).not.toMatch(/require\(["']\.\//);
		for (const filePath of Object.keys(demo.files)) {
			expect(code).not.toContain(`'${filePath}'`);
		}
	});

	it("runs a demo whose entry file imports above its own directory", async () => {
		// `../` imports are supported by design (`pathHelpers.ts`'s
		// `resolveRelativePath`), but until now nothing ran one through the
		// full build → runtime seam — only unit-tested in isolation on the
		// shared helper both halves use.
		const { demo } = buildDemo("climbingDemo.mdx", "Climbing/App.tsx");

		expect(Object.keys(demo.files).sort()).toEqual([
			"../shared/theme.ts",
			"App.tsx",
		]);

		const code = await bundleCode(demo);
		const component = getFnFromString(code);

		expect(component({})).toBe("<div>THEMED</div>");
	});

	it("runs a demo whose files import each other circularly", async () => {
		// The build step used to reject cycles outright. It doesn't, because
		// they're legal in ES modules and Rollup bundles them correctly — this
		// executes one to prove the rejection was blocking working demos, and
		// guards against reintroducing it.
		const { demo } = buildDemo("circularDemo.mdx", "Circular/App.tsx");

		expect(Object.keys(demo.files).sort()).toEqual([
			"App.tsx",
			"even.ts",
			"odd.ts",
		]);

		const code = await bundleCode(demo);
		const component = getFnFromString(code);

		expect(component({})).toBe("<div>EVEN</div>");
	});
});
