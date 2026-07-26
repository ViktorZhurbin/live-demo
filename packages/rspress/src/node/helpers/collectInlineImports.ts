/**
 * Collect the external packages an inline (` ```lang live `) block imports.
 *
 * External demos get this for free: their files are read off disk and walked
 * by `collectDemoFiles`. An inline block's source only exists in the MDX, so
 * the scan parses it here instead — same oxc parser, same `extractSourcePath`,
 * just against a string rather than a file. The result feeds `uniqueImports`,
 * which is what the generated virtual module can resolve.
 */
import { parseSync } from "oxc-parser";
import type { LiveDemoLanguage } from "~shared/constants";
import { isRelativeImport } from "~shared/pathHelpers";

import { extractSourcePath } from "./extractSourcePath";

type CollectInlineImports = {
	code: string;
	/** The fence's language, already checked against `isAllowedExt` by the caller. */
	lang: LiveDemoLanguage;
};

/**
 * Parse failures are ignored rather than thrown, unlike `readAndParseFile`'s
 * `PARSE_FAILED`. An inline block is live-edited demo source: today a syntax
 * error in one renders an error in the preview pane, and making the scan
 * strict would turn that into a failed docs build — a categorically worse
 * failure mode for a typo in a code fence. A block that doesn't parse simply
 * contributes no imports; it still renders, and still reports its own error at
 * runtime. (oxc reports syntax errors on `parsed.errors` instead of throwing,
 * so ignoring them is just not reading that array — see `readAndParseFile`.)
 *
 * Relative imports are skipped: an inline demo is a single file with no
 * directory to resolve against, so `./utils` can't refer to anything.
 */
export const collectInlineImports = ({
	code,
	lang,
}: CollectInlineImports): string[] => {
	// Only the extension is load-bearing — it picks the parser's language.
	const parsed = parseSync(`inline.${lang}`, code, { sourceType: "module" });

	const imports: string[] = [];
	for (const statement of parsed.program.body) {
		const sourcePath = extractSourcePath(statement);
		if (sourcePath && !isRelativeImport(sourcePath)) {
			imports.push(sourcePath);
		}
	}

	return imports;
};
