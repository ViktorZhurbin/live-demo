# @live-demo/rspress — plugin internals

Implementation of the Live Demo rspress plugin. See the [root
CLAUDE.md](../../CLAUDE.md) for what the plugin does and how this package
fits in the monorepo.

## Library references

- `@mantine/hooks`: https://mantine.dev/llms.txt
- `@uiw/react-codemirror`: https://github.com/uiwjs/react-codemirror/blob/master/core/README.md
- `@codemirror/lang-javascript`: https://codemirror.net/docs/ref/
- `react-resizable-panels`: https://github.com/bvaughn/react-resizable-panels/blob/main/README.md
- `react-error-boundary`: https://github.com/bvaughn/react-error-boundary/blob/main/README.md
- Rollup:
  - Config: https://github.com/rollup/rollup/blob/master/docs/configuration-options/index.md
  - JS API: https://github.com/rollup/rollup/blob/master/docs/javascript-api/index.md
  - `@rollup/browser`: https://github.com/rollup/rollup/blob/master/docs/browser/index.md
- `@babel/standalone`: https://github.com/babel/website/tree/main/docs
- `tsdown`: https://github.com/rolldown/tsdown/blob/main/skills/tsdown/SKILL.md
- `vitest`: https://github.com/vitest-dev/vitest/tree/main/docs/guide

## Maintaining this file

Update this file when your changes affect what's documented here.

Keep a fact here only if an agent needs it **before** opening the relevant
file. If they'd see it on arrival, it belongs in a docblock next to the code —
reference the file instead of restating it. Passes the test: cross-file
contracts, `package.json` gotchas (JSON can't hold comments), build ordering,
where things live, decisions someone would otherwise undo. Fails it: how a
function behaves, resolution rules, a module's internal design.

Also update `CHANGELOG.md` when a change is user-facing — breaking, newly
allowed, or otherwise affects consumers of the published package.
Internal/contributor-only changes don't belong there.

## Architecture

Two phases:

**Build time (Node.js, `src/node/` + `src/plugin/`)** — `src/plugin/plugin.ts`
is the actual `RspressPlugin` registered via `liveDemoPluginRspress()`. On
`routeGenerated` it scans MDX files (`visitFilePaths.ts`) and for each
`<code src="..."/>` or ` ```lang live ` block collects the entry file and
everything it transitively imports (`collectDemoFiles.ts`).
External imports (react, etc.) are collected across all demos and exported
from one generated virtual module (`getVirtualModulesCode.ts`,
`addRuntimeModules` hook). `remarkPlugin.ts` then rewrites the MDX AST so
`<code src="..."/>` / ` ```lang live ` becomes `<LiveDemo files={...} />`.

**Runtime (browser, `src/web/`)** — user edits code in a Monaco-based editor.
On change: Babel (`@babel/standalone`, loaded from CDN) transpiles JSX/TS,
then Rollup (`@rollup/browser`, also CDN) bundles the modules using a custom
resolver plugin that resolves `./Button` against the importing file's
directory to a key in the `files` record. The bundle is then evaluated with
`new Function` and rendered into the host page's React tree — see the
isolation model below.

### Isolation model: there isn't one

Demo code is **not** sandboxed. `LiveDemoCodeRunner` evaluates the bundle via
`new Function(...)` and renders the result with `createElement` directly in
the host React tree, wrapped only in a `react-error-boundary`. There is no
iframe, no Worker, no origin separation anywhere in `src/`.

What that means, and what it costs:

- Demos share the page's **React instance** (deliberate — it's how hooks work
  at all), plus its **globals and styles**, which leak both ways.
- Demo code runs in the **host origin**, with access to the page's DOM,
  `localStorage`, and cookies.
- The error boundary catches render errors. It is not a security boundary.

This is a reasonable trade for a docs tool where demo authors are as trusted
as the docs themselves — which is the assumption baked in today. It stops
being reasonable for untrusted demo sources, or if demos need style
isolation. Moving to an iframe would be a breaking architectural change, so
it's a major-version decision. Until then: this section is the honest
description, don't call it a sandbox.

### Dependency gotchas

These live here because `package.json` can't hold comments — everything else
about a file is documented in the file itself.

`@babel/standalone` and `@rollup/browser` are **exact-pinned** in
`devDependencies` to match the CDN URLs in `src/node/htmlTags.ts`, which are
the actual runtime versions. Bump one, bump the other in the same commit.
Full rationale is in that file's header; `tests/node/htmlTags.test.ts`
enforces it.

