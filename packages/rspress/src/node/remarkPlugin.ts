/**
 * Remark plugin that transforms MDX code blocks and elements into LiveDemo components
 *
 * This plugin runs during MDX compilation and handles two types of interactive examples:
 * 1. External examples: <code src="./Component.tsx" /> → <LiveDemo files={...} />
 * 2. Inline examples: ```jsx live → <LiveDemo files={{App.jsx: "..."}} />
 *
 * Flow:
 * - Rspress build starts
 * - visitFilePaths() scans MDX files and builds example data (files + dependencies)
 * - This plugin transforms AST nodes into LiveDemo components with that data
 * - MDX compiler outputs React components
 */
import path from "node:path";

import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { isAllowedExt } from "~shared/pathHelpers";
import type {
	DemoDataByPath,
	LiveDemoPluginOptions,
	LiveDemoPropsFromPlugin,
} from "~shared/types";

import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import { resolveFileInfo } from "./helpers/resolveFileInfo";

interface RemarkPluginProps {
	options?: LiveDemoPluginOptions["ui"];
	getDemoDataByPath: () => DemoDataByPath; // Provides analyzed demo files
}

/**
 * Remark plugin that injects LiveDemo components into MDX
 *
 * @param options - UI configuration (theme, display mode, etc.)
 * @param getDemoDataByPath - Function that returns the analyzed demo data
 * @returns Transformer function that modifies the MDX AST
 */
export const remarkPlugin: Plugin<[RemarkPluginProps], Root> = ({
	options,
	getDemoDataByPath,
}) => {
	const demoDataByPath = getDemoDataByPath();

	return (tree, vfile) => {
		// Transform 1: External demo files
		// Converts: <code src="./Button.tsx" />
		// To: <LiveDemo files={{Button.tsx: "...", utils.ts: "..."}} entryFileName="Button.tsx" />
		visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
			if (node.name !== "code") return;

			const importPath = getMdxJsxAttribute(node, "src");

			if (typeof importPath !== "string") return;

			const { absolutePath } = resolveFileInfo({
				importPath,
				dirname: path.dirname(vfile.path),
			});

			const demoData = demoDataByPath[absolutePath];

			if (!demoData) return;

			const props = getPropsWithOptions(demoData, options);

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

			if (!(isLive && isAllowedExt(node.lang))) return;

			const entryFileName = `App.${node.lang}`;
			const baseProps = {
				entryFileName,
				files: { [entryFileName]: node.value },
			};

			const props = getPropsWithOptions(baseProps, options);

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
		value: JSON.stringify(value),
		type: "mdxJsxAttribute",
	}));
}
