import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts", "./src/client.ts", "./src/remarkPlugin.ts"],
    platform: "neutral",
    // outDir: "dist/theme",
    dts: true,
    // unbundle: true,
    external: ["fs", "path", "unist-util-visit", "mdast-util-mdx"],
  },
]);
