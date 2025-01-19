import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import type { DemoDataByPath } from "./pluginPlayground";

interface RemarkPluginProps {
	getDemoDataByPath: () => DemoDataByPath;
}

/**
 * Inject <Playground /> into MDX
 */
export const remarkPlugin: Plugin<[RemarkPluginProps], Root> = ({
	getDemoDataByPath,
}) => {
	const demoDataByPath = getDemoDataByPath();

	return (tree, vfile) => {
		// Transform <code src="./Component.tsx" />
		// into <Playground files={files}  />
		visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
			if (node.name !== "code") return;

			const importPath = getMdxJsxAttribute(node, "src");

			if (typeof importPath !== "string" || !demoDataByPath[importPath]) {
				return;
			}

			const { files } = demoDataByPath[importPath];

			Object.assign(node, {
				type: "mdxJsxFlowElement",
				name: "Playground",
				attributes: getMdxJsxAttributes([["files", JSON.stringify(files)]]),
			});
		});
	};
};

function getMdxJsxAttributes(
	attrs: Array<[string, string]>,
): MdxJsxFlowElement["attributes"] {
	return attrs.map(([name, value]) => ({
		name,
		value,
		type: "mdxJsxAttribute",
	}));
}
