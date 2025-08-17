import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig, type LibConfig } from "@rslib/core";

const sharedConfig: LibConfig = {
  format: "esm",
  syntax: "es2020",
  dts: { bundle: true },
  output: {
    cleanDistPath: true,
  },
};

export default defineConfig({
  lib: [
    {
      ...sharedConfig,
      source: {
        entry: { index: "src/node/index.ts" },
      },
      output: {
        ...sharedConfig.output,
        target: "node",
        distPath: { root: "dist/node" },
        externals: ["@types/react", "@mdx-js/mdx", "@types/mdast"],
      },
    },
    {
      ...sharedConfig,
      source: {
        entry: { index: "src/web/index.ts" },
      },
      output: {
        ...sharedConfig.output,
        target: "web",
        distPath: { root: "dist/web" },
        externals: ["@types/react", "_live_demo_virtual_modules"],
      },
      plugins: [pluginReact()],
    },
  ],

  performance: process.env.BUNDLE_ANALYZE
    ? {
        bundleAnalyze: {
          analyzerMode: "static",
          openAnalyzer: true,
        },
      }
    : {},
});
