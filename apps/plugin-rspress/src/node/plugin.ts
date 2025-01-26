import path from "node:path";
import type { RspressPlugin } from "@rspress/core";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import type { LiveDemoProps, PluginOptions } from "shared/types";
import { visit } from "unist-util-visit";
import { getFilesAndImports } from "./helpers/getFilesAndImports";
import { getMdxAst } from "./helpers/getMdxAst";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import { getVirtualModulesCode } from "./helpers/getVirtualModulesCode";
import { resolveFileInfo } from "./helpers/resolveFileInfo";
import { remarkPlugin } from "./remarkPlugin";

export type DemoDataByPath = Record<string, LiveDemoProps>;

const demoDataByPath: DemoDataByPath = {};

/**
 * Included by default for every demo
 **/
const defaultModules = ["react", "rspress/theme"];

export function rspressPluginLiveDemo(options?: PluginOptions): RspressPlugin {
  const getDemoDataByPath = () => demoDataByPath;
  const extraModules = options?.includeModules || [];

  /**
   * Modules that will be available in demos,
   * Eg, you can use `import { Card } from "rspress/theme"` in any demo,
   * since it is included in defaultModules
   **/
  const imports = new Set(defaultModules.concat(extraModules));

  return {
    name: "rspress-plugin-live-demo",

    config(config) {
      config.markdown = config.markdown || {};
      // disable Rust compiler to use
      // markdown.remarkPlugins and markdown.globalComponents
      // https://rspress.dev/api/config/config-build#markdownglobalcomponents
      config.markdown.mdxRs = false;

      return config;
    },

    async routeGenerated(routes) {
      // Scan all MDX files
      for (const route of routes) {
        if (!route.absolutePath.endsWith(".mdx")) continue;

        try {
          const mdxAst = getMdxAst(route.absolutePath);

          // Find files containing `<code src='./path/to/Demo.tsx' />`,
          visit(mdxAst, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
            if (node.name !== "code") return;

            const importPath = getMdxJsxAttribute(node, "src");

            if (typeof importPath !== "string") return;

            const entryFile = resolveFileInfo({
              importPath,
              dirname: path.dirname(route.absolutePath),
            });

            const demo = getFilesAndImports({
              imports,
              ...entryFile,
            });

            demoDataByPath[importPath] = {
              files: demo.files,
              entryFileName: entryFile.fileName,
            };
          });
        } catch (e) {
          console.error(e);
          throw e;
        }
      }
    },

    async addRuntimeModules() {
      return {
        _live_demo_virtual_modules: getVirtualModulesCode(imports),
      };
    },

    builderConfig: {
      html: {
        tags: [
          // Load Babel and Rollup through script tags
          {
            tag: "script",
            head: true,
            attrs: {
              src: "https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js",
              integrity: "sha256-oShy6o2j0psqKWxRv6x8SC6BQZx1XyIHpJrZt3IA9Oo=",
              crossorigin: "anonymous",
            },
          },
          {
            tag: "script",
            head: true,
            attrs: {
              src: "https://cdn.jsdelivr.net/npm/@rollup/browser@4.31.0/dist/rollup.browser.min.js",
            },
          },
        ],
      },
    },

    markdown: {
      remarkPlugins: [
        [remarkPlugin, { getDemoDataByPath, options: options?.ui }],
      ],

      globalComponents: [
        options?.customLayout ??
          path.join(__dirname, "../../static/LiveDemo.tsx"),
      ],
    },
  };
}
