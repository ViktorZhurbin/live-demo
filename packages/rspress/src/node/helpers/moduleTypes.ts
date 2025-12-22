/**
 * Type definitions for the module graph system
 *
 * The module graph represents all files and their dependencies for a demo.
 * It follows bundler architecture patterns (webpack, Rollup) for managing modules.
 */
import type { PathWithAllowedExt } from "shared/types";

/**
 * Represents a single module in the dependency graph
 *
 * A module is a JavaScript/TypeScript file with:
 * - Unique ID for referencing
 * - Source code content
 * - List of dependencies (imports)
 * - Mapping from relative paths to module IDs (for runtime resolution)
 *
 * Example module:
 * ```typescript
 * {
 *   id: 0,
 *   fileName: "Button.tsx",
 *   absolutePath: "/path/to/Button.tsx",
 *   dependencies: ["react", "./styles"], // What this file imports
 *   content: "import React from 'react'...",
 *   mapping: { "./styles": 1 } // Relative path → module ID for runtime
 * }
 * ```
 */
export type Module = {
  /** Unique sequential ID (0, 1, 2, ...) assigned during graph building */
  id: number;

  /** File name with extension (e.g., "Button.tsx") */
  fileName: PathWithAllowedExt;

  /** Absolute path on disk */
  absolutePath: PathWithAllowedExt;

  /** Array of import paths found in this module (relative and external) */
  dependencies: string[];

  /** Raw source code content */
  content: string;

  /**
   * Mapping from relative import path to module ID
   * Used at runtime to resolve imports: require("./Button") → modules[mapping["./Button"]]
   */
  mapping: Record<string, number>;
};
