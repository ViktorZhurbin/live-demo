# @live-demo/rspress: plugin internals

Implementation of the Live Demo rspress plugin. See the [root
CLAUDE.md](../../CLAUDE.md) for what the plugin does and how this package
fits in the monorepo.

## Library references

- `@mantine/hooks`: https://mantine.dev/llms.txt
- `@uiw/react-codemirror`: https://github.com/uiwjs/react-codemirror/blob/master/core/README.md
- `@codemirror/lang-javascript`: https://codemirror.net/docs/ref/
- `react-resizable-panels`: https://github.com/bvaughn/react-resizable-panels/blob/main/README.md
- `react-error-boundary`: https://github.com/bvaughn/react-error-boundary/blob/main/README.md
- `sucrase`: https://github.com/alangpierce/sucrase (README is the API doc)
- `tsdown`: https://github.com/rolldown/tsdown/blob/main/skills/tsdown/SKILL.md
- `vitest`: https://github.com/vitest-dev/vitest/tree/main/docs/guide

## Maintaining this file

Update this file when your changes affect what's documented here.

Keep a fact here only if an agent needs it **before** opening the relevant
file. Otherwise, it belongs in a docblock next to the code. Reference the
file instead of restating it.

Also update `CHANGELOG.md` when a change is user-facing: breaking, newly
allowed, or otherwise affects consumers of the published package.
Internal/contributor-only changes don't belong there.

## Architecture

Two phases:

**Build time (Node.js, `src/node/` + `src/plugin/`)**

- `src/plugin/plugin.ts` registers `liveDemoPluginRspress()` as an
  `RspressPlugin`. Its `config` hook captures `config.root` (mirroring
  `@rspress/core`'s own resolution) into `docRoot`, used for the
  `/`-prefixed `file=` form. `markdown.remarkPlugins` is built before
  `config()` runs, so `docRoot` reaches `remarkPlugin` as a `getDocRoot`
  getter, not by value — see the getter's inline comment in `plugin.ts`.

- On `routeGenerated`, `visitFilePaths.ts` scans every MDX file once per
  dev-server process — the routed pages, plus the `.mdx` partials they
  import, which are compiled like any page but never appear in the route
  table. An external demo is a fenced block with `file="..."` and the bare
  word `live` (or `playground`, see `parseCodeMeta.ts`) in its meta, or the
  deprecated `<code src="..."/>`. For each one it walks the entry file and
  its transitive imports (`collectDemoFiles.ts`), folding external imports
  into the sitewide `uniqueImports` set — the walk's own `files` result is
  discarded. `resolvePrefixedPath.ts` maps `file=`'s four supported prefixes
  (`./`, `../`, `/`, `<root>/`, matching `@rspress/core`'s
  `remarkFileCodeBlock`) to the `{ dirname, importPath }` pair the resolver
  expects. Inline ` ```lang live ` blocks collect no files — the MDX itself
  is the one file — but `collectInlineImports.ts` still parses their source
  for imported packages, so those reach the virtual module too.

- All demos' external imports feed one generated virtual module
  (`getVirtualModulesCode.ts`) as lazy `() => import(...)` thunks, shared
  sitewide: a static import would make every page pay for every other
  page's externals. `runCode.ts` awaits only its own demo's.

- `remarkPlugin.ts` resolves the same `file=`/`<code src>` reference and
  re-walks its graph (`collectDemoFiles.ts` again) on every MDX compile, so
  a demo's `files` reflect current disk content rather than the
  once-per-process scan. `analyzeModule.ts`'s per-file cache — keyed by
  `(absolutePath, mtimeMs)` — keeps that re-walk from doubling the scan's
  disk reads; an edit's new mtime forces the cache miss.

- It rewrites the MDX AST: a `file="..." live` block, an inline
  ` ```lang live ` block, or `<code src="..."/>` becomes a
  `<LiveDemo files={...} />` element. Pages with at least one demo get a
  prepended layout `import` (`createLayoutImportNode.ts`) so only those
  pages pull in the runtime graph. An inline block's source is parsed for
  imports here as well as in the scan — the two serve different ends (the
  virtual module vs. the per-demo prefetch hint), see `transformInlineDemo`.

- Per-page injection alone isn't enough: the runtime graph (CodeMirror, the
  virtual-modules bundle) still has to stay out of every page's chunk. That's
  what `src/web/lazy.tsx` is for — its own build entry
  (`@live-demo/rspress/web/lazy`), not an export of the `web` barrel. Layouts
  render `LiveDemoLazy` from that subpath rather than importing `LiveDemoRoot`
  directly; see its docblock for why and how.

