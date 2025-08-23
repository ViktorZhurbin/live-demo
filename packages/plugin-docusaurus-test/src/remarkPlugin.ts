import fs from "fs";
import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import path from "path";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

enum LiveDemoLanguage {
  ts = "ts",
  tsx = "tsx",
  js = "js",
  jsx = "jsx",
}

const CODE_BLOCK_NAME = "CodeBlock";

export const remarkPlugin: Plugin<[], Root> = () => {
  return (tree, vfile) => {
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
        name: CODE_BLOCK_NAME,
        children: [
          {
            type: "text",
            value: node.value,
          },
        ],
      });

      return;
    });

    /** 2. Transform:
     * <CodeBlock src="../snippets/Component.tsx" />
     *
     * into:
     *
     * <CodeBlock>
     *    const a = 1 + 3;
     * </CodeBlock>
     */
    visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
      if (node.name !== CODE_BLOCK_NAME) return;

      const importPath = getMdxJsxAttribute(node, "src");

      if (typeof importPath !== "string") {
        return;
      }

      // Resolve relative to the current MDX file location
      const mdxFileDir = path.dirname(vfile.path || vfile.history[0] || "");
      const absolutePath = path.resolve(mdxFileDir, importPath);

      const code = fs.readFileSync(absolutePath, {
        encoding: "utf8",
      });

      Object.assign(node, {
        type: "mdxJsxFlowElement",
        name: CODE_BLOCK_NAME,
        children: [
          {
            type: "text",
            value: code,
          },
        ],
      });
    });
  };
};

function getMdxJsxAttribute(node: MdxJsxFlowElement, attrName: string) {
  const attribute = node.attributes?.find((attr) => {
    return attr.type === "mdxJsxAttribute" && attr.name === attrName;
  });

  return attribute?.value;
}
