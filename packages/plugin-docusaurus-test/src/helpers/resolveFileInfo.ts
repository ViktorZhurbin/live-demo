import fs from "fs";
import path from "path";
import { getPossiblePaths } from "shared/pathHelpers";
import type { PathWithAllowedExt } from "shared/types";

type ResolveFileInfo = {
  importPath: string;
  absolutePath: string;
};

export function resolveFileInfo({ absolutePath, importPath }: ResolveFileInfo) {
  // same helper should be used in web, check compiler/rollup
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
