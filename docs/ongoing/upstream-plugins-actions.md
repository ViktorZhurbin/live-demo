# Upstream takeaways → ordered plan

Companion to [upstream-plugins-takeaways.md](./upstream-plugins-takeaways.md):
that's research (what the two official plugins do differently), this is the
decision layer (what's worth doing here, in what order). Kept separate
because the two have different lifetimes — research is a snapshot; this list
gets items checked off and eventually deleted.

Ordering axis is this repo's own goals, not general plugin quality:
`packages/rspress/CLAUDE.md`'s "simplify adoption from the official plugin",
root CLAUDE.md's 3.0 driver of "code clarity, simplicity, maintainability",
and wire payload per [ADR 0004](../decisions/0004-payload-ranking-axis.md).
At ~22 weekly downloads, "users would want X" is not an argument; "deletes
code", "migration becomes a config change", and "measured" are.

**Reordered 2026-07-28** when the payload axis was added, pulling in items 1
and 2 (not from upstream — see "Where this list departs from upstream").
Numbering changed; cross-references in this file are updated, elsewhere may
not be.

## Corrections to the research doc

- **`includeModules` doesn't exist.** Removed in the current major
  (`CHANGELOG.md`) once inline demos started being scanned for their own
  imports. Item 5 below covers what's actually left.
- **The debounce comparison is already resolved.** Lives in
  `CodeRunner.tsx:15`, 800ms, with two refinements playground lacks:
  mount-time `.flush()` so first paint doesn't idle out the debounce, and
  `prefetchImports` overlapping externals with compiler load.
- **`<code src>` is already answered.** `file="..." live` is the canonical
  form; `<code src>` is a deprecated alias with a `warnOnce` notice
  (`remarkPlugin.ts:75`), slated for removal in 3.0.
- **`defaultRenderMode` is the wrong lever for migration.** It defaults to
  `'pure'` — already what `live` does. What removes the find-and-replace a
  migrating user faces is accepting the `playground` keyword, not a render
  mode. Done, see "Done" below.

## Where this list departs from upstream

- **Payload is a first-class axis** —
  [ADR 0004](../decisions/0004-payload-ranking-axis.md).
  `asset-size-comparison.md`: ~92% of demo-specific cost is CodeMirror
  (182.4 KB) + Sucrase (44.8 KB) of 246.6 KB brotli. Neither official plugin
  addresses this — both are heavier and offload to a CDN. Items 1 and 2
  come from this measurement.
- **Item 2 absorbs the old "narrow `ui.editor`'s type" item.** Owning the
  editor removes the foreign prop surface, so the type stops needing a
  description. Same problem, structural fix instead of a patch.
- **"Deliver site-wide `ui` once" is closed, not deferred.** See "Closed".

## The list

### 1. Viewport-gate the first compile — small, largest measured payload win

Promoted from `.shelved-questions.md`. Wrap `CodeRunner`'s mount-time flush
(`CodeRunner.tsx:97-106`) and `prefetchImports` in an `IntersectionObserver`.
A reader who never scrolls to the demo never loads 182.4 KB CodeMirror +
44.8 KB Sucrase — ~92% of the demo-specific payload.

No fidelity risk, no SSR exposure, no new option (Ring 1 throughout). Doesn't
substitute for the parked static-preview design — it only helps readers who
never reach the demo, a different population from those who reach it and
wait.

Care needed: the mount-flush exists so first paint doesn't idle out the
800ms debounce. Gating must preserve that once the demo enters view.

### 2. Own the editor: drop `@uiw/react-codemirror` — medium, deletes a dependency

The whole CodeMirror surface is three imports in `Editor.tsx:1-3` plus one
type import (`shared/types.ts:1`). Replacing the wrapper with
`@codemirror/view` + `@codemirror/state` directly is contained to
`Editor.tsx`.

- **Payload.** The wrapper is 20.6 KB gzip. `@codemirror/autocomplete` adds
  11.9 KB gzip despite `autocompletion: false` (`Editor.tsx:29`), because
  `basicSetup` imports it statically. ~30 KB gzip total — verify the
  autocomplete half before quoting, and don't mix gzip (per-package) with
  brotli (chunk total) in one sentence.
- **Dissolves the `ui.editor` type lie.** `types.ts:76` types it as full
  `ReactCodeMirrorProps`, but every option crosses `JSON.stringify` into an
  MDX attribute (`remarkPlugin.ts:207`), so functions and extension
  instances silently vanish. Owning the editor means defining a small
  serializable options type instead of tracking a foreign prop surface.
- **Fun.** CodeMirror 6's compartment/extension API is pleasant used
  directly, and `Editor.tsx` already has most of `basicSetup` disabled.

Unchanged by this: the only real path to passing functions through is a
user-supplied module path the bundler imports — playground's `render`
option, i.e. `customLayout` again, deliberately removed (see "Closed").

### 3. CSS Modules in demos — medium, best fun-to-value on the list

Full analysis in [css-imports.md](./css-imports.md): no bundler is needed,
and bringing Rollup back would buy nothing. Ring 1 under ADR 0003.

~100 lines, no new dependency: rewrite `.foo` selectors to `.foo_<hash>` and
return the class-name map as the module's exports. Closes rspress#1269 /
#1394-style bleed in the direction achievable without an iframe (demo styles
stop leaking out; docs leaking in still needs shadow DOM or an iframe,
Ring 3).

