/**
 * Remark plugin that rewrites MDX code blocks/elements into LiveDemo components,
 * using demo data `visitFilePaths` already collected during the earlier scan phase:
 * 1. External examples: <code src="./Component.tsx" /> → <LiveDemo files={...} />
 * 2. Inline examples: ```jsx live → <LiveDemo files={{App.jsx: "..."}} />
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
	demoDataByPath: DemoDataByPath; // Analyzed demo files
}

export const remarkPlugin: Plugin<[RemarkPluginProps], Root> = ({
	options,
	demoDataByPath,
}) => {
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

			// Resolves fine here, but the earlier scan phase (`visitFilePaths`)
			// never recorded it: `routeGenerated` runs once per dev server
			// process, so adding a new <code src> to an already-routed page
			// triggers this recompile without rescanning. The node is left
			// alone, which renders as an empty <code> element — indistinguishable
			// from a broken demo, hence the warning.
			//
			// `console.warn`, not `vfile.message`: rspress's MDX pipeline
			// collects vfile messages but never prints them, so that route is
			// silent in practice.
			if (!demoData) {
				console.warn(
					`[live-demo] No demo data for <code src="${importPath}"> in ${vfile.path}.\n` +
						"It will render as an empty <code> element. Restart the dev server to pick it up.",
				);
				return;
			}

			const props = getPropsWithOptions(demoData, options);

			Object.assign(node, {
				type: "mdxJsxFlowElement",
				name: "LiveDemo",
				attributes: getJsxAttributesFromProps(props),
			});
		});

		// Transform 2: Inline code blocks
		// Converts: ```jsx live\nexport const App = () => <div>Hello</div>\n```
		// To: <LiveDemo files={{App.jsx: "export const App..."}} entryFileName="App.jsx" />
		//
		// Unlike Transform 1, the block's source is never parsed, so its external
		// imports never reach `uniqueImports` and aren't added to the virtual
		// module. That asymmetry is intended: inline demos rely on the plugin's
		// `defaultModules`, on `includeModules`, or on an external demo elsewhere
		// on the site having pulled the same package in (`uniqueImports` is one
		// set for the whole build). Documented at
		// `website/docs/guide/inline/otherImports.mdx`.
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

function getPropsWithOptions(
	props: LiveDemoPropsFromPlugin,
	options?: LiveDemoPluginOptions["ui"],
) {
	return options ? { ...props, options } : props;
}

/**
 * {files: {...}, entryFileName: "App.tsx"}
 * → [{name: "files", value: "{...}", type: "mdxJsxAttribute"}, ...]
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
