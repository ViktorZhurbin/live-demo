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
	 * `remarkFileCodeBlock` accepts. Thrown via `resolvePrefixedPath`, called
	 * from `resolveFileMetaEntry.ts` — shared by the scan and `remarkPlugin`,
	 * whichever resolves the reference first — before core ever sees the
	 * file, so a malformed prefix fails clearly instead of resolving against
	 * the wrong base.
	 */
	UNSUPPORTED_FILE_PREFIX: ImportResolutionTokens;
	/**
	 * A `file="..."` value has no extension, or one outside the supported set.
	 * Thrown by `resolveFileMetaEntry.ts` — shared by the scan and
	 * `remarkPlugin`, whichever resolves the reference first — before
	 * `resolveFileInfo` ever runs: `resolveFileInfo`'s own extension-guessing
	 * (`getPossiblePaths`) would happily resolve an extensionless path, but
	 * @rspress/core's real `remarkFileCodeBlock` reads `file=` literally off
	 * disk and has no such guessing — so letting the scan succeed here would
	 * just move the failure to a later, unrelated ENOENT at MDX-compile time.
	 * Deliberately doesn't apply to the deprecated `<code src>` alias, which
	 * keeps its existing extensionless resolution.
	 */
	FILE_META_EXTENSION_REQUIRED: ImportResolutionTokens;
	PARSE_FAILED: { filePath: string; errorMessage: string; codeframe?: string };
	/**
	 * A file `runCode` never transpiled was reached at evaluation time. Only
	 * possible when something resolves against `files` that the walk over
	 * Sucrase's *emitted* imports didn't visit — see `moduleRunner.ts`'s
	 * `evaluate`.
	 */
	MODULE_NOT_TRANSPILED: { filePath: string };
	/** Optional: getEntryResult is callable without an entry file name (tests, direct use). */
	NO_DEFAULT_EXPORT: { entryFileName?: string };
	PROP_PARSE_FAILED: { key: string };
	PROVIDER_MISSING: undefined;
	/**
	 * A named import the resolved package doesn't actually export. Thrown by
	 * `moduleRunner.ts`'s `wrapExternal` — a Proxy `get` trap that fires when
	 * demo code reads the missing property, during evaluation. See its
	 * docblock for why the check lives there instead of an upfront scan.
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
export type LiveDemoErrorPayload = LiveDemoErrorContent & {
	code: ErrorCode;
};
