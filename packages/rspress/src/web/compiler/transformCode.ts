import { LiveDemoError } from "~shared/errors";

import { formatCodeframe } from "./formatCodeframe";
import { getTransform } from "./loadCompiler";

type TransformedFile = {
	code: string;
	/**
	 * Every import specifier this file references, relative and external
	 * alike, in source order — including ones Sucrase itself injects (the
	 * automatic JSX runtime's `react/jsx-runtime`). `moduleRunner`'s walk uses
	 * this to discover the rest of the demo's reachable files and its
	 * externals, without a second parse.
	 */
	importSpecifiers: string[];
};

/**
 * Transpile one file straight to CommonJS with a single Sucrase pass: the
 * `imports` transform turns every surviving `import`/`export` into plain
 * `require(...)`/`exports.x = ...`, alongside `jsx`/`typescript` for syntax.
 * `moduleRunner`'s `require` supplies the CJS globals (`require`, `module`,
 * `exports`) each file's `new Function` call expects.
 *
 * Import specifiers are recovered by scanning the *emitted* code for
 * `require(<string literal>)` rather than from a separate AST visitor: this
 * is Sucrase's own generated output, not user source, so every `require`
 * call present is one it emitted for an import (including the automatic JSX
 * runtime's injected `react/jsx-runtime`, which has no source-level import to
 * visit in the first place). A second parse of the original source couldn't
 * see that injection at all.
 *
 * The `typescript` transform is unconditional, unlike a Babel-preset-style
 * extension check: it's a no-op on plain JS, and `jsx` already handles
 * `.js(x)` fine, so branching on `filename` bought nothing but a place for a
 * `.ts`-only bug to hide (see tests/fixtures/README.md).
 *
 * `filePath` is deliberately not passed to `transform`: it only changes the
 * thrown message to `Error transforming <path>: ...`, and `filePath` is
 * already in the outer `PARSE_FAILED` message text — passing it would just
 * repeat the filename.
 */
export const transformCode = (
	code: string,
	filePath: string,
): TransformedFile => {
	const transform = getTransform();

	let result: { code: string };
	try {
		result = transform(code, {
			transforms: ["jsx", "typescript", "imports"],
			jsxRuntime: "automatic",
			production: true, // otherwise emits a react/jsx-dev-runtime import
			disableESTransforms: true, // modern browsers; skip ES5 downleveling
		});
	} catch (cause) {
		const err = cause as {
			message: string;
			loc?: { line: number; column: number };
		};

		throw new LiveDemoError(
			"PARSE_FAILED",
			{
				filePath,
				errorMessage: err.message,
				codeframe: formatCodeframe(code, filePath, err.loc),
			},
			{ cause },
		);
	}

	return {
		code: result.code,
		importSpecifiers: extractRequireSpecifiers(result.code),
	};
};

// Matches Sucrase's own emitted `require('x')` / `require("x")` calls. Safe to
// assume no escaped quotes inside the literal: these are import specifiers
// Sucrase itself wrote, not arbitrary strings from user code.
//
// Sucrase emits an import in exactly two shapes — `var _pkg = require('pkg')`
// for anything with bindings (including its own injected jsx-runtime import
// and every `export ... from` form), and a statement-position `require('x');`
// for a bare `import 'x'`. Anchoring to those two, rather than matching
// `require(` anywhere in the text, is what keeps the *words* `require('x')`
// in a demo's comment or mid-line string from being read as a real import.
// The leading `[\n;}]` covers all three positions a real one appears in:
// after a newline, after the `;` separating hoisted requires, and directly
// after the `}` closing an interop helper Sucrase prepends.
//
// Still fooled by a demo string whose *own* line starts with `require('x')`
// (a fenced code sample in a template literal, say): Sucrase passes strings
// through verbatim, so nothing short of parsing the output tells them apart.
// That yields a phantom specifier which fails loudly as
// EXTERNAL_IMPORT_NOT_FOUND, never silently — see the Limitations section in
// this package's CLAUDE.md.
//
// `transformCode.test.ts` asserts extraction for every import form. If a
// Sucrase upgrade ever changes these emit shapes, that suite fails rather
// than this regex quietly missing a specifier.
const REQUIRE_RE =
	/(?:^|[\n;}])[ \t]*(?:var [\w$]+ = )?require\((['"])([^'"]*)\1\)/g;

function extractRequireSpecifiers(code: string): string[] {
	const seen = new Set<string>();

	for (const match of code.matchAll(REQUIRE_RE)) {
		seen.add(match[2]);
	}

	return [...seen];
}
