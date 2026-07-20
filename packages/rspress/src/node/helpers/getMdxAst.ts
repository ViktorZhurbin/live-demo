/** Parses an MDX file into an AST, for `visitFilePaths` to scan for `<code>` elements. */
import fs from "node:fs";

import { createProcessor } from "@mdx-js/mdx";
import type { Root } from "mdast";
import remarkGFM from "remark-gfm";

const processor = createProcessor({
	format: "mdx",
	remarkPlugins: [remarkGFM],
});

export const getMdxAst = (filePath: string): Root => {
	const mdxSource = fs.readFileSync(filePath, "utf-8");
	const mdxAst = processor.parse(mdxSource);

	return mdxAst;
};
