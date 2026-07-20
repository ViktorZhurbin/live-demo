/**
 * Reads a source file and parses it to an AST with OXC — a Rust-based
 * JS/TS parser, faster than Babel for this — so `analyzeModule` can extract
 * import/export statements without executing the code.
 */
import fs from "node:fs";

import type { Program } from "@oxc-project/types";
import { parseSync } from "oxc-parser";
import { LiveDemoError } from "~shared/errors";
import type { PathWithAllowedExt } from "~shared/types";

type ReadAndParseFile = {
	/**
	 * Path relative to the entry file's directory — the key this file gets in
	 * the `files` record (see `collectDemoFiles`). Not resolved against disk
	 * here, but its extension is important: `parseSync` below uses it to
	 * pick the parser's language, so don't replace it with a base name or an
	 * extension-less path.
	 */
	filePath: string;
	absolutePath: PathWithAllowedExt;
};

export const readAndParseFile = ({
	absolutePath,
	filePath,
}: ReadAndParseFile): { code: string; ast: Program } => {
	// resolveFileInfo already confirmed this path exists; if the read still
	// fails (permissions, a file removed in between), let fs's raw error
	// propagate rather than wrapping it.
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
		throw new LiveDemoError("PARSE_FAILED", {
			filePath,
			errorMessage: first.message,
			codeframe: first.codeframe ?? undefined,
		});
	}

	return { code, ast: parsed.program };
};
