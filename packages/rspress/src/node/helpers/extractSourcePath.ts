/**
 * Pull the imported/re-exported path out of a single AST statement.
 *
 * Shared by the two things that need import specifiers at build time:
 * `analyzeModule` (a demo file read off disk) and `collectInlineImports` (an
 * inline block's source, which lives in the MDX and is never on disk). Keeping
 * one definition means both agree on which statements count as an import.
 */
import type { Program } from "@oxc-project/types";

/**
 * Covers plain imports and both re-export forms (`export { x } from` and
 * `export * from`) — anything else returns undefined. Type-only statements
 * (`import type`, `export type ... from`) are erased by the runtime compiler
 * (Sucrase), so they're skipped here too; mixed imports (`import { type A, B }`) keep
 * `importKind: "value"` and aren't affected.
 */
export function extractSourcePath(
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
