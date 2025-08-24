import { defineConfig } from "tsdown";

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
    ],
  },
]);
