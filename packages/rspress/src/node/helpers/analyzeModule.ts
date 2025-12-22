/**
 * Analyzes a single module to extract its dependencies
 *
 * This is the first step in building a module graph.
 * For each file, we:
 * 1. Parse it to an AST (Abstract Syntax Tree)
 * 2. Extract all import and export statements
 * 3. Return module info with placeholder values (ID and mapping filled later)
 *
 * Similar to webpack's createAsset() function.
 */
import type { Program } from "@oxc-project/types";
import type { PathWithAllowedExt } from "shared/types";
import { getFilesAndAst } from "./getFilesAndAst";
import type { Module } from "./moduleTypes";

/**
 * Extract the import/export path from an AST statement
 *
 * Handles three types of statements:
 * 1. import Button from './Button' → './Button'
 * 2. export { Button } from './Button' → './Button'
 * 3. export * from './components' → './components'
 *
 * @param statement - AST node from the module's body
 * @returns Import path if statement has one, undefined otherwise
 */
function extractSourcePath(
  statement: Program["body"][number],
): string | undefined {
  if (statement.type === "ImportDeclaration") {
    // Regular import: import React from 'react'
    return statement.source.value;
  } else if (statement.type === "ExportNamedDeclaration" && statement.source) {
    // Re-export with named exports: export { Button } from './Button'
    return statement.source.value;
  } else if (statement.type === "ExportAllDeclaration") {
    // Re-export all: export * from './components'
    return statement.source.value;
  }
  return undefined;
}

/**
 * Analyze a single module to extract its dependencies
 *
 * This function:
 * 1. Reads the file and parses it to AST
 * 2. Walks through all top-level statements
 * 3. Collects all import/export paths (both relative and external)
 * 4. Returns a Module object with placeholder ID and empty mapping
 *
 * The returned module is incomplete - buildModuleGraph will:
 * - Assign a unique ID
 * - Build the mapping (relative path → module ID)
 *
 * @param params - File information (name and absolute path)
 * @returns Module object with dependencies extracted, ID=-1, mapping={}
 *
 * @example
 * // For a file: Button.tsx
 * // import React from 'react'
 * // import './styles.css'
 * // export default Button
 *
 * analyzeModule({ fileName: 'Button.tsx', absolutePath: '/path/to/Button.tsx' })
 * // Returns:
 * // {
 * //   id: -1,
 * //   fileName: 'Button.tsx',
 * //   absolutePath: '/path/to/Button.tsx',
 * //   dependencies: ['react', './styles.css'],
 * //   content: "import React from 'react'...",
 * //   mapping: {}
 * // }
 */
export function analyzeModule(params: {
  fileName: PathWithAllowedExt;
  absolutePath: PathWithAllowedExt;
}): Module {
  const { absolutePath, fileName } = params;

  // Read file and parse to AST
  const { files, ast } = getFilesAndAst({ absolutePath, fileName });

  // Walk through all top-level statements and extract dependencies
  const dependencies: string[] = [];
  for (const statement of ast.body) {
    const sourcePath = extractSourcePath(statement);
    if (sourcePath) {
      dependencies.push(sourcePath);
    }
  }

  return {
    id: -1, // Placeholder - assigned by buildModuleGraph based on BFS order
    fileName,
    absolutePath,
    dependencies, // List of all imports/exports found
    content: files[fileName], // Raw source code
    mapping: {}, // Placeholder - populated during graph traversal
  };
}
