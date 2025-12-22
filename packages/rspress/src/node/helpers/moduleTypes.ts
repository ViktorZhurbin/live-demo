import type { PathWithAllowedExt } from "shared/types";

/**
 * Represents a module in the dependency graph
 * Contains source code, dependencies, and mapping for bundling
 */
export type Module = {
  id: number;
  fileName: PathWithAllowedExt;
  absolutePath: PathWithAllowedExt;
  dependencies: string[];
  content: string;
  mapping: Record<string, number>; // relative path → module ID
};
