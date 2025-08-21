import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "theme/index": "theme/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
});
