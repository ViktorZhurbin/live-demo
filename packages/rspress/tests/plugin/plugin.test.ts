import { htmlTags } from "node/htmlTags";
import { describe, expect, it } from "vitest";
import { liveDemoPluginRspress } from "../../src/plugin/plugin";

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

  it("injects the Babel/Rollup CDN tags via builderConfig", () => {
    const plugin = liveDemoPluginRspress();
    expect(plugin.builderConfig?.html?.tags).toBe(htmlTags);
  });

  it("registers the remark transform and a global LiveDemo component", () => {
    const plugin = liveDemoPluginRspress();
    expect(plugin.markdown?.remarkPlugins).toHaveLength(1);
    expect(plugin.markdown?.globalComponents?.[0]).toMatch(/LiveDemo\.tsx$/);
  });

  describe("customLayout validation", () => {
    it("throws when the path does not end in LiveDemo.(jsx|tsx)", () => {
      expect(() =>
        liveDemoPluginRspress({ customLayout: "/some/path/MyLayout.tsx" }),
      ).toThrow(/customLayout/);
    });

    it.each([
      ["/x/LiveDemo.tsx"],
      ["/x/LiveDemo.jsx"],
      ["/x/LiveDemo.js"],
    ])("accepts %s and uses it as the global component", (customLayout) => {
      const plugin = liveDemoPluginRspress({ customLayout });
      expect(plugin.markdown?.globalComponents?.[0]).toBe(customLayout);
    });
  });

  describe("addRuntimeModules", () => {
    it("always includes the default modules (react + rspress theme)", async () => {
      const plugin = liveDemoPluginRspress();
      // The hook ignores both args; pass a minimal config + isProd=false.
      const modules = await plugin.addRuntimeModules?.({} as never, false);
      const virtualModule = modules?._live_demo_virtual_modules ?? "";

      expect(virtualModule).toContain("import * as i_0 from 'react';");
      expect(virtualModule).toContain("'@rspress/core/theme'");
    });

    it("adds user-provided includeModules to the virtual module", async () => {
      const plugin = liveDemoPluginRspress({ includeModules: ["@mantine/hooks"] });
      const modules = await plugin.addRuntimeModules?.({} as never, false);

      expect(modules?._live_demo_virtual_modules ?? "").toContain(
        "'@mantine/hooks'",
      );
    });
  });
});
