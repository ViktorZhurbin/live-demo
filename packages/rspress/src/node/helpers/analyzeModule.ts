/**
 * Read a single source file and extract the paths it imports
 *
 * This is deliberately just "source plus its import paths" — resolving those
 * paths, deciding which are local, and following them is `collectDemoFiles`'s
 * job, and bundling them is Rollup's at runtime.
 */
import type { Program } from "@oxc-project/types";
import type { PathWithAllowedExt } from "~shared/types";

import { readAndParseFile } from "./readAndParseFile";

/**
 * Extract the import/export path from an AST statement, if it has one.
 * Covers plain imports and both re-export forms (`export { x } from` and
 * `export * from`) — anything else returns undefined. Type-only statements
 * (`import type`, `export type ... from`) are erased by runtime Babel, so
 * they're skipped here too; mixed imports (`import { type A, B }`) keep
 * `importKind: "value"` and aren't affected.
 */
function extractSourcePath(
	statement: Program["body"][number],
): string | undefined {
	if (statement.type === "ImportDeclaration") {
		if (statement.importKind === "type") return undefined;
		return statement.source.value;
	} else if (statement.type === "ExportNamedDeclaration" && statement.source) {
		if (statement.exportKind === "type") return undefined;
		return statement.source.value;
	} else if (statement.type === "ExportAllDeclaration") {
		if (statement.exportKind === "type") return undefined;
		return statement.source.value;
	}
	return undefined;
}

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
