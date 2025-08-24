import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import path from "path";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { LiveDemoLanguage } from "./helpers/constants";
import { getFilesAndImports } from "./helpers/getFilesAndImports";
import { resolveFileInfo } from "./helpers/resolveFileInfo";

const CODE_BLOCK_NAME = "CodeBlock";

/**
 * Included by default for every demo
 **/
const defaultModules = ["react"];

export const remarkPlugin: Plugin<[], Root> = () => {
	const uniqueImports = new Set(defaultModules);

	return (tree, vfile) => {
		if (vfile.extname !== ".mdx" && vfile.extname !== ".md") return;
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

			const attributes = getJsxAttributesFromProps(props);

			Object.assign(node, {
				type: "mdxJsxFlowElement",
				name: CODE_BLOCK_NAME,
				attributes,
				// children: [
				//   {
				//     type: "text",
				//     value: code,
				//   },
				// ],
			});
		});
	};
};

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
	props: Record<string, unknown>
): MdxJsxFlowElement["attributes"] {
	return Object.entries(props).map(([name, value]) => ({
		name,
		value: JSON.stringify(value),
		type: "mdxJsxAttribute",
	}));
}
