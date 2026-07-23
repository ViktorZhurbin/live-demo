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

**Build time (Node.js, `src/node/` + `src/plugin/`)**: `src/plugin/plugin.ts`
is the actual `RspressPlugin` registered via `liveDemoPluginRspress()`. On
`routeGenerated` it scans MDX files (`visitFilePaths.ts`) and for each
`<code src="..."/>` block collects the entry file and everything it
transitively imports (`collectDemoFiles.ts`). Inline ` ```lang live ` blocks
never reach this scan. `remarkPlugin.ts` turns them into `<LiveDemo>`
directly, without collecting their imports (see "Limitations" below).
External imports (react, etc.) are collected across all demos and exported
from one generated virtual module (`getVirtualModulesCode.ts`) as lazy
`() => import(...)` thunks. That one module is shared by the whole site,
so static imports would make every demo page pay for every other page's externals.
`runCode.ts` awaits just its own demo's before evaluating. `remarkPlugin.ts`
then rewrites the MDX AST so `<code src="..."/>` / ` ```lang live ` becomes a
`<LiveDemo files={...} />` element, and on pages that have at least one demo,
prepends an `import` of the layout so only those pages pull in the runtime graph
(`createLayoutImportNode.ts`; it is _not_ a global component). Per-page
injection alone isn't enough to keep the runtime graph off other pages: the
default layout (`static/LiveDemo.tsx`) loads `Core` behind `React.lazy`.
A static top-level import of `Core` gets scope-hoisted by the consumer's
bundler into a chunk shared across every page regardless of which pages
import the layout (see `src/web/lazy.tsx`'s module docblock for the
mechanism).

That async boundary is packaged as `@live-demo/rspress/web/lazy`
(`src/web/lazy.tsx`) as a **separate build entry**, not an export of the
`web` barrel. The barrel (`src/web/index.ts`) only exports `Button` and a
type, so it's cheap to import statically today — but the heavy graph
(CodeMirror, the virtual-modules bundle) is reached exclusively through
`Core`, which `lazy.tsx` loads via `React.lazy`. The layout should render
`LiveDemoLazy` from that subpath rather than importing `Core` itself, both
to keep that boundary intact and because the barrel offers no other way to
reach it. It owns the `Suspense` boundary, the loading skeleton, and the
`ErrorBoundary` that catches a _rejected_ chunk load (which `Suspense` alone
does not; see its docblock).

**Runtime (browser, `src/web/`)**: user edits code in a CodeMirror-based
editor, bundled with the package. On change, Sucrase is loaded lazily via
dynamic `import()` (`loadCompiler.ts`). The consuming site code-splits it into
an async chunk that loads only on demo pages. `runCode.ts` walks from the
entry file over `files`, transpiling every reachable file straight to
CommonJS in one Sucrase pass (`transformCode.ts`; `jsx`/`typescript`/`imports`
transforms) and collecting the specifiers it can't resolve locally as
externals — recovered by scanning the emitted `require(...)` calls rather
than a separate AST visitor, since that's Sucrase's own deterministic output.
Once those externals are preloaded (`loadImports`), `moduleRunner.ts`'s small
`require` evaluates each file with `new Function`, resolving `./Button`-style
specifiers against the importing file's directory into a key in the `files`
record — same resolution rules `collectDemoFiles.ts` uses at build time, via
the shared `pathHelpers.ts` helpers. The entry file's default export (or its
last named export) is then rendered into the host page's React tree.

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

A second, build-internal seam: the scan (`visitFilePaths.ts`) and the remark
transform (`remarkPlugin.ts`) are separate parses of the same MDX, so results
cross via `demoDataByRef`, keyed by `demoRefKey.ts`'s raw `(mdxPath, src)`.

Note that build time deliberately does _not_ bundle: see `collectDemoFiles.ts` for why.

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

## Testing

### Vitest

Test build-time logic in a `node` environment.

Fixtures live in `tests/fixtures/`. **Read its README before adding one.**
Two bugs have shipped past a fully green suite because a fixture had the
right extension and the wrong syntax.

### Playwright

Test `web/` components against the actual `website/` through the preview build.

## Limitations (of demo code, not the plugin's own source)

- No CSS modules in live demos: inline styles or external CSS only
- No dynamic imports: all imports must be static
- No Node.js APIs: demos run in the browser
- Only `.js(x)`/`.ts(x)` files are resolvable as imports
- Inline (` ```lang live `) demos don't auto-resolve external imports; only
  `<code src>` demos do. This is intentional (see `remarkPlugin.ts` and
  `website/docs/guide/inline/otherImports.mdx`). Don't "fix" it.
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
  and demo code authors are as trusted as the docs themselves.
- **Cross-platform**: no Windows path handling. See the posix-style `files`
  keys in "The build→runtime seam" above.
- **Graceful recovery on file reads**: a read that fails after the existence
  check (permissions, a removed file) propagates raw.
- **Runtime validation of plugin options**: `LiveDemoPluginOptions` is
  TypeScript's contract only; `plugin.ts` doesn't check any of it at runtime.
- **`.md` files**: `<code src>` injects JSX, so it only works in `.mdx` files.
- **Dev-mode staleness on demo-file edit**: the MDX→demo scan (`routeGenerated`)
  runs once per dev-server process. Editing an existing demo's source file
  afterward isn't picked up. Restarting the dev server is the only fix (documented in
  `website/docs/guide/usage.mdx`).

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
- **`EXTERNAL_IMPORT_NOT_FOUND`** ("Can't resolve import"): confirm it's a
  real dependency and that it reached the virtual module
  (`getVirtualModulesCode.ts`).
- **`PARSE_FAILED`**: thrown build-side by `readAndParseFile.ts` (oxc) and
  now also runtime-side by `transformCode.ts` (Sucrase) when a demo author's
  edit introduces a syntax error. Same code and message shape either way; the
  codeframe comes from oxc directly on the build side and from
  `formatCodeframe.ts` (hand-rolled, matched to oxc's shape) on the runtime
  side, since Sucrase doesn't produce one itself.
- **`PROP_PARSE_FAILED`**: the plugin's `JSON.stringify`d props and the
  runtime's `JSON.parse` are out of sync. Check `parseProps.ts`.
- **A demo picks up the wrong files**: log `Object.keys(files)` at the end of
  `collectDemoFiles.ts`. That's the exact record the browser receives.
