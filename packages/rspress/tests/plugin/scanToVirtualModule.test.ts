import path from "node:path";

import type { RouteMeta } from "@rspress/core";
import type { PluginVirtualModuleOptions } from "rsbuild-plugin-virtual-module";
import { describe, expect, it, vi } from "vitest";

vi.mock("rsbuild-plugin-virtual-module", () => ({
	pluginVirtualModule: vi.fn<(options: PluginVirtualModuleOptions) => unknown>(
		(options) => ({
			name: "mock-plugin-virtual-module",
			__options: options,
		}),
	),
}));

const { liveDemoPluginRspress } = await import("../../src/plugin/plugin");

const FIXTURES_DIR = path.join(__dirname, "../fixtures");

const getVirtualModuleHandler = (plugin: any) => {
	const [virtualModulePlugin] = plugin.builderConfig?.plugins ?? [];
	return virtualModulePlugin.__options.virtualModules
		._live_demo_virtual_modules;
};

/**
 * `routeGenerated` and the virtual-module handler are joined only by the
 * mutable `uniqueImports` set closed over by both, plus an ordering
 * assumption (the handler runs after the scan). `plugin.test.ts` checks the
 * handler's output for defaults, which are populated at plugin creation,
 * before any scan — those assertions would pass even if `routeGenerated`'s
 * mutations never reached the handler. This exercises the actual seam: scan
 * a fixture that imports something *not* in defaults, then read it back off
 * the same plugin instance.
 */
describe("routeGenerated seams into the virtual module handler", () => {
	it("makes a scanned demo's external import resolvable from the live plugin object", async () => {
		const plugin = liveDemoPluginRspress();
		const handler = getVirtualModuleHandler(plugin);

		const mdxPath = path.join(FIXTURES_DIR, "mdx/nonDefaultExternalDemo.mdx");
		await plugin.routeGenerated?.(
			[{ absolutePath: mdxPath } as RouteMeta],
			false,
		);

		const virtualModule = await handler();
		expect(virtualModule).toContain(
			"importsMap.set('clsx', () => import('clsx'));",
		);
	});

	/**
	 * The inline half of the same seam. An inline block has no file on disk, so
	 * its imports reach `uniqueImports` only via `collectInlineImports` during
	 * the scan — nothing else in the pipeline would put them there.
	 */
	it("makes an inline demo's external import resolvable from the live plugin object", async () => {
		const plugin = liveDemoPluginRspress();
		const handler = getVirtualModuleHandler(plugin);

		const mdxPath = path.join(FIXTURES_DIR, "mdx/inlineDemoWithImports.mdx");
		await plugin.routeGenerated?.(
			[{ absolutePath: mdxPath } as RouteMeta],
			false,
		);

		const virtualModule = await handler();
		expect(virtualModule).toContain(
			"importsMap.set('luxon', () => import('luxon'));",
		);
		// Relative and type-only specifiers must never reach the module.
		expect(virtualModule).not.toContain("./helper");
		expect(virtualModule).not.toContain("type-only-package");
	});

	/**
	 * The `/`-prefixed form of `file=` resolves against `config.root`, read by
	 * this plugin's own `config` hook (see plugin.ts) — a value `routeGenerated`
	 * has no other way to learn. This exercises that hook wiring end to end,
	 * not just `resolvePrefixedPath`'s own string mapping (covered in its unit
	 * test): the negative case below shows the root genuinely has to flow
	 * through, not just happen to not throw regardless.
	 */
	it("resolves the `/` prefix against the root the config hook observed", async () => {
		const plugin = liveDemoPluginRspress();

		await plugin.config?.({ root: FIXTURES_DIR }, {} as never, false);

		const mdxPath = path.join(FIXTURES_DIR, "mdx/docRootPrefixDemo.mdx");

		// Resolves (rather than throwing) only if the `/` prefix found the file.
		await expect(
			plugin.routeGenerated?.([{ absolutePath: mdxPath } as RouteMeta], false),
		).resolves.toBeUndefined();
	});

	it("fails to resolve the `/` prefix if config() never ran (docRoot still at its default)", async () => {
		const plugin = liveDemoPluginRspress();

		const mdxPath = path.join(FIXTURES_DIR, "mdx/docRootPrefixDemo.mdx");

		// Without a `config()` call, `docRoot` stays at its own default ("docs"
		// under cwd), which doesn't contain this fixture's target file — proving
		// the value from `config()` is what makes the test above pass, not
		// coincidence.
		await expect(
			plugin.routeGenerated?.([{ absolutePath: mdxPath } as RouteMeta], false),
		).rejects.toThrow(/Couldn't resolve/);
	});
});
