# Live Demo — Interactive Examples for Documentation

Rspress plugin that turns code blocks/files in MDX into interactive, editable
examples (CodeSandbox-style) that run in the browser.

````mdx
<code src="./examples/Button.tsx" />

```jsx live
function App() {
  return <div>Hello World!</div>;
}
```
````

## Active initiative: major version upgrade

This repo went dormant for ~7 months and is now being brought current. Plan,
in order:

1. Reconsider dev tooling (biome, husky, CI — none currently exists) —
   doesn't touch the published package.
2. Bump dev dependencies that *could* affect the published output
   (build/test toolchain: tsdown, vitest, oxc-parser, `@rspress/core` used
   for building/testing the plugin itself).
3. Bump runtime dependencies (react-resizable-panels, @mantine/hooks,
   @rsbuild/plugin-react, codemirror packages, etc.) — several are behind by
   a major version.
4. Update source for any breaking API changes surfaced by the above.
5. Ship it all as a single major version bump — no incremental minors for
   this pass.

**The most consequential item:** `@rspress/core` is pinned at `2.0.0-rc.4`
(both as the plugin's peer/dev dependency and as the website's direct
dependency), while the stable line has since shipped up to `2.0.18`. The
`RspressPlugin` API this plugin builds against (`src/plugin/plugin.ts`) may
have changed between rc.4 and stable — audit this first, before chasing
smaller dependency bumps.

If you're picking this up in a fresh session: check `git log` and `pnpm
outdated -r` for current state before assuming the above is still accurate —
this note will drift as the upgrade progresses.

## Architecture

Two phases:

**Build time (Node.js, `src/node/` + `src/plugin/`)** — `src/plugin/plugin.ts`
is the actual `RspressPlugin` registered via `liveDemoPluginRspress()`. On
`routeGenerated` it scans MDX files (`visitFilePaths.ts`) and for each
`<code src="..."/>` or ` ```lang live ` block builds a module graph
(`buildModuleGraph.ts`) capturing the file and all of its local imports.
External imports (react, etc.) are collected across all demos and exported
from one generated virtual module (`getVirtualModulesCode.ts`,
`addRuntimeModules` hook). `remarkPlugin.ts` then rewrites the MDX AST so
`<code src="..."/>` / ` ```lang live ` becomes `<LiveDemo files={...} />`.

**Runtime (browser, `src/web/`)** — user edits code in a Monaco-based editor.
On change: Babel (`@babel/standalone`, loaded from CDN) transpiles JSX/TS,
then Rollup (`@rollup/browser`, also CDN) bundles the modules using a custom
resolver plugin that maps `require("./Button")` to the right entry via the
module graph's `mapping`, then the bundle runs in a sandboxed iframe.

### Module graph (the core bundler logic)

Inspired by webpack/Rollup. When `Button.tsx` imports `./theme` and `./Icon`,
all three files need to ship together, not just the entry. `buildModuleGraph.ts`
BFS-traverses from the entry file, using `analyzeModule.ts` (OXC parser) to
extract each file's imports/exports. Modules are cached by path (each file
parsed once) and get sequential IDs; a `Set` gives O(1) circular-import
detection instead of `array.includes()`.

```typescript
{
  modules: [
    { id: 0, fileName: "Button.tsx", dependencies: ["./theme"], mapping: { "./theme": 1 } },
    { id: 1, fileName: "theme.ts", dependencies: [], mapping: {} },
  ],
  externalImports: Set(["react"]),
}
```

## Key files

```
packages/rspress/src/
├── plugin/           # RspressPlugin entry point (plugin.ts, index.ts)
├── node/             # build-time: MDX scanning, module graph, remark transform
│   └── helpers/       # analyzeModule, buildModuleGraph, resolveFileInfo, getVirtualModulesCode, ...
├── shared/           # types, path helpers, constants used by both sides
└── web/              # runtime: editor + sandboxed preview
    └── ui/
        ├── liveDemo/        # top-level LiveDemo component + layout
        ├── editor/          # Monaco editor, file tabs
        ├── preview/          # LiveDemoCodeRunner — Babel/Rollup compiler pipeline lives here
        └── controlPanel/    # wrap/fullscreen/view-mode toggles
```

Path aliases (`node/*`, `shared/*`, `web/*`) map to `src/node`, `src/shared`,
`src/web` — see `tsconfig.json` / `vitest.config.ts`.

## Import resolution

**Build time**: `./Button` is checked against `.tsx`, `.ts`, `.jsx`, `.js`,
and `./Button/index.*` variants (`resolveFileInfo.ts`) — only these
extensions are supported.

**Runtime**: the custom Rollup plugin resolves `require("./Button")` using
the module graph's `mapping` to find the right bundled module by ID.

**Virtual module pattern**: user code can `import` external packages
(react, etc.) that aren't actually installed in the sandbox. Build time
generates one virtual module re-exporting everything referenced across all
demos on the page; at runtime `require('_live_demo_virtual_modules')`
returns a lookup function for it.

## Testing

```bash
pnpm test                  # all packages
pnpm test buildModuleGraph.test.ts
pnpm test --watch
```

Test fixtures live in `packages/rspress/tests/fixtures/{valid,invalid}`.

## Limitations (of the in-browser sandbox, not the plugin's own source)

- No CSS modules in live demos — inline styles or external CSS only
- No dynamic imports — all imports must be static
- No Node.js APIs — runs in a browser sandbox
- Only `.js(x)`/`.ts(x)` files are resolvable as imports

## Troubleshooting

- **"Couldn't resolve import"** — check extension/path against the resolution
  rules above.
- **"Circular import detected"** — read the dependency chain in the error;
  break the cycle or use lazy loading.
- **"Can't resolve external package"** — confirm it's a real dependency and
  check the browser console for virtual-module generation issues.
- Debugging the module graph itself: add `console.log(queue.map(m =>
  m.fileName))` in `buildModuleGraph.ts`, or check `buildModuleGraph.test.ts`
  for a similar existing case.
