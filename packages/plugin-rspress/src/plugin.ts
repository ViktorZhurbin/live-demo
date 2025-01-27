import path from "node:path";
import {
  type DemoDataByPath,
  type LiveDemoPluginOptions,
  getVirtualModulesCode,
  htmlTags,
  remarkPlugin,
  visitFilePaths,
} from "@live-demo/core";
import type { RspressPlugin } from "@rspress/core";

const demoDataByPath: DemoDataByPath = {};

/**
 * Included by default for every demo
 **/
const defaultModules = ["react", "rspress/theme"];

export function liveDemoPluginRspress(
  options?: LiveDemoPluginOptions,
): RspressPlugin {
  const getDemoDataByPath = () => demoDataByPath;

  const extraModules = options?.includeModules || [];
  const uniqueImports = new Set(defaultModules.concat(extraModules));

  return {
    name: "@live-demo/plugin-rspress",

    config(config) {
      config.markdown = config.markdown || {};
      // disable Rust compiler to use
      // markdown.remarkPlugins and markdown.globalComponents
      // https://rspress.dev/api/config/config-build#markdownglobalcomponents
      config.markdown.mdxRs = false;

      return config;
    },

    async routeGenerated(routes) {
      const filePaths = routes.map((route) => route.absolutePath);

      visitFilePaths({
        filePaths: filePaths,
        uniqueImports,
        demoDataByPath,
      });
    },

    async addRuntimeModules() {
      return {
        _live_demo_virtual_modules: getVirtualModulesCode(uniqueImports),
      };
    },

    builderConfig: {
      html: {
        tags: htmlTags,
      },
    },

    markdown: {
      remarkPlugins: [
        [remarkPlugin, { getDemoDataByPath, options: options?.ui }],
      ],

      globalComponents: [
        options?.customLayout ?? path.join(__dirname, "../static/LiveDemo.tsx"),
      ],
    },
  };
}
