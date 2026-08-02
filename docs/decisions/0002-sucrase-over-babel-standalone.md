# 0002. Replace `@babel/standalone` with Sucrase, recovering specifiers by scanning its output

- **Status:** Accepted, implemented in `cd36f42` (2026-07-23). Unreleased; ships in 3.0.
- **Scope:** `packages/rspress` browser runtime (`src/web/compiler/`).
- **Supersedes:** the compiler-choice conclusion in [0001](0001-drop-rollup-for-cjs-require-loop.md)'s "Consequences for future work" ("`@babel/standalone` stays").
  **Superseded by:** nothing.

## Context

[0001](0001-drop-rollup-for-cjs-require-loop.md) removed `@rollup/browser` and left
`@babel/standalone` as the sole compiler. Babel was step 1 of a four-step plan
to shrink the browser runtime; steps 2-4 were to try `@babel/core`, then oxc, then Sucrase.

`@babel/core` was tried first and abandoned: it needs `@rsbuild/plugin-node-polyfill`
plus hand-written shims in the _consuming site's_ build config (`node:assert`,
`node:path`, `node:util` imports outside its browser-export stub), and under real
brotli compression the saving was near zero — the ~92 kB headline was a gzip-only
artifact. That work is preserved at `git stash@{0}`.

`@babel/standalone` was, at that point, the only candidate clearing every hard
requirement:

1. Runs in the browser with zero build/server config from the consuming site.
2. TS + TSX + JSX → JS, JSX via the automatic runtime (`react/jsx-runtime`).
3. CommonJS output, because `moduleRunner.ts` evaluates each file with
   `new Function("require", "module", "exports", code)`.
4. Import specifiers and named-import names per file, from the same pass.
5. Syntax errors good enough for a live-editing error overlay — `CodeRunner.tsx`
   displays `error.message` verbatim, so whatever's in `.message` is the whole
   error UX.
6. Maintenance health.

oxc-transform failed requirement 1 (its wasm build needs COOP/COEP headers the
consuming site would have to set) and requirement 3 (no CJS output mode).
esbuild-wasm and `@swc/wasm-web` failed on size alone (13-19 MB raw). Sucrase's
npm package failed requirement 4 as shipped: its public API is
`{ transform, getFormattedTokens, getVersion }`, with no specifier or
named-import access.

The full comparison, including a wrong-then-corrected evaluation of Yuku
(`@yuku-analyzer/wasm` / `@yuku-codegen/wasm`), is in
`./0002-extras--trinspiler-research.md`.

## Decision

Ship Sucrase, and satisfy requirement 4 by scanning its _emitted_ `require(...)`
calls instead of reaching into its internals.

Two internal-access strategies were considered and rejected before landing on
the output scan:

- **Fork Sucrase**, pruning unused transformers (Flow, Jest-hoist,
  React-Hot-Loader) and hooking `CJSImportTransformer` to collect specifiers
  as it processes tokens.
