# Upstream takeaways → ordered plan

Companion to [upstream-plugins-takeaways.md](./upstream-plugins-takeaways.md).
That file is research: what the two official plugins are and what they do
differently. This one is the decision layer — what's worth doing _here_, in
what order, and what the research got wrong or has since drifted from.

Kept separate rather than appended, because the two have different lifetimes.
The research is a snapshot worth preserving as written; this list gets items
checked off and eventually gets deleted.

Ordering axis is this repo's own stated goals, not general plugin quality:
`packages/rspress/CLAUDE.md`'s "simplify adoption and the switch from the
official plugin", and the root CLAUDE.md's 3.0 driver of "code clarity,
simplicity, maintainability". At ~22 weekly downloads, "users would want X"
is not an argument; "this deletes code" and "this makes migration a config
change" are.

## Corrections to the research doc

Written before some of this landed, or reasoned from the wrong premise.

- **`includeModules` doesn't exist.** Item 5 says "your `includeModules` is
  names only." It was removed in the current major (`CHANGELOG.md`, "`includeModules`
  plugin option removed") once inline demos started being scanned for their own
  imports. So the gap isn't "names only vs. aliasing tuples" — there is no
  option at all, and the removal rationale still holds. See item 5 below for
  what's actually left of this.
- **The debounce comparison is already resolved.** Item under "Small,
  portable details" asks how `useActiveCode.ts` compares to playground's 800ms.
  It's not there — the debounce lives in `CodeRunner.tsx:15`, at exactly 800ms,
  with two refinements playground lacks (mount-time `.flush()` so first paint
  doesn't idle out the debounce, and `prefetchImports` overlapping externals
  with the compiler load). Nothing to do.
- **`<code src>` is already answered.** Item 7 defers to a `TODO.md` entry on
  whether `<code src>` should become explicit meta. That entry is gone and the
  question resolved itself: `file="..." live` _is_ the canonical form,
  `<code src>` is a deprecated alias with a `warnOnce` notice
  (`remarkPlugin.ts:75`) slated for removal. Don't reopen; just delete it in 3.0.
- **`defaultRenderMode` is the wrong lever for migration.** Item 2 claims it's
  "the thing that makes converting an existing docs site a config change rather
  than a find-and-replace." It isn't. Playground's `defaultRenderMode` defaults
  to `'pure'` — opt-in via a `playground` marker — which is already exactly
  what `live` does. The find-and-replace a migrating user faces is
  `playground` → `live` on every fence. What removes it is accepting the
  `playground` keyword, not a render mode. See item 3.

## The list

### 1. Move file collection into the remark pass — **large, highest value**

The research doc's "one real architectural idea", and the only item that
deletes code _and_ closes a documented bug. Keep `visitFilePaths` running in
`routeGenerated` but have it fold only `externalImports` into `uniqueImports`;
resolve `file=` and run `collectDemoFiles.ts` inside `remarkPlugin` instead.

What goes away: `demoDataByRef` and its type, `demoRefKey.ts`, both
`console.warn` blocks (`remarkPlugin.ts:85-91` and `:120-126`), the
`node.value ? {…} : …` freshness hack at `remarkPlugin.ts:140`, the "second,
build-internal seam" paragraph in `packages/rspress/CLAUDE.md`, and the
"Dev-mode staleness on demo-file edit" limitation in the same file. Residual
staleness drops to "a demo gained a brand-new _external_ import → restart",
which is a strict subset of the `EXTERNAL_IMPORT_NOT_FOUND` limitation already
documented as inherent.

Three obstacles the research doc doesn't name, all of which should be settled
before starting:

- **`docRoot` is a `let` primitive set by the `config` hook** (`plugin.ts:46`),
  but `markdown.remarkPlugins` is built once at plugin-definition time. Passing
  `docRoot` by value captures the pre-`config()` default. It has to become a
  getter or ride in a mutable object, the way `demoDataByRef` currently does.
- **The graph gets walked twice.** The scan still needs the full transitive walk
  to discover external imports (unlike playground, which is single-file and only
  parses the entry). So `collectDemoFiles` runs once in the scan with `files`
  discarded, then again per MDX compile. One code path, roughly double the reads
  at dev-server start. Fine at this scale, but say so in the docblock rather
  than letting it read as an oversight.
- **Errors move from build-crash to MDX-compile.** `IMPORT_NOT_RESOLVED`,
  `IMPORT_EXTENSION_NOT_SUPPORTED`, and `FILE_META_EXTENSION_REQUIRED` currently
  throw at `routeGenerated` and fail the build loudly. Thrown from inside remark
  they go through rspress's MDX pipeline, which — per `remarkPlugin.ts:117` —
  collects vfile messages and never prints them. Verify a thrown `LiveDemoError`
  still surfaces before committing to the move; this is the one way the refactor
  could be a net DX regression.

Tests to expect: `tests/node/visitFilePaths.test.ts`,
`tests/node/remarkPlugin.test.ts`, `tests/plugin/scanToVirtualModule.test.ts`,
and `tests/integration/buildToRuntime.test.ts`.

### 2. Narrow `ui.editor`'s type — **tiny**

`types.ts:76` types it as full `ReactCodeMirrorProps`, but every option travels
through `JSON.stringify` into an MDX attribute (`remarkPlugin.ts:205`). Functions
and CodeMirror extension instances — the things anyone would actually reach for
— silently vanish. Narrow the type to the serializable subset. Independent of
item 6, and the fix for the type lie specifically: moving delivery off per-node
attributes doesn't restore functions, because a virtual module and
`source.define` are both generated _source text_ too.

