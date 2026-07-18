/**
 * Scans MDX files to find and analyze interactive example components
 *
 * This is Phase 1 of the build process, run before MDX compilation:
 * 1. Scan all MDX files for <code src="./Demo.tsx" /> elements
 * 2. For each one, collect the entry file and everything it imports —
 *    reading files off disk only happens here, at build time
 * 3. Collect external imports (react, lodash, etc.) once across all demos, to
 *    bundle into a single virtual module later
 * 4. Store demo data for the remark plugin, which runs after this phase
 *
 * Flow:
 * visitFilePaths → collectDemoFiles → analyzeModule → readAndParseFile → OXC parser
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
 * Scan all MDX files and build demo data for each live code example
 *
 * @param filePaths - Array of all MDX file paths to scan
 * @param uniqueImports - Set to collect all external package imports (mutated)
 * @param demoDataByPath - Object to store demo data (mutated)
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
			});

			const { files, externalImports } = collectDemoFiles(entryFile);

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
