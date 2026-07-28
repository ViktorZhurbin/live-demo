# @live-demo/rspress: plugin internals

Implementation of the Live Demo rspress plugin. See the [root
CLAUDE.md](../../CLAUDE.md) for what the plugin does and how this package
fits in the monorepo.

## Next goals

- Make changes that simplify adoption and the switch from the official plugin: align APIs and behaviors (where it makes sense).

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

`src/plugin/plugin.ts` is the `RspressPlugin` registered via
`liveDemoPluginRspress()`. Its `config` hook captures `config.root`
(mirroring `@rspress/core`'s own resolution) into `docRoot`, used later for
the `/`-prefixed `file=` form. `markdown.remarkPlugins` is built once,
before `config()` runs, so `docRoot` reaches `remarkPlugin` as a
`getDocRoot` getter rather than by value (`plugin.ts`'s inline comment on
the getter).

On `routeGenerated`, `visitFilePaths.ts` scans MDX files once per
dev-server process. For each external demo — a fenced block with both
`file="..."` and the bare word `live` in its meta (`playground` also
accepted, see `parseCodeMeta.ts`), or the deprecated `<code src="..."/>`
alias — it walks the entry file and everything it transitively imports
(`collectDemoFiles.ts`), folding only external imports into the sitewide
`uniqueImports` set; the `files` from that walk is discarded. `file=`'s path
can carry any of four prefixes (`./`, `../`, `/`, `<root>/`, matching
`@rspress/core`'s own `remarkFileCodeBlock`); `resolvePrefixedPath.ts` maps
each to the `{ dirname, importPath }` pair the rest of the resolver expects.
Inline ` ```lang live ` blocks (no `file=`) collect no files — they're a
single file held in the MDX itself — but the scan still parses their source
for imported packages (`collectInlineImports.ts`), so those reach the
virtual module too.

External imports across all demos are collected into one generated virtual
module (`getVirtualModulesCode.ts`) as lazy `() => import(...)` thunks —
shared by the whole site, so static imports would make every demo page pay
for every other page's externals. `runCode.ts` awaits only its own demo's.

`remarkPlugin.ts` resolves the same `file=`/`<code src>` reference itself
and re-walks its graph (`collectDemoFiles.ts` again) on every MDX compile,
so a demo's `files` reflect current disk content rather than whatever the
once-per-process scan saw. `analyzeModule.ts`'s per-file cache, keyed by
`(absolutePath, mtimeMs)`, keeps that second walk from doubling every disk
read the scan already did; an edit's new mtime is what forces a cache miss.

It then rewrites the MDX AST so a `file="..." live` block, an inline
` ```lang live ` block, or a deprecated `<code src="..."/>` becomes a
`<LiveDemo files={...} />` element, and on pages with at least one demo,
prepends an `import` of the layout so only those pages pull in the runtime
graph (`createLayoutImportNode.ts` — not a global component).

Per-page injection alone isn't enough: the default layout
(`static/LiveDemo.tsx`) loads `Core` behind `React.lazy`, because a static
top-level import would get scope-hoisted by the consumer's bundler into a
chunk shared across every page regardless of which pages import the layout
(see `src/web/lazy.tsx`'s module docblock for the mechanism).

That async boundary is packaged as `@live-demo/rspress/web/lazy`
(`src/web/lazy.tsx`) as a **separate build entry**, not an export of the
`web` barrel — the barrel (`src/web/index.ts`) only exports `Button` and a
type, cheap to import statically, while the heavy graph (CodeMirror, the
virtual-modules bundle) is reached exclusively through `Core`, which
`lazy.tsx` loads via `React.lazy`. The layout should render `LiveDemoLazy`
from that subpath rather than importing `Core` directly, both to keep the
boundary intact and because the barrel offers no other way to reach it. It
owns the `Suspense` boundary, the loading skeleton, and the `ErrorBoundary`
that catches a _rejected_ chunk load (`Suspense` alone doesn't; see its
docblock).

**Runtime (browser, `src/web/`)**

User edits code in a CodeMirror-based editor, bundled with the package. On
change, Sucrase loads lazily via dynamic `import()` (`loadCompiler.ts`); the
consuming site code-splits it into an async chunk that loads only on demo
pages. `runCode.ts` walks from the entry file over `files`, transpiling
every reachable file straight to CommonJS in one Sucrase pass
(`transformCode.ts`; `jsx`/`typescript`/`imports` transforms) and collecting
unresolvable specifiers as externals — recovered by scanning the emitted
`require(...)` calls rather than a separate AST visitor, since that's
Sucrase's own deterministic output. Once those externals are preloaded
(`loadImports`), `moduleRunner.ts`'s small `require` evaluates each file
with `new Function`, resolving `./Button`-style specifiers against the
importing file's directory into a key in the `files` record — the same
resolution rules `collectDemoFiles.ts` uses at build time, via the shared
`pathHelpers.ts` helpers. The entry file's default export (or its last named
export) is rendered into the host page's React tree.

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

## Key files

```
src/
├── plugin/           # RspressPlugin entry point
├── node/             # build-time: MDX scanning, file collection, remark transform
├── shared/           # types, path helpers, constants used by both sides
│   └── errors/       # LiveDemoError, ErrorCode messages (see Troubleshooting)
└── web/              # runtime: editor + in-page preview
    └── ui/           # plugin UI
```

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

## Limitations (of demo code, not the plugin's own source)

These are consequences of the "no bundler" commitment, not independent
choices — see [ADR 0003](../../docs/decisions/0003-scope-boundary.md).

- No CSS in live demos: inline styles or global CSS only
- No dynamic imports: all imports must be static
- No Node.js APIs: demos run in the browser
- Only `.js(x)`/`.ts(x)` files are resolvable as imports
- `file=` can't be extensionless (`file="./Button"`), unlike the deprecated
  `<code src>`. `@rspress/core`'s own
  `remarkFileCodeBlock` reads `file=` literally off disk with no
  extension-guessing, and it's appended after this plugin's remark plugins
  unconditionally (`@rspress/core`'s `mdx/options.js` — no ordering knob), so
  there's no way to get ahead of it short of a chained webpack loader
  rewriting `.mdx` source text, disproportionate for this codebase.
  `resolveFileMetaEntry.ts` (shared by the scan and `remarkPlugin`) rejects an
  extensionless (or unsupported-extension) `file=` itself with
  `FILE_META_EXTENSION_REQUIRED` — so it fails with a clear message instead of
  core's unrelated ENOENT later.
- No import can be resolved that isn't declared in some demo's source at build
  time — the consuming bundler has to see every specifier statically to build
  the virtual module. The one case this bites: typing a brand-new import while
  editing a demo in the browser, which throws `EXTERNAL_IMPORT_NOT_FOUND`
  instead of resolving. Inherent to the design, not a gap to close (see
  `getVirtualModulesCode.ts` and `website/docs/guide/usage.mdx`).
- No JSX closing-tag-mismatch or duplicate-prop diagnostics: Sucrase is a
  token rewriter, not a validating parser, and skips that checking by design.
  A demo with `<div></span>` or `<Foo a="1" a="2">` transpiles and runs
  whatever that produces instead of failing with a clear parse error.
- The literal text `require('pkg')` **at the start of a line inside a demo's
  string** (a code sample in a template literal, say) is read as a real
  import. `transformCode.ts` recovers specifiers by scanning emitted
  `require(...)` calls, and Sucrase passes strings through untouched. The
  scan is anchored to the two shapes Sucrase actually emits, so the same text
  in a comment or mid-line is ignored; only a line-initial one still slips
  through, and it fails loudly with `EXTERNAL_IMPORT_NOT_FOUND`, never
  silently. The fix is to reword or re-indent the demo.
- An import whose binding is never used in a value position is dropped, in
  `.js`/`.jsx` as well as TypeScript, because the `typescript` transform runs
  unconditionally (see `transformCode.ts`). Bare `import './styles.css'` is
  kept, so this only bites `import X from 'pkg'` where `X` is unused and
  `pkg` was wanted for its side effects.

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
- **Dev-mode staleness: what a recompile picks up vs. what triggers one**.
  `remarkPlugin` re-walks a demo's whole file graph fresh on every MDX
  compile (not just the entry, as before), so once a page recompiles,
  everything in it — the entry and everything it imports — reflects current
  disk content. That's a different question from what makes a page recompile
  in the first place, which is Rspack's own dependency tracking: it watches
  the MDX file itself and a `file=`'s literal target (core tracks that path
  explicitly), but not a file reached only through `collectDemoFiles`'s own
  read — something a demo's entry merely imports. Editing _only_ such a file
  doesn't itself trigger a recompile (verified against a real dev server);
  the edit shows up on the next recompile that happens for another reason —
  editing the entry too, editing the MDX file, or restarting. Adding a
  brand-new demo (either syntax) needs no restart: editing the MDX is itself
  the recompile, and both branches resolve and walk from scratch with no scan
  data involved. The one case that does is a demo introducing an _external_
  import no demo used before, since `uniqueImports` feeds a virtual module
  fixed at plugin-config time.

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
  reference first — so an extensionless `file=` fails here instead of as an
  unrelated ENOENT from `@rspress/core`'s own MDX compile later (see
  "Limitations").
- **`EXTERNAL_IMPORT_NOT_FOUND`** ("Can't resolve import"): confirm it's a
  real dependency and that it reached the virtual module
  (`getVirtualModulesCode.ts`).
- **`PARSE_FAILED`**: thrown build-side by `readAndParseFile.ts` (oxc) and
  now also runtime-side by `transformCode.ts` (Sucrase) when a demo author's
  edit introduces a syntax error. Same code and message shape either way; the
  codeframe comes from oxc directly on the build side and from
  `formatCodeframe.ts` (hand-rolled, matched to oxc's shape) on the runtime
  side, since Sucrase doesn't produce one itself.

  Note which side you get. Saving a syntactically broken demo file **to
  disk** fails the page's MDX compile, because `collectDemoFiles` parses
  every file in the graph — the entry included, for its dependency list —
  from inside the remark transform. Only edits made in the browser editor
  reach the runtime path and its error overlay. This is deliberate: it's the
  same place `IMPORT_NOT_RESOLVED` already surfaces from, and a broken file
  on disk should fail loudly rather than ship a page whose demo explains the
  problem only after it loads.
- **`PROP_PARSE_FAILED`**: the plugin's `JSON.stringify`d props and the
  runtime's `JSON.parse` are out of sync. Check `parseProps.ts`.
- **A demo picks up the wrong files**: log `Object.keys(files)` at the end of
  `collectDemoFiles.ts`. That's the exact record the browser receives.
