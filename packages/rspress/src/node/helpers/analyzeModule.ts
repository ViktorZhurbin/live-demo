import type { Program } from "@oxc-project/types";
import type { PathWithAllowedExt } from "shared/types";
import { getFilesAndAst } from "./getFilesAndAst";
import type { Module } from "./moduleTypes";

/**
 * Extract source path from import/export statements
 */
function extractSourcePath(statement: Program["body"][number]): string | undefined {
  if (statement.type === "ImportDeclaration") {
    return statement.source.value;
  } else if (
    statement.type === "ExportNamedDeclaration" &&
    statement.source
  ) {
    // Handle: export { Button } from './Button'
    return statement.source.value;
  } else if (statement.type === "ExportAllDeclaration") {
    // Handle: export * from './components'
    return statement.source.value;
  }
  return undefined;
}

/**
 * Analyze a single module to extract its dependencies
 * Parses the file's AST to find all import and export statements
 *
 * @param params - Module file information
 * @returns Module with dependencies and content (ID and mapping assigned later)
 */
export function analyzeModule(params: {
  fileName: PathWithAllowedExt;
  absolutePath: PathWithAllowedExt;
}): Module {
  const { absolutePath, fileName } = params;

  const { files, ast } = getFilesAndAst({ absolutePath, fileName });

  // Extract all dependencies (imports and re-exports)
  const dependencies: string[] = [];
  for (const statement of ast.body) {
    const sourcePath = extractSourcePath(statement);
    if (sourcePath) {
      dependencies.push(sourcePath);
    }
  }

  return {
    id: -1, // Assigned by buildModuleGraph based on module order
    fileName,
    absolutePath,
    dependencies,
    content: files[fileName],
    mapping: {}, // Populated by buildModuleGraph during traversal
  };
}
