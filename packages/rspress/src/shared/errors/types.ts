/**
 * Structured error payload types, split by responsibility: this file holds
 * shape (codes, tokens, payload), messages.ts holds wording.
 */

/**
 * Shared by import-resolution and prefix codes: `importer` is the file whose
 * import statement (or `file=`/`<code src>` reference) named `importPath`;
 * `mdxPath` is the MDX page that started the scan, when it differs from
 * `importer` (a demo file's own nested import, not the reference itself).
 */
type ImportResolutionTokens = {
	importPath: string;
	importer?: string;
	mdxPath?: string;
};

export type ErrorTokens = {
	/** The path genuinely doesn't exist under any supported extension. */
	IMPORT_NOT_RESOLVED: ImportResolutionTokens;
	/**
	 * The specifier's extension isn't one `getPossiblePaths` allows. Thrown
	 * before any existence check, so the file may or may not be on disk.
	 */
	IMPORT_EXTENSION_NOT_SUPPORTED: ImportResolutionTokens;
	/**
	 * A `file="..."` meta value doesn't start with `./`, `../`, `/`, or
	 * `<root>/` — the same four prefixes @rspress/core's own
	 * `remarkFileCodeBlock` accepts. Thrown by the pre-scan
	 * (`resolvePrefixedPath`), before core ever sees the file, so a malformed
	 * prefix fails clearly instead of resolving against the wrong base.
	 */
	UNSUPPORTED_FILE_PREFIX: ImportResolutionTokens;
	/**
	 * A `file="..."` value has no extension, or one outside the supported set.
	 * Thrown by the pre-scan (`visitFilePaths.ts`) before `resolveFileInfo` ever
	 * runs: `resolveFileInfo`'s own extension-guessing (`getPossiblePaths`)
	 * would happily resolve an extensionless path, but @rspress/core's real
	 * `remarkFileCodeBlock` reads `file=` literally off disk and has no such
	 * guessing — so letting the scan succeed here would just move the failure
	 * to a later, unrelated ENOENT at MDX-compile time. Deliberately doesn't
	 * apply to the deprecated `<code src>` alias, which keeps its existing
	 * extensionless resolution.
	 */
	FILE_META_EXTENSION_REQUIRED: ImportResolutionTokens;
	PARSE_FAILED: { filePath: string; errorMessage: string; codeframe?: string };
	/** Optional: getFnFromString is callable without an entry file name (tests, direct use). */
	NO_DEFAULT_EXPORT: { entryFileName?: string };
	PROP_PARSE_FAILED: { key: string };
	PROVIDER_MISSING: undefined;
	/**
	 * A named import the resolved package doesn't actually export. Checked by
	 * `runCode.ts` before evaluation, so it's a normal thrown LiveDemoError —
	 * unlike EXTERNAL_IMPORT_NOT_FOUND below.
	 */
	UNDEFINED_NAMED_IMPORT: { importName: string; pkg: string };
	/** Thrown as generated code inside a demo bundle (see messages.ts header). */
	EXTERNAL_IMPORT_NOT_FOUND: { importName: string };
	/** The lazily-imported Sucrase chunk failed to load (see loadCompiler.ts). */
	COMPILER_LOAD_FAILED: undefined;
	UNEXPECTED: undefined;
};

export type ErrorCode = keyof ErrorTokens;

export type LiveDemoErrorContent = {
	title: string;
	message?: string;
	hint?: string;
	notes?: string[];
};

/** The error table: one wording factory per error code. */
export type LiveDemoErrorMessages = {
	[K in ErrorCode]: (tokens: ErrorTokens[K]) => LiveDemoErrorContent;
};

/** Structured error payload: data + code, voice lives in messages.ts. */
export interface LiveDemoErrorPayload extends LiveDemoErrorContent {
	code: ErrorCode;
}
