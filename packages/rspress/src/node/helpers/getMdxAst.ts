/**
 * Parses MDX files into Abstract Syntax Trees (AST)
 *
 * Used by visitFilePaths to analyze MDX files and find <code> elements
 * before the MDX compilation phase.
 */
import fs from "node:fs";
import { createProcessor } from "@mdx-js/mdx";
import remarkGFM from "remark-gfm";
import type { Processor } from "unified";

// MDX processor configured with GitHub Flavored Markdown support
const processor = createProcessor({
  format: "mdx",
  remarkPlugins: [remarkGFM],
});

/**
 * Parse an MDX file into an AST for analysis
 *
 * @param filepath - Absolute path to MDX file
 * @returns MDX AST (tree of nodes representing the document structure)
 */
export const getMdxAst = (filepath: string): ReturnType<Processor["parse"]> => {
  const mdxSource = fs.readFileSync(filepath, "utf-8");
  const mdxAst = processor.parse(mdxSource);

  return mdxAst;
};
