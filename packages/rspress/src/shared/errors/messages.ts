/**
 * Every user-facing error string lives here, keyed by ErrorCode. Wording
 * lives here, structure (LiveDemoErrorPayload) lives in types.ts.
 *
 * EXTERNAL_IMPORT_NOT_FOUND backs a `throw` statement generated as text
 * inside `getVirtualModulesCode.ts`'s virtual module: that code can't import
 * LiveDemoError, so it splices `formatSplicedMessage(...)` in as a plain
 * string instead.
 */
import type { LiveDemoErrorMessages } from "./types";

export const errorMessages: LiveDemoErrorMessages = {
	IMPORT_NOT_RESOLVED: ({ importPath, importer, mdxPath }) => ({
		title: "Import couldn't be resolved",
		message: `Couldn't resolve \`${importPath}\`${importer ? ` from \`${importer}\`` : ""}.`,
		notes:
			mdxPath && mdxPath !== importer
				? [`Referenced from ${mdxPath}.`]
				: undefined,
		hint: "Check that the file exists and the path is correct.",
	}),

	IMPORT_EXTENSION_NOT_SUPPORTED: ({ importPath, importer, mdxPath }) => ({
		title: "Unsupported file extension",
		message: `\`${importPath}\`${importer ? ` from \`${importer}\`` : ""} isn't a supported file type.`,
		notes:
			mdxPath && mdxPath !== importer
				? [`Referenced from ${mdxPath}.`]
				: undefined,
		hint: "Only .js(x) and .ts(x) files are supported.",
	}),

	UNSUPPORTED_FILE_PREFIX: ({ importPath, importer, mdxPath }) => ({
		title: "Unsupported file path prefix",
		message: `\`file="${importPath}"\`${importer ? ` in \`${importer}\`` : ""} must start with \`./\`, \`../\`, \`/\`, or \`<root>/\`.`,
		notes:
			mdxPath && mdxPath !== importer
				? [`Referenced from ${mdxPath}.`]
				: undefined,
		hint: "See the docs on external demos for what each prefix resolves against.",
	}),

	FILE_META_EXTENSION_REQUIRED: ({ importPath, importer, mdxPath }) => ({
		title: "file= requires an explicit, supported extension",
		message: `\`file="${importPath}"\`${importer ? ` in \`${importer}\`` : ""} has no supported extension.`,
		notes:
			mdxPath && mdxPath !== importer
				? [`Referenced from ${mdxPath}.`]
				: undefined,
		hint: 'Add the file extension, e.g. `file="./Button.tsx"` — @rspress/core reads this path literally.',
	}),

	PARSE_FAILED: ({ filePath, errorMessage, codeframe }) => ({
		title: "Parse failed",
		message: `Failed to parse \`${filePath}\`: ${errorMessage}`,
		notes: codeframe ? [codeframe] : undefined,
		hint: "Fix the syntax error in this file.",
	}),

	MODULE_NOT_TRANSPILED: ({ filePath }) => ({
		title: "Module wasn't compiled",
		message: `\`${filePath}\` is part of this demo, but nothing the entry file imports leads to it, so it was never compiled.`,
		hint: "A dynamic `import()` only resolves a file some static import already pulled in. Import it normally, or use the value the static import gives you.",
	}),

	NO_DEFAULT_EXPORT: ({ entryFileName }) => ({
		title: "No default export",
		message: entryFileName
			? `\`${entryFileName}\` has no default export.`
			: "The demo has no default export.",
		hint: "The entry file must export a component: `export default` or a single named export (`export const App = ...`).",
	}),

	PROP_PARSE_FAILED: ({ key }) => ({
		title: "Prop parse failed",
		message: `Failed to parse LiveDemo prop \`${key}\`.`,
		hint: "The plugin JSON.stringifies props at build time. A parse failure means the two sides are out of sync.",
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

	// getVirtualModulesCode.ts splices this message *and hint*, unescaped,
	// inside a real template literal in generated code. `${importName}` there
	// is meant to stay as live interpolation (importName isn't known until
	// getImport() is called at demo-runtime). Never add a backtick or another
	// `${...}` to either field: both would corrupt that generated template
	// literal. `getVirtualModulesCode.test.ts`'s "executing the generated
	// module" block writes that module to disk and imports it, so such an edit
	// fails there rather than only in a browser.
	//
	// That generated throw is the fallback, not the usual path: demo code
	// reaches externals through `moduleRunner.ts`, which re-throws it as a real
	// LiveDemoError so the preview renders this title and hint rather than a
	// bare message string.
	EXTERNAL_IMPORT_NOT_FOUND: ({ importName }) => ({
		title: "Can't resolve import",
		message: `Can't resolve ${importName}.`,
		hint: "Every package a demo imports has to be a dependency of your docs site and imported by some demo's source at build time — an import typed into the browser editor can't resolve on its own.",
	}),

	COMPILER_LOAD_FAILED: () => ({
		title: "Couldn't load the demo compiler",
		message: "Failed to load Sucrase, so this demo can't be compiled.",
		hint: "Check your network connection, then edit the code to retry (or reload the page).",
	}),

	UNEXPECTED: () => ({
		title: "Unexpected error",
		message: "An unexpected error occurred.",
	}),
};
