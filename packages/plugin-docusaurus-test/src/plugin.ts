import type { Plugin } from "@docusaurus/types";
import { getVirtualModulesCode } from "./helpers/getVirtualModulesCode";
import { uniqueImports } from "./sharedData";

export function pluginDocusaurusTest(): Plugin {
  return {
    name: "@live-demo/plugin-docusaurus-test",

    configureWebpack(_config) {
      const fs = require("fs");
      const path = require("path");

      const nodeModulesDir = path.join(process.cwd(), "node_modules");

      // Generate the virtual modules file
      const virtualModulesCode = getVirtualModulesCode(uniqueImports);
      const virtualModulesPath = path.join(
        nodeModulesDir,
        "_live_demo_virtual_modules.js",
      );

      console.log({ _config, virtualModulesCode, virtualModulesPath });

      fs.writeFileSync(virtualModulesPath, virtualModulesCode);

      return {
        resolve: {
          alias: {
            _live_demo_virtual_modules: virtualModulesPath,
          },
        },
      };
    },

    async contentLoaded({ actions }) {
      // Configure remark plugins for MDX processing
      // biome-ignore lint/correctness/noUnusedVariables: explanation
      const { addRoute } = actions;
      // This will be handled by the preset configuration
    },

    async loadContent() {
      const fs = require("fs");
      const path = require("path");

      const nodeModulesDir = path.join(process.cwd(), "node_modules");

      // Generate the virtual modules file
      const virtualModulesCode = getVirtualModulesCode(uniqueImports);
      const virtualModulesPath = path.join(
        nodeModulesDir,
        "_live_demo_virtual_modules.js",
      );

      console.log({ virtualModulesCode, virtualModulesPath });

      fs.writeFileSync(virtualModulesPath, virtualModulesCode);

      // Return plugin configuration
      return {};
    },

    injectHtmlTags() {
      return {
        headTags: [
          // Load Babel and Rollup through script tags
          {
            tagName: "script",
            head: true,
            attributes: {
              src: "https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.3/babel.min.js",
            },
          },
          {
            tagName: "script",
            head: true,
            attributes: {
              src: "https://cdn.jsdelivr.net/npm/@rollup/browser@4.46.3/dist/rollup.browser.min.js",
            },
          },
        ],
      };
    },
  };
}
