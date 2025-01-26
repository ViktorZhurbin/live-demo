import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { LiveDemoLanguage } from "shared/constants";
import type { LiveDemoProps } from "shared/types";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import type { DemoDataByPath } from "./plugin";

interface RemarkPluginProps {
	getDemoDataByPath: () => DemoDataByPath;
}

/**
 * Inject <LiveDemo /> into MDX
 */
export const remarkPlugin: Plugin<[RemarkPluginProps], Root> = ({
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

			Object.assign(node, {
				type: "mdxJsxFlowElement",
				name: "LiveDemo",
				attributes: getJsxAttributesFromProps(demoDataByPath[importPath]),
			});
		});

		// 2. Inline ```jsx/tsx ``` markdown code blocks
		visit(tree, "code", (node) => {
			if (!node?.lang) return;

			const isLive = node.meta?.includes("live");

			if (!(isLive && node.lang in LiveDemoLanguage)) return;

			const entryFileName = `App.${node.lang}`;

			Object.assign(node, {
				type: "mdxJsxFlowElement",
				name: "LiveDemo",
				attributes: getJsxAttributesFromProps({
					entryFileName,
					files: { [entryFileName]: node.value },
				}),
			});
			return;
		});
	};
};

function getJsxAttributesFromProps(
	props: LiveDemoProps,
): MdxJsxFlowElement["attributes"] {
	return Object.entries(props).map(([name, value]) => ({
		name,
		value: JSON.stringify(value),
		type: "mdxJsxAttribute",
	}));
}