The only real path to passing functions is a user-supplied module path the
bundler imports, i.e. playground's `render` option. That's `customLayout`
again — deliberately removed, see "Closed" below.

### 3. Accept `playground` as an alias for `live` — **tiny, unlocks migration**

One extra token in `parseCodeMeta.ts:26`'s `tokens.includes("live")` check.
A site migrating off `@rspress/plugin-playground` then swaps one plugin
registration and changes nothing in its MDX. This is what item 2 of the research
doc was reaching for.

Tradeoff to state in the docs rather than engineer around: claiming the
`playground` keyword means the two plugins can't be registered together.
Upstream designed for coexistence (`defaultRenderMode`'s docs warn about it
explicitly); this plugin is a replacement, so that's the right trade — but it
should be written down, not discovered.

`preview` is a different matter and should _not_ be aliased: those blocks are
non-editable compiled previews, a different product.

### 4. Per-block meta options — **medium**

`website/docs/guide/customization.mdx:7` says outright there's no per-demo
override, and it's the most obviously-shaped gap. The parsing already exists:
`parseCodeMeta.ts` tokenizes every `key=value` pair and then discards all but
`file`. Extending it costs the plumbing, not the parser.

Worth carrying: the default view (the research doc's line-13 idea — `view=preview`
to open on Preview instead of Split), `direction=vertical`, and hiding the editor
or control panel for one demo. Inline and `file=` demos both already carry meta;
don't extend `<code src>`, it's leaving.

Frontmatter as a middle precedence tier (upstream's block > frontmatter > plugin
chain, read at runtime via `usePageData()` so it costs nothing at build time) is
a natural follow-on, but only once per-block exists. Split it out; per-block
alone covers the common "hide the editor for this one demo" need.

### 5. Verify `resolve.alias` already covers library self-aliasing — **tiny, verify first**

The capability behind the research doc's item 5 that survives `includeModules`'s
removal: a component library's own docs writing `import { Button } from 'my-lib'`
and having it resolve to `../src/index.ts`. This is the primary audience for the
whole plugin category.

But it may already work with zero code. `getVirtualModulesCode.ts` emits
`import('my-lib')` into a virtual module that the _consuming_ bundler resolves,
so a `resolve.alias` entry in the user's own rspress config should apply.
Check that before writing an option. If it works, this is a paragraph in
`website/docs/guide/customization.mdx`, which is a far better outcome than a
new option. If it doesn't, the minimal version is an alias map applied at
`getVirtualModulesCode` — specifier still has to be imported by some demo to
land in the map, so the `includeModules` removal rationale stays intact.

### 6. Deliver site-wide `ui` once instead of per demo — **medium**

`getPropsWithOptions` (`remarkPlugin.ts:191`) copies the entire `options.ui`
object into every single demo node, then `parseProps.ts` re-parses it per demo
at runtime. It's site-wide constant data riding in the MDX AST. Upstream keeps
it out entirely via `source.define` (`plugin-playground/src/cli/index.ts:209`);
a second virtual module would work equally well here and matches what this
codebase already does.

Same shape as item 1 — stop carrying build-time payload across a seam — and
doing 1 first makes the remaining `parseProps` surface small enough to see
clearly. Purely a payload/clarity win; it does not fix item 2's type lie.

### 7. Logger and `rp-not-doc` — **tiny each, do with item 1**

- Replace `console.warn` with `@rsbuild/core`'s `createLogger({ prefix: … })`
  so plugin output formats with the rest of the build. Do it _after_ item 1,
  which deletes two of the three call sites — what's left is `warnOnce.ts`'s
  deprecation notice.
- Check whether the demo chrome needs `rp-not-doc`. Both upstream plugins put
  it on their root to escape rspress prose styling; `Wrapper.tsx` has no
  equivalent. May well be moot — rspress v2 moved its theme off unprefixed
  Tailwind to scoped BEM (research doc, issue #1269) — so this is a Playwright
  check against `website/`, not a change.

## Deferred

- **`previewLanguages` + `previewCodeTransform`.** Cheap and a good fit with the
  "exploring interesting problems is legitimate" clause, and item 1 gives it a
  natural home (a transform hook right where the fence becomes a demo). But the
  honest scope here is narrower than upstream's: their example is Vue SFC, and
  this runtime is Sucrase → JS → React, so anything non-React can't render no
  matter what the hook returns. That leaves "pre-transform a fence into JS/JSX",
  which is real but has no known consumer. Easy to add when someone asks.

## Closed

- **The iframe modes.** Agreed with the research doc — two Rsbuild instances and
  a second dev server buys a different product.
- **`render` / composable web exports.** `customLayout` was removed on purpose
  (`CHANGELOG.md`): it broke the `React.lazy` boundary in `web/lazy.tsx` that
  keeps the runtime graph off non-demo pages. Upstream's `render` has the same
  footgun; playground just has no lazy boundary to break, so it never shows.
  Item 2's escape-hatch note is the only reason this would come back, and it
  isn't reason enough.
- **Mutable module-level singletons.** `demoDataByRef` and `uniqueImports` are
  closure state per plugin instance, not module-level. Item 1 keeps
  `uniqueImports` that way.
