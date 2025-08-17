import { defineConfig, type UserConfig } from "tsdown";
import lightningCss from "unplugin-lightningcss/rolldown";

const sharedConfig: UserConfig = {
  dts: true,
};

export default defineConfig([
  {
    entry: ["./src/node/index.ts"],
    platform: "node",
    outDir: "dist/node",
    external: ["@types/react", "@mdx-js/mdx", "@types/mdast"],
    ...sharedConfig,
  },
  {
    entry: ["./src/web/index.ts"],
    platform: "browser",
    outDir: "dist/web",
    external: ["@types/react", "_live_demo_virtual_modules"],
    ...sharedConfig,
    plugins: [lightningCss()],
  },
]);
