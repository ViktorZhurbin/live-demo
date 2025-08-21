import type { LiveDemoPluginOptions } from "@live-demo/core";
import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

interface SimpleRemarkPluginOptions {
  options?: LiveDemoPluginOptions["ui"];
}

/**
 * Simple remark plugin that only handles inline demos
 * to avoid MDX dependency conflicts
 */
export function createSimpleRemarkPlugin(
  pluginOptions: SimpleRemarkPluginOptions = {},
): Plugin<[], Root> {
  return (tree) => {
    // Only handle inline demos for now
    visit(tree, "code", (node: any) => {
      if (!node?.lang) return;

      const isLive = node.meta?.includes("live");
      const supportedLanguages = ["jsx", "tsx", "js", "ts"];

      if (!(isLive && supportedLanguages.includes(node.lang))) return;

      const entryFileName = `App.${node.lang}`;
      const baseProps = {
        entryFileName,
        files: { [entryFileName]: node.value },
      };

      const props = pluginOptions.options
        ? { ...baseProps, options: pluginOptions.options }
        : baseProps;

      Object.assign(node, {
        type: "mdxJsxFlowElement",
        name: "LiveDemo",
        attributes: Object.entries(props).map(([name, value]) => ({
          name,
          value: JSON.stringify(value),
          type: "mdxJsxAttribute",
        })),
      });
    });
  };
}
