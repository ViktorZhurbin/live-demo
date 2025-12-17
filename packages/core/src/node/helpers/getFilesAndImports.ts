import path from "node:path";
import { isRelativeImport } from "shared/pathHelpers";
import type { PathWithAllowedExt, UniqueImports } from "shared/types";
import { getFilesAndAst } from "./getFilesAndAst";
import { resolveFileInfo } from "./resolveFileInfo";

export const getFilesAndImports = (params: {
  fileName: PathWithAllowedExt;
  absolutePath: PathWithAllowedExt;
  uniqueImports: UniqueImports;
  visited?: Set<string>;
}) => {
  const { absolutePath, fileName, uniqueImports } = params;

  // Circular import detection
  const visited = params.visited || new Set<string>();

  if (visited.has(absolutePath)) {
    const chain = Array.from(visited)
      .map((p) => path.basename(p))
      .join(" → ");

    throw new Error(
      `[LiveDemo] Circular import detected: ${fileName}\n` +
        `Import chain: ${chain} → ${fileName}`,
    );
  }

  visited.add(absolutePath);

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
        visited,
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
