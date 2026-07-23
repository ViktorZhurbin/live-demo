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

// remarkPlugins is `[[remarkPlugin, { demoDataByRef, layoutPath, options }]]`;
// rspress types the entry loosely, matching getVirtualModuleHandler below.
const getRemarkLayoutPath = (plugin: any): string =>
	plugin.markdown?.remarkPlugins?.[0]?.[1]?.layoutPath;

/**
 * Guards the plugin's contract with @rspress/core: the shape of the returned
 * RspressPlugin and the hooks it wires up. This is the surface most exposed to
 * an @rspress/core major upgrade, so it's checked here independently of the
 * build-time helpers (which have their own tests).
 */
describe("liveDemoPluginRspress", () => {
	it("returns a plugin registered under the expected name", () => {
		const plugin = liveDemoPluginRspress();
		expect(plugin.name).toBe("@live-demo/rspress");
	});

	it("registers the remark transform with the default layout path", () => {
		const plugin = liveDemoPluginRspress();
		expect(plugin.markdown?.remarkPlugins).toHaveLength(1);
		// Layout is imported per-page by remarkPlugin, not registered globally.
		expect(plugin.markdown).not.toHaveProperty("globalComponents");
		expect(getRemarkLayoutPath(plugin)).toMatch(/LiveDemo\.tsx$/);
	});

	describe("virtual module (registered via rsbuild-plugin-virtual-module)", () => {
		const getVirtualModuleHandler = (plugin: any) => {
			const [virtualModulePlugin] = plugin.builderConfig?.plugins ?? [];
			return virtualModulePlugin.__options.virtualModules
				._live_demo_virtual_modules;
		};

		it("always includes the default modules (react + jsx-runtime + rspress theme)", async () => {
			const plugin = liveDemoPluginRspress();
			const handler = getVirtualModuleHandler(plugin);
			const virtualModule = await handler();

			expect(virtualModule).toContain(
				"importsMap.set('react', () => import('react'));",
			);
			expect(virtualModule).toContain("'@rspress/core/theme'");

			// Sucrase's automatic JSX runtime emits this import on the author's
			// behalf, so it can never be discovered by scanning demo source.
			// Without it every JSX demo fails with "Can't resolve".
			expect(virtualModule).toContain("'react/jsx-runtime'");
		});

		it("adds user-provided includeModules to the virtual module", async () => {
			const plugin = liveDemoPluginRspress({
				includeModules: ["@mantine/hooks"],
			});
			const handler = getVirtualModuleHandler(plugin);
			const virtualModule = await handler();

			expect(virtualModule).toContain("'@mantine/hooks'");
		});
	});
});
