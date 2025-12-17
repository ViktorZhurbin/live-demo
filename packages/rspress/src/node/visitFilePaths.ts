import path from "node:path";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import type { DemoDataByPath, UniqueImports } from "shared/types";
import { visit } from "unist-util-visit";
import { getFilesAndImports } from "./helpers/getFilesAndImports";
import { getMdxAst } from "./helpers/getMdxAst";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import { resolveFileInfo } from "./helpers/resolveFileInfo";

// Scan all MDX files
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

    try {
      const mdxAst = getMdxAst(filePath);

      // Find files containing `<code src='./path/to/Demo.tsx' />`,
      visit(mdxAst, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
        if (node.name !== "code") return;

        const importPath = getMdxJsxAttribute(node, "src");

        if (typeof importPath !== "string") return;

        const entryFile = resolveFileInfo({
          importPath,
          dirname: path.dirname(filePath),
        });

        const demo = getFilesAndImports({
          uniqueImports,
          ...entryFile,
        });

        demoDataByPath[importPath] = {
          files: demo.files,
          entryFileName: entryFile.fileName,
        };
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};
