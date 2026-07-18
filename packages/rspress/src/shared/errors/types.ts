/**
 * Structured error payload types, mirroring castro's utils/errors.js split:
 * this file holds shape (codes, tokens, payload), messages.ts holds wording.
 */

export type ErrorTokens = {
	IMPORT_NOT_RESOLVED: { importPath: string };
	PARSE_FAILED: { filePath: string; errorMessage: string; codeframe?: string };
	INVALID_CUSTOM_LAYOUT: { customLayout: string };
	/** entryFileName is known at the CodeRunner call site but not inside getFnFromString itself. */
	NO_DEFAULT_EXPORT: { entryFileName?: string };
	PROP_PARSE_FAILED: { key: string };
	PROVIDER_MISSING: undefined;
	/** Thrown as generated code inside a demo bundle — see messages.ts header. */
	UNDEFINED_NAMED_IMPORT: { importName: string; pkg: string };
	/** Thrown as generated code inside a demo bundle — see messages.ts header. */
	EXTERNAL_IMPORT_NOT_FOUND: { importName: string };
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