Type packages (`@types/babel__core`, `@types/babel__standalone`) deliberately
stay on Babel 7 even though the runtime is on `@babel/standalone@8` —
`@babel/standalone` ships no types and has no v8 DefinitelyTyped stub, so
pairing it with a real `@babel/core@8` creates a v7/v8 type split-brain
requiring `as unknown as` casts. Don't "modernize" them independently.

`@mdx-js/mdx`, `mdast-util-mdx`, `remark-gfm`, `unified`, and
`unist-util-visit` live in `peerDependencies` only (no `dependencies`/
`devDependencies` entry) since `tsdown` leaves them external in `dist/` and
the real runtime copy must be `@rspress/core`'s own. Don't delete or move
them — pnpm's peer-auto-install is what makes them resolvable for this
package's own build/typecheck/test, pulling them from `@rspress/core`'s
tree, so removing the peerDependencies entries breaks the build with an
opaque `TS2307: Cannot find module` error.

### The build→runtime seam

The one contract spanning both phases: **`files` is keyed by each file's path
relative to the entry file's directory**, posix-style. The build step
(`collectDemoFiles.ts`) produces those keys; the runtime resolver
(`pluginResolveModules.ts`) resolves imports against them. Both go through
`shared/pathHelpers.ts`. Change one side, change the other — and check
`tests/integration/buildToRuntime.test.ts`, the only test that spans the seam.
Every unit test on either half can pass while a demo renders nothing.

Note that build time deliberately does _not_ bundle: it only collects
reachable files and external package names. Rollup owns bundling, in the
browser. See `collectDemoFiles.ts` for why that boundary is where it is.

## Key files

```
src/
├── plugin/           # RspressPlugin entry point (plugin.ts, index.ts)
├── node/             # build-time: MDX scanning, file collection, remark transform
│   └── helpers/       # collectDemoFiles, analyzeModule, readAndParseFile, resolveFileInfo, getVirtualModulesCode, ...
├── shared/           # types, path helpers, constants used by both sides
└── web/              # runtime: editor + in-page preview
    └── ui/
        ├── liveDemo/        # top-level LiveDemo component + layout
        ├── editor/          # Monaco editor, file tabs
        ├── preview/          # LiveDemoCodeRunner — Babel/Rollup compiler pipeline lives here
        └── controlPanel/    # wrap/fullscreen/view-mode toggles
```

Path aliases (`~node/*`, `~shared/*`, `~web/*`) map to `src/node`, `src/shared`,
`src/web` — see `tsconfig.json` / `vitest.config.ts`.

**Build must run before typecheck.** `static/LiveDemo.tsx` imports the
package's own public API by its published specifier (`@live-demo/rspress/web`),
which resolves through `package.json`'s `exports` map to `dist/`. If `dist`
doesn't exist yet, that import fails typecheck with a "Cannot find module"
error — it doesn't fail quietly. CI (`.github/workflows/ci.yml`) runs
`build:lib` before `typecheck` for this reason, and `pnpm verify` (root `package.json` script) mirrors that order. Keep both in sync if either changes.

**Virtual module pattern**: user code can `import` external packages
(react, etc.) that aren't installed anywhere the demo can reach. Build time
generates one virtual module re-exporting everything referenced across all
demos on the page; at runtime `require('_live_demo_virtual_modules')`
returns a lookup function for it. See `getVirtualModulesCode.ts`.

Import resolution (which extensions, in what order, index files) is defined
by `getPossiblePaths` and the `LiveDemoLanguage` enum — documented at both.

## Testing

```bash
pnpm test                  # all packages
pnpm test collectDemoFiles.test.ts
pnpm test --watch
```

Fixtures live in `tests/fixtures/` — **read its README before adding one.**
Two bugs have shipped past a fully green suite because a fixture had the
right extension and the wrong syntax.

## Limitations (of demo code, not the plugin's own source)

- No CSS modules in live demos — inline styles or external CSS only
- No dynamic imports — all imports must be static
- No Node.js APIs — demos run in the browser
- Only `.js(x)`/`.ts(x)` files are resolvable as imports

## Troubleshooting

- **"Couldn't resolve import"** — check the path against `getPossiblePaths`.
- **"Can't resolve external package"** — confirm it's a real dependency, and
  that it reached the virtual module (`getVirtualModulesCode.ts`).
- **A demo picks up the wrong files** — log `Object.keys(files)` at the end of
  `collectDemoFiles.ts`; that's the exact record the browser receives.
