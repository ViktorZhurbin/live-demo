/**
 * Scans MDX files to find and analyze interactive example components
 *
 * This is Phase 1 of the build process (runs before MDX compilation):
 * 1. Scan all MDX files for <code src="./Demo.tsx" /> elements
 * 2. For each example, collect the entry file and everything it imports
 * 3. Collect external imports (react, lodash, etc.) for virtual module generation
 * 4. Store example data for the remark plugin to use later
 *
 * Why this phase is needed:
 * - We need to analyze demo files before MDX compilation
 * - Reading files off disk happens at build time (Node.js), not runtime (browser)
 * - External imports are collected once and bundled into a virtual module
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
		// Only process MDX files (skip .md, .ts, etc.)
		if (!filePath.endsWith(".mdx")) continue;

		// Parse MDX to AST for analysis
		const mdxAst = getMdxAst(filePath);

		// Find all <code src="..." /> elements in the MDX file
		visit(mdxAst, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
			if (node.name !== "code") return;

			// Extract the src attribute (import path to demo file)
			const importPath = getMdxJsxAttribute(node, "src");

			if (typeof importPath !== "string") return;

			// Resolve relative path to absolute path with file extension
			// Example: "./Button" → "/absolute/path/to/Button.tsx"
			const entryFile = resolveFileInfo({
				importPath,
				dirname: path.dirname(filePath),
			});

			// Collect the entry file plus everything it transitively imports,
			// keyed by path relative to the entry's directory
			const { files, externalImports } = collectDemoFiles(entryFile);

			// Collect all external package imports (react, lodash, etc.)
			// These will be bundled into a virtual module later
			for (const externalImport of externalImports) {
				uniqueImports.add(externalImport);
			}

			// This will be used by the remark plugin during MDX compilation
			demoDataByPath[entryFile.absolutePath] = {
				files,
				entryFileName: entryFile.fileName,
			};
		});
	}
};
