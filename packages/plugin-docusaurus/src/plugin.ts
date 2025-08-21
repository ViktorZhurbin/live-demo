import fs from "node:fs";
import path from "node:path";
import type { LoadContext, Plugin } from "@docusaurus/types";
import { htmlTags, type LiveDemoPluginOptions } from "@live-demo/core";
import { glob } from "glob";
// @ts-expect-error - webpack-virtual-modules doesn't have proper types
import VirtualModulesPlugin from "webpack-virtual-modules";
import { sharedDemoData } from "./shared";

export interface LiveDemoPluginDocusaurusOptions extends LiveDemoPluginOptions {
  /**
   * Path to custom layout file.
   * It will be injected as a global MDX component.
   *
   * The file has to have a default export.
   * Path needs to end with `LiveDemo.(jsx|tsx)`.
   *
   * @example
   * path.join(__dirname, "src/components/CustomLiveDemo/LiveDemo.tsx")
   **/
  customLayout?: string;
}

/**
 * Included by default for every demo
 **/
const defaultModules = ["react", "@docusaurus/theme-common"];

export default function liveDemoPluginDocusaurus(
  context: LoadContext,
  options: LiveDemoPluginDocusaurusOptions = {},
): Plugin {
  const { includeModules } = options;

  const extraModules = includeModules || [];
  const uniqueImports = new Set(defaultModules.concat(extraModules));

  // Helper function to generate virtual modules code
  const generateVirtualModulesCode = () => {
    // Create a simple virtual module that uses dynamic imports
    return `
// Virtual modules for live demos
console.log('[LiveDemo] Virtual module loaded');

const moduleMap = {
  'react': () => import('react'),
  '@docusaurus/theme-common': () => import('@docusaurus/theme-common')
};

async function getImport(moduleName, getDefault) {
  console.log('[LiveDemo] Requesting module:', moduleName);

  if (!moduleMap[moduleName]) {
    throw new Error(\`Cannot resolve module: \${moduleName}\`);
  }

  try {
    const module = await moduleMap[moduleName]();
    console.log('[LiveDemo] Module loaded:', moduleName, module);

    if (getDefault && module.default) {
      return module.default;
    }
    return module;
  } catch (error) {
    console.error('[LiveDemo] Failed to load module:', moduleName, error);
    throw error;
  }
}

export default getImport;
`;
  };

  // Create VirtualModulesPlugin instance with initial virtual modules
  const virtualModulesPlugin = new VirtualModulesPlugin({
    "node_modules/_live_demo_virtual_modules.js": generateVirtualModulesCode(),
  });

  return {
    name: "@live-demo/plugin-docusaurus",

    async loadContent() {
      // TODO: Re-enable external file processing once MDX dependency issues are resolved
      // For now, only support inline demos
      return { filePaths: [], demoDataByPath: {} };
    },

    async contentLoaded({ actions }) {
      // Virtual modules are already created in the plugin initialization
      console.log(
        "[LiveDemo] Virtual modules configured with webpack-virtual-modules",
      );
    },

    getClientModules() {
      return [path.resolve(__dirname, "../theme/client.js")];
    },

    configureWebpack(config, isServer, utils) {
      return {
        plugins: [virtualModulesPlugin],
      };
    },

    injectHtmlTags() {
      // Provide basic HTML tags for now
      return {
        headTags: htmlTags.map((tag) => ({
          tagName: tag.tag,
          attributes: tag.attrs,
        })),
      };
    },

    getThemePath() {
      // Point to the built theme directory within dist
      return path.resolve(__dirname, "../theme");
    },
  };
}
