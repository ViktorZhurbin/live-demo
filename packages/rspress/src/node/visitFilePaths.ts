/**
 * Scans MDX files for `<code src="./Demo.tsx" />` elements and, for each one,
 * collects its files and external imports. Runs before MDX compilation, once
 * per build — reading files off disk only happens here. `remarkPlugin` reads
 * the results back out by path in a later phase.
 */
import path from "node:path";

import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import type { DemoDataByRef, UniqueImports } from "~shared/types";

import { collectDemoFiles } from "./helpers/collectDemoFiles";
import { demoRefKey } from "./helpers/demoRefKey";
import { getMdxAst } from "./helpers/getMdxAst";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import { resolveFileInfo } from "./helpers/resolveFileInfo";

/**
 * Scans `<code src>` demos only — inline ` ```lang live ` blocks are handled
 * entirely by `remarkPlugin` and never reach this function. `uniqueImports`
 * and `demoDataByRef` are both mutated in place.
 */
export const visitFilePaths = ({
	filePaths,
	uniqueImports,
	demoDataByRef,
}: {
	filePaths: string[];
	uniqueImports: UniqueImports;
	demoDataByRef: DemoDataByRef;
}) => {
	for (const mdxRoutePath of filePaths) {
		if (!mdxRoutePath.endsWith(".mdx")) continue;

		const mdxAst = getMdxAst(mdxRoutePath);

		visit(mdxAst, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
			if (node.name !== "code") return;

			const importPath = getMdxJsxAttribute(node, "src");

			if (typeof importPath !== "string") return;

			const entryFile = resolveFileInfo({
				importPath,
				dirname: path.dirname(mdxRoutePath),
				importer: mdxRoutePath,
			});

			const { files, externalImports } = collectDemoFiles({
				...entryFile,
				mdxPath: mdxRoutePath,
			});

			for (const externalImport of externalImports) {
				uniqueImports.add(externalImport);
			}

			// Keyed by the raw `<code src>` reference so the remark plugin, which
			// runs later on a separate parse, can look it up without resolving
			// against disk a second time. See `demoRefKey`.
			const refKey = demoRefKey(mdxRoutePath, importPath);
			demoDataByRef[refKey] = {
				files,
				entryFileName: entryFile.fileName,
				// Kept per demo as well as folded into the sitewide set above: the
				// set decides what the virtual module can resolve, this list lets
				// the runtime prefetch just this demo's share of it.
				externalImports: [...externalImports],
			};
		});
	}
};
