import path from "node:path";
import { isRelativeImport } from "shared/pathHelpers";
import type { PathWithAllowedExt } from "shared/types";
import { analyzeModule } from "./analyzeModule";
import type { Module } from "./moduleTypes";
import { resolveFileInfo } from "./resolveFileInfo";

/**
 * Build complete dependency graph using breadth-first search
 * Each module is analyzed exactly once, even if imported by multiple parents
 *
 * @param params - Entry module file information
 * @returns Object containing:
 *   - modules: Array of all modules in dependency graph
 *   - externalImports: Set of external package imports
 * @throws Error if circular import is detected
 */
export function buildModuleGraph(params: {
  fileName: PathWithAllowedExt;
  absolutePath: PathWithAllowedExt;
}): {
  modules: Module[];
  externalImports: Set<string>;
} {
  const moduleCache = new Map<string, Module>();
  const externalImports = new Set<string>();
  const queuedModules = new Set<string>();
  const queue: Module[] = [];
  let nextId = 0;

  // Helper to analyze and assign ID
  const analyzeWithId = (fileInfo: {
    fileName: PathWithAllowedExt;
    absolutePath: PathWithAllowedExt;
  }) => {
    const moduleItem = analyzeModule(fileInfo);
    moduleItem.id = nextId++;

    return moduleItem;
  };

  // Analyze and cache entry module
  const entryModule = analyzeWithId(params);
  moduleCache.set(params.absolutePath, entryModule);
  queue.push(entryModule);
  queuedModules.add(params.absolutePath);

  for (const moduleItem of queue) {
    // Process each dependency
    const dirname = path.dirname(moduleItem.absolutePath);

    for (const dep of moduleItem.dependencies) {
      if (isRelativeImport(dep)) {
        // Local import - resolve path
        const childInfo = resolveFileInfo({ importPath: dep, dirname });

        // Check cache first - only analyze if not already processed
        let childModule = moduleCache.get(childInfo.absolutePath);

        if (!childModule) {
          // Module not yet analyzed - analyze and cache it
          childModule = analyzeWithId(childInfo);
          moduleCache.set(childInfo.absolutePath, childModule);
          queue.push(childModule);
          queuedModules.add(childInfo.absolutePath);
        } else if (queuedModules.has(childInfo.absolutePath)) {
          // Circular import detected - module is in the queue but being referenced again
          const chain = Array.from(moduleCache.keys())
            .filter((key) => queuedModules.has(key))
            .map((p) => path.basename(p))
            .join(" → ");

          throw new Error(
            `[LiveDemo] Circular import detected: ${childModule.fileName}\n` +
              `Import chain: ${chain} → ${childModule.fileName}`,
          );
        }

        // Build mapping: relative path → module ID (now has real ID)
        moduleItem.mapping[dep] = childModule.id;
      } else {
        // External import - collect for virtual modules
        externalImports.add(dep);
      }
    }
  }

  return { modules: Array.from(moduleCache.values()), externalImports };
}