Build **CSS Modules, not plain CSS imports** — a bare `<style>` injection is
global and unscoped, the exact bug upstream's iframe modes exist to escape.
The scoping is the feature; the docs should say so.

Touches the same `collectDemoFiles`/`analyzeModule` path the file-collection
refactor changed (see "Done"): `remarkPlugin` re-walks per compile, so a
per-file `<style>` element has to key off the same `(absolutePath, mtimeMs)`
cache. Design the `<style>` lifecycle up front — with an 800ms debounce,
every recompile injects another node unless keyed, replaced, and removed on
unmount.

### 4. Per-block meta options — medium

`website/docs/guide/customization.mdx:7` says outright there's no per-demo
override — the most obviously-shaped gap. `parseCodeMeta.ts` already
tokenizes every `key=value` pair and discards all but `file`; extending it
costs plumbing, not parsing.

Worth carrying: default view (`view=preview` to open on Preview instead of
Split), `direction=vertical`, and hiding the editor or control panel for one
demo. Inline and `file=` demos both already carry meta; don't extend
`<code src>`, it's leaving.

Frontmatter as a middle precedence tier (block > frontmatter > plugin chain,
read at runtime via `usePageData()` so it costs nothing at build time) is a
natural follow-on once per-block exists. Split it out — per-block alone
covers the common "hide the editor for this one demo" need.

### 5. Verify `resolve.alias` already covers library self-aliasing — tiny, verify first

The capability behind research item 5 that survives `includeModules`'s
removal: a component library's own docs writing
`import { Button } from 'my-lib'` and having it resolve to
`../src/index.ts` — the primary audience for this plugin category.

May already work with zero code. `getVirtualModulesCode.ts` emits
`import('my-lib')` into a virtual module that the consuming bundler
resolves, so a `resolve.alias` entry in the user's own rspress config should
apply. Check that before writing an option. If it works, it's a paragraph
in `customization.mdx`. If not, the minimal version is an alias map applied
at `getVirtualModulesCode` — the specifier still has to be imported by some
demo to land in the map, so the `includeModules` removal rationale stays
intact.

### 6. Logger and `rp-not-doc` — tiny each

- Replace `console.warn` with `@rsbuild/core`'s `createLogger({ prefix: … })`
  so plugin output formats with the rest of the build. The file-collection
  refactor already deleted two of three call sites — what's left is
  `warnOnce.ts`'s deprecation notice.
- Check whether the demo chrome needs `rp-not-doc`. Both upstream plugins
  use it to escape rspress prose styling; `Wrapper.tsx` has no equivalent.
  May be moot — rspress v2 moved off unprefixed Tailwind to scoped BEM — so
  this is a Playwright check against `website/`, not necessarily a change.

## Done

