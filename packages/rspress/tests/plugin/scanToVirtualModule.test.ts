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
 * handler's output for defaults/`includeModules`, which are populated at
 * plugin creation, before any scan — those assertions would pass even if
 * `routeGenerated`'s mutations never reached the handler. This exercises the
 * actual seam: scan a fixture that imports something *not* in defaults or
 * `includeModules`, then read it back off the same plugin instance.
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
});
