# Architecture review (external, 2026-07-22)

The review that started the 3.0 compiler work. **Trimmed 2026-07-23**: items that
have since been decided, implemented, or measured were removed from here once their
rationale was recorded elsewhere. What remains is the part still open.

Resolved items and where they went:

| Original item                            | Outcome                                                  |
| ---------------------------------------- | -------------------------------------------------------- |
| 1. Every visitor pays the compiler       | Investigated, parked → `research/.closed-questions.md`   |
| 3a. Output CJS instead of ESM + rewrite  | **Implemented** → `decisions/0001`                       |
| 3b. Replace Babel + Rollup with one tool | Researched, negative → `research/transpiler-research.md` |

Two of the review's factual premises are also now out of date and worth correcting,
since they were load-bearing for its priority list: the compiler measured **842 KB
brotli** over a real CDN, not "several MB"; and `@rollup/browser` is gone, so the
"two multi-MB compilers" framing no longer describes the code.

## What already works well (keep it)

The fork genuinely improved on upstream in the places that matter:

- **Per-page layout injection.** Upstream registers the playground via
  `globalComponents` + `globalStyles`, so every page on the site pays for the runtime.
  `createLayoutImportNode` + the separate `/web/lazy` entry keeps the demo graph off
  non-demo pages. The most careful part of the design, and well documented.
- **Lazy external thunks.** Upstream's virtual module does `import * as i_0 from 'react'`
  statically, so every demo page pulls the union of all externals. The
  `() => import(...)` thunks plus a `loadImports` preload are strictly better. (The
  preload list now comes from `runCode`'s own walk rather than Rollup's `chunk.imports`
  — see `decisions/0001`.)
- **Bundled CodeMirror vs CDN Monaco.** Upstream preloads Babel and Monaco from CDN
  `<script>`s on every page. Self-contained, version-pinned, code-split dependencies are
  the right call for a plugin.
- **Build-time collection stays minimal.** `collectDemoFiles` is a reachability walk,
  not a second bundler. The docblock explaining why (and warning against re-adding
  module ids) is exactly the kind of decision record that keeps this maintainable.
- **The seam discipline.** One documented contract (`files` keys relative to entry dir),
  one shared `getPossiblePaths`, one integration test that spans it, and an error
  taxonomy (`LiveDemoError`). Whatever else changes, keep this culture.

## Still open

### 1. The two-parse build phase causes the dev-mode staleness you've had to document

`visitFilePaths` parses all MDX once per dev-server process in `routeGenerated`;
`remarkPlugin` parses again per compile and reads results through
`demoDataByRef`/`demoRefKey`. Consequences: the "restart the dev server" limitation, the
`console.warn` fallback for un-scanned demos, and the refKey machinery itself.

The scan exists for one reason: the externals union must be known to generate the
virtual module. But the _file collection_ doesn't need to happen in the scan. The remark
plugin has `vfile.path` and can run `collectDemoFiles` itself, synchronously, at compile
time. That would:

- delete `demoDataByRef`, `demoRefKey`, and the warning path entirely;
- make newly added `<code src>` blocks work without a restart;
- leave `routeGenerated` with only the cheap job of collecting the externals union (it
  still needs to parse MDX for that, but only to extract import specifiers).

Edits to existing demo files are a separate gap: the MDX module doesn't depend on them,
so rspack never recompiles. Worth researching whether rspress exposes the loader's
`addDependency` to remark plugins (or via a small rspack loader shim); if it does, both
staleness problems die together. If it doesn't, a dev-only chokidar watcher that touches
the referencing MDX file is a pragmatic fallback.

This is the largest remaining item from the original review, and the only one whose
payoff is purely code deletion plus a documented wart disappearing — which makes it a
better fit for this project's constraints than anything on the payload side.

### 2. The inline-demo externals asymmetry is smaller than it looks

Inline demos not resolving their own externals is documented as intended, but note
upstream _does_ parse inline block imports during its scan. The scan already walks every
MDX AST; parsing the fenced code's import statements there (same `oxc-parser`, same
`extractSourcePath`) would make `import { DateTime } from "luxon"` in an inline block
just work, at near-zero cost.

What stays impossible is _typing a new import at runtime_ that no demo registered, and
that's inherent to the virtual-module design (the consuming bundler must see specifiers
statically). If you ever want to lift that, the only real option is a CDN fallback
(esm.sh-style) at runtime, which trades away self-containment; keep it off by default or
skip it.

### 3. Options plumbing has a type lie and no per-demo story

- `ui.editor` is typed as full `ReactCodeMirrorProps`, but options travel through
  `JSON.stringify` in MDX attributes, so functions and CodeMirror extension instances
  (the things people most want to pass) can't survive the trip. Either narrow the type to
  the serializable subset or, better, stop serializing site-wide options per demo at all:
  they're constants for the whole site, so they could be delivered once (through the
  virtual module or a config module the layout imports), which also slims every demo's
  attribute payload and `parseProps`.
- There's no per-demo configuration (docs say so explicitly). Upstream carried fence meta
  (`direction=vertical`) through to props. Natural carriers exist already: extra fence
  meta on ` ```jsx live ` and extra attributes on `<code src>`. Worth adding for 3.0;
  "hide editor for this one demo" is a common docs need. See also `TODO.md`'s entry on
  whether `<code src>` should become explicit meta, which upstream v2 has since done.

### 4. Isolation: fine as a trust model, limiting as a feature ceiling

In-tree `new Function` eval is a reasonable, well-documented trade for trusted docs. But
note what it forecloses: CSS imports in demos (the top documented limitation), style
leakage both directions, and a runaway demo taking the page down. An _optional_ iframe
preview mode (srcdoc, own React copy or portal-based) would lift the CSS limitation
specifically. Not as the default; it complicates theme integration and adds weight.
Flagged because "no CSS in demos" is the limitation most likely to bite component-library
docs, the core audience. `TODO.md` tracks this against the opposite option (leaning
harder on rspress theme variables instead).

## Full alternatives ruled out

- **Sandpack**: solves multi-file, npm deps, and isolation, but the bundler is a hosted
  CodeSandbox service; self-hosting it is real infra. Wrong trade for a self-contained
  docs plugin.
- **WebContainers**: licensing plus tens of MB; built for full dev environments, not doc
  demos.
- **react-live / sucrase**: the review dismissed these as single-file with no imports.
  Half right — Sucrase has since been measured properly and is the runner-up transpiler
  (10x smaller than Babel), disqualified on AST access and error quality rather than on
  capability. See `research/transpiler-research.md`.

Owning the pipeline was and remains the right call; the items above are refinements of
that position, not reversals.

## Remaining priority

1. **Move collection into remark + dependency tracking** (item 1): kills the documented
   dev-staleness wart and deletes the refKey machinery.
2. **Options cleanup, per-demo config, inline-imports scan** (items 2-3): smaller, mostly
   additive, and the per-demo config is a real user-facing gap.
3. **Iframe isolation** (item 4): only if the CSS limitation starts costing real users.

The review's two closing questions have since been answered. "Is fully self-contained,
no CDN at runtime a hard constraint?" — yes, and it hardened further: zero build or
server configuration required from the consuming site is now a hard requirement, which
is what disqualified both `@babel/core` and oxc (see `research/transpiler-research.md`).
"Do you care about SSR/SSG of previews?" — not enough to pay for it at this project's
scale (see `research/.closed-questions.md`).
