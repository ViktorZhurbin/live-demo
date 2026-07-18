/**
 * Read a source file and parse it into an AST
 *
 * Uses OXC (Oxidation Compiler) - a fast JavaScript/TypeScript parser written in Rust.
 * OXC is significantly faster than Babel for parsing large files.
 *
 * Why we parse to AST:
 * - To extract import/export statements for dependency analysis
 * - To find every file a demo needs without executing the code
 */
import fs from "node:fs";

import type { Program } from "@oxc-project/types";
import { parseSync } from "oxc-parser";
import type { PathWithAllowedExt } from "~shared/types";

type ReadAndParseFile = {
	/** Path relative to the entry file's directory — used in error messages */
	filePath: string;
	absolutePath: PathWithAllowedExt;
};

/**
 * Read a source file and parse it to AST
 *
 * @param params - File information (relative path key and absolute path)
 * @returns the file's source `code` and its parsed `ast`
 */
export const readAndParseFile = (
	params: ReadAndParseFile,
): { code: string; ast: Program } => {
	const { absolutePath, filePath } = params;

	const code = fs.readFileSync(absolutePath, { encoding: "utf8" });

	const parsed = parseSync(filePath, code, {
		sourceType: "module",
	});

	// OXC reports syntax errors on `parsed.errors` rather than throwing, so a
	// broken file would otherwise slip through with a partial/empty AST. Fail
	// loudly here so the build surfaces it instead of shipping a demo that
	// silently drops imports.
	const errors = parsed.errors.filter((error) => error.severity === "Error");
	if (errors.length > 0) {
		const [first] = errors;
		throw new Error(
			`Failed to parse \`${filePath}\`: ${first.message}\n${first.codeframe ?? ""}`,
		);
	}

	return { code, ast: parsed.program };
};
