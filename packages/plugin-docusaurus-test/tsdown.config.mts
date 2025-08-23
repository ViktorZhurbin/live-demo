import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    platform: "neutral",
    // outDir: "dist/theme",
    dts: true,
    // unbundle: true,
  },
]);
