import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as rollupBrowser from "@rollup/browser";
import { visitFilePaths } from "node/visitFilePaths";
import type { DemoDataByPath, UniqueImports } from "shared/types";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { bundleCode } from "web/ui/preview/LiveDemoCodeRunner/compiler/bundleCode";
import { getFnFromString } from "web/ui/preview/LiveDemoCodeRunner/compiler/getFnFromString";

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
	window.rollup = rollupBrowser as typeof window.rollup;

	// @rollup/browser fetches its wasm binary at runtime; under Node that
	// resolves to a file:// URL, which fetch doesn't support.
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

const buildDemo = (mdxFixture: string, importPath: string) => {
	const uniqueImports: UniqueImports = new Set();
	const demoDataByPath: DemoDataByPath = {};

	visitFilePaths({
		filePaths: [path.join(FIXTURES_DIR, "mdx", mdxFixture)],
		uniqueImports,
		demoDataByPath,
	});

	const demo = demoDataByPath[importPath];
	expect(demo, `no demo data for ${importPath}`).toBeDefined();

	return { demo, uniqueImports };
};

describe("build-time output feeds the runtime bundler", () => {
	it("runs a flat single-file demo end to end", async () => {
		const { demo } = buildDemo(
			"externalDemo.mdx",
			"../valid/SimpleComponent.tsx",
		);

		const code = await bundleCode(demo);
		const component = getFnFromString(code);

		expect(component({})).toBe("<div>Hello World</div>");
	});

	it("runs a demo with files in subfolders sharing a base name", async () => {
		const { demo } = buildDemo(
			"nestedDemo.mdx",
			"../valid/SharedNames/App.tsx",
		);

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
		const { demo } = buildDemo(
			"nestedDemo.mdx",
			"../valid/SharedNames/App.tsx",
		);

		const code = await bundleCode(demo);

		// Nothing may survive as an unresolved bare import — that would mean
		// Rollup treated a local file as an external package.
		expect(code).not.toMatch(/require\(["']\.\//);
		for (const filePath of Object.keys(demo.files)) {
			expect(code).not.toContain(`'${filePath}'`);
		}
	});

	it("runs a demo whose files import each other circularly", async () => {
		// The build step used to reject cycles outright. It doesn't, because
		// they're legal in ES modules and Rollup bundles them correctly — this
		// executes one to prove the rejection was blocking working demos, and
		// guards against reintroducing it.
		const { demo } = buildDemo("circularDemo.mdx", "../valid/Circular/App.tsx");

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
