import fs from "node:fs";
import path from "node:path";
import { getPossiblePaths } from "shared/pathHelpers";
import type { PathWithAllowedExt } from "shared/types";

type ResolveFileInfo = {
	importPath: string;
	dirname: string;
};

export function resolveFileInfo({ dirname, importPath }: ResolveFileInfo) {
	const absolutePath = path.join(dirname, importPath);

	// same helper should be used in web, check compiler/rollup
	const pathsToCheck = getPossiblePaths(absolutePath);

	for (const absolutePath of pathsToCheck) {
		if (fs.existsSync(absolutePath)) {
			const fileName = path.basename(absolutePath) as PathWithAllowedExt;

			return { absolutePath, fileName };
		}
	}

	throw new Error(
		`[LiveDemo]: Couldn't resolve \`src=${importPath}\`.\nOnly .jsx and .tsx files are supported`,
	);
}
