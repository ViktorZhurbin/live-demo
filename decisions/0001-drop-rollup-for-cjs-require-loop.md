# 0001. Drop `@rollup/browser`, run demos through an in-memory CommonJS require loop

- **Status:** Accepted, implemented in `5d12aa3` (2026-07-23). Unreleased; ships in 3.0.
- **Scope:** `packages/rspress` browser runtime (`src/web/compiler/`).
- **Supersedes:** nothing. **Superseded by:** nothing.

## Context

The browser runtime compiled a demo in two stages: Babel (`@babel/standalone`)
transpiled each file, then `@rollup/browser` bundled them into one module,
which `getFnFromString` evaluated with `new Function`.

Two facts made that worth revisiting.

**The compiler dominated what a reader downloads.** On a demo page, Babel plus
Rollup plus Rollup's wasm binary was roughly 75% of all JS a reader pulled
down, and it was a fixed cost: identical for a counter demo and for a three.js
scene. It was also paid by every reader, not just those who edit, since
`CodeRunner` compiles on mount.

**Rollup was doing less than its size implied.** The final evaluation step was
already a CommonJS module invocation in all but name: an `exports` stub, an
injected `require`-equivalent (`getImport`), and a function body. Rollup's only
real contribution was flattening N modules into 1 before doing the thing that
was going to happen anyway. Worse, flattening created work that would not
otherwise exist: Rollup left external imports as ESM in its output, so
`babelPluginTraverse` had to run a second AST pass to rewrite them into
`__get_import` calls and normalize exports.

This was step 1 of a four-step plan in `parse-transform-bundle.md`, deliberately
sequenced first because it was the only step that ends with less code and fewer
dependencies than it started with, and because it changes the value of the
steps after it.

## Decision

Replace Rollup with a per-module require loop over the same `files` record.

- `pluginResolveModules` became `moduleRunner.ts`'s `resolveLocalImport`,
  calling the identical `pathHelpers` functions. A relocation, not a rewrite.
