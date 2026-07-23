# Browser transpiler research: replacing/keeping `@babel/standalone`

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
| **@babel/standalone**            | 8.0.4   | 2384.9 KB | 563.4 KB  | 387.6 KB        | no                               | yes (built-in)            | yes (visitor, in use today)                                               | codeframe baked into `.message`                                   | 2026-07-09                                                |
| **Sucrase**                      | 3.35.1  | 201.2 KB  | 46.2 KB   | 39.2 KB         | no                               | yes (`imports` transform) | no — separate parse needed                                                | bare message + line:col, `.loc` empty                             | 2025-11-19 (dep-bump only; prior real release 2023-12-22) |
| **oxc-transform** (JS glue only) | 0.141.0 | 199.1 KB  | 45.5 KB   | 39.3 KB         | **yes, separately**              | **no** (ESM only)         | partial — `deps` exists only on a `@deprecated "Only works for Vite"` API | best-in-class: rich `errors[]` with span, labels, ASCII codeframe | 2026-07-21                                                |
| oxc-transform wasm blob          | 0.141.0 | 3194.1 KB | 1050.2 KB | (n/a, see note) | —                                | —                         | —                                                                         | —                                                                 | 2026-07-21                                                |
| esbuild-wasm                     | 0.28.1  | 13.3 MB   | 3.54 MB   | 2.58 MB         | yes                              | n/a, out on size          | n/a                                                                       | n/a                                                               | —                                                         |
| @swc/wasm-web                    | 1.15.46 | 18.15 MB  | 4.77 MB   | 3.00 MB         | yes                              | n/a, out on size          | n/a                                                                       | n/a                                                               | —                                                         |
| Yuku (`@yuku-analyzer/wasm`)     | 0.7.4   | 63.9 KB   | 15.3 KB   | 13.6 KB         | **yes, but no COOP/COEP needed** | **no**                    | **yes** — `module.imports` gives `{kind, name, specifier}` natively       | message + span + help text, no codeframe, no line/col             | 2026-07-22                                                |
| Yuku analyzer wasm blob          | 0.7.4   | 663.4 KB  | 196.7 KB  | 137.2 KB        | —                                | —                         | —                                                                         | —                                                                 | 2026-07-22                                                |
| Yuku (`@yuku-codegen/wasm`)      | 0.7.4   | 38.6 KB   | 7.9 KB    | (n/a)           | yes, same story                  | —                         | —                                                                         | —                                                                 | 2026-07-22                                                |
| Yuku codegen wasm blob           | 0.7.4   | 221.2 KB  | 44.4 KB   | (n/a)           | —                                | —                         | —                                                                         | —                                                                 | 2026-07-22                                                |

**All brotli figures here are offline quality 11 and are not comparable to production
numbers.** Cloudflare compresses on the fly at a lower quality, so its output is
larger: the same `@babel/standalone` chunk measured **492.5 KB** brotli over
`live-demo.pages.dev` against **387.6 KB** offline here. Compare like with like, and
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
is size (563 KB gzip), which is why this research exists.

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
(45.5 KB gzip), it's the toolchain this repo already trusts for build-time parsing
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
   63.9 KB raw / 15.3 KB gzip / 13.6 KB brotli, its wasm blob is 663.4 KB raw / 196.7 KB
   gzip / 137.2 KB brotli. `@yuku-codegen/wasm` (needed to print the AST back to
   source) is another 38.6 KB raw / 7.9 KB gzip of glue plus a 221.2 KB raw / 44.4 KB
   gzip wasm blob. A realistic combined stack (analyzer for parse+specifiers, codegen
   for printing) comes to roughly **885 KB raw / 241 KB gzip total** — smaller than
   Sucrase, dramatically smaller than oxc's 3.2 MB wasm blob, and less than half of
   Babel's 563 KB gzip JS-only bundle.

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

Measured, not cited: `esbuild-wasm@0.28.1`'s `esbuild.wasm` is 13.3 MB raw / 3.54 MB
gzip / 2.58 MB brotli. `@swc/wasm-web@1.15.46`'s `wasm_bg.wasm` is 18.15 MB raw /
4.77 MB gzip / 3.00 MB brotli — larger even than esbuild-wasm. Both are 5-10x the
incumbent Babel bundle before any code-splitting benefit could offset it. Not
seriously in the running; included only per the task's instruction to document the
disqualification with real numbers.

## What I could not measure

- **oxc wasm blob brotli.** I measured gzip (1050.2 KB) but treat any brotli number
  for a 3.1 MB wasm binary as noise not worth reporting as a clean comparison point —
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
- **Yuku codegen wasm blob brotli.** Measured gzip (44.4 KB) but skipped brotli for
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

**Under brotli it was worth roughly nothing.** The headline was ~90 KB gzip. But the
`@babel/core` chunk measured 387.2 KB brotli, and this research measured
`@babel/standalone` at 387.6 KB brotli by a comparable offline method. Different
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
error message a user actually sees. The `@babel/core` swap that looked like ~90 KB
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
