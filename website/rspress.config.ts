import * as path from "node:path";
import { liveDemoPluginRspress } from "@live-demo/rspress";
import { defineConfig } from "@rspress/core";

export default defineConfig({
  root: path.join(__dirname, "docs"),

  plugins: [
    liveDemoPluginRspress({
      // customLayout: path.join(__dirname, "src/CustomLiveDemo/LiveDemo.tsx"),
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

  themeConfig: {
    enableScrollToTop: true,
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
