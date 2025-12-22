/**
 * Build a complete module dependency graph using breadth-first search (BFS)
 *
 * This is the core of the bundler logic, inspired by webpack and Rollup.
 *
 * Algorithm:
 * 1. Start with entry file (e.g., Button.tsx)
 * 2. Analyze it to get dependencies
 * 3. For each dependency:
 *    - If relative import (./utils): resolve → analyze → queue
 *    - If external import (react): collect for virtual module
 * 4. Process queue until empty
 * 5. Detect circular imports using a Set (O(1) lookup)
 *
 * Key features:
 * - Each module analyzed exactly once (cached by absolute path)
 * - Sequential IDs (0, 1, 2, ...) for deterministic ordering
 * - Mapping table for runtime module resolution
 * - O(1) circular import detection using Set
 *
 * Output example:
 * {
 *   modules: [
 *     {id: 0, fileName: 'Button.tsx', dependencies: ['react', './utils'], ...},
 *     {id: 1, fileName: 'utils.ts', dependencies: [], ...}
 *   ],
 *   externalImports: Set(['react'])
 * }
 */
import path from "node:path";
import { isRelativeImport } from "shared/pathHelpers";
import type { PathWithAllowedExt } from "shared/types";
import { analyzeModule } from "./analyzeModule";
import type { Module } from "./moduleTypes";
import { resolveFileInfo } from "./resolveFileInfo";

/**
 * Build complete dependency graph using breadth-first search
 *
 * Each module is analyzed exactly once, even if imported by multiple parents.
 * This follows the same pattern as webpack and Rollup for module graph construction.
 *
 * Performance optimizations:
 * - Module caching: Each file analyzed once (Map lookup)
 * - O(1) circular detection: Uses Set instead of array.includes()
 * - Sequential IDs: Modules get IDs 0, 1, 2, ... in BFS order
 *
 * @param params - Entry module file information
 * @returns Object containing:
 *   - modules: Array of all modules in dependency graph (with IDs and mappings)
 *   - externalImports: Set of external package names (for virtual module)
 * @throws Error if circular import is detected
 */
export function buildModuleGraph(params: {
  fileName: PathWithAllowedExt;
  absolutePath: PathWithAllowedExt;
}): {
  modules: Module[];
  externalImports: Set<string>;
} {
  // State for the BFS algorithm
  const moduleCache = new Map<string, Module>(); // absolutePath → Module (for deduplication)
  const externalImports = new Set<string>(); // External packages (react, lodash, etc.)
  const queuedModules = new Set<string>(); // Tracks modules in queue for O(1) circular detection
  const queue: Module[] = []; // BFS queue
  let nextId = 0; // Counter for sequential IDs

  /**
   * Helper function to analyze a module and assign it a unique ID
   *
   * IDs are assigned sequentially (0, 1, 2, ...) in BFS order.
   * This ensures deterministic output - same input always produces same IDs.
   */
  const analyzeWithId = (fileInfo: {
    fileName: PathWithAllowedExt;
    absolutePath: PathWithAllowedExt;
  }) => {
    const moduleItem = analyzeModule(fileInfo);
    moduleItem.id = nextId++; // Assign next sequential ID

    return moduleItem;
  };

  // Analyze and cache the entry module (starting point)
  const entryModule = analyzeWithId(params);
  moduleCache.set(params.absolutePath, entryModule);
  queue.push(entryModule);
  queuedModules.add(params.absolutePath); // Track for circular detection

  // BFS loop: Process queue until empty
  // Note: queue grows dynamically as we discover new dependencies
  for (const moduleItem of queue) {
    // Get the directory of the current module (for resolving relative imports)
    const dirname = path.dirname(moduleItem.absolutePath);

    // Process each dependency found in this module
    for (const dep of moduleItem.dependencies) {
      if (isRelativeImport(dep)) {
        // Relative import (./Button, ../utils/helper)
        // These are local files that need to be included in the bundle

        // Step 1: Resolve the import path to an actual file
        // Example: "./Button" → "/absolute/path/to/Button.tsx"
        const childInfo = resolveFileInfo({ importPath: dep, dirname });

        // Step 2: Check if we've already analyzed this file (deduplication)
        let childModule = moduleCache.get(childInfo.absolutePath);

        if (!childModule) {
          // First time seeing this file - analyze it
          childModule = analyzeWithId(childInfo);
          moduleCache.set(childInfo.absolutePath, childModule);
          queue.push(childModule); // Add to queue for processing
          queuedModules.add(childInfo.absolutePath); // Track for circular detection
        } else if (queuedModules.has(childInfo.absolutePath)) {
          // Circular import detected!
          // The module is in cache AND in the queue, meaning it's been queued but not yet
          // fully processed. This creates a dependency cycle.
          //
          // Example: A.tsx → B.tsx → A.tsx (circular!)
          //
          // Build error message showing the import chain
          const chain = Array.from(moduleCache.keys())
            .filter((key) => queuedModules.has(key))
            .map((p) => path.basename(p))
            .join(" → ");

          throw new Error(
            `[LiveDemo] Circular import detected: ${childModule.fileName}\n` +
              `Import chain: ${chain} → ${childModule.fileName}`,
          );
        }

        // Step 3: Build the mapping table for runtime module resolution
        // This allows the browser bundler to resolve: require("./Button") → modules[1]
        moduleItem.mapping[dep] = childModule.id;
      } else {
        // External import (react, lodash, etc.)
        // These are packages that will be provided by the virtual module
        externalImports.add(dep);
      }
    }
  }

  // Return all modules and external imports
  // Modules are returned from the cache (Map.values()) to ensure uniqueness
  return { modules: Array.from(moduleCache.values()), externalImports };
}