- **`pnpm patch`** the published package to expose its already-existing
  `CJSImportProcessor.importInfoByPath` map (a superset of what's needed) with
  a diff estimated at ~100 lines.

Both were solving a problem that dissolves once the pipeline looks at Sucrase's
output instead of its internals: `transformCode.ts`'s `extractRequireSpecifiers`
recovers every specifier — including the injected `react/jsx-runtime` import,
which `importInfoByPath` never captures, since Sucrase's JSX transformer keeps
it in a private map and emits the `require` as text — by matching the two
literal shapes Sucrase always emits: `var _x = require('spec')` for anything
with bindings, and a statement-position `require('spec');` for a bare
`import 'x'`. The pattern is anchored to a line start, a `;`, or the `}`
closing a prepended interop helper, and is covered by
`transformCode.test.ts` against all ten import forms, so an upstream emit
change fails in CI instead of silently dropping a specifier.

This keeps Sucrase a plain, upgradable dependency: no fork, no patch, no deep
imports, only the public `transform` export.

### Requirement 4 was over-specified, and got split

The original requirement — "import specifiers _and_ named-import names, from
the same pass" — described Babel's implementation, not the actual need:
discover externals, and diagnose bad named imports. Splitting those apart is
what unblocked everything else:

- **Externals** are recovered by the output scan above.
- **Bad named imports** moved from an eager pre-evaluation check
  (`assertNamedImportsExist`, deleted along with the `namedImports` plumbing)
  to a `Proxy` in `moduleRunner.ts`'s `wrapExternal`, which throws when demo
  code _reads_ a property the package doesn't export. This is a real behavior
  change, not a wash: it fires during evaluation rather than before it,
  feature detection (`if (pkg.maybeThing)`) now throws instead of seeing
  `undefined` — though `'maybeThing' in pkg` is an undocumented escape hatch,
  since the Proxy has no `has` trap — and the trap needs an allowlist so
  `then` and symbol keys pass through (a proxy that throws on `then` turns
  "not a Promise" into an uncatchable rejection anywhere the namespace object
  gets awaited). `toJSON` is a similar, lower-stakes hole: `JSON.stringify(pkg)`
  throws a confusing `UNDEFINED_NAMED_IMPORT` for `'toJSON'` instead of the
  message being about the demo's own bad import.

### Other requirements, resolved without forking

- **Codeframes (requirement 5)** needed no fork. Sucrase's `err.loc =
{line, column}` is already populated — an earlier reading of the source that
  called it empty was wrong. `formatCodeframe.ts` builds a codeframe from
  `err.loc` and the source string in live-demo's own error path, shaped to
  match oxc's build-side output so both paths through `PARSE_FAILED` look
  identical. The caret pad is copied from the offending line's own leading
  characters (tabs included) rather than built from spaces, so it doesn't
  drift on tab-indented source.
- **JSX runtime (requirement 2)** needed no fork either: `jsxRuntime:
"automatic"` plus `production: true` are two option flags, not a hardcoded
  patch.

## What actually changed on disk

Deleted: `babel/babelTransformCode.ts`, the `namedImports` plumbing in
`runCode.ts`. Added: `transformCode.ts` (transform + `extractRequireSpecifiers`),
`formatCodeframe.ts`. Changed: `loadCompiler.ts`, `moduleRunner.ts` (the
`wrapExternal` Proxy), `CodeRunner.tsx`, `analyzeModule.ts`, error
types/messages.

Dependency `@babel/standalone` removed, `sucrase` added.

## Results

Measured with a real matched A/B: prod (`live-demo.pages.dev/guide/external/basic`,
pre-migration) against the feature deployment of the same page on the same
Cloudflare CDN, reading `performance.getEntriesByType('resource')` in a real
browser.

| Chunk                        | Raw       | Brotli, live CDN |
| ---------------------------- | --------- | ---------------- |
| `@babel/standalone` (before) | 2305.0 kB | 492.7 kB         |
| Sucrase (after)              | 201.0 kB  | 45.9 kB          |

An 11.5x reduction raw, 10.7x under real CDN brotli. (Earlier offline
measurements undersold this: quality-11 `zlib` brotli measured Babel at 396.9 kB,
about 19% below its real deployed footprint — Cloudflare compresses live
traffic at a lower quality than an offline max-quality pass.)

Combined with [0001](0001-drop-rollup-for-cjs-require-loop.md)'s Rollup removal,
the same demo page's compiler payload went from 847.5 kB to 51.2 kB brotli
(847.5 kB → 51.2 kB, ~3.07 MB less raw) — for a plugin whose pitch is being
leaner than `@rspress/plugin-playground`, that is close to the pitch itself.

Verification: `pnpm run check:all` green — 211/211 vitest (was 186), 22/22
Playwright e2e (was 21), knip clean. Two `UNDEFINED_NAMED_IMPORT` fixtures had
been passing for years for a reason that no longer applies (Babel's eager
check fired on code that was never executed; the Proxy only throws on an
actual read) and were fixed to read at module top level. One e2e assertion on
Babel's exact error string (`"Unterminated JSX contents"`) had to change to
Sucrase's less specific `"Unexpected token, expected \";\" (1:25)"`.

## Tradeoffs accepted

**No JSX closing-tag-mismatch or duplicate-prop diagnostics.**
`<div>Hello</span>` transpiles and runs; Sucrase parses the closing tag name
and discards it. Fixing this means owning parser code, which is exactly what
the output-scan strategy avoids, so it stays absent. In a live editor this is
silent wrongness rather than a crash, blunted by CodeMirror's auto-closing
tags preventing most of the mistake at the source. Documented in
`packages/rspress/CLAUDE.md`'s Limitations section; the first thing to
reconsider if real users complain.

**A demo string whose own line starts with `require(...)` is read as a real
import**, failing loudly as `EXTERNAL_IMPORT_NOT_FOUND`, never silently. A
regex over compiler output can't distinguish that shape from Sucrase's own
emit. Narrowed during review from "any comment or mid-line string" to just
this one case, and is asserted by a test that documents the gap rather than
hiding it.

**Unused value imports are now elided in `.js`/`.jsx`, not just `.ts`/`.tsx`.**
The `typescript` transform runs unconditionally instead of branching on file
extension. Bare `import './styles.css'` survives; only `import X from 'pkg'`
with `X` unused and `pkg` wanted purely for its side effect is affected —
rare in demo code.

**The maintenance bet on a near-dormant upstream.** Sucrase has had one
substantive release since 2023 (a 2025-11-19 tag was a dependency bump, not a
feature/fix release), single maintainer, 80 open issues. Accepted because it's
a token rewriter, not an AST compiler: unrecognized syntax mostly passes
through untouched rather than breaking, so new JS/TS syntax costs it far less
than it costs a full compiler. TS 5.2-era features (`satisfies`, `accessor`,
`using`, import attributes, `in`/`out` variance) are confirmed present in
3.35.1, and TypeScript has added almost no new syntax since — the ~23-month
gap plausibly reflects "done" more than "abandoned" for what a doc demo
exercises. The failure mode is a future grammar Sucrase's parser rejects,
which fails loudly as `PARSE_FAILED`, not silently — that grammar rejection is
the trigger to revisit, not another quiet release year. The bet is cheap to
hold: the migration touches only Sucrase's public `transform` export (no
fork, no patch, no deep imports), so reverting to Babel is roughly the size of
this diff in git history, not an unwind of vendored code.

## History: how the decision was reached

Recorded because the false starts are the reusable part. Full detail,
including every wrong turn, is in `./0002-extras--trinspiler-research.md`.

1. **Initial survey** measured six candidates (Babel, Sucrase, oxc-transform,
   Yuku, esbuild-wasm, swc-wasm) against the six requirements above and
   recommended staying on Babel — Sucrase's npm package lacked specifier
   access and its error `.loc` was (wrongly) recorded as empty.
2. **A "fork Sucrase" proposal** argued the missing specifier access and
   codeframes were artifacts of Sucrase's public API, not its engine, and
   sketched a pruned `sucrase-lite` fork.
3. **Independent review of that source** found `err.loc` actually is
   populated (the first pass's claim was wrong), that specifier extraction
   needs no fork (`CJSImportProcessor.importInfoByPath` already exists,
   `transform()` just needs to return it), that the fork's size claim
   (~87 kB raw) was optimistic by ~60% against a real build (~139 kB), and
   surfaced the one real gap neither pass had found — Sucrase doesn't
   validate JSX tag matching. Recommended `pnpm patch` over forking, ~100
   lines.
4. **Implementation** found the patch plan didn't survive contact either: the
   published package ships `dist/`, `dist/esm/`, and `dist/types/`, so
   patching `importInfoByPath` means editing the same logic in ~7 compiled
   files, and the injected `react/jsx-runtime` import is confirmed
   unreachable through `importInfoByPath` regardless (it lives in a private
   map, emitted as text). The output-scan strategy that shipped sidesteps
   both problems at once, recovering the injected import for free since by
   then it's just another `require` in the text.
5. **Independent review of the staged migration** re-verified the load-bearing
   claims (`err.loc` populated with and without `filePath`; zero Node
   builtins reachable from Sucrase's browser entry) and hardened what
   shipped: anchored the specifier regex to Sucrase's exact two emit shapes,
   added missing test coverage for the `Proxy` (including a
   namespace-heavy-import e2e test against the react-three-fiber demo, the
   one that motivated the whole effort), and fixed the codeframe's caret
   alignment on tab-indented source.
6. **A real CDN A/B**, deployed and measured in a live browser rather than
   estimated offline, produced the Results numbers above and confirmed every
   prior offline estimate had undersold the real saving, once again for the
   reason [0001](0001-drop-rollup-for-cjs-require-loop.md)'s Postscript
   already warned about: Cloudflare's live brotli compresses at a lower
   quality than an offline max-quality pass.

The pattern worth repeating on future swings: measure on the real CDN, refuse
the fork when a cheaper strategy satisfies the actual requirement, and fence
every accepted gap with a test and a doc rather than a comment.

## Consequences for future work

**Every remaining step of [0001](0001-drop-rollup-for-cjs-require-loop.md)'s
four-step compiler plan has now been tried.** Step 1 (drop Rollup) and step 4
(Sucrase) shipped; step 2 (`@babel/core`) and step 3 (oxc) were tried and
abandoned, both recorded above and in `./0002-extras--trinspiler-research.md`.

**The revisit triggers, if this ever needs to change again:** Sucrase shipping
a real, sustained release cadence again (weakens the maintenance-risk
argument, doesn't change the technical picture); oxc publishing a non-threaded
browser build of the transformer with a CJS output mode (would clear both of
its current disqualifiers at once); or a grammar Sucrase's parser actually
rejects surfacing in the wild (the concrete failure mode the maintenance bet
is watching for, not a calendar date).
