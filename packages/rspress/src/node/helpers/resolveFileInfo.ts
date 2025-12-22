/**
 * Resolve import paths to actual file paths with extensions
 *
 * JavaScript/TypeScript allows imports without extensions:
 * - import Button from './Button' → could be Button.tsx, Button.ts, Button.jsx, Button.js
 *
 * This function tries all possible extensions to find the actual file.
 * Same logic is used in both build-time (Node) and runtime (browser Rollup).
 */
import fs from "node:fs";
import path from "node:path";
import { getPossiblePaths } from "shared/pathHelpers";
import type { PathWithAllowedExt } from "shared/types";

type ResolveFileInfo = {
  importPath: string; // Relative import (e.g., "./Button", "../utils/helper")
  dirname: string; // Directory to resolve from
};

/**
 * Resolve a relative import path to an absolute file path
 *
 * Tries common extensions: .tsx, .ts, .jsx, .js (and index files)
 *
 * @param dirname - Directory to resolve from (usually MDX file's directory)
 * @param importPath - Relative import path (e.g., "./Button", "../utils")
 * @returns Object with absolutePath and fileName
 * @throws Error if file cannot be resolved
 */
export function resolveFileInfo({ dirname, importPath }: ResolveFileInfo) {
  const absolutePath = path.join(dirname, importPath);

  // Get all possible file paths with different extensions
  // Example: "./Button" → ["./Button.tsx", "./Button.ts", "./Button.jsx", "./Button.js", "./Button/index.tsx", ...]
  const pathsToCheck = getPossiblePaths(absolutePath);

  for (const absolutePath of pathsToCheck) {
    if (fs.existsSync(absolutePath)) {
      const fileName = path.basename(absolutePath) as PathWithAllowedExt;

      return { absolutePath, fileName };
    }
  }

  throw new Error(
    `[LiveDemo]: Couldn't resolve \`${importPath}\`.\nOnly .js(x) and .ts(x) files are supported`,
  );
}
