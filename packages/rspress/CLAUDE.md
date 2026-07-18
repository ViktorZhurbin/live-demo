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
file. Otherwise, it belongs in a docblock next to the code —
reference the file instead of restating it.

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
from one generated virtual module (`getVirtualModulesCode.ts`). `remarkPlugin.ts` then rewrites the MDX AST so `<code src="..."/>` / ` ```lang live ` becomes
`<LiveDemo files={...} />`.

**Runtime (browser, `src/web/`)** — user edits code in a CodeMirror-based
editor, bundled with the package. On change: Babel
(`@babel/standalone`, loaded from CDN) transpiles JSX/TS, then Rollup
(`@rollup/browser`, also CDN) bundles the modules using a custom resolver
plugin that resolves `./Button` against the importing file's
directory to a key in the `files` record. The bundle is then evaluated with
`new Function` and rendered into the host page's React tree.

### Dependency gotchas

These live here because `package.json` can't hold comments — everything else
about a file is documented in the file itself.

`@babel/standalone` and `@rollup/browser` are **exact-pinned** in
`devDependencies` to match the CDN URLs in `src/node/htmlTags.ts`, which are
the actual runtime versions.

Type packages (`@types/babel__core`, `@types/babel__standalone`) deliberately
stay on Babel 7 even though the runtime is on `@babel/standalone@8` —
`@babel/standalone` ships no types and has no v8 DefinitelyTyped stub, so
pairing it with a real `@babel/core@8` creates a v7/v8 type split-brain
requiring `as unknown as` casts. Don't "modernize" them independently.

`@mdx-js/mdx`, `mdast-util-mdx`, `remark-gfm`, `unified`, and
`unist-util-visit` live in `peerDependencies` only. `tsdown` leaves
them external in `dist/` and the real runtime copy must be
`@rspress/core`'s own. Don't delete or move them.

### The build→runtime seam

The one contract spanning both phases: **`files` is keyed by each file's path
relative to the entry file's directory**, posix-style. The build step
(`collectDemoFiles.ts`) produces those keys; the runtime resolver
(`pluginResolveModules.ts`) resolves imports against them. Both go through
`shared/pathHelpers.ts`. Change one side, change the other — and check
`tests/integration/buildToRuntime.test.ts`, the only test that spans the seam.
Every unit test on either half can pass while a demo renders nothing.

Note that build time deliberately does _not_ bundle: see `collectDemoFiles.ts` for why.

### Build & Verify Gotchas

**Build must run before typecheck.** `static/LiveDemo.tsx` imports the
package's own public API by its published specifier (`@live-demo/rspress/web`),
which resolves through `package.json`'s `exports` map to `dist/`. If `dist`
doesn't exist yet, that import fails typecheck with a "Cannot find module"
error — it doesn't fail quietly. CI (`.github/workflows/ci.yml`) runs
`build:lib` before `typecheck` for this reason, and `pnpm verify` (root `package.json` script) mirrors that order. Keep both in sync if either changes.

## Key files

```
src/
├── plugin/           # RspressPlugin entry point
├── node/             # build-time: MDX scanning, file collection, remark transform
├── shared/           # types, path helpers, constants used by both sides
│   └── errors/       # LiveDemoError, ErrorCode messages — see Troubleshooting
└── web/              # runtime: editor + in-page preview
    ├── components/   # generic building blocks (Button, ToggleButtonGroup)
    └── ui/           # plugin UI
```

## Conventions

### Comments

- **Module docblocks**: 3-8 lines on the file's architectural role — what
  problem it solves and how it fits with neighboring files, not a restatement
  of its exports.
- **Inline comments**: answer "why?" or "why not the obvious way?" — delete
  anything that just restates what the code already says.
- **JSDoc prose**: only when the name and TypeScript's own types don't already
  convey intent. This is TypeScript — don't add `@param`/`@returns` blocks
  that repeat a type signature.

## Testing

Fixtures live in `tests/fixtures/` — **read its README before adding one.**
Two bugs have shipped past a fully green suite because a fixture had the
right extension and the wrong syntax.

## Limitations (of demo code, not the plugin's own source)

- No CSS modules in live demos — inline styles or external CSS only
- No dynamic imports — all imports must be static
- No Node.js APIs — demos run in the browser
- Only `.js(x)`/`.ts(x)` files are resolvable as imports

## Deliberately not handled

This section exists to stop defensive-code creep.

- **Isolation model** - Demo code is **not** sandboxed.
  `CodeRunner` evaluates the bundle via`new Function(...)` and renders the
  result with `createElement` directly in the host React tree, wrapped only
  in a `react-error-boundary`. This is a docs tool and demo code authors are
  as trusted as the docs themselves.
- **Cross-platform** — no Windows path handling; see the posix-style `files`
  keys in "The build→runtime seam" above.
- **Graceful recovery on file reads** — a read that fails after the existence
  check (permissions, a removed file) propagates raw.
- **Runtime validation of plugin options** — `plugin.ts` only checks the
  `customLayout` filename pattern. Everything else in
  `LiveDemoPluginOptions` is TypeScript's contract.

## Troubleshooting

Every error the plugin itself throws (build- or runtime-side) is a
`LiveDemoError` (`src/shared/errors/`) — see the `errors.ts`/`messages.ts`
docblocks for the class/message-table split and the two codes that splice a
plain string into a demo's own bundle instead of importing the class.

- **`IMPORT_NOT_RESOLVED`** ("Couldn't resolve import") — check the path
  against `getPossiblePaths`.
- **`EXTERNAL_IMPORT_NOT_FOUND`** ("Can't resolve import") — confirm it's a
  real dependency, and that it reached the virtual module
  (`getVirtualModulesCode.ts`).
- **`PROP_PARSE_FAILED`** — the plugin's `JSON.stringify`d props and the
  runtime's `JSON.parse` are out of sync; check `parseProps.ts`.
- **A demo picks up the wrong files** — log `Object.keys(files)` at the end of
  `collectDemoFiles.ts`; that's the exact record the browser receives.
