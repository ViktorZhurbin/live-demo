import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { LiveDemoLanguage } from "shared/constants";
import type {
  DemoDataByPath,
  LiveDemoPluginOptions,
  LiveDemoPropsFromPlugin,
} from "shared/types";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";

interface RemarkPluginProps {
  options?: LiveDemoPluginOptions["ui"];
  getDemoDataByPath: () => DemoDataByPath;
}

/**
 * Inject <LiveDemo /> into MDX
 */
export const remarkPlugin: Plugin<[RemarkPluginProps], Root> = ({
  options,
  getDemoDataByPath,
}) => {
  const demoDataByPath = getDemoDataByPath();

  return (tree, vfile) => {
    // 1. External demo, ie <code src="./Component.tsx" />
    visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
      if (node.name !== "code") return;

      const importPath = getMdxJsxAttribute(node, "src");

      if (typeof importPath !== "string" || !demoDataByPath[importPath]) {
        return;
      }

      const props = getPropsWithOptions(demoDataByPath[importPath], options);

      Object.assign(node, {
        type: "mdxJsxFlowElement",
        name: "LiveDemo",
        attributes: getJsxAttributesFromProps(props),
      });
    });

    // 2. Inline demo, ie ```jsx/tsx SOME_CODE ``` code blocks
    visit(tree, "code", (node) => {
      if (!node?.lang) return;

      const isLive = node.meta?.includes("live");

      if (!(isLive && node.lang in LiveDemoLanguage)) return;

      const entryFileName = `App.${node.lang}`;

      const props = getPropsWithOptions(
        {
          entryFileName,
          files: { [entryFileName]: node.value },
        },
        options,
      );

      Object.assign(node, {
        type: "mdxJsxFlowElement",
        name: "LiveDemo",
        attributes: getJsxAttributesFromProps(props),
      });
      return;
    });
  };
};

function getPropsWithOptions(
  props: LiveDemoPropsFromPlugin,
  options?: LiveDemoPluginOptions["ui"],
) {
  return options ? { ...props, options } : props;
}

function getJsxAttributesFromProps(
  props: LiveDemoPropsFromPlugin,
): MdxJsxFlowElement["attributes"] {
  return Object.entries(props).map(([name, value]) => ({
    name,
    value: JSON.stringify(value),
    type: "mdxJsxAttribute",
  }));
}
