import fs from "node:fs";
import path from "node:path";
import type { LoadContext, Plugin } from "@docusaurus/types";
import {
  getVirtualModulesCode,
  htmlTags,
  type LiveDemoPluginOptions,
  visitFilePaths,
} from "@live-demo/core";
import { glob } from "glob";
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

  return {
    name: "@live-demo/plugin-docusaurus",

    async loadContent() {
      // Find all markdown files in the Docusaurus content directories
      const contentPaths = [
        path.join(context.siteDir, "docs"),
        path.join(context.siteDir, "blog"),
        path.join(context.siteDir, "src/pages"),
      ].filter((p) => fs.existsSync(p));

      const filePaths: string[] = [];

      for (const contentPath of contentPaths) {
        const markdownFiles = await glob("**/*.{md,mdx}", {
          cwd: contentPath,
          absolute: true,
        });
        filePaths.push(...markdownFiles);
      }

      // Process the markdown files to extract live demo data
      visitFilePaths({
        filePaths,
        uniqueImports,
        demoDataByPath: sharedDemoData,
      });

      return { filePaths, demoDataByPath: sharedDemoData };
    },

    async contentLoaded({ actions }) {
      const { createData } = actions;

      // Create the virtual modules data
      const virtualModulesCode = getVirtualModulesCode(uniqueImports);

      await createData("live-demo-virtual-modules.js", virtualModulesCode);
    },

    getClientModules() {
      return [path.resolve(__dirname, "../theme/client.js")];
    },

    configureWebpack() {
      return {
        resolve: {
          alias: {
            "@live-demo/virtual-modules": path.resolve(
              __dirname,
              "../dist/virtual-modules.js",
            ),
          },
        },
      };
    },

    injectHtmlTags() {
      return {
        headTags: htmlTags.map((tag) => ({
          tagName: tag.tag,
          attributes: tag.attrs,
        })),
      };
    },

    getThemePath() {
      return path.resolve(__dirname, "../theme");
    },
  };
}
