/**
 * Scans MDX files for `<code src="./Demo.tsx" />` elements and, for each one,
 * collects its files and external imports. Runs before MDX compilation, once
 * per build — reading files off disk only happens here. `remarkPlugin` reads
 * the results back out by path in a later phase.
 */
import path from "node:path";

import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import type { DemoDataByPath, UniqueImports } from "~shared/types";

import { collectDemoFiles } from "./helpers/collectDemoFiles";
import { getMdxAst } from "./helpers/getMdxAst";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import { resolveFileInfo } from "./helpers/resolveFileInfo";

/**
 * Scans `<code src>` demos only — inline ` ```lang live ` blocks are handled
 * entirely by `remarkPlugin` and never reach this function. `uniqueImports`
 * and `demoDataByPath` are both mutated in place.
 */
export const visitFilePaths = ({
	filePaths,
	uniqueImports,
	demoDataByPath,
}: {
	filePaths: string[];
	uniqueImports: UniqueImports;
	demoDataByPath: DemoDataByPath;
}) => {
	for (const filePath of filePaths) {
		if (!filePath.endsWith(".mdx")) continue;

		const mdxAst = getMdxAst(filePath);

		visit(mdxAst, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
			if (node.name !== "code") return;

			const importPath = getMdxJsxAttribute(node, "src");

			if (typeof importPath !== "string") return;

			const entryFile = resolveFileInfo({
				importPath,
				dirname: path.dirname(filePath),
				importer: filePath,
			});

			const { files, externalImports } = collectDemoFiles({
				...entryFile,
				mdxPath: filePath,
			});

			for (const externalImport of externalImports) {
				uniqueImports.add(externalImport);
			}

			// Keyed for the remark plugin, which runs later and looks up by the
			// same absolute path to rewrite this node into <LiveDemo files={...} />
			demoDataByPath[entryFile.absolutePath] = {
				files,
				entryFileName: entryFile.fileName,
			};
		});
	}
};