- **Move file collection into the remark pass** (2026-07-28).
  `visitFilePaths` still runs once per dev-server process in
  `routeGenerated`, but now only folds each demo's `externalImports` into
  `uniqueImports`; `remarkPlugin` resolves `file=`/`<code src>` and walks
  `collectDemoFiles` itself, synchronously, on every MDX compile. Deleted:
  `demoDataByRef` and its type, `demoRefKey.ts`, both `console.warn` "no
  demo data" blocks, and the `node.value ? {…} : …` freshness hack.

  Three obstacles, settled before the rewrite:
  - **Errors surfacing from remark** — verified by temporarily throwing
    `LiveDemoError` inside `remarkPlugin` and running a real
    `pnpm build:web`; message, hint, and file location surfaced correctly.
  - **`docRoot`'s by-value capture** — `plugin.ts` now passes a
    `getDocRoot: () => docRoot` getter, since `markdown.remarkPlugins` is
    built before `config()` reassigns `docRoot`.
  - **The doubled walk** — `analyzeModule.ts` caches per
    `(absolutePath, mtimeMs)`, per plugin instance (a `Map` threaded through
    `collectDemoFiles` into both `visitFilePaths` and `remarkPlugin`).

  **Residual staleness turned out broader than planned.** Verified against a
  real `website` dev server: once an MDX page recompiles, the fresh walk
  does pick up every file in the graph. But what triggers that recompile is
  Rspack's own dependency tracking (the `.mdx` file itself, and a `file=`'s
  literal target) — not a file reached only through `collectDemoFiles`'s own
  disk read. Editing only a file a demo's entry merely imports does **not**
  itself trigger a recompile; it surfaces on the next recompile that
  happens for another reason. See `packages/rspress/CLAUDE.md`'s
  "Deliberately not handled" section for the corrected claim. Whether
  rspress lets a remark plugin declare that dependency
  (`docs/.open-questions.md`) is still unanswered.

- **Accept `playground` as an alias for `live`** (2026-07-28). One extra
  token in `parseCodeMeta.ts`'s `live` check. A site migrating off
  `@rspress/plugin-playground` swaps one plugin registration and changes
  nothing in its MDX — the highest value-per-line change in the repo, and
  what research item 2 was reaching for.

  Tradeoff to document rather than engineer around: claiming `playground`
  means the two plugins can't be registered together. Upstream designed for
  coexistence; this plugin is a replacement, so that's the right trade —
  but it's **still to write** in the docs.

  `preview` was deliberately not aliased: those blocks are non-editable
  compiled previews, a different product.

## Deferred

- **`previewLanguages` + `previewCodeTransform`.** Cheap and fits "exploring
  interesting problems is legitimate"; `remarkPlugin` (now doing its own
  resolution) gives it a natural home. But scope is narrower than upstream:
  their example is Vue SFC, this runtime is Sucrase → JS → React, so
  non-React can't render regardless of what the hook returns. That leaves
  "pre-transform a fence into JS/JSX" — real, but no known consumer.
- **The TS/JS view toggle.** From the origin project, not upstream (ADR
  0003's "Prior art"): react-babylonjs typed `files` as
  `Record<Language, FilesEntry>`, carrying a TSX and JSX copy of every file
  built at compile time (Babel with `retainLines`), switched at runtime.
  Passes ADR 0003 (build-time transform + toggle, Ring 1) and answers a
  real need: readers who don't write TypeScript see TSX with no
  alternative.

  Deferred on cost, not scope: doubles every demo's `files` payload, which
  cuts against items 1 and 2, and rests on whether Sucrase preserves
  formatting as well as Babel's `retainLines` did — unanswered. Its old
  framing as a companion to delivering site-wide data no longer applies;
  that item is closed.

## Closed

- **The iframe modes.** Agreed with the research doc — two Rsbuild
  instances and a second dev server buys a different product.
- **`render` / composable web exports.** `customLayout` was removed on
  purpose (`CHANGELOG.md`): it broke the `React.lazy` boundary in
  `web/lazy.tsx` that keeps the runtime graph off non-demo pages.
  Upstream's `render` has the same footgun; playground just has no lazy
  boundary to break, so it never shows.
- **Deliver site-wide `ui` once instead of per demo.** `getPropsWithOptions`
  (`remarkPlugin.ts:193`) copies `options.ui` into every demo node;
  upstream keeps it out via `source.define`. Priced against measurements:
  a few hundred bytes saved against a 246.6 KB demo-specific cost, costing
  a second generated virtual module and build-time seam. Reopen only if
  `ui` grows something large.
- **Mutable module-level singletons.** `uniqueImports` is closure state per
  plugin instance, not module-level; the file-collection refactor's
  `moduleCache` follows the same rule.
