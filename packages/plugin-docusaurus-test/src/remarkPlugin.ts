// Local types to avoid workspace dependency issues
type LiveDemoPropsFromPlugin = {
  files: Record<string, string>;
  entryFileName: string;
};

type LiveDemoPluginOptions = {
  includeModules?: string[];
  ui?: Record<string, unknown>;
};

import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import path from "path";
import { LiveDemoLanguage } from "shared/constants";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { getFilesAndImports } from "./helpers/getFilesAndImports";
import { resolveFileInfo } from "./helpers/resolveFileInfo";
import { uniqueImports } from "./sharedData";

const LIVE_DEMO = "LiveDemo";

interface RemarkPluginProps {
  options?: LiveDemoPluginOptions["ui"];
}

export const remarkPlugin: Plugin<[RemarkPluginProps], Root> = ({
  options = {},
} = {}) => {
  return (tree, vfile) => {
    if (vfile.extname !== ".mdx" && vfile.extname !== ".md") return;
    /** 1. Transform:
     * ```jsx live
     *    const a = 1 + 3;
     * ```
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

    /** 2. Transform:
     * <LiveDemo src="../snippets/Component.tsx" />
     */
    visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
      if (node.name !== LIVE_DEMO) return;

      const importPath = getMdxJsxAttribute(node, "src");

      if (typeof importPath !== "string") return;

      const absolutePath = getAbsolutePath(importPath, vfile);

      const entryFile = resolveFileInfo({
        importPath,
        absolutePath,
      });

      const demo = getFilesAndImports({
        uniqueImports,
        ...entryFile,
      });

      const props = {
        files: demo.files,
        entryFileName: entryFile.fileName,
      };

      const combinedProps = getPropsWithOptions(props, options);
      const attributes = getJsxAttributesFromProps(combinedProps);

      Object.assign(node, {
        type: "mdxJsxFlowElement",
        name: LIVE_DEMO,
        attributes,
      });
    });
  };
};

function getPropsWithOptions(
  props: LiveDemoPropsFromPlugin,
  options?: LiveDemoPluginOptions["ui"],
) {
  return options ? { ...props, options } : props;
}

function getAbsolutePath(importPath: string, vfile: VFile) {
  // Resolve relative to the current MDX file location
  const mdxFileDir = path.dirname(vfile.path || vfile.history[0] || "");
  const absolutePath = path.resolve(mdxFileDir, importPath);

  return absolutePath;
}

function getMdxJsxAttribute(node: MdxJsxFlowElement, attrName: string) {
  const attribute = node.attributes?.find((attr) => {
    return attr.type === "mdxJsxAttribute" && attr.name === attrName;
  });

  return attribute?.value;
}

function getJsxAttributesFromProps(
  props: Record<string, unknown>,
): MdxJsxFlowElement["attributes"] {
  return Object.entries(props).map(([name, value]) => ({
    name,
    value: JSON.stringify(value),
    type: "mdxJsxAttribute",
  }));
}
