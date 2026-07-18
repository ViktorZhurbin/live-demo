/**
 * Every user-facing error string lives here, keyed by ErrorCode. Wording
 * lives here, structure (LiveDemoErrorPayload) lives in types.ts.
 *
 * UNDEFINED_NAMED_IMPORT and EXTERNAL_IMPORT_NOT_FOUND back `throw`
 * statements generated as text into a demo's bundle (babelPluginTraverse.ts,
 * getVirtualModulesCode.ts): that code can't import LiveDemoError, so it
 * splices `formatSplicedMessage(...)` in as a plain string instead.
 */
import type { LiveDemoErrorMessages } from "./types";

export const errorMessages: LiveDemoErrorMessages = {
	IMPORT_NOT_RESOLVED: ({ importPath }) => ({
		title: "Import couldn't be resolved",
		message: `Couldn't resolve \`${importPath}\`.`,
		hint: "Only .js(x) and .ts(x) files are supported.",
	}),

	PARSE_FAILED: ({ filePath, errorMessage, codeframe }) => ({
		title: "Parse failed",
		message: `Failed to parse \`${filePath}\`: ${errorMessage}`,
		notes: codeframe ? [codeframe] : undefined,
		hint: "Fix the syntax error in this file.",
	}),

	INVALID_CUSTOM_LAYOUT: ({ customLayout }) => ({
		title: "Invalid customLayout path",
		message: `\`customLayout\` must end with \`LiveDemo.(jsx?|tsx)\` — got \`${customLayout}\`.`,
		hint: "Example: path.join(__dirname, './src/CustomLiveDemo/LiveDemo.tsx')",
	}),

	NO_DEFAULT_EXPORT: ({ entryFileName }) => ({
		title: "No default export",
		message: entryFileName
			? `\`${entryFileName}\` has no default export.`
			: "The demo has no default export.",
		hint: "The entry file must `export default` a component.",
	}),

	PROP_PARSE_FAILED: ({ key }) => ({
		title: "Prop parse failed",
		message: `Failed to parse LiveDemo prop \`${key}\`.`,
		hint: "The plugin JSON.stringifies props at build time — a parse failure means the two sides are out of sync.",
	}),

	PROVIDER_MISSING: () => ({
		title: "Missing LiveDemoProvider",
		message: "useLiveDemoContext was called outside a LiveDemoProvider.",
		hint: "Wrap this component tree in <LiveDemoProvider>.",
	}),

	UNDEFINED_NAMED_IMPORT: ({ importName, pkg }) => ({
		title: "Import is undefined",
		message: `Import '${importName}' from '${pkg}' is undefined.`,
		hint: "This export may not exist in this version of the package.",
	}),

	// getVirtualModulesCode.ts splices this message, unescaped, inside a real
	// template literal in generated code — `${importName}` there is meant to
	// stay live interpolation (importName isn't known until getImport() is
	// called at demo-runtime). Never add a backtick or another `${...}` to
	// this message: either would corrupt that generated template literal.
	EXTERNAL_IMPORT_NOT_FOUND: ({ importName }) => ({
		title: "Can't resolve import",
		message: `Can't resolve ${importName}.`,
	}),

	UNEXPECTED: () => ({
		title: "Unexpected error",
		message: "An unexpected error occurred.",
	}),
};
