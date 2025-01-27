import { pluginReact } from "@rsbuild/plugin-react";
import { type LibConfig, defineConfig } from "@rslib/core";

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
        externals: ["@types/react", "@mdx-js/mdx"],
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
        externals: [
          "@types/react",
          "@rspress/core",
          "_live_demo_virtual_modules",
        ],
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
