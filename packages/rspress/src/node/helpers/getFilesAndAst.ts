/**
 * Read a source file and parse it into an AST
 *
 * Uses OXC (Oxidation Compiler) - a fast JavaScript/TypeScript parser written in Rust.
 * OXC is significantly faster than Babel for parsing large files.
 *
 * Why we parse to AST:
 * - To extract import/export statements for dependency analysis
 * - To build the module graph without executing the code
 */
import fs from "node:fs";
import type { Program } from "@oxc-project/types";
import { parseSync } from "oxc-parser";
import type { LiveDemoFiles, PathWithAllowedExt } from "shared/types";

type GetFilesAndAst = {
  fileName: string;
  absolutePath: PathWithAllowedExt;
};

/**
 * Read a source file and parse it to AST
 *
 * @param params - File information (name and absolute path)
 * @returns Object containing:
 *   - files: Object with fileName → content mapping
 *   - ast: Parsed AST (Abstract Syntax Tree) for dependency extraction
 */
export const getFilesAndAst = (
  params: GetFilesAndAst,
): { files: LiveDemoFiles; ast: Program } => {
  const { absolutePath, fileName } = params;

  const files: LiveDemoFiles = {};

  // Read file content
  const code = fs.readFileSync(absolutePath, { encoding: "utf8" });

  files[fileName] = code;

  // Parse with OXC (fast Rust-based parser)
  const parsed = parseSync(fileName, code, {
    sourceType: "module", // ES modules (import/export syntax)
  });

  const ast = parsed.program;

  return { files, ast };
};
