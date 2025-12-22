/**
 * Remark plugin that transforms MDX code blocks and elements into LiveDemo components
 *
 * This plugin runs during MDX compilation and handles two types of live demos:
 * 1. External demos: <code src="./Component.tsx" /> → <LiveDemo files={...} />
 * 2. Inline demos: ```jsx live → <LiveDemo files={{App.jsx: "..."}} />
 *
 * Flow:
 * - Rspress build starts
 * - visitFilePaths() scans MDX files and builds demo data (files + dependencies)
 * - This plugin transforms AST nodes into LiveDemo components with that data
 * - MDX compiler outputs React components
 */
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
  getDemoDataByPath: () => DemoDataByPath; // Provides analyzed demo files
}

/**
 * Remark plugin that injects LiveDemo components into MDX
 *
 * @param options - UI configuration (theme, display mode, etc.)
 * @param getDemoDataByPath - Function that returns demo file data by import path
 * @returns Transformer function that modifies the MDX AST
 */
export const remarkPlugin: Plugin<[RemarkPluginProps], Root> = ({
  options,
  getDemoDataByPath,
}) => {
  // Get all analyzed demo data (populated by visitFilePaths during build)
  const demoDataByPath = getDemoDataByPath();

  return (tree, _vfile) => {
    // Transform 1: External demo files
    // Converts: <code src="./Button.tsx" />
    // To: <LiveDemo files={{Button.tsx: "...", utils.ts: "..."}} entryFileName="Button.tsx" />
    visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
      if (node.name !== "code") return;

      const importPath = getMdxJsxAttribute(node, "src");

      // Skip if no src attribute or demo data not found
      if (typeof importPath !== "string" || !demoDataByPath[importPath]) {
        return;
      }

      // Get demo data (files + entry point) and merge with UI options
      const props = getPropsWithOptions(demoDataByPath[importPath], options);

      // Transform the AST node from <code> to <LiveDemo>
      Object.assign(node, {
        type: "mdxJsxFlowElement",
        name: "LiveDemo",
        attributes: getJsxAttributesFromProps(props),
      });
    });

    // Transform 2: Inline code blocks
    // Converts: ```jsx live\nfunction App() { return <div>Hello</div> }\n```
    // To: <LiveDemo files={{App.jsx: "function App()..."}} entryFileName="App.jsx" />
    visit(tree, "code", (node) => {
      if (!node?.lang) return;

      const isLive = node.meta?.includes("live");

      // Only transform code blocks with 'live' meta and supported languages (jsx, tsx, js, ts)
      if (!(isLive && node.lang in LiveDemoLanguage)) return;

      // Create a single-file demo from the code block content
      const entryFileName = `App.${node.lang}`;
      const baseProps = {
        entryFileName,
        files: { [entryFileName]: node.value },
      };

      const props = getPropsWithOptions(baseProps, options);

      // Transform the AST node from code block to <LiveDemo>
      Object.assign(node, {
        type: "mdxJsxFlowElement",
        name: "LiveDemo",
        attributes: getJsxAttributesFromProps(props),
      });
      return;
    });
  };
};

/**
 * Merge UI options with demo props if options are provided
 * @param props - Demo data (files, entryFileName)
 * @param options - Optional UI configuration
 * @returns Props with or without options merged
 */
function getPropsWithOptions(
  props: LiveDemoPropsFromPlugin,
  options?: LiveDemoPluginOptions["ui"],
) {
  return options ? { ...props, options } : props;
}

/**
 * Convert props object to MDX JSX attributes format
 * Example: {files: {...}, entryFileName: "App.tsx"}
 * → [{name: "files", value: "{...}", type: "mdxJsxAttribute"}, ...]
 *
 * @param props - LiveDemo component props
 * @returns Array of MDX JSX attributes for the AST
 */
function getJsxAttributesFromProps(
  props: LiveDemoPropsFromPlugin,
): MdxJsxFlowElement["attributes"] {
  return Object.entries(props).map(([name, value]) => ({
    name,
    value: JSON.stringify(value), // Serialize to JSON string
    type: "mdxJsxAttribute",
  }));
}
