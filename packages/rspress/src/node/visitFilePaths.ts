import path from "node:path";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import type { DemoDataByPath, UniqueImports } from "shared/types";
import { visit } from "unist-util-visit";
import { buildModuleGraph } from "./helpers/buildModuleGraph";
import { getMdxAst } from "./helpers/getMdxAst";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import type { Module } from "./helpers/moduleTypes";
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

        const { modules, externalImports } = buildModuleGraph(entryFile);

        // Collect external imports
        for (const externalImport of externalImports) {
          uniqueImports.add(externalImport);
        }

        // Convert modules to files format
        const files: Record<Module["fileName"], Module["content"]> = {};

        for (const moduleItem of modules) {
          files[moduleItem.fileName] = moduleItem.content;
        }

        demoDataByPath[importPath] = {
          files,
          entryFileName: entryFile.fileName,
        };
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};
