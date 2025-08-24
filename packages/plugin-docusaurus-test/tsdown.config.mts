// import virtual from "@rollup/plugin-virtual";
import { defineConfig } from "tsdown";
import lightningCss from "unplugin-lightningcss/rolldown";

export default defineConfig([
  {
    entry: ["./src/index.ts", "./src/remarkPlugin.ts"],
    platform: "neutral",
    dts: true,
    external: [
      "fs",
      "path",
      "unist-util-visit",
      "mdast-util-mdx",
      "@docusaurus/theme-common",
      "_live_demo_virtual_modules",
    ],
    plugins: [
      lightningCss(),
      // virtual({ _live_demo_virtual_modules: "exports.module = {}" }),
    ],
  },
]);
