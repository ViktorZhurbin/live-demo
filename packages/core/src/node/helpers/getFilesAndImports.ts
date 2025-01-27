import path from "node:path";
import { isRelativeImport } from "shared/pathHelpers";
import type { PathWithAllowedExt, UniqueImports } from "shared/types";
import { getFilesAndAst } from "./getFilesAndAst";
import { resolveFileInfo } from "./resolveFileInfo";

export const getFilesAndImports = (params: {
  fileName: PathWithAllowedExt;
  absolutePath: PathWithAllowedExt;
  uniqueImports: UniqueImports;
}) => {
  const { absolutePath, fileName, uniqueImports } = params;

  const { files, ast } = getFilesAndAst({
    absolutePath,
    fileName,
  });

  const allFiles = { ...files };

  for (const statement of ast.body) {
    if (statement.type !== "ImportDeclaration") continue;

    const importPath = statement.source.value;

    // Support local imports and multi-file demos
    if (isRelativeImport(importPath)) {
      const dirname = path.dirname(absolutePath);
      const fileInfo = resolveFileInfo({ importPath, dirname });

      const nested = getFilesAndImports({
        uniqueImports,
        ...fileInfo,
      });

      Object.assign(allFiles, nested.files);
    } else {
      uniqueImports.add(importPath);
    }
  }

  return {
    files: allFiles,
  };
};
