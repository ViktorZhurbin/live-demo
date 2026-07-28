# CSS imports in demos

Original question: explore lite bundlers, or whether a naive hand-rolled one
could handle CSS imports and similar.

Answered below: no bundler is needed, and the bundler was never the blocker.
Scope frame is [ADR 0003](../decisions/0003-scope-boundary.md) — plain CSS
imports sit inside Ring 1, with one caveat that decides which variant to build.

## Correction: Rollup never supported this

The assumption that `@rollup/browser` handled CSS before
[ADR 0001](../decisions/0001-drop-rollup-for-cjs-require-loop.md) removed it is
wrong, in two independent ways.

**CSS never reached Rollup.** The build-side extension gate predates the removal
and is unchanged: `getPossiblePaths` (`shared/pathHelpers.ts`) throws
`IMPORT_EXTENSION_NOT_SUPPORTED` for any extension outside `LiveDemoLanguage`,
and the Rollup-era `resolveFileInfo.ts` called the same helper
(`git show 5d12aa3^:packages/rspress/src/node/helpers/resolveFileInfo.ts`). A
`.css` import failed during `collectDemoFiles`, long before bundling.

**Rollup would not have handled it anyway.** Rollup core parses every module as
JavaScript; CSS support comes from plugins, and the Rollup-era
`pluginResolveModules.ts` had none — its `resolveId` returned `null` for
anything not already in `files`, and `files` only ever held `.js(x)`/`.ts(x)`.
Adding CSS would have meant hand-writing a Rollup plugin whose entire body is
"return the text wrapped in a `<style>` injection" — the same fifteen lines that
now belong in `moduleRunner.ts`, minus Rollup.

So: **bringing Rollup back buys nothing here.** It would re-add ~350 KB brotli
(ADR 0001's measured saving) to solve a problem it never solved and does not
address. Closed.

## What it actually takes

CSS needs a _transform_ step, not a bundler. Three small changes:

1. **Build side — let `.css` into `files`.** Not by adding it to
   `LiveDemoLanguage`: that enum is also the candidate list for extensionless
   imports, so `./Button` would start probing `Button.css`. CSS has to be an
   explicit-extension-only import, which means a separate allowlist consulted
   after `getFileExt` and before `getPossiblePaths`.
2. **Build side — don't parse it as JS.** `analyzeModule` runs the file through
   oxc for its dependencies. A `.css` file has none worth following; read the
   contents and return an empty dependency set.
3. **Runtime — inject instead of evaluate.** `transformCode.ts` must skip
   Sucrase for `.css`, and `moduleRunner`'s `requireModule` must branch: on a
   resolved key ending in `.css`, create a `<style>` node with the text, append
   it, and cache an empty `exports` — rather than `new Function`.

Roughly 40 lines total, no new dependency. One lifecycle wrinkle to design
rather than discover: with editing debounced at 800 ms, every recompile injects
another `<style>`. They need to be keyed and replaced, and removed when the demo
unmounts.

## The caveat that picks the variant

A plain `<style>` injection is **global and unscoped**. It leaks demo styles
into the docs page and lets docs styles leak into the demo — which is exactly
rspress#1269 / #1394, the style-pollution complaint that drove upstream to build
iframe modes. Shipping plain CSS imports means shipping that bug on purpose.

That makes **CSS Modules the more defensible target**, and the interesting one:

- It adds one real transform — rewrite `.foo` selectors to `.foo_<hash>` and
  return the class-name map as the module's exports. Perhaps 40–60 lines of
  actual CSS work on top of the plumbing above, still with no bundler.
- It gives one direction of isolation for free: demo styles stop leaking _out_.
  Docs styles leaking _in_ remains, and that one genuinely needs shadow DOM or
  an iframe (ADR 0003, Ring 3).
- It matches what mode-2 users — component libraries documenting themselves —
  actually write. Plain global CSS is rarer in that population.

The pre-`a31236b` wording of the CLAUDE.md limitation ("No CSS modules in live
demos") suggests this was already the shape of the intent.

## Out of scope

Sass, Less, Tailwind, PostCSS plugins. Each needs a real toolchain in the
browser, failing ADR 0003's test. Supporting evidence that this is the right
call even for projects that _do_ have a bundler: rspress v2 unbundled Sass/Less
from `plugin-preview` and now makes users pass `@rsbuild/plugin-sass` through
`iframeOptions.builderConfig` themselves.

## Recommendation

1. Build CSS Modules support, not plain CSS imports, and say so in the docs —
   the scoping is the feature, not an implementation detail.
2. The file-collection refactor (moved file collection into remark;
   [upstream-plugins-actions.md](./upstream-plugins-actions.md)'s "Done"
   section) already landed and touches the same `collectDemoFiles` path this
   needs to change — read that entry's cache design before starting.
3. Leave Rollup out.
