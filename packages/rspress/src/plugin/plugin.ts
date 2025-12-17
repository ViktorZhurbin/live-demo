import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RspressPlugin } from "@rspress/core";
import { htmlTags } from "node/htmlTags";
import { getVirtualModulesCode } from "node/index";
import { remarkPlugin } from "node/remarkPlugin";
import { visitFilePaths } from "node/visitFilePaths";
import type { DemoDataByPath, LiveDemoPluginOptions } from "shared/types";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoDataByPath: DemoDataByPath = {};

interface LiveDemoPluginRspressOptions extends LiveDemoPluginOptions {
  /**
   * Path to custom layout file.
   * It will be injected as a global component:
   * @see https://rspress.dev/api/config/config-build#markdownglobalcomponents
   *
   * The file has to have a default export.
   * Path needs to end with `LiveDemo.(jsx|tsx)`.
   *
   * @example
   * path.join(__dirname, "src/CustomLiveDemo/LiveDemo.tsx")
   **/
  customLayout?: string;
}

/**
 * Included by default for every demo
 **/
const defaultModules = ["react", "rspress/theme"];

export function liveDemoPluginRspress(
  options?: LiveDemoPluginRspressOptions,
): RspressPlugin {
  const { customLayout, includeModules } = options ?? {};

  if (customLayout && !/LiveDemo\.(jsx?|tsx)$/.test(customLayout)) {
    throw new Error(
      "[LiveDemo]: `customLayout` path should end with 'LiveDemo.(jsx?|tsx)',\nExample: `path.join(__dirname, './src/CustomLiveDemo/LiveDemo.tsx')`",
    );
  }

  const getDemoDataByPath = () => demoDataByPath;

  const extraModules = includeModules || [];
  const uniqueImports = new Set(defaultModules.concat(extraModules));

  return {
    name: "@live-demo/rspress",

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
        customLayout ?? path.join(__dirname, "../static/LiveDemo.tsx"),
      ],
    },
  };
}
