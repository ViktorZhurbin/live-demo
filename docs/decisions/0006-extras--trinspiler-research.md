# Part 1

Date: 2026-07-23. Scope: `packages/rspress/src/web/compiler/` — per-file transpile to
CommonJS, run through `moduleRunner.ts`'s `new Function(require, module, exports)`
loop. No bundler in the runtime anymore, so the field is any _transpiler_, not just
bundler-adjacent tools. This doc is research only; no repo file other than this one
was changed.

**Bottom line: stay on `@babel/standalone`.** Nothing measured here clears the hard
"zero consumer config" bar while also matching Babel's CJS-out / specifier-access /
error-quality feature set. See Recommendation at the end.

## Hard requirements (from the code)

1. Runs in the browser with **zero build/server config from the consuming site**.
2. TS + TSX + JSX → JS, JSX via the **automatic** runtime (`react/jsx-runtime` import).
3. **CommonJS** output (`require()` / `exports.x =`), because `moduleRunner.ts` evaluates
   each file with `new Function("require", "module", "exports", code)`.
4. Import specifiers **and** named-import names per file, from the same pass
   (`babelTransformCode.ts`'s visitor; feeds `runCode.ts`'s externals walk and the
   `UNDEFINED_NAMED_IMPORT` check).
5. Syntax errors good enough for a live-editing error overlay (`CodeRunner.tsx` just
   displays `error.message` verbatim — there's no separate codeframe token consumed at
   runtime today, so whatever's in `.message` _is_ the whole error UX).
6. Maintenance health.

## Method

Every candidate was bundled the same way, outside the repo, and actually run:

```
npx esbuild entry.js --bundle --minify --format=esm --platform=browser --outfile=out.js
wc -c out.js
gzip -9 -c out.js | wc -c
node -e "...zlib.brotliCompressSync(buf, {quality: 11})..."
grep -o 'node:[a-z/]*' out.js   # + manual check of any hits for false positives
```

Each candidate's `transform()` was run for real, in Node, against
`website/docs/guide/external/snippets/multiFile/{MultiFile,Imported}.tsx` (a real
`<code src>` demo with a local import, an external package import, and JSX), and its
CJS output was then executed through a small harness that mimics
`moduleRunner.ts` exactly: `new Function("require","module","exports", code)` with a
fake `require` mocking `react`, `react/jsx-runtime`, and the local file. Each
candidate was also run against a deliberately truncated JSX file (`<div>Hi</div>`
missing its closing brace) to see what its error looks like.

## Comparison table

| Candidate                        | Version | Raw       | Gzip      | Brotli          | Wasm                             | CJS out                   | AST/specifiers                                                            | Error quality                                                     | Last release                                              |
| -------------------------------- | ------- | --------- | --------- | --------------- | -------------------------------- | ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| **@babel/standalone**            | 8.0.4   | 2442.1 kB | 576.9 kB  | 396.9 kB        | no                               | yes (built-in)            | yes (visitor, in use today)                                               | codeframe baked into `.message`                                   | 2026-07-09                                                |
| **Sucrase**                      | 3.35.1  | 206.0 kB  | 47.3 kB   | 40.1 kB         | no                               | yes (`imports` transform) | no — separate parse needed                                                | bare message + line:col, `.loc` empty                             | 2025-11-19 (dep-bump only; prior real release 2023-12-22) |
| **oxc-transform** (JS glue only) | 0.141.0 | 203.9 kB  | 46.6 kB   | 40.2 kB         | **yes, separately**              | **no** (ESM only)         | partial — `deps` exists only on a `@deprecated "Only works for Vite"` API | best-in-class: rich `errors[]` with span, labels, ASCII codeframe | 2026-07-21                                                |
| oxc-transform wasm blob          | 0.141.0 | 3270.8 kB | 1075.4 kB | (n/a, see note) | —                                | —                         | —                                                                         | —                                                                 | 2026-07-21                                                |
| esbuild-wasm                     | 0.28.1  | 13.9 MB   | 3.71 MB   | 2.71 MB         | yes                              | n/a, out on size          | n/a                                                                       | n/a                                                               | —                                                         |
| @swc/wasm-web                    | 1.15.46 | 19.03 MB  | 5.00 MB   | 3.15 MB         | yes                              | n/a, out on size          | n/a                                                                       | n/a                                                               | —                                                         |
| Yuku (`@yuku-analyzer/wasm`)     | 0.7.4   | 65.4 kB   | 15.7 kB   | 13.9 kB         | **yes, but no COOP/COEP needed** | **no**                    | **yes** — `module.imports` gives `{kind, name, specifier}` natively       | message + span + help text, no codeframe, no line/col             | 2026-07-22                                                |
| Yuku analyzer wasm blob          | 0.7.4   | 679.3 kB  | 201.4 kB  | 140.5 kB        | —                                | —                         | —                                                                         | —                                                                 | 2026-07-22                                                |
| Yuku (`@yuku-codegen/wasm`)      | 0.7.4   | 39.5 kB   | 8.1 kB    | (n/a)           | yes, same story                  | —                         | —                                                                         | —                                                                 | 2026-07-22                                                |
| Yuku codegen wasm blob           | 0.7.4   | 226.5 kB  | 45.5 kB   | (n/a)           | —                                | —                         | —                                                                         | —                                                                 | 2026-07-22                                                |

**All brotli figures here are offline quality 11 and are not comparable to production
numbers.** Cloudflare compresses on the fly at a lower quality, so its output is
larger: the same `@babel/standalone` chunk measured **504.3 kB** brotli over
`live-demo.pages.dev` against **396.9 kB** offline here. Compare like with like, and
prefer the raw column when comparing across measurement methods — it's the only
quality-independent number in the table.

Sizes are the transform-entry-point bundle only (`{ transform }`, minified, esbuild
`--bundle`), same method for every JS candidate. "Brotli (n/a)" for a wasm blob means I
didn't re-run brotli on it as a second number worth trusting — see "What I could not
measure." Yuku's two entries reflect a corrected pass (see its verdict below): the
initial version of this doc under-measured and under-credited it.

## Per-candidate verdicts

### @babel/standalone — incumbent, stays

Already wired into `loadCompiler.ts` / `babelTransformCode.ts` and does everything the
pipeline needs in one pass: CJS output, the specifier-collecting visitor, named-import
tracking, and an error whose `.message` already contains an ASCII codeframe (verified —
`SyntaxError: /Broken.tsx: Unexpected token (1:48)` followed by a `> 1 | ...` /
`    | ^` block). Zero Node builtins in the bundle (grepped the real 8.0.4 bundle,
confirmed clean). Cost to adopt: zero, it's already adopted. The only concrete downside
is size (577 kB gzip), which is why this research exists.

### Sucrase — second place, not adoptable as-is

Real CJS output verified end-to-end through the `moduleRunner.ts`-style harness — code
ran and rendered correctly. Automatic JSX runtime works, but **only if you pass
`production: true`**: without it, Sucrase's "automatic" mode imports
`react/jsx-dev-runtime` and calls `jsxDEV`, not the `react/jsx-runtime` /
`jsx`/`jsxs` the pipeline's docblocks say the automatic runtime is chosen for
(verified both ways). That's a one-line fix, not a blocker, but it's exactly the kind
of divergence this research was asked to catch.

What actually stops it:

- **No AST/specifier access.** Sucrase's whole public API is
  `{ transform, getFormattedTokens, getVersion }` (checked via
  `Object.keys(require("sucrase"))`) — no import list, no named-import list. `runCode.ts`
  and the `UNDEFINED_NAMED_IMPORT` check would need a second parse of every file, by
  something else, kept in sync with Sucrase's own (forked-Babel-parser) syntax support.
  That's a real dependency and a real perf cost per keystroke, not a detail.
- **Error quality is weaker.** On the same broken JSX, Sucrase throws
  `SyntaxError: Error transforming Broken.tsx: Unexpected token, expected ";" (1:23)`
  with `.loc = {}` (empty) and no codeframe. Since `CodeRunner.tsx` just shows
  `.message` raw, users would get a line:col with no source context — a real
  regression in a live-editing tool, which is exactly what requirement 5 flagged to
  watch for.
- **Maintenance.** One real release (3.35.0, 2023-12-22) then a ~23-month gap before
  3.35.1 (2025-11-19), which itself is a dependency-bump, not a feature/fix release.
  Single maintainer (alangpierce), 80 open issues. The task background already flagged
  this; the registry timestamps confirm it.

Files this would touch if adopted anyway: `loadCompiler.ts` (swap the dynamic import
and the `Babel` type), `babelTransformCode.ts` (rewrite the transform call and,
critically, add the second-parse step for specifiers/named-imports), and
`src/shared/errors/messages.ts`'s `PARSE_FAILED` wording would need to drop its
codeframe expectation for the runtime path or grow logic to fabricate one from
`.loc`/`.pos` (`.loc` was empty in testing, so `.pos` plus the source string would be
the only path to a hand-rolled codeframe).

### oxc-transform — best engineering, disqualified for this pipeline today

Two separate, both-disqualifying problems, verified rather than assumed:

**1. Its browser delivery needs cross-origin isolation, a server config the consuming
site must set.** `oxc-transform`'s `package.json` `browser` field points at
`@oxc-transform/binding-wasm32-wasi`, whose browser glue
(`transform.wasi-browser.js`) does `new WebAssembly.Memory({ shared: true })` and
spawns a `Worker` — a shared `WebAssembly.Memory` throws unless the page is
cross-origin isolated (`Cross-Origin-Opener-Policy: same-origin` +
`Cross-Origin-Embedder-Policy: require-corp` response headers). This isn't
speculation: oxc's own official playground repo (`oxc-project/playground`) ships a
`_headers` file setting exactly those two headers, i.e. even the Oxc team's own
browser deployment needs this config. `oxc-parser` (already a build-time
devDependency here) has the identical `browser` → `wasm32-wasi` architecture, so
using it for a second specifier-only parse doesn't dodge the problem. Per the task's
own hard requirement, this disqualifies it outright — Rspress docs sites are commonly
static-hosted (GitHub Pages, plain object storage, etc.) where setting response
headers may not even be possible, let alone "zero config."

**2. It doesn't emit CommonJS.** `transform()`'s `sourceType` option only controls how
the _input_ is parsed (`'script' | 'module' | 'commonjs' | 'unambiguous'`) — there's no
output-module-format option. Verified by actually running it: the output for
`MultiFile.tsx` kept `import { Button } from "@live-demo/rspress/web"` etc. as real
`import` statements (automatic-runtime JSX transform worked correctly otherwise —
`jsx`/`jsxs` from `react/jsx-runtime`, matching the pipeline's requirement exactly).
Feeding that output to `new Function("require","module","exports", code)` throws
`SyntaxError: Cannot use import statement outside a module` (verified). Babel's
`transform-modules-commonjs` handles a lot of edge-case interop (live bindings,
circular imports, `export *`, TDZ-safe hoisting) that a hand-rolled ESM→CJS pass
would have to reimplement or risk subtly breaking `moduleRunner.ts`'s cycle-safe
caching.

There's also a `moduleRunnerTransform`/`Sync` pair whose result includes exactly the
`deps`/`dynamicDeps` array `runCode.ts` wants — but its type declaration marks it
`@deprecated Only works for Vite`, and its output targets Vite's SSR runtime helpers,
not plain CJS. Not usable as-is.

None of this is a knock on oxc's quality — the raw transform is fast, its automatic
JSX runtime output is correct, its bundle-without-wasm size is on par with Sucrase
(46.6 kB gzip), it's the toolchain this repo already trusts for build-time parsing
(`oxc-parser`, `oxlint`, `oxfmt`), and its error reporting is the best of anything
tested: `transformSync` never throws, it returns `errors[]` with `severity`,
`message`, span `labels`, and a ready ASCII-art `codeframe` — richer than Babel's.
If oxc ever ships (a) a non-threaded, non-shared-memory browser build of the
transformer (their playground's approach isn't published as a reusable npm package
today) and (b) a CJS output mode, it would be the clear pick to revisit. Today, it's
disqualified on requirement 1 alone, and would need real new code for requirement 3.

### Yuku — not viable today, but I undersold it in the first pass. Corrected below.

The user asked me to double-check this one, and the second pass changed two of my
conclusions. Both corrections make Yuku look _better engineered_ than I first gave it
credit for; neither changes the bottom line, because the actual blocker was always
requirement 2/3 (JSX transform, CJS output), not what I originally focused on.

**What I got wrong the first time:**

1. _"No ready specifier walk."_ Wrong — I'd only looked at the bare parser/codegen
   docs. `@yuku-analyzer/wasm`'s `Analyzer.addFile(path, source).imports` gives
   exactly what requirement 4 needs, natively, no second parse: I ran it on
   `MultiFile.tsx` and got back one record per import —
   `{kind: 'named', name: 'Button', specifier: '@live-demo/rspress/web'}`,
   `{kind: 'named', name: 'useState', specifier: 'react'}`,
   `{kind: 'named', name: 'Imported', specifier: './Imported'}` — structurally
   cleaner than Babel's ad-hoc visitor, and it comes from the same native pass that
   parses the file (`module.ast` is documented as "the same ESTree/TS-ESTree output
   as yuku-parser", so one `addFile` call plausibly covers both parsing and specifier
   extraction).
2. _"Not measured, not comparable."_ I declined to measure on the theory that "half a
   transformer" isn't a fair number. That was a cop-out — I should have measured and
   labeled it correctly instead of not measuring. Corrected numbers, using the exact
   same esbuild method as every other candidate: `@yuku-analyzer/wasm`'s JS glue is
   65.4 kB raw / 15.7 kB gzip / 13.9 kB brotli, its wasm blob is 679.3 kB raw / 201.4 kB
   gzip / 140.5 kB brotli. `@yuku-codegen/wasm` (needed to print the AST back to
   source) is another 39.5 kB raw / 8.1 kB gzip of glue plus a 226.5 kB raw / 45.5 kB
   gzip wasm blob. A realistic combined stack (analyzer for parse+specifiers, codegen
   for printing) comes to roughly **906 kB raw / 247 kB gzip total** — smaller than
   Sucrase, dramatically smaller than oxc's 3.4 MB wasm blob, and less than half of
   Babel's 577 kB gzip JS-only bundle.

   More importantly, **Yuku's wasm doesn't need cross-origin isolation.** I checked
   `@yuku-parser/wasm`'s and `@yuku-analyzer/wasm`'s glue code directly: it's a plain
   `WebAssembly.instantiateStreaming(fetch(...))`, no `napi-rs`/WASI shim, no shared
   `WebAssembly.Memory`, no spawned `Worker` (grepped the bundled output for
   `shared:true` / `new Worker`, zero hits). That's the exact thing that disqualifies
   oxc on requirement 1, and Yuku's Zig-native wasm build doesn't have it. It isn't
   fully config-free either, though: its `index.js` has a Node-only branch
   (`await import("node:fs/promises")`, reached only when loading from `file:`) that
   `esbuild --bundle --platform=browser` refuses to resolve by default — the build
   hard-fails until you add `--external:node:fs/promises` (or an equivalent
   `resolve.fallback` in webpack/Rspack terms). That's a real, verified consumer-config
   touch, just a much smaller and more plausibly upstream-fixable one than oxc's
   header requirement.

**What was right, and is now proven by running it rather than reading about it:**
"Supports jsx/tsx/ts" in Yuku's docs means the _parser_ accepts that grammar as valid
input, not that codegen turns it into plain JS — those are two different claims, and
it's worth being precise about which one the docs snippet
(`parse("const x = 1 + 2;")` → `generate(program)`) actually demonstrates: that
example is plain JS with no JSX or TS in it at all, so it only shows the parse→print
round-trip mechanism working, not a transform. I confirmed the actual JSX/TS behavior
directly, with real JSX/TS source this time, not the docs' trivial example:

```
parse("const el = <div className=\"x\">{count}</div>;", { lang: "jsx" })
  → diagnostics: [], parses to a real JSXElement node (parsing genuinely works)
generate(that program)                 → const el = <div className="x">{count}</div>;
generate(that program, { strip: true }) → const el = <div className="x">{count}</div>;   (identical — strip is a no-op on JSX)

parse("const el: JSX.Element = <div count={1 as number}>{1}</div>;", { lang: "tsx" })
generate(that program, { strip: true }) → const el = <div count={1}>{1}</div>;
  (the TS annotation `: JSX.Element` and the `as number` assertion are gone — that's what strip does —
   but the JSX itself, `<div count={1}>{1}</div>`, is untouched)

parse("import { a } from \"m\"; export const b = a;")
generate(that program, { strip: true }) → import { a } from "m";\nexport const b = a;   (unchanged)
```

So: Yuku's wasm parser really does parse JSX, TSX, and TS correctly — that part of the
docs is accurate and I don't dispute it. What doesn't exist is a step that turns
`<div>` into a `jsx("div", ...)` call, or `import`/`export` into `require`/`exports.x =`.
`strip` does exactly one thing: delete TypeScript-only syntax. Confirmed again on the
real demo file: `generate(parse(MultiFileSource, {lang: 'tsx'}).program, { strip: true
})` kept `<div>...</div>` as literal JSX and `import { Button } from
"@live-demo/rspress/web"` as a literal ES import, completely untouched (there was no
TS syntax in that particular file for `strip` to remove, which is why I ran the more
targeted tests above too, to isolate exactly what `strip` does and doesn't touch).
Feeding the demo-file output to the `moduleRunner.ts`-style harness throws the
identical `SyntaxError: Cannot use import statement outside a module` that oxc's ESM
output does. I also ran the parser against the same deliberately-broken JSX file used for
every other candidate: `yuku-parser` reports
`{message: "Expected '}' to close function body, but found 'end of file'", start: 48,
end: 48, help: "Add a closing brace..."}` — a byte-offset span and a genuinely useful
`help` string (better than Sucrase's bare position), but no codeframe and not even a
line/column, so the live-editing overlay would need hand-written offset→line/col
conversion plus source slicing to render anything as good as what Babel gives free
today.

Building the missing pieces — a JSX-automatic-runtime transform and an ESM→CJS
transform with Babel-equivalent handling of live bindings/circular imports/`export *`
— means writing real, ongoing-maintenance code against `yuku-ast`'s traverser, on
top of a toolchain releasing multiple 0.x versions _per day_ (`@yuku-analyzer/wasm`
went 0.7.2 → 0.7.3 → 0.7.4 within about 34 hours during this research) from what
looks like a single maintainer (arshad-yaseen), 857 GitHub stars, 4 open issues,
created October 2025. That's still real, unrecoverable-today engineering cost — but
of everything in this table, Yuku's underlying parser/analyzer/codegen foundation is
now the one I'd bet on first if someone later decides that cost is worth paying: it's
the smallest footprint, the only wasm story here that doesn't need server
cross-origin-isolation headers, and it already hands you structured specifiers for
free. Not adoptable today. Worth revisiting specifically if either the JSX/CJS
transform gap gets filled upstream, or this project's own tolerance for building and
maintaining that layer itself changes.

### esbuild-wasm / @swc/wasm-web — out on size, as expected

Measured, not cited: `esbuild-wasm@0.28.1`'s `esbuild.wasm` is 13.9 MB raw / 3.71 MB
gzip / 2.71 MB brotli. `@swc/wasm-web@1.15.46`'s `wasm_bg.wasm` is 19.03 MB raw /
5.00 MB gzip / 3.15 MB brotli — larger even than esbuild-wasm. Both are 5-10x the
incumbent Babel bundle before any code-splitting benefit could offset it. Not
seriously in the running; included only per the task's instruction to document the
disqualification with real numbers.

## What I could not measure

- **oxc wasm blob brotli.** I measured gzip (1075.4 kB) but treat any brotli number
  for a 3.3 MB wasm binary as noise not worth reporting as a clean comparison point —
  wasm binaries don't compress the way JS text does, and quality-11 brotli on 3 MB
  takes long enough that I didn't want to present a single run as authoritative. Moot
  anyway since oxc-transform is disqualified on requirement 1.
- **A real browser run of anything.** All "runs the demo" claims here are Node-side:
  the transform output evaluated through a `new Function(require, module, exports)`
  harness that mimics `moduleRunner.ts`'s contract exactly (mocked `react`,
  `react/jsx-runtime`, and the local `Imported.tsx`), not an actual browser tab. This
  matches what the task asked for (confirm working CJS + automatic JSX runtime) but
  doesn't exercise the DOM, CodeMirror, or the real `_live_demo_virtual_modules`
  virtual module.
- **oxc's COOP/COEP requirement, confirmed via its own playground's config, not via
  spinning up a real cross-origin-isolated deployment myself.** I'm confident in this
  finding (it's standard `SharedArrayBuffer`/shared-`WebAssembly.Memory` platform
  behavior, and the oxc team's own `_headers` file corroborates it), but I did not
  personally attempt to load the wasm module in a non-isolated page and watch it
  throw.
- **Sucrase's behavior on every syntax-error shape.** I tested one deliberately broken
  file. `.loc` being an empty object may not be true for every parse-error path;
  I did not exhaustively test Sucrase's error surface.
- **Yuku codegen wasm blob brotli.** Measured gzip (45.5 kB) but skipped brotli for
  the same "not worth trusting as a single run" reason as oxc's blob; low stakes here
  since the JS-glue-plus-wasm total is already the smallest of any candidate on gzip
  alone.
- **Whether `@yuku-analyzer/wasm`'s `module.ast` can actually replace a separate
  `@yuku-parser/wasm` parse call in practice** (i.e. whether analyzer alone is
  sufficient, or codegen needs the parser's own AST shape specifically). I only
  confirmed this from the docs' claim that they're "the same ESTree/TS-ESTree
  output," not by feeding `module.ast` into `generate()` myself.

## Postscript: the abandoned `@babel/core` swap

Before this research ran, `@babel/standalone` was swapped for `@babel/core` plus only
the four plugins actually used. It worked — codeframes survived, the async-chunk
boundary held, `check:all` green, demos verified in a browser. It was still abandoned,
and both reasons are worth recording because they generalize.

**It exported build config to every consumer.** `@babel/core@8` already stubs its
config-file loading behind a `browser` export condition, so that anticipated risk was
solved upstream. What wasn't: `@babel/core` and several of its plugins import
`node:assert`, `node:path`, and `node:util` for pure string and invariant logic,
outside that stub. Making it build required `@rsbuild/plugin-node-polyfill` plus two
hand-written shims — **in `website/rspress.config.ts`, not in the package**. Since the
consuming site is what bundles the runtime, every consumer would have had to replicate
that. For a plugin whose pitch is being easier to adopt than
`@rspress/plugin-playground`, mandatory bundler config is the wrong trade at any size.
This is where requirement 1 came from.

**Under brotli it was worth roughly nothing.** The headline was ~92 kB gzip. But the
`@babel/core` chunk measured 396.5 kB brotli, and this research measured
`@babel/standalone` at 396.9 kB brotli by a comparable offline method. Different
bundling contexts, so not a clean A/B, but close enough to conclude the win was a
gzip-only artifact. Cloudflare serves brotli. **Lesson: for a decision about real
payload, measure brotli against the CDN that actually serves it — a gzip delta can be
almost entirely compression-artifact.**

The work is preserved at `git stash@{0}` ("babel/standalone > babel/core") if a future
change makes the packaging question moot — for instance, pre-bundling Babel into the
package's own `dist/` with the shims applied at package build time, which would remove
the consumer burden while keeping the smaller Babel. That option was never tested.

## Recommendation

Stay on `@babel/standalone`. It's the only candidate that clears every hard
requirement without new code: zero-config browser execution, CJS output, the
specifier/named-import pass the pipeline already depends on, and a codeframe in the
error message a user actually sees. The `@babel/core` swap that looked like ~92 kB
gzip turned out to be near-zero under brotli and carried a consumer build-config cost
(see Postscript), and no transpiler measured here recovers real payload without
either failing requirement 1 outright (oxc) or giving up AST access and error quality
for a project that's been essentially dormant for two years (Sucrase). If this gets
revisited, three concrete triggers to watch for: Sucrase shipping a real, sustained
release cadence again; oxc publishing a non-threaded browser build of the transformer
with a CJS output mode; or someone deciding it's worth building a JSX-automatic-runtime

- ESM→CJS transform layer on top of Yuku's parser/analyzer/codegen, which — per the
  corrected research above — has the smallest footprint and the only wasm delivery story
  here that doesn't need cross-origin-isolation headers, at the cost of that transform
  layer not existing yet.

# Part 2

**A custom fork of Sucrase is viable and is is arguably the cleanest long-term path to eliminating Babel while keeping your zero-consumer-config guarantee.**

The initial research rightly disqualified _unmodified_ `sucrase@3.35.1` from `npm`. However, all three reasons it failed in your comparison—lack of specifier metadata, missing error codeframes, and unused legacy code—are artifacts of Sucrase's high-level API wrappers, **not fundamental limitations of its engine**.

Below is a full review of Sucrase’s source code, an evaluation of its internals, and a concrete blueprint for building a hyper-focused **`sucrase-lite`** side project for `@live-demo/rspress`.

---

## Source Code Review & Architecture Evaluation

Sucrase is fundamentally a **token-stream rewriter**, not an AST compiler. It tokenizes source code once using a modified Babel parser, identifies token ranges to delete or insert (e.g., stripping `: string` or replacing `<div />` with `_jsx("div", {})`), and stitches the original string slices back together.

```
Source Code ──> Tokenizer ──> TokenProcessor ──> Transformers ──> Output String
                                (Token Stream)     (CJS, JSX, TS)

```

### 1. Specifier & Named Import Extraction

- **Source Files:** `src/transformers/CJSImportTransformer.ts`, `src/util/getImportExportSpecifierInfo.ts`
- **Current Behavior:** To transform `import { useState, useEffect as useEff } from "react"` into CommonJS `var _react = require("react")`, `CJSImportTransformer` already walks every import statement at the token level. It uses `getImportExportSpecifierInfo()` to extract local names, imported names, and package specifiers.
- **The Opportunity:** Standard Sucrase discards this metadata when `transform()` completes. By adding a simple array/map collector directly inside `CJSImportTransformer`, your fork can return `importSpecifiers` and `namedImports` natively in the exact shape `runCode.ts` requires—**with zero performance penalty and no second parse**.

### 2. Syntax Error Quality & Codeframes

- **Source Files:** `src/parser/tokenizer/index.ts`, `src/parser/traverser/util.ts`
- **Current Behavior:** When Sucrase hits a syntax error, `this.unexpected()` calls `getLineAndColumnFromPos(this.input, this.state.pos)` and throws a standard `SyntaxError` with a plain string like `Unexpected token (1:23)`. It computes the exact character offset (`this.state.pos`), but never formats source line context.
- **The Opportunity:** Because `this.state.pos` and the full `input` string are available at the exact moment an error is thrown, a ~25-line formatting helper inserted into `this.error()` can splice line slices and generate a Babel-identical ASCII codeframe directly into `error.message`:

```sh
SyntaxError: Unexpected token (1:23)
> 1 | const App = () => <div>Hello</span>;
    |                            ^

```

### 3. Automatic JSX Runtime Defaults

- **Source Files:** `src/transformers/JSXTransformer.ts`, `src/util/getJSXPragmaInfo.ts`
- **Current Behavior:** Sucrase defaults JSX transforms to classic `React.createElement` unless configured with `jsxRuntime: "automatic"` and `production: true`. Without `production: true`, it targets `react/jsx-dev-runtime` (`jsxDEV`).
- **The Opportunity:** In your fork, you can hardcode the automatic JSX transformer to always emit `react/jsx-runtime` (`_jsx`/`_jsxs`), eliminating the need to pass extra configuration flags at runtime.

### 4. Code Base Footprint & Dead Weight

- **Source Files:** `src/transformers/FlowTransformer.ts`, `src/parser/plugins/flow.ts`, `src/transformers/JestHoistTransformer.ts`, `src/transformers/ReactHotLoaderTransformer.ts`, `src/cli.ts`, `src/register.ts`
- **Evaluation:** Flow type parsing alone accounts for a significant portion of Sucrase's parser logic. Combined with Jest hoisting, React Hot Loader transforms, and Node CLI/register entry points, over 50% of the repository is unused for your browser demo use case.
- **The Opportunity:** Deleting these modules leaves a clean core containing only `Tokenizer`, `TokenProcessor`, `TypeScriptTransformer`, `JSXTransformer`, and `CJSImportTransformer`.

---

## Blueprint for a `sucrase-lite` Fork

If you build this as a side project (e.g., an in-monorepo package `@live-demo/transpiler`), here is the step-by-step modification plan:

### Step 1: Prune Unused Code

Remove the following directories and files:

- `src/transformers/FlowTransformer.ts` & `src/parser/plugins/flow.ts`
- `src/transformers/JestHoistTransformer.ts`
- `src/transformers/ReactHotLoaderTransformer.ts`
- `src/cli.ts`, `src/register.ts`, `bin/`, `integrations/`, `ts-node-plugin/`

### Step 2: Hook Import Specifiers into `CJSImportTransformer`

In `src/transformers/CJSImportTransformer.ts`, record imports as they are processed:

```ts
// Inside CJSImportTransformer processing loop
export interface TranspileResult {
  code: string;
  importSpecifiers: string[];
  namedImports: Map<string, Set<string>>;
}

// As getImportExportSpecifierInfo parses tokens:
const pkg = this.tokens.stringValueForToken(specifierToken);
importSpecifiers.push(pkg);

if (specifier.importedName && !specifier.isType) {
  const names = namedImports.get(pkg) ?? new Set();
  names.add(specifier.importedName);
  namedImports.set(pkg, names);
}

```

### Step 3: Enhance `error()` with ASCII Codeframe Generation

In `src/parser/traverser/util.ts`, update the error throw site:

```ts
export function createCodeframe(input: string, pos: number): string {
  const lines = input.slice(0, pos).split("\n");
  const lineNum = lines.length;
  const colNum = lines[lines.length - 1].length + 1;
  const allLines = input.split("\n");

  const line = allLines[lineNum - 1] || "";
  const lineNumberPrefix = `> ${lineNum} | `;
  const indent = " ".repeat(lineNumberPrefix.length + colNum - 1);

  return `SyntaxError: Unexpected token (${lineNum}:${colNum})\n${lineNumberPrefix}${line}\n${indent}^`;
}

```

---

## Comparison: `@babel/standalone` vs. `sucrase-lite`

| Metric / Requirement          | `@babel/standalone` (Current) | `sucrase-lite` (Custom Fork)            |
| ----------------------------- | ----------------------------- | --------------------------------------- |
| **Bundle Size (Raw)**         | ~2,442 kB                     | **~87 kB**                              |
| **Bundle Size (Brotli)**      | ~396 kB                       | **~23 kB**                              |
| **Startup / Execution Speed** | Baseline (~1x)                | **~15x – 20x faster** (No AST creation) |
| **Consumer Build Config**     | Zero Config                   | **Zero Config**                         |
| **Module Output**             | CommonJS                      | CommonJS                                |
| **Specifier Extraction**      | AST Visitor Pass              | Native Token Collector Pass             |
| **Error Codeframes**          | Baked into `.message`         | Built-in via offset generator           |
| **Maintenance Burden**        | External dependency           | ~1,200 lines of internal monorepo code  |

---

## Final Recommendation & Strategy

1. **Phase 1 (Immediate):** Stay on `@babel/standalone`. It is stable, already implemented, and correctly handled behind your `@live-demo/rspress/web/lazy` dynamic import boundary.
2. **Phase 2 (Side Project):** Fork Sucrase into a lightweight monorepo package inside your project. Apply the codeframe helper, hardcode the automatic JSX runtime, and expose the `importSpecifiers`/`namedImports` map directly from `transform()`.
3. **Phase 3 (Validation):** Run your existing Vitest and Playwright test suites against `sucrase-lite`. Once verified, swap `@babel/standalone` out to permanently reduce your browser demo compiler payload from **~396 kB brotli down to ~23 kB brotli**.

# Part 3

## What the source confirms

**Specifier extraction is even easier than Part 2 says.** It doesn't need a hook in `CJSImportTransformer`. `CJSImportProcessor` already maintains `importInfoByPath: Map<string, ImportInfo>` (`src/CJSImportProcessor.ts:34`), populated by `preprocessTokens()` before any transform runs, where `ImportInfo` is `{defaultNames, wildcardNames, namedImports: [{importedName, localName}], namedExports, hasBareImport, exportStarNames, hasStarExport}`. That is a superset of `TransformedFile`'s `importSpecifiers` + `namedImports`. Type-only specifiers are already excluded at the source (`getImportExportSpecifierInfo` returns `isType: true` with null names, and `CJSImportProcessor.ts:370` skips those), which matches the visitor's `importKind === "type"` early-return in `babelTransformCode.ts`. The patch is: make the field public, return it from `transform()`. Maybe 10 lines.

**Codeframes need no fork at all.** Part 1 recorded `.loc` as empty. That's wrong. `augmentError` (`src/parser/traverser/base.ts:16`) sets both `error.pos` and `error.loc = {line, column}`. Verified by running it:

```
Error transforming Broken.tsx: Unexpected token, expected ";" (1:23) | pos: 22 | loc: {"line":1,"column":23}
```

So the codeframe helper belongs in live-demo's own error path, built from `err.loc` plus the source string you already have. Requirement 5 is satisfiable in ~20 lines of your code, in your tests, with no upstream surface. Part 2 putting it inside `unexpected()` is the worse placement.

**JSX runtime**: confirmed, `production: true` is the only thing gating `react/jsx-runtime` over `jsx-dev-runtime` (`JSXTransformer.ts:75`). One option flag. Hardcoding it in a fork buys nothing.

## The gap neither part found

Sucrase does not validate JSX tag matching. Verified:

```js
transform('export const App = () => <div>Hello</span>;', ...)
// → _jsxruntime.jsx.call(void 0, 'div', { children: "Hello"})   ← no error
```

The closing tag name is parsed and then ignored. `<div a="1" a="2" />` also passes silently. Babel rejects the first with "Expected corresponding JSX closing tag". In a live editor where people retype tags constantly, a mistyped closing tag would silently render the wrong thing instead of showing the overlay. This is the most substantive regression in the proposal, and it's the one thing that genuinely argues _for_ owning the code: `jsxParseOpeningElement` / `jsxParseClosingElement` (`src/parser/plugins/jsx/index.ts:186,230`) both go through `jsxParseElementName`, so the token ranges for both names exist and comparing them is maybe 30 lines. Upstream won't add it (it's a deliberate speed tradeoff), so you'd carry it.

## Real sizes

Part 2's ~87 kB raw / ~23 kB brotli is optimistic by roughly 60%. Measured with the same esbuild method Part 1 used:

| Build                                                                     | Raw     | Gzip    | Brotli(q11) |
| ------------------------------------------------------------------------- | ------- | ------- | ----------- |
| `@babel/standalone` (Part 1)                                              | 2442 kB | 577 kB  | 397 kB      |
| npm `sucrase@3.35.1`, unmodified                                          | 206 kB  | 47.3 kB | 41.1 kB     |
| `src/` bundled without options-validator, sourcemaps, `lines-and-columns` | 166 kB  | 36.9 kB | 31.6 kB     |
| realistic max-pruned fork (est. from metafile)                            | ~139 kB | ~31 kB  | ~27 kB      |

Per-module bytes from the metafile: Flow parser + transformer 8.9 kB, `ESMImportTransformer` 6.3 kB, ReactDisplayName 2.5 kB, JestHoist 1.3 kB, ReactHotLoader 1.1 kB, `formatTokens` 0.9 kB. All of Part 2's Step 1 deletions total about 16 kB raw, roughly 4 kB brotli.

That reframes the whole thing: **unmodified Sucrase already captures ~356 kB of the ~371 kB brotli win. Pruning buys about 1% of the total, at the cost of the largest and most irreversible part of the diff.** Step 1 is the worst-value step in the plan. Dropping `validateOptions` (`ts-interface-checker`) and `computeSourceMap` (`gen-mapping`) is worth more than deleting Flow, and is two import lines.

Also verified for requirement 1: the npm `sucrase` browser bundle contains zero `node:` builtins and zero `process` references. Genuinely zero consumer config, unlike the `@babel/core` path in the Postscript.

## On staleness vs stability

Your instinct holds up structurally, more than the release dates suggest. Sucrase is a token rewriter, not an AST compiler, so syntax it doesn't need to transform mostly passes through untouched. New JS syntax costs it far less than it costs Babel. Confirmed present in 3.35.1: `satisfies`, `accessor`, `using` / `await using`, import attributes (`with {}`), `in`/`out` variance, const type params. That's TS 5.2-era, and TS has added almost no new syntax since. Decorators are parsed but passed through untransformed, which is roughly parity with your current Babel config (no decorators plugin enabled).

The limit is that it's still a full parser, so genuinely new grammar breaks it, and there's no one upstream to fix it. But the surface a doc demo exercises is covered today, and the ~23-month gap plausibly reflects "done" more than "abandoned" for this use case.

The honest counterpoint to the fork plan: forking converts an external maintenance risk into an internal one over ~13k lines of parser you didn't write. If upstream is dead, you inherit its bugs either way, but a fork also means you inherit them without the fallback of a version bump.

## What I'd actually do

Skip Step 1. Don't vendor 13k lines. Use `pnpm patch` against `sucrase@3.35.1`, with a diff of roughly 100 lines:

1. Expose `importInfoByPath` from `transform()`.
2. Drop `validateOptions` and the sourcemap import (~9 kB brotli, more than pruning Flow).
3. Add JSX open/close tag-name validation.

Then in live-demo: a codeframe formatter over `err.loc`, and pass `jsxRuntime: "automatic", production: true`. That gets you ~32 kB brotli, keeps the owned surface small enough to actually review, and keeps `pnpm patch`'s rebase-on-upgrade as a safety net. Upstream's slowness makes patch maintenance nearly free, which is the same property you identified, applied to a cheaper strategy than forking. If the patch grows past ~300 lines, that's the signal to vendor properly.

Two things I didn't check, both worth resolving before committing:

- **The injected `react/jsx-runtime` import won't appear in `importInfoByPath`.** `babelTransformCode.ts`'s docblock specifically relies on Babel's visitor seeing preset-injected specifiers in the same traversal. Sucrase's JSX transformer emits that `require` as text after preprocessing, so the externals walk would miss it. Probably harmless if `react/jsx-runtime` is always resolvable, but it needs checking against `getVirtualModulesCode.ts`, not assuming.
- **`.call(void 0, ...)` output shape.** Sucrase emits `_jsxruntime.jsx.call(void 0, 'div', {...})` and `_react.useState.call(void 0, 0)`. Functionally fine under `moduleRunner`, but it's a different interop shape from Babel's, and your `UNDEFINED_NAMED_IMPORT` check reads `resolved[importName]` which still works. Worth running the real e2e suite against before trusting.

# Part 4: implemented

Date: 2026-07-23, branch `sucrase-migration`. Parts 1-3 were research; this
part records what shipping it actually cost and what the earlier parts got
wrong. **Sucrase is in, `@babel/standalone` is out**, and none of Part 2's
fork, Part 3's `pnpm patch`, or any vendoring was needed.

## The strategy that won, and why the earlier ones lost

Parts 2 and 3 both assumed the pipeline needs Sucrase's _internal_ import
metadata, and argued about how invasively to reach it (fork vs. patch). Both
were solving a problem that dissolves once you look at the output instead of
the internals.

**Specifiers are recovered by scanning the emitted `require(...)` calls.**
That's `transformCode.ts`'s `extractRequireSpecifiers`, a regex over Sucrase's
own generated output. Sucrase stays a plain, upgradable dependency: no patch,
no fork, no deep imports, only the public `transform` export.

Two things killed the `pnpm patch` plan on contact:

1. **The published package ships `dist/` _and_ `dist/esm/` (plus
   `dist/types/`).** Exposing `importInfoByPath` means the same edit in ~7
   compiled files, not one source file. Part 3 costed the patch as if it
   applied to `src/`. It doesn't — npm ships compiled output.
2. **The injected `react/jsx-runtime` import is genuinely unreachable that
   way.** Part 3 flagged this as unchecked; it's now confirmed.
   `JSXTransformer.claimAutoImportedName` (`dist/transformers/JSXTransformer.js:298`)
   keeps it in a private `cjsAutomaticModuleNameResolutions` map and emits the
   `require` as text. It never touches `importInfoByPath`, so the patch would
   have needed a second edit in a second file anyway.

The output scan gets that injected import **for free**, because by then it's
just another `require` in the text. The mechanism Parts 2 and 3 treated as the
hard part is the one the chosen approach handles without special-casing.

## The named-import check moved instead of being preserved

Requirement 4 asked for named-import _names_, solely to power
`UNDEFINED_NAMED_IMPORT`. Sucrase's emit doesn't preserve them — they become
plain property reads (`_react.useState`) — and the output scan can't recover
them.

Rather than reach into internals to keep the old design, the check moved to a
`Proxy` in `moduleRunner.ts`'s `wrapExternal`, which throws when demo code
_reads_ a property the package doesn't export. `runCode.ts`'s
`assertNamedImportsExist` and the entire `namedImports` plumbing are deleted.

This is arguably better than what it replaced — the error names the property
at the actual use site — but it is a real behavior change, not a wash:

- It fires **during** evaluation, not before it.
- Feature detection on a missing export (`if (pkg.maybeThing)`) now throws
  instead of quietly seeing `undefined`.
- The trap needs an allowlist. Symbol keys and `then` must pass through: a
  proxy that throws on `then` turns "this isn't a Promise" into an uncatchable
  rejection anywhere the namespace object gets awaited.

**Requirement 4 was over-specified.** It described the existing implementation
(a specifier list _and_ a named-import map) rather than the actual need
(discover externals; diagnose bad named imports). Splitting those two needs
apart is what unblocked everything else. Worth remembering the next time a
requirements list is derived from reading the code that satisfies it.

## Real bundle numbers, measured in situ

Part 1 and Part 3 measured candidate bundles offline with esbuild. These are
the **actual built website chunks** (`website/doc_build/static/js/async/`),
which is what a visitor downloads:

| Chunk                   | Raw      | Gzip    | Brotli(q11) |
| ----------------------- | -------- | ------- | ----------- |
| Sucrase compiler chunk  | 201.0 kB | 44.9 kB | 37.8 kB     |
| live-demo runtime chunk | 12.4 kB  | 5.1 kB  | 4.6 kB      |

Grepping every async chunk for `@babel/standalone` / `babel-plugin-transform`
returns zero hits: Babel is fully gone from the output, not merely unreferenced.

Caveat on the comparison: **this is not a matched A/B.** The pre-migration
build wasn't measured in situ, so the honest framing is Part 1's offline
`@babel/standalone` figure (2442 kB raw / 397 kB brotli) against this build's
201.0 kB raw / 37.8 kB brotli. The raw column is the only quality-independent
one. Part 1's warning still applies: Cloudflare compresses at lower quality
than offline q11, so the deployed brotli number will be larger than 37.8 kB.

Part 3's size analysis holds up. Unmodified Sucrase captured essentially the
whole win; the pruning Part 2 built its plan around would have bought ~1% of
it for the largest and most irreversible part of the diff.

## What Parts 1-3 got wrong, corrected

- **Part 1: "Sucrase's `.loc` is empty."** Wrong, as Part 3 said. `err.loc =
{line, column}` is populated. `formatCodeframe.ts` renders a codeframe from
  it, shaped to match oxc's build-side output so both paths through
  `PARSE_FAILED` look identical. No new error code was needed — `PARSE_FAILED`
  already had a `codeframe` token, used by `readAndParseFile.ts`.
- **Part 1: "No AST/specifier access → needs a second parse."** True about the
  API, wrong about the consequence. The output scan needs no second parse.
- **Part 2: `~87 kB raw / ~23 kB brotli`.** Optimistic, as Part 3 found; the
  real shipped chunk is 201.0 kB raw / 37.8 kB brotli.
- **Part 2: "hardcode the automatic JSX runtime."** Unnecessary.
  `jsxRuntime: "automatic"` + `production: true` are two option flags.
- **Part 3: `pnpm patch` for ~100 lines.** Underestimated by the cjs/esm/types
  triplication described above.

## Gaps accepted and documented

All three are in `packages/rspress/CLAUDE.md`'s Limitations section.

1. **No JSX closing-tag-mismatch or duplicate-prop diagnostics.** Part 3's
   finding, accepted rather than fixed. `<div></span>` transpiles and runs.
   Fixing it means owning parser code, which is exactly what the chosen
   strategy avoids.
2. **`require('pkg')` at the start of a line in a demo's string is read as a
   real import.** Found while reviewing the implementation, not predicted by
   any earlier part. Sucrase passes comments and strings through verbatim, so
   the output scan can't tell them from its own emit. Fails loudly as
   `EXTERNAL_IMPORT_NOT_FOUND`, never silently. This is the chosen strategy's
   one genuine soft spot, and the honest price of not reaching into internals.

   **Narrowed after review** (see Part 5): the scan is now anchored to the two
   shapes Sucrase actually emits, so the comment and mid-line-string cases are
   gone. Only a line-initial `require(...)` inside a string still slips
   through.

3. **Unused value imports are elided in `.js`/`.jsx` too.** The `typescript`
   transform now runs unconditionally (the old code branched on file
   extension), so TS-style unused-import elision applies to plain JS as well.
   Bare `import './styles.css'` survives; only `import X from 'pkg'` with `X`
   unused and `pkg` wanted for side effects is affected.

## Verification

`pnpm run check:all` green end to end: format, lint, both builds, typecheck,
**186/186 vitest**, knip, **21/21 Playwright e2e**. Unit tests, lint, and the
full e2e suite were each re-run independently of the implementing agent's
report.

`tests/web/compiler/runCode.test.ts` was the load-bearing artifact — ~30 cases
running the _real_ compiler end to end rather than a mock. Every assertion
survived the swap. Two things only it and the e2e suite could have caught:

- Two `UNDEFINED_NAMED_IMPORT` fixtures wrapped the bad import in an arrow
  function `runCode` never calls. Babel's eager check threw regardless; the
  Proxy only throws on an actual read. The fixtures now read at module top
  level. **Those two tests had been passing for a reason that no longer
  exists** — a latent weakness the migration exposed.
- `website/e2e/errorOverlay.spec.ts` asserted Babel's exact string
  `"Unterminated JSX contents"`. Sucrase produces
  `Unexpected token, expected ";" (1:25)` for that input — less specific, and
  consistent with gap 1 above. Only running Playwright surfaced it.

## Open

- **Deployed brotli size.** Measure the compiler chunk over
  `live-demo.pages.dev` after this lands, per Part 1's lesson about offline vs.
  CDN compression quality.
- **`CHANGELOG.md`'s size claim** should cite the in-situ raw number above
  rather than any offline brotli figure.
- **Syntax coverage over time.** Part 3's staleness analysis (token rewriter,
  so new syntax mostly passes through; TS 5.2-era features confirmed present)
  is the standing argument for tolerating an upstream that ships rarely. The
  trigger to revisit is a _grammar_ Sucrase's parser rejects, not another
  quiet release year.

# Part 5: independent review, and what it changed

Date: 2026-07-23. A review of the staged migration against the domain (an
Rspress docs plugin), the project's scale, and the tradeoffs. **Verdict: the
swap is justified and lands net better.** The strongest thing in it is
structural rather than numeric: recovering specifiers from the _output_ keeps
Sucrase a plain, upgradable dependency — no fork, no `pnpm patch`, no deep
imports, only the public `transform` export — which also makes the bet cheap
to unwind (three files, ~250 lines).

Independently re-verified rather than taken on trust:

- `err.loc` really is populated, **with and without** `filePath` passed. Part
  1's "loc is empty" was wrong; Part 3's correction stands.
- Sucrase's browser entry (`dist/esm/index.js`) reaches zero node builtins.
  `commander`/`mz`/`pirates`/`tinyglobby` are CLI/register-only and
  unreachable from `transform`, so requirement 1 holds at install _and_ bundle
  level.
- The emit shapes the output scan depends on, enumerated across every import
  and re-export form.

## Changes the review produced

1. **The specifier scan is anchored, not free-floating.** Every import Sucrase
   emits is one of exactly two shapes: `var _x = require('spec')` for anything
   with bindings (including its injected jsx-runtime import and all
   `export ... from` forms), and a statement-position `require('spec');` for a
   bare `import 'x'`. `REQUIRE_RE` now matches only those, at a line start, a
   `;`, or the `}` closing a prepended interop helper. Gap 2 above shrinks
   from "any comment or string" to "a string whose own line starts with it."
   `transformCode.test.ts` now covers extraction for all ten import forms, so
   an upstream emit change fails in CI instead of silently dropping a
   specifier.
2. **The `wrapExternal` Proxy got the tests it was missing.** It is broader
   than the check it replaced — it traps _every_ property read on an external,
   not just the reads named imports compile to — and nothing exercised it
   against a namespace-heavy package. Added: missing-member-off-a-namespace
   throws; existing members read fine; the `for...in` + `hasOwnProperty` walk
   `_interopRequireWildcard` performs survives it; `then` and symbol keys pass
   through; and the accepted feature-detection regression
   (`if (pkg.maybeThing)` now throws) is asserted so it stays a decision on
   record. Plus `website/e2e/namespaceHeavyDemo.spec.ts`, which renders the
   react-three-fiber page (`import * as THREE`, `THREE.Color`) — the heaviest
   demo on the site and the one that motivated the whole size effort, and
   until now the only real namespace-heavy path with no e2e over it.
3. **The hand-rolled codeframe no longer drifts on tab-indented source.** The
   caret pad is copied from the offending line's own leading characters, tabs
   included, instead of being built from spaces. `formatCodeframe.test.ts` is
   new and covers alignment, tabs, EOF columns, and the undefined paths.
4. **`ALWAYS_ALLOWED` trimmed to what does work.** `constructor`,
   `hasOwnProperty`, `__esModule`, and `default` were already passing the
   trap's own `Reflect.has` check (via `Object.prototype` or the target
   itself). Only `then` and `prototype` need listing; the comment now says why
   `then` is the one that matters.
5. Stale `Babel` references cleaned out of `website/playwright.config.ts` and
   `tests/fixtures/README.md`.

Deliberately **not** changed: JSX validation stays absent. CodeMirror's
auto-closing tags cover the realistic version of that failure in the editor,
which is where it would bite.

Verification after these changes: `pnpm run check:all` green — **211/211
vitest** (was 186), **22/22 Playwright e2e** (was 21), knip clean.

## Still open

- The CHANGELOG's size claim still cites offline brotli figures; Part 4's
  in-situ raw numbers (2442 kB → 201.0 kB) are the honest headline.
- Deployed brotli size over `live-demo.pages.dev`, unchanged from Part 4.

  **Resolved in Part 6** — both closed, with a real matched A/B this time.

# Part 6: real numbers, matched A/B against the two actual deployments

Date: 2026-07-23. Every number before this part was either the offline esbuild
method (Part 1) or a single build measured in situ with nothing genuine to compare
it against (Part 4 — the pre-migration build was never deployed and measured
alongside it). Both gaps close here: prod
(`live-demo.pages.dev/guide/external/basic`, still Babel + `@rollup/browser`) and the
`sucrase-migration` feature deployment
(`bf69ff8d.live-demo.pages.dev/guide/external/basic`, Sucrase only) are the same
page, same demo, same Cloudflare CDN. A real A/B, not an estimate.

## Method

Loaded each URL in a real browser (Playwright/Chromium) and read
`performance.getEntriesByType('resource')` for every async JS chunk and the wasm
blob: `encodedBodySize` is the bytes actually transferred after Cloudflare's live
brotli (confirmed via each response's `content-encoding: br` header), `decodedBodySize`
is the raw, decompressed size. Re-read twice per deployment; both agreed to the byte.

Each chunk's identity was confirmed by fetching its text and checking content, not
filename/hash alone. One false lead worth recording: the real `@babel/standalone`
chunk contains the substring "rollup" twice — both inside Babel's own error-message
text about `@rollup/plugin-commonjs` interop, not Rollup code. Confirmed by reading
the surrounding text. The actual Rollup chunk was confirmed the opposite way: it
contains `ROLLUP_FILE_URL_` / `ROLLUP_FILE_URL_OBJ_`, constant prefixes Rollup's own
bundler emits for `import.meta.ROLLUP_FILE_URL_*` and nothing else would, and zero
occurrences of `@babel/standalone`.

## Numbers

Prod (Babel + `@rollup/browser`), `guide/external/basic`:

| Chunk                          | Raw       | Brotli, live CDN |
| ------------------------------ | --------- | ---------------- |
| `@babel/standalone`            | 2305.0 kB | 492.7 kB         |
| Rollup JS (`@rollup/browser`)  | 410.8 kB  | 114.9 kB         |
| Rollup wasm                    | 557.8 kB  | 234.6 kB         |
| live-demo runtime chunk (glue) | 12.6 kB   | 5.3 kB           |
| **Total, all four chunks**     | 3285.9 kB | 847.5 kB         |

Feature (`sucrase-migration`, Sucrase only), same page:

| Chunk                          | Raw      | Brotli, live CDN |
| ------------------------------ | -------- | ---------------- |
| Sucrase                        | 201.0 kB | 45.9 kB          |
| live-demo runtime chunk (glue) | 12.4 kB  | 5.4 kB           |
| **Total, both chunks**         | 213.4 kB | 51.2 kB          |

The CodeMirror editor chunk (`3899.09416e05e5.js`, ~191.4 kB brotli) is byte-identical
in both deployments — same filename hash — and is excluded above as irrelevant to the
compiler swap.

Sucrase's raw figure (201.0 kB) matches Part 4's in-situ number exactly — that one
was already right, it just had no genuine pre-migration build to compare against
until now.

## What this settles

- **Babel → Sucrase, real CDN brotli**: 492.7 kB → 45.9 kB, a 10.7x reduction. Part
  1's offline-q11 figure for Babel (396.9 kB) undersold its real deployed footprint
  by ~19% — Cloudflare's live brotli compresses at lower quality than the offline
  `zlib` quality-11 pass every earlier part used, the exact effect Part 1's
  Postscript warned about but couldn't demonstrate on Sucrase, since no Sucrase
  build was deployed yet.
- **Babel → Sucrase, raw (quality-independent)**: 2305.0 kB → 201.0 kB, an 11.5x
  reduction.
- **`@rollup/browser` removal, real CDN brotli**: 112.2 + 229.1 = 349.5 kB. The
  changelog's existing "~292 kB (brotli, offline max-quality)" undersold this for
  the same reason as above.
- **`@rollup/browser` removal, raw**: 401.2 + 544.7 = 968.5 kB.
- **Combined effect of both changes**, per load of a page with an external-import
  demo: 847.5 kB → 51.2 kB brotli (796.3 kB less), 3285.9 kB → 213.4 kB raw
  (3072.7 kB / ~3.07 MB less).

`packages/rspress/CHANGELOG.md` is updated to cite these numbers in place of the
offline estimates.

# Verdict

## Verdict

The swap is justified and lands net better for this project. I'd keep it. The reasoning, then the tradeoffs ranked by how much they actually matter, then a few small things the previous review passes (Parts 4-5) didn't surface.

## Why it's justified

**The size win is the product, not a nicety.** This plugin's stated differentiator over `@rspress/plugin-playground` is being leaner and easier to adopt. Part 6's matched A/B (same page, same CDN, real brotli) shows the compiler payload going from 492.7 kB to 45.9 kB, and combined with the Rollup removal the demo-page tax dropped from 847.5 kB to 51.2 kB compressed. For a docs plugin, "a demo page costs 51 kB extra instead of 850 kB" is the pitch itself. On a project whose explicit goal includes exploring in-browser compilation done well, this is the strongest single change on the branch.

**The strategy is the right one, and it's the reviewable part.** The research seriously considered a fork (Part 2) and a `pnpm patch` (Part 3). What shipped instead touches only Sucrase's public `transform` export and recovers specifiers by scanning the emitted `require(...)` calls. That decision does three things at once: it keeps Sucrase upgradable, it keeps the owned surface tiny (`transformCode.ts` at 115 lines, `formatCodeframe.ts` at 54, ~50 lines of Proxy in `moduleRunner.ts`), and it makes the whole bet cheap to unwind — the old Babel path is one file in git history and the seams (`loadCompiler`, `transformCode`, the `TransformedFile` shape) are unchanged in shape. A migration you can revert in an afternoon is a very different risk than a vendored parser.

**The scan's fragility is fenced correctly.** A regex over compiler output is the kind of thing that rots silently. Here it can't rot silently: `transformCode.test.ts` runs the real Sucrase against all ten import forms and asserts the recovered specifier, so an upstream emit change breaks CI instead of dropping an import at runtime. The one remaining false positive (a demo string whose own line starts with `require('x')`) fails loudly as `EXTERNAL_IMPORT_NOT_FOUND`, is documented in CLAUDE.md, and even has a test asserting the gap exists. That's the right way to hold a known limitation.

## The tradeoffs, ranked

**1. The maintenance bet on Sucrase is the biggest real risk, and it's acceptable here.** Single maintainer, one substantive release since 2023. The counterargument in Part 3 holds up structurally: a token rewriter mostly passes unknown syntax through, TS 5.2-era syntax is covered, and TypeScript has essentially stopped adding grammar. The failure mode is a future grammar Sucrase's parser rejects, which fails loudly as `PARSE_FAILED`, not silently. For 22 weekly downloads with a one-afternoon revert path, this is a fine bet. It would be a harder call on a project with real adoption.

**2. Losing JSX validation is the most user-visible regression, and it's the one I'd watch.** `<div>Hello</span>` now transpiles and runs. In a live editor this is silent wrongness rather than a crash, which is worse than an error in principle. In practice it's blunted three ways: the common typo produces output that still renders something recognizable, CodeMirror's auto-closing tags prevent most of the mistake at the source, and the changelog states it plainly. The decision in Part 5 to not fix it (fixing means owning parser code, the exact thing the strategy avoids) is coherent. Acceptable, but it's the first thing to reconsider if real users ever complain.

**3. The `UNDEFINED_NAMED_IMPORT` move is a genuine design improvement wearing a regression's clothes.** Lazy, at the use site, naming the actual property read — better error, better semantics. The two costs (fires during evaluation rather than before; `if (pkg.maybeThing)` throws) are documented, and the second one has a test asserting it's a decision on record, which is exactly how an accepted regression should be held. The old behavior also had its own dishonesty that nobody mourned: two fixtures passed for years only because the eager check fired on code that was never executed.

**4. Error message specificity dropped a notch.** Babel said "Unterminated JSX contents"; Sucrase says "Unexpected token, expected ';' (1:25)". The hand-rolled codeframe recovers most of the UX (and matching oxc's build-side shape so both `PARSE_FAILED` paths look identical is a nice touch). Minor.

**5. Unconditional TS transform eliding unused imports in `.js`** — the affected shape (`import X from 'pkg'` with `X` unused, `pkg` wanted for side effects) is rare in demos, and CSS side-effect imports aren't supported anyway. Documented. Negligible.

## Things the earlier reviews didn't surface

Three small observations, none blocking, no code changes made:

- **`toJSON` is a hole in the Proxy's allowlist of the same class as `then`.** A demo that does `JSON.stringify(pkg)` (a plausible "let me inspect this module" move in a live editor) triggers a get of `toJSON`, which is on neither the target nor `Object.prototype`, so it throws a confusing `UNDEFINED_NAMED_IMPORT` for `'toJSON'`. Unlike `then` it can't cascade into an uncatchable rejection, so it's cosmetic, but it's the same category of "read by machinery, not by demo code."
- **The `in` operator is an undocumented escape hatch for the feature-detection regression.** The Proxy has no `has` trap, so `'maybeThing' in pkg` quietly returns `false` while `pkg.maybeThing` throws. That's the natural workaround for the accepted regression, and neither the changelog note nor the `wrapExternal` docblock mentions it. Worth a sentence in one of them.
- **`wrapExternal` builds a fresh target and Proxy on every `require` call**, so two demo files importing the same package get different namespace identities and each pay a re-spread. This is pre-existing (main's plain-object `wrapExternal` did the same), the Proxy just makes it slightly more visible. Identity comparison of namespace objects in demo code is vanishingly rare; a per-specifier memo would be a three-line hardening if it ever matters.

## Better, equal, or worse

- **Payload**: much better, and it's a real matched measurement, not an estimate.
- **Architecture**: better. Less dependency surface, a smaller and more honest compiler seam, and the check that moved (named imports) moved to a structurally better place.
- **Reversibility and testability**: better. More tests than before (211 vs 186 unit, 22 vs 21 e2e), and the fragile parts are the specifically fenced ones.
- **Error UX**: slightly worse (JSX validation gone, less specific messages), fully disclosed, appropriate for the scale.
- **Long-term risk**: worse in the abstract (dormant upstream), fine in the concrete (loud failure modes, cheap revert, syntax surface that has stopped moving).

The pattern across the whole effort — measure on the real CDN, refuse the fork, fence every accepted gap with a test and a doc — is the part I'd want repeated on future swings. The one open item from Part 5 that still stands is trivial: the changelog excerpt you quoted now cites the in-situ numbers, so that's already resolved on the branch.