- `pluginBabelTransform` became a direct `babelTransformCode` call.
- Babel's own `transform-modules-commonjs` turns `import { useState } from
"react"` into `require("react")`. The require decides: in `files` means
  evaluate that module, otherwise hand off to `getImport`.
- `babelPluginTraverse`'s AST rewriting is gone. It only ever existed to undo
  what Rollup left behind.

### What actually changed on disk

Deleted: `bundleCode.ts`, `getFnFromString.ts`, `babelPluginTraverse.ts`,
`rollup/pluginResolveModules.ts`, `rollup/pluginBabelTransform.ts`,
`rollup/pluginBabelTransformImportsExports.ts`.

Added: `runCode.ts` (walk, transpile, resolve externals, evaluate) and
`moduleRunner.ts` (the require graph itself).

Dependency `@rollup/browser` removed. Nothing added.

## Results

Measured at implementation time, recorded in `packages/rspress/CHANGELOG.md`:

- **~350 KB gzip / ~285 KB brotli** less to download on a page with a demo.
  The brotli figure is offline quality 11. Over Cloudflare, which compresses at
  a lower quality, the two removed chunks measured 114.9 KB (Rollup JS) +
  234.6 KB (wasm) = **~350 KB brotli** in production, so the real-world saving
  is larger than the offline number suggests. See the method note in
  `research/open-questions.md`.
- For `guide/external/basic`, the compiler payload drops from Babel + Rollup JS
  plus Rollup's wasm binary to Babel alone.
- Six files deleted, two added. One dependency dropped, none added.
- Babel's codeframes preserved. Multi-file demos still work.

Behavioral changes a consumer notices are in the CHANGELOG under "Changed" and
"Breaking" (`window.Babel` / `window.rollup` are no longer set globally).

## Tradeoffs accepted

**Circular imports changed semantics, knowingly.** `collectDemoFiles.ts`
previously documented that cycles work because Rollup handled them correctly.
The require graph gives Node's partial-exports behavior instead:
`moduleRunner`'s `evaluate` seeds the cache before running a module body, so a
cycle terminates, and a value read by property access after the cycle unwinds
(mutually recursive functions, the common case) sees the fully-initialized
module. A value used at module-eval time, before the cycle unwinds, sees
whatever `exports` existed at that moment. This is a real semantic change to a
documented guarantee. It is judged obscure enough in demo code to accept, the
reasoning is recorded at `collectDemoFiles.ts`, and `buildToRuntime.test.ts`'s
"circularly" case pins the common shape.

**`getImport` stays synchronous, so externals must be resolved up front.** The
evaluated module calls `getImport` during module init and cannot await. Rollup
used to report what it externalized; now `runCode` walks and transpiles every
reachable file first, collects the `require()` targets, awaits `loadImports`,
and only then evaluates. This is why `runCode` is a two-phase function rather
than a straight recursive evaluation, and why the walk cannot be folded into
`moduleRunner`.

**`export const App` support moved from an AST pass to a few lines.**
`getEntryResult` takes `module.exports.default` if present, otherwise the last
key of `module.exports`. Insertion order gives last-export-wins for free. A
simplification, not a loss.

## What the original analysis missed

Recorded because it is the useful part in six months. The three wrinkles
anticipated up front (externals-before-evaluation, circular imports, `export
const App`) all landed as predicted and none were fatal. Two things that were
_not_ anticipated caused real work.

**ESM/CJS interop at the external boundary.** Externals arrive as real ES
namespace objects from the browser's own `import()`, not Babel's CJS
convention. Babel's `_interopRequireDefault` only reads `.default` when it sees
an `__esModule` marker, and a package with no real default export needs the
whole module to stand in for one. `moduleRunner`'s `wrapExternal` fakes both.
Under Rollup this never surfaced, because Rollup owned the interop. General
lesson: removing a bundler moves its interop obligations onto you, and interop
is the part nobody itemizes when estimating the removal.

**Named imports fail differently without a bundler.** Babel's CommonJS interop
turns `import { usestate } from 'react'` into a property read that quietly
yields `undefined`, so the demo dies later at the use site with a TypeError
naming neither the import nor the package. This forced a new error code,
`UNDEFINED_NAMED_IMPORT`, the `assertNamedImportsExist` check in `runCode`, and
threading `namedImports` out of `babelTransformCode`. A bundler would have
errored at bundle time for free.

Both cost more than the "four files deleted" framing suggested. The change was
still clearly worth it, but the estimate was optimistic about what a bundler
silently provides beyond flattening modules.

## Consequences for future work

**Single-file-only demos are now worth much less.** That idea's value was
mostly that it would let Rollup go. With Rollup already gone, dropping
multi-file support saves only the require loop, roughly 40 lines. Reassess it
as a product question (multi-file is a real feature, and one of the pain points
with the official playground plugin) rather than a bundle-size one. This
ordering was the reason for doing Rollup removal first.

**The build→runtime seam survived intact.** `files` is still keyed by each
file's path relative to the entry file's directory, posix-style, and both sides
still go through `shared/pathHelpers.ts`. `resolveLocalImport` replaced
`pluginResolveModules` as the runtime half. `buildToRuntime.test.ts` is still
the only test spanning it.

**The remaining steps of that plan have since been answered — all negative.**
Steps 2-4 were to try `@babel/core`, then oxc, then Sucrase.

- **`@babel/core`**: implemented and abandoned. It works, but the consuming
  site would have to add `@rsbuild/plugin-node-polyfill` plus two shims to its
  own build config, and under brotli the saving was near zero (the ~90 KB was a
  gzip artifact). Kept at `git stash@{0}`.
- **oxc, Sucrase, Yuku, esbuild-wasm, swc-wasm**: all measured and run. None
  clears zero-consumer-config while matching CJS output, specifier access, and
  error quality.

`@babel/standalone` stays. Full evidence in `research/transpiler-research.md`;
revisit triggers in `research/open-questions.md`.
