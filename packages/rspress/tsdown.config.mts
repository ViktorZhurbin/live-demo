import { defineConfig } from "tsdown";
import lightningCssPlugin from "unplugin-lightningcss/rolldown";

export default defineConfig([
  // Browser-side: React components
  {
    entry: ["./src/web/index.ts"],
    platform: "browser",
    outDir: "dist/web",
    external: ["@types/react", "_live_demo_virtual_modules"],
    plugins: [lightningCssPlugin()],
    dts: true,
    hash: false,
  },
  // Rspress plugin
  {
    entry: ["./src/plugin/index.ts"],
    platform: "node",
    external: ["_live_demo_virtual_modules"],
    outDir: "dist",
    dts: true,
    hash: false,
  },
]);
