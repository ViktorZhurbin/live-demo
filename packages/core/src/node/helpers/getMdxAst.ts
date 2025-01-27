import fs from "node:fs";
import { createProcessor } from "@mdx-js/mdx";
import remarkGFM from "remark-gfm";
import type { Processor } from "unified";

const processor = createProcessor({
  format: "mdx",
  remarkPlugins: [remarkGFM],
});

export const getMdxAst = (filepath: string): ReturnType<Processor["parse"]> => {
  const mdxSource = fs.readFileSync(filepath, "utf-8");
  const mdxAst = processor.parse(mdxSource);

  return mdxAst;
};