**Runtime (browser, `src/web/`)**

- The user edits code in a CodeMirror-based editor, bundled with the
  package. On change, Sucrase loads lazily via dynamic `import()`
  (`loadCompiler.ts`); the consuming site code-splits it into an async
  chunk that loads only on demo pages.

- `runCode.ts` walks from the entry file over `files`, transpiling every
  reachable file to CommonJS and collecting unresolvable specifiers as
  externals; see `transformCode.ts`'s docblock for how the Sucrase pass and
  specifier extraction work.

- Once externals are preloaded (`loadImports`), `moduleRunner.ts`'s small
  `require` evaluates each file with `new Function`, resolving
  `./Button`-style specifiers against the importing file's directory into a
  key in the `files` record — the same resolution rules
  `collectDemoFiles.ts` uses at build time, via the shared
  `pathHelpers.ts` helpers. The entry file's default export (or its last
  named export) renders into the host page's React tree.

- None of that — nor the editor — starts on page load. `lazy.tsx` withholds
  `<LiveDemoRoot>` until a one-shot `IntersectionObserver`
  (`observeEnteredViewport.ts`) sees its loading skeleton come within 400px
  of the viewport, so a demo the reader never scrolls to costs nothing
  beyond that skeleton (ADR 0004's payload axis). The gate can't move
  deeper: rendering `<LiveDemoRoot>` is what fires its `import()`, and the editor
  rides in the same chunk group. See `lazy.tsx`'s docblock.

### Dependency gotchas

These live here because `package.json` can't hold comments. Everything else
about a file is documented in the file itself.

`@mdx-js/mdx`, `mdast-util-mdx`, `remark-gfm`, `unified`, and
`unist-util-visit` live in `peerDependencies` only. `tsdown` leaves
them external in `dist/` and the real runtime copy must be
`@rspress/core`'s own. Don't delete or move them.

### The build→runtime seam

The one contract spanning both phases: **`files` is keyed by each file's path
relative to the entry file's directory**, posix-style. The build step
(`collectDemoFiles.ts`) produces those keys; the runtime resolver
(`moduleRunner.ts`'s `resolveLocalImport`) resolves imports against them. Both
go through `shared/pathHelpers.ts`. Change one side, change the other, and check
`tests/integration/buildToRuntime.test.ts`, the only test that spans the seam.
Every unit test on either half can pass while a demo renders nothing.

Note that build time deliberately does _not_ bundle: see `collectDemoFiles.ts` for why.

**The second contract: both sides must discover the same files.** Keying is only
half of it. Each side finds a demo's imports by its own mechanism — build time
walks the oxc AST (`extractSourcePath.ts`), the runtime regexes Sucrase's
_emitted_ output (`transformCode.ts`'s `REQUIRE_RE`) — and each has good reasons
for it, documented at each site. Nothing forces them to agree, so an oxc or
Sucrase upgrade can drift them apart while every unit test on both halves stays
green: `buildToRuntime.test.ts` proves the runtime can resolve what the build
side found, not that the two find the same thing.

Two divergences exist on purpose today:

- **Dynamic `import()`** — neither side sees it. `extractSourcePath` skips
  `ImportExpression`, and Sucrase emits the require mid-line where `REQUIRE_RE`
  won't match. See the Limitations entry for what that means for demo authors.
- **An unused value import** — build sees it, the runtime doesn't, because
  Sucrase elides the binding. The file still lands in `files`, which is what
  makes `MODULE_NOT_TRANSPILED` reachable at all.

Before "fixing" either, note that teaching the build side to skip unused
bindings means reimplementing Sucrase's elision rules against the oxc AST —
more of exactly this drift, not less.

**Everything crossing that seam is JSON.** `remarkPlugin.ts` `JSON.stringify`s
every prop into an MDX attribute and `parseProps.ts` parses it back, so
nothing but JSON-serializable data can reach the runtime — **functions,
class instances, and CodeMirror extensions silently become `undefined`, with
no error on either side.** This binds plugin _options_ as much as `files`:
`LiveDemoPluginOptions["ui"]` rides the same attributes. Moving delivery off
per-node attributes wouldn't change it either, since a virtual module is
generated source text too. The only way to pass a function would be a
user-supplied module path the consuming bundler imports — that's
`customLayout`, removed on purpose (see the CHANGELOG, and ADR 0003's
"Closed" reasoning). Type any new option accordingly rather than typing it as
a third-party library's full prop surface.

### Build & Verify Gotchas

**Build must run before typecheck.** `static/LiveDemo.tsx` imports the
package's own public API by its published specifier (`@live-demo/rspress/web`),
which resolves through `package.json`'s `exports` map to `dist/`. If `dist`
doesn't exist yet, that import fails typecheck with a "Cannot find module"
error (it doesn't fail quietly). CI (`.github/workflows/ci.yml`) runs
`build:lib` before `typecheck` for this reason, and `pnpm verify` (root `package.json` script) mirrors that order. Keep both in sync if either changes.

## Conventions

### Comments

- **Module docblocks**: 3-8 lines on the file's architectural role, what
  problem it solves and how it fits with neighboring files (not a restatement
  of its exports).
- **Inline comments**: answer "why?" or "why not the obvious way?" Delete
  anything that just restates what the code already says.
- **JSDoc prose**: only when the name and TypeScript's own types don't already
  convey intent (this is TypeScript, not plain JavaScript). Don't add `@param`/`@returns` blocks
  that repeat a type signature.
- **Concision**: prefer the shortest comment that still carries the why.
  A docblock past ~8 lines is a smell. Say the rationale once in the file
  that owns it, and have other call sites reference it instead of re-explaining.

### Function declaration style

Use arrow functions by default. Leverage named function declaration hoisting to keep local helpers at the bottom of the file.

### Build-time state is per plugin instance

Every piece of state that belongs to a _build_ — `uniqueImports`,
`moduleCache`, `docRoot` — is a closure variable created inside
`liveDemoPluginRspress()` and threaded to whatever needs it, never a
module-level binding: two plugin instances in one process (tests do exactly
this) would share it and leak across each other.

The one deliberate exception is `warnOnce.ts`'s `warnedKeys`, which is
module-level on purpose. Deprecation notices dedupe per _process_, not per
build — two plugin instances shouldn't each re-warn about the same
`<code src>` — so it has a test-only `resetWarnOnce` instead of instance
scoping. Anything that would change a build's output doesn't get that
latitude.

Threading state through parameters is the cost of that guarantee; it's
deliberate, not plumbing that wants tidying. The `docRoot` getter in
Architecture above is the same rule applied to a single value.

## Testing

### Vitest

Test build-time logic in a `node` environment.

Fixtures live in `tests/fixtures/`. **Read its README before adding one.**
Two bugs have shipped past a fully green suite because a fixture had the
right extension and the wrong syntax.

### Playwright

Test `web/` components against the actual `website/` through the preview build.

### The `ui` options have no behavioral coverage

`controlPanel.hide`, `fileTabs.hide`, `fileTabs.hideSingleTab` and
`editor.tabSize` are documented in `customization.mdx` and rendered by no test.
`remarkPlugin.test.ts` asserts only that one of them survives the build→runtime
transport as a forwarded attribute.

That's structural, not a backlog item. `ui` is a **site-wide** plugin option, so
`website/` can only ever build with one configuration — asserting `hide: true`
would mean hiding that band on the real docs site. The unit suite can't reach
them either: `environment: "node"`, no DOM, and `.tsx` deliberately excluded
from coverage (see `vitest.config.ts`'s comment). Closing the gap means a DOM
test environment or a second Playwright project with its own rspress config,
both judged out of proportion to four options at this project's scale.

So: treat these four as unverified when you change anything they touch, and
check them by hand.

## Limitations (of demo code, not the plugin's own source)

These are consequences of the "no bundler" commitment, not independent
choices — see [ADR 0003](../../docs/decisions/0003-scope-boundary.md).

- No CSS in live demos: inline styles or global CSS only
- Dynamic `import()` resolves only what a _surviving_ static import already
  pulled in. Neither collector sees the specifier (see "The second contract"
  above), so the target has to already be in `files` and walked. In an
  **inline** demo it can never resolve: `files` holds the single MDX block and
  nothing else. Where a failure shows up depends on the demo's shape —
  `React.lazy(() => import(...))` re-throws during render into `Preview`'s
  `ErrorBoundary` and gets the overlay; a fire-and-forget `import()` rejects in
  a microtask after `runCode` has returned, so it only reaches the console.
- No Node.js APIs: demos run in the browser
- Only `.js(x)`/`.ts(x)` files are resolvable as imports
- `file=` can't be extensionless (`file="./Button"`), unlike the deprecated
  `<code src>`. `@rspress/core`'s `remarkFileCodeBlock` reads `file=`
  literally off disk with no extension-guessing, and core registers it
  _before_ any plugin's remark plugins (`@rspress/core`'s `mdx/options.js`
  spreads `remarkPluginsFromPlugins` last, with no ordering knob) — so within
  the remark pass this plugin can't get ahead of it, and an extensionless
  `file=` would fail as core's unrelated ENOENT. What gets ahead of it is the
  `routeGenerated` scan, which runs before any MDX compiles:
  `resolveFileMetaEntry.ts` (shared by the scan and `remarkPlugin`) rejects an
  extensionless or unsupported-extension `file=` there with
  `FILE_META_EXTENSION_REQUIRED`, so the failure is a clear message instead.
  Guarded by `tests/node/helpers/resolveFileMetaEntry.test.ts`.
- No import can be resolved that isn't declared in some demo's source at
  build time — the consuming bundler has to see every specifier statically
  to build the virtual module. This bites typing a brand-new import while
  editing a demo in the browser: it throws `EXTERNAL_IMPORT_NOT_FOUND`
  instead of resolving. Inherent to the design, not a gap to close (see
  `getVirtualModulesCode.ts` and `website/docs/guide/usage.mdx`).
- No JSX closing-tag-mismatch or duplicate-prop diagnostics: Sucrase is a
  token rewriter, not a validating parser, and skips that checking by design.
  A demo with `<div></span>` or `<Foo a="1" a="2">` transpiles and runs
  whatever that produces instead of failing with a clear parse error.
- The literal text `require('pkg')` **at the start of a line inside a demo's
  string** (a code sample in a template literal, say) is read as a real
  import and fails loudly with `EXTERNAL_IMPORT_NOT_FOUND`, never silently.
  Fix: reword or re-indent the demo. See `transformCode.ts`'s `REQUIRE_RE`
  comment for why only that position is ambiguous.
- An import whose binding is never used in a value position is dropped, in
  `.js`/`.jsx` as well as TypeScript, because the `typescript` transform runs
  unconditionally (see `transformCode.ts`). Bare `import './styles.css'` is
  kept, so this only bites `import X from 'pkg'` where `X` is unused and
  `pkg` was wanted for its side effects. The build side keeps it either way, so
  an unused external still reaches the virtual module and this demo's
  `externalImports`; `CodeRunner`'s prefetch then downloads it for every
  reader who scrolls to the demo — a package that nothing then uses. Cheap to
  avoid (drop the import). See "The second contract" above for why the build
  side doesn't detect it.

## Deliberately not handled

This section exists to stop defensive-code creep.

- **Isolation model** - Demo code is **not** sandboxed.
  `moduleRunner.ts` evaluates each file via `new Function(...)` and
  `CodeRunner` renders the result with `createElement` directly in the host
  React tree, wrapped only in a `react-error-boundary`. This is a docs tool
  and demo code authors are as trusted as the docs themselves. It's also a
  scope commitment rather than skipped defensive code — the rationale, and
  what it rules out, live in
  [ADR 0003](../../docs/decisions/0003-scope-boundary.md).
- **Cross-platform**: no Windows path handling. See the posix-style `files`
  keys in "The build→runtime seam" above.
- **Graceful recovery on file reads**: a read that fails after the existence
  check (permissions, a removed file) propagates raw.
- **Runtime validation of plugin options**: `LiveDemoPluginOptions` is
  TypeScript's contract only; `plugin.ts` doesn't check any of it at runtime.
- **`.md` files**: an external demo injects JSX (`<LiveDemo>`), so it only
  works in `.mdx` files.
- **Dev-mode staleness**: what a recompile picks up is not the same as what
  triggers one. `remarkPlugin` re-walks a demo's whole file graph fresh on
  every MDX compile, so once a page recompiles, the entry and everything it
  imports reflect current disk content. What triggers that recompile is
  Rspack's own dependency tracking, which watches the MDX file itself and a
  `file=`'s literal target — not a file reached only through
  `collectDemoFiles`'s own read (something a demo's entry merely imports).
  So editing _only_ such a file doesn't itself trigger a recompile (verified
  against a real dev server); the edit surfaces on whatever recompile
  happens next for another reason — editing the entry, editing the MDX
  file, or restarting. Adding a brand-new demo needs no restart: editing the
  MDX is itself the recompile. The one edit that does need a restart is a
  demo introducing an _external_ import no demo used before, since
  `uniqueImports` feeds a virtual module fixed at plugin-config time.

## Troubleshooting

Every error the plugin itself throws (build- or runtime-side) is a
`LiveDemoError` (`src/shared/errors/`). See the `errors.ts`/`messages.ts`
docblocks for the class/message-table split and the one code
(`EXTERNAL_IMPORT_NOT_FOUND`) that splices a plain string into the generated
virtual module instead of importing the class.

- **`IMPORT_NOT_RESOLVED`** ("Couldn't resolve import"): the path doesn't
  exist under any supported extension. Check it against `getPossiblePaths`.
  The message names the importer and, if different, the MDX page that
  started the scan.
- **`IMPORT_EXTENSION_NOT_SUPPORTED`** ("isn't a supported file type"): the
  import's extension isn't `.js(x)`/`.ts(x)` (e.g. a `.css` import). This is
  thrown before any existence check; same importer/MDX-page context as above.
- **`UNSUPPORTED_FILE_PREFIX`**: a `file=` value doesn't start with `./`,
  `../`, `/`, or `<root>/`. Thrown by `resolvePrefixedPath` before
  `resolveFileInfo` runs.
- **`FILE_META_EXTENSION_REQUIRED`**: a `file=` value has no extension, or an
  unsupported one. Thrown by `resolveFileMetaEntry.ts` before `resolveFileInfo`
  runs — from both the scan and `remarkPlugin`, whichever resolves the
  reference first. In practice that's the scan, which is what lets an
  extensionless `file=` fail here rather than as an unrelated ENOENT from
  `@rspress/core`'s own MDX compile (see "Limitations").
- **`EXTERNAL_IMPORT_NOT_FOUND`** ("Can't resolve import"): confirm it's a
  real dependency and that it reached the virtual module
  (`getVirtualModulesCode.ts`). Thrown twice over: as a plain `Error` in the
  generated virtual module (which can't import the class), then re-thrown as
  a real `LiveDemoError` by `moduleRunner.ts`'s `loadExternal` — the only
  path demo code reaches an external through, and what gets the overlay to
  render the title and hint.
- **`PARSE_FAILED`**: thrown build-side by `readAndParseFile.ts` (oxc), or
  runtime-side by `transformCode.ts` (Sucrase) when a demo author's edit
  introduces a syntax error. Same code and message shape either way; the
  codeframe comes from oxc directly on the build side and from
  `formatCodeframe.ts` (hand-rolled, matched to oxc's shape) on the runtime
  side, since Sucrase doesn't produce one itself.

  Note which side you get. Saving a syntactically broken demo file **to
  disk** fails the page's MDX compile — `collectDemoFiles` parses every file
  in the graph, entry included, from inside the remark transform. Only edits
  made in the browser editor reach the runtime path and its error overlay.
  Deliberate: same surfacing point as `IMPORT_NOT_RESOLVED`, and a broken
  file on disk should fail loudly rather than ship a page whose demo
  explains the problem only after it loads.

- **`MODULE_NOT_TRANSPILED`**: a file in `files` was reached at evaluation time
  that `runCode`'s walk never compiled. The walk follows Sucrase's _emitted_
  requires, so this means something resolved a file that no surviving static
  import leads to — a dynamic `import()`, in practice. See `moduleRunner.ts`'s
  `evaluate`.

- **`PROP_PARSE_FAILED`**: the plugin's `JSON.stringify`d props and the
  runtime's `JSON.parse` are out of sync. Check `parseProps.ts`.
- **A demo picks up the wrong files**: log `Object.keys(files)` at the end of
  `collectDemoFiles.ts`. That's the exact record the browser receives.
