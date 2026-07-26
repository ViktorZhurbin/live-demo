/**
 * Read a single source file and extract the paths it imports
 *
 * This is deliberately just "source plus its import paths" — resolving those
 * paths, deciding which are local, and following them is `collectDemoFiles`'s
 * job, and evaluating them is `web/compiler/moduleRunner.ts`'s at runtime.
 */
import type { PathWithAllowedExt } from "~shared/types";

import { extractSourcePath } from "./extractSourcePath";
import { readAndParseFile } from "./readAndParseFile";

type AnalyzeModule = {
	filePath: PathWithAllowedExt;
	absolutePath: PathWithAllowedExt;
};

/**
 * Read a file and list every path it imports or re-exports, both relative
 * (`./Button`) and external (`react`).
 */
export const analyzeModule = ({
	filePath,
	absolutePath,
}: AnalyzeModule): { content: string; dependencies: string[] } => {
	const { code, ast } = readAndParseFile({ filePath, absolutePath });

	const dependencies: string[] = [];
	for (const statement of ast.body) {
		const sourcePath = extractSourcePath(statement);
		if (sourcePath) {
			dependencies.push(sourcePath);
		}
	}

	return { content: code, dependencies };
};
