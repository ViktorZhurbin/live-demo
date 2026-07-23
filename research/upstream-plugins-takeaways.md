## What the two v2 plugins actually are now

**`@rspress/plugin-preview`** — no in-browser compilation at all. The remark plugin writes each demo's code to a real file under `node_modules/.rspress/virtual-demo/`, imports it as a normal module, and the bundler compiles it. Its distinguishing feature is `iframe-fixed` / `iframe-follow`: it spins up a _second, complete Rsbuild instance_ with its own dev server (port 7890) and generated entries, so demos get real bundling and full style isolation, plus a QR code to open them on a phone.

**`@rspress/plugin-playground`** — the one you forked from. Still Babel-standalone-from-CDN + Monaco-from-CDN, still single-file, still one global `Playground` component. Architecturally almost unchanged from v1: `routeGenerated` scans all MDX for imports → writes one virtual module; remark rewrites code blocks to `<Playground code=... />`.

## The v2 changes that matter to you

1. **`<code src>` is gone.** Both plugins migrated to core's File Code Block: ` ```tsx file="./_demo.tsx" preview `. Their migration guide states it flatly.

2. **`defaultRenderMode: 'pure' | 'preview'`** with a `pure` escape hatch, on _both_ plugins, and both docs explicitly warn against changing it "because it may affect combined usage with the other plugin." They designed for coexistence on one site. You don't have this axis at all — `live` is always opt-in. Adding `defaultRenderMode` plus a `pure` marker is small and is the thing that makes "convert an existing docs site" a config change rather than a find-and-replace.

3. **Per-block options parsed out of meta, with a three-level precedence chain**: code-block meta (`direction=vertical`) > page frontmatter (`playgroundDirection: vertical`) > plugin option (injected via `source.define` as `__PLAYGROUND_DIRECTION__`). Frontmatter is read at _runtime_ through `usePageData()`, so it costs nothing at build time. Your `options.ui` is plugin-level only and gets `JSON.stringify`d into the attributes of every single demo node ([remarkPlugin.ts:182](packages/rspress/src/node/remarkPlugin.ts:182)). Their `define` approach keeps build-wide config out of the MDX AST entirely.

4. **`previewLanguages` + `previewCodeTransform`.** A user-supplied `({ language, code }) => code` at the remark stage, with a configurable trigger-language list. Their example turns a JSON block into a React component. It's ~10 lines of plugin surface that lets someone support a language you've never heard of without you doing anything. Good fit for an experimental project.

5. **`include` accepts aliasing tuples**: `['my-package', '/path/to/package/index.js']`. Your `includeModules` is names only. The alias form is what lets a component library's own docs write `import { Button } from 'my-lib'` in a demo and have it resolve to `../src/index.ts`. That's the primary audience for this whole category of plugin, and it's a real gap.

6. **`render` option + composable web exports.** Playground lets you pass your own `Playground.tsx` and documents both `@rspress/plugin-playground/web` (exports `Editor`, `Runner`, the Monaco loader) and the generated module name `_rspress_playground_imports` as public API. Your [static/LiveDemo.tsx](packages/rspress/static/LiveDemo.tsx) path is hardcoded in [plugin.ts:36](packages/rspress/src/plugin/plugin.ts:36) and [src/web/index.ts](packages/rspress/src/web/index.ts) exports only `Button` and a type. You have a much better-factored internal component tree (`LiveDemoProvider`, `ControlPanel`, `ResizablePanels`, `CodeRunner`) and none of it is reachable by a consumer.
   My note: we did have a `customLayout` option, but removed it for simplicity - it was a footgun that easily breaks our lazy loading, and added real API surface. May reconsider later.

## The one real architectural idea

Where the demo's file work happens:

|                   | import scan            | file contents            |
| ----------------- | ---------------------- | ------------------------ |
| plugin-preview    | —                      | in remark, every compile |
| plugin-playground | `routeGenerated`, once | in the AST node itself   |
| yours             | `routeGenerated`, once | `routeGenerated`, once   |

`plugin-preview` has no staleness problem because it does everything in remark, which re-runs on every MDX recompile. Playground has a mild one (a _newly added bare import_ needs a restart). You have the full version of it — your documented "editing an imported file needs a dev-server restart" limitation — because `demoDataByRef` carries file _contents_ across the seam.

The idea worth taking: **shrink what crosses `routeGenerated` → remark down to just the external-import set, and run [collectDemoFiles.ts](packages/rspress/src/node/helpers/collectDemoFiles.ts) inside the remark pass.** That's playground's split. It would delete `demoDataByRef`, `demoRefKey`, the two `console.warn`s about missing demo data, and the staleness limitation together — at the cost of reading a handful of small files per MDX compile.

The obstacle is real and worth naming before you try it: `uniqueImports` feeds the virtual module, which is generated once at build config time. If a demo gains a new bare import mid-session, the virtual module has to be regenerated. plugin-preview solves the analogous problem with `isDirtyRef` + `isDeepStrictEqual` comparison and a full dev-server restart of the demo build. You'd need something equivalent, or accept playground's residual staleness (new _external_ import → restart), which is a strictly smaller bug than the one you have.

## What not to copy

- **The iframe modes.** Two Rsbuild instances, a second dev server, port negotiation, generated entries, `postMessage` theme sync, `writeToDisk: true`, `buildCache: false`. It buys style isolation and real bundling, which is a genuinely different product from in-browser compilation. For ~22 weekly downloads it's not the trade.
- **Their state management.** `export let routeMeta`, `export const globalDemos = {}`, `export const isDirtyRef` — mutable module-level singletons in both plugins. Your parameter-passing is better; don't regress.
- **CDN-loaded Babel/Monaco.** Bundled CodeMirror + lazily-imported Sucrase is a clear improvement, and they even have [a linked issue](https://github.com/web-infra-dev/rspress/issues/876) about the UMD-loading hack it forces.

## Small, portable details

- `rp-not-doc` — a class both plugins put on their root to opt out of rspress's prose styling. Worth checking whether your UI needs that escape hatch.
- `createLogger({ prefix: picocolors.dim('[@rspress/plugin-preview]') })` from `@rsbuild/core` instead of raw `console.warn`. Integrates with the build's own output formatting.
- plugin-preview sets `data.pageMeta.haveIframeFixedDemos` from remark, so the theme layer can react per-page. Your per-page layout import already covers the equivalent need.
- Playground debounces recompilation at 800ms in the runner — worth comparing against whatever [useActiveCode.ts](packages/rspress/src/web/hooks/useActiveCode.ts) does.

## Where you're already ahead

Multi-file demos, lazy `() => import()` thunks per external instead of one static graph, per-page layout injection, the typed `LiveDemoError` taxonomy, and an actual test suite (upstream has one test file between the two packages). Your README's "Coming in v3" claims about global injection and eager dependency loading check out against their source — playground's `globalComponents` and its `import * as i_${index}` block are both exactly as described.
