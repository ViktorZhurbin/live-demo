/**
 * Structured error payload types, split by responsibility: this file holds
 * shape (codes, tokens, payload), messages.ts holds wording.
 */

/**
 * Shared by both import-resolution codes: `importer` is the file whose
 * import statement (or `<code src>`) named `importPath`; `mdxPath` is the
 * MDX page that started the scan, when it differs from `importer` (a demo
 * file's own nested import, not the `<code src>` reference itself).
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
	PARSE_FAILED: { filePath: string; errorMessage: string; codeframe?: string };
	/** Optional: getFnFromString is callable without an entry file name (tests, direct use). */
	NO_DEFAULT_EXPORT: { entryFileName?: string };
	PROP_PARSE_FAILED: { key: string };
	PROVIDER_MISSING: undefined;
	/** Thrown as generated code inside a demo bundle (see messages.ts header). */
	UNDEFINED_NAMED_IMPORT: { importName: string; pkg: string };
	/** Thrown as generated code inside a demo bundle (see messages.ts header). */
	EXTERNAL_IMPORT_NOT_FOUND: { importName: string };
	/** The lazily-imported Babel/Rollup chunk failed to load (see loadCompiler.ts). */
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
