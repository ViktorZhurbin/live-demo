import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

enum LiveDemoLanguage {
  ts = "ts",
  tsx = "tsx",
  js = "js",
  jsx = "jsx",
}

export const remarkPlugin: Plugin<[], Root> = () => {
  return (tree, _vfile) => {
    /** 1. Transorm:
     * ```jsx live
     *    const a = 1 + 3;
     * ```
     * into:
     * <CodeBlock>
     *    const a = 1 + 3;
     * </CodeBlock>
     */
    visit(tree, "code", (node) => {
      if (!node?.lang) return;

      const isLive = node.meta?.includes("live");

      if (!(isLive && node.lang in LiveDemoLanguage)) return;

      Object.assign(node, {
        type: "mdxJsxFlowElement",
        name: "CodeBlock",
        children: [
          {
            type: "text",
            value: node.value,
          },
        ],
      });

      return;
    });
  };
};
