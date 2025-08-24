import type { Plugin } from "@docusaurus/types";

export function pluginDocusaurusTest(): Plugin {
  return {
    name: "@live-demo/plugin-docusaurus-test",

    configureWebpack() {
      return {
        // Add any webpack configuration if needed
      };
    },

    async contentLoaded({ actions }) {
      // Configure remark plugins for MDX processing
      // biome-ignore lint/correctness/noUnusedVariables: explanation
      const { addRoute } = actions;
      // This will be handled by the preset configuration
    },

    async loadContent() {
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
