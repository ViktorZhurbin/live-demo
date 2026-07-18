/**
 * Read a single source file and extract the paths it imports
 *
 * This is deliberately just "source plus its import paths" — resolving those
 * paths, deciding which are local, and following them is `collectDemoFiles`'s
 * job, and bundling them is Rollup's at runtime.
 */
import type { Program } from "@oxc-project/types";
import type { PathWithAllowedExt } from "shared/types";

import { readAndParseFile } from "./readAndParseFile";

/**
 * Extract the import/export path from an AST statement, if it has one.
 * Covers plain imports and both re-export forms (`export { x } from` and
 * `export * from`) — anything else returns undefined.
 */
function extractSourcePath(
	statement: Program["body"][number],
): string | undefined {
	if (statement.type === "ImportDeclaration") {
		return statement.source.value;
	} else if (statement.type === "ExportNamedDeclaration" && statement.source) {
		return statement.source.value;
	} else if (statement.type === "ExportAllDeclaration") {
		return statement.source.value;
	}
	return undefined;
}

/**
 * Read a file and list every path it imports or re-exports, both relative
 * (`./Button`) and external (`react`).
 */
export function analyzeModule(params: {
	filePath: PathWithAllowedExt;
	absolutePath: PathWithAllowedExt;
}): { content: string; dependencies: string[] } {
	const { code, ast } = readAndParseFile(params);

	const dependencies: string[] = [];
	for (const statement of ast.body) {
		const sourcePath = extractSourcePath(statement);
		if (sourcePath) {
			dependencies.push(sourcePath);
		}
	}

	return { content: code, dependencies };
}
