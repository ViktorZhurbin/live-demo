import * as path from "node:path";
import { rspressPluginLiveDemo } from "rspress-plugin-live-demo";
import { defineConfig } from "rspress/config";

export default defineConfig({
  root: path.join(__dirname, "docs"),

  plugins: [
    rspressPluginLiveDemo({
      ui: {
        resizablePanels: {
          autoSaveId: "live-demo-docs",
          defaultPanelSizes: { editor: 55, preview: 45 },
        },
      },
    }),
  ],

  title: "Live Demo",
  icon: "/icon-dark.png",

  logoText: "Live Demo",
  logo: {
    light: "/icon-light.svg",
    dark: "/icon-dark.svg",
  },

  markdown: {
    checkDeadLinks: true,
  },
  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/ViktorZhurbin/live-demo",
      },
    ],
  },

  route: {
    cleanUrls: true,
    exclude: ["**/snippets/**"],
  },

  builderConfig: {
    performance: process.env.BUNDLE_ANALYZE
      ? {
          bundleAnalyze: {
            analyzerMode: "static",
            openAnalyzer: true,
          },
        }
      : {},
  },
});
