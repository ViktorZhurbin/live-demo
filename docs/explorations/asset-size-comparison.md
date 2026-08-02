# Asset size comparison: current vs. upstream vs. published v2

Original question: does this plugin's unreleased work (Sucrase, per-page layout
injection, dropping `@rollup/browser`, viewport-gated demo loading) actually
cost less over the wire than `@rspress/plugin-playground` and the last
published `@live-demo/rspress@2.0.6`? Measured on real Cloudflare Pages
deploys, same site content, same four pages.

**Answered below: yes, on every page, and the margin widens the less a page
asks for.** A page with no demo at all is 4.4–4.6× lighter. A page whose demo
imports nothing but `react` is 5.2–7.2× lighter, because both of the others
ship every external used anywhere on the site to every page that has a demo.
Only on the one page whose demo genuinely needs three.js does the gap narrow —
and current is still 1.7–2.4× lighter there.

## Setup

Three deploys of the same 9-page site:

| Leg          | Deploy                                      | What it runs                                      |
| ------------ | ------------------------------------------- | ------------------------------------------------- |
| **current**  | `live-demo.pages.dev`                       | `main`, this repo's unreleased `packages/rspress` |
| **upstream** | `asset-size-2-upstream.live-demo.pages.dev` | `@rspress/plugin-playground@2.0.18`               |
| **v2.0.6**   | `asset-size-2-v2-0-6.live-demo.pages.dev`   | published `@live-demo/rspress@2.0.6` from npm     |

Branches: `asset-size-2/upstream` and `asset-size-2/v2.0.6`, both cut from
`main` independently so each diff reads against `main` directly.

**The site is not trimmed.** All 9 pages and all prose stay byte-identical to
`main` on both branches, so the search index, route manifest, nav tree and
per-page prose — everything that makes up site chrome — are comparable across
legs. Keeping the full site also means the sitewide virtual module holds the
same set of demos everywhere.

`@rspress/core` is pinned to exact `2.0.18` on all three.

### The four pages, and why each is there

- **`guide/customization`** — no demo at all. Isolates "does the runtime load
  even when nothing on the page needs it." This is the row ADR 0004's eager
  invariant is about.
- **`guide/getStarted`** — one `.tsx` demo importing only `react` and this
  plugin's `Button`. The cheapest possible demo.
- **`guide/external/goWild`** — one `.jsx` demo importing three.js,
  `@react-three/{fiber,drei,postprocessing}`. The expensive demo.
- **`guide/usage`** — two inline ` ```jsx live ` demos, one at the top and one
  ~2900px down. Catches both inline-vs-external and above-vs-below-the-fold.

`getStarted` against `goWild` is the pair that matters: on current those two
pages should differ by exactly the three.js graph, and on the other two legs
they should not differ at all.

### Per-branch adaptations

The three plugins aren't drop-in compatible. Full reasoning is in each
branch's commit message; what matters for reading the numbers:

**upstream (`@rspress/plugin-playground@2.0.18`)**

- meta word `live` → `playground`, on real demo fences only. Illustrative
  fences inside ` ```` ` blocks are left alone — they aren't demos and
  changing them would move bytes for no reason.
- Demos need an explicit `export default`; the `Runner` errors with "No
  default export" otherwise.
- This plugin's `Button` → a plain `<button>`.
- **No local sibling imports.** `./Imported` was inlined into `MultiFile.tsx`
  and `./Atom` into `ReactEllipseCurve.jsx`. `Imported.tsx` and `Atom.jsx` are
  still on disk, unimported and route-excluded, contributing nothing — don't
  read their presence as upstream handling the import.
- `HomeDemo.tsx` dropped (uses this plugin's `web/lazy` API directly).
- The `ui` plugin option dropped (no upstream equivalent).
- **`include: ["@react-three/drei", "@react-three/fiber",
"@react-three/postprocessing", "three"]` was required.** Upstream's
  `routeGenerated` scan parses raw MDX with its own processor and collects
  imports from inline ` ```jsx playground ` fences and `<code src>` elements.
  A `file=` fence's body is still **empty** in that raw MDX —
  `@rspress/core`'s `remarkFileCodeBlock` fills it during a later compile the
  scan never sees — so a `file=` demo's imports are structurally invisible to
  it. Without `include`, `goWild` throws "Module @react-three/fiber not found",
  and there is no upstream-supported alternative.

  **The `usage` page settles whether that mattered.** Its two demos are inline
  fences importing `react` and `qrcode.react`, both collected by upstream's own
  scan with no `include` involvement — and it still pulls the full 887.9 KB
  union chunk carrying three.js. The union behavior is upstream's, not
  something the config produced.

**v2.0.6 (published `@live-demo/rspress@2.0.6`)**

- `file=` reverted to the deprecated `<code src>` — 2.0.6 predates `file=`;
  its remark transform reads a `src` attribute for external demos.
- `HomeDemo.tsx` dropped here too: no `./web/lazy` in 2.0.6's `exports`.
- `ui.resizablePanels.defaultPanelSizes` takes numbers in 2.0.6, not `"55%"`
  strings.
- `includeModules: ["qrcode.react"]` — 2.0.6 doesn't scan inline
  ` ```lang live ` blocks for their own imports, so `usage`'s QR demo can't
  resolve it otherwise. External demos _are_ scanned, so three.js needs no
  entry. (This option's removal, and why it's no longer needed, is the
  CHANGELOG's `includeModules` entry.)
- `Button` and the local sibling imports stay — 2.0.6 exported `Button` from
  its ten-export barrel and did support multi-file demos.

**The pinning conflict**: `packages/rspress/package.json`
still reads `"2.0.6"`, so a plain `"@live-demo/rspress": "2.0.6"` in
`website/package.json` satisfies pnpm's workspace-link range and silently
resolves to the _local unreleased_ source. `"npm:@live-demo/rspress@2.0.6"`
forces the registry tarball — verified by checking the installed package's
`exports` map has only `.`, `./web` and `./web/index.css`, with no `./web/lazy`.

### Every demo was clicked

On all three deploys, in a real browser: `getStarted`, `basic` and `multiFile`
counters increment; `goWild` renders a live `three.js r182` canvas; `usage`'s
inline counter increments and its QR code renders at 128×128. A page whose demo
silently renders nothing would still produce a plausible byte total.

## Methodology

Each of the 12 (deploy × page) combinations was loaded in its **own isolated
browser context**, so every request is a cold fetch — no cross-page cache
carry-over, which is what would otherwise make the second page of a session
look free.

Bytes come from the page's own `performance.getEntriesByType('resource')` plus
the `navigation` entry for the HTML document, read as **`transferSize`**: actual
bytes off the wire for that load, compression included, cache hits counted as 0.

Two things to know about that number:

- **It includes a flat 300 B/request header allowance.** Cross-checked against
  `curl -H "Accept-Encoding: br, gzip" -w "%{size_download}"` on the same URLs:
  `transferSize − 300` matched curl's body byte count **exactly on four of five
  samples**, across Cloudflare and both third-party CDNs. The fifth (`899`, the
  CodeMirror chunk) came back 32 B larger from curl than `transferSize` — a
  0.02% discrepancy with no explanation chased down. Subtract 300 × the request
  count in the tables below for body-only bytes, give or take that.
- **Brotli end-to-end.** `content-encoding: br` confirmed on every response
  counted, including `cdnjs.cloudflare.com` and `cdn.jsdelivr.net`. Both CDNs
  serve brotli by default, so the totals below have no unit mismatch between
  own-origin and CDN bytes.

**Monaco's workers are the one gap.** Resource timing only sees main-thread
requests, so upstream's worker-initiated fetches (`workerMain.js`,
`simpleWorker.nls.js`, `tsWorker.js`) and the codicon font don't appear there.
Those four were measured by curl and added, +300 each to keep the basis uniform.
`workerMain.js` and `simpleWorker.nls.js` are each requested twice (two workers)
and counted once — both responses carry `cache-control: immutable,
max-age=30672000`, so the second is a cache hit. If that's wrong, upstream's
demo-page numbers are 80.4 KB higher still, which changes nothing.

Local `rspress preview` was **not** used for any number: it serves gzip, not
brotli, which would put a gzip own-bundle against a brotli CDN inside the same
total.

## Results

### Total transferred bytes, all resource types

| page                                   |   **current** | **upstream** | **v2.0.6** |
| -------------------------------------- | ------------: | -----------: | ---------: |
| `customization` — no demo              |  **194.4 KB** |     857.5 KB |   895.6 KB |
| `getStarted` — demo needs `react` only |  **430.5 KB** |    3090.8 KB |  2251.0 KB |
| `goWild` — demo needs three.js         | **1311.1 KB** |    3086.2 KB |  2246.2 KB |
| `usage` — two inline demos †           |  **429.7 KB** |    3090.2 KB |  2250.1 KB |

† **The `usage` row is cost on arrival, and the three legs aren't doing the same
work for it.** Its second demo sits ~2900px down. Upstream and v2.0.6 load both
demos regardless; current loads only the first, and the second costs 6.4 KB more
if the reader scrolls to it. That's the viewport gate working, not a measurement
gap — but don't read 429.7 against 2250.1 as "same page, same content."

Requests: current 12 / 16 / 20 / 16, upstream 14 / 24 / 24 / 24, v2.0.6
14 / 16 / 16 / 17.

### JavaScript only

JS accounts for essentially all of the difference:

| page            |   **current** | **upstream** | **v2.0.6** |
| --------------- | ------------: | -----------: | ---------: |
| `customization` |  **154.3 KB** |     818.5 KB |   853.5 KB |
| `getStarted`    |  **388.0 KB** |    2997.3 KB |  1923.3 KB |
| `goWild`        | **1273.2 KB** |    2997.2 KB |  1923.0 KB |
| `usage`         |  **389.5 KB** |    2998.7 KB |  1924.5 KB |

Everything that isn't JS is close to identical across all three legs and doesn't
move with the plugin: CSS 14.1–16.1 KB, images 14.7 KB, the HTML document
3.8–9.0 KB, the search index 5.4 KB. Two exceptions, each specific to one leg:
upstream adds a **36.7 KB codicon font** (Monaco's icon set) on every demo page,
and v2.0.6 adds Rollup's **282.4 KB wasm binary** on every demo page.

### Read the two middle rows together

`getStarted` and `goWild` are the same site, the same chrome, and demos at
opposite ends of the dependency spectrum.

|                    |       current |    upstream |      v2.0.6 |
| ------------------ | ------------: | ----------: | ----------: |
| `getStarted` total |      430.5 KB |   3090.8 KB |   2251.0 KB |
| `goWild` total     |     1311.1 KB |   3086.2 KB |   2246.2 KB |
| difference         | **+880.6 KB** | **−4.6 KB** | **−4.8 KB** |

On current, the three.js demo costs 880.6 KB more than the trivial one, because
that's what three.js weighs and only that page loads it. On upstream and v2.0.6
the two pages are the _same size to within page prose_ — the heavy demo's
dependencies are already on the cheap demo's page. That difference is the whole
"lazy external imports" claim, measured.

## Per-branch breakdown

### current (`main`)

| chunk                                     |    bytes | loads on                      |
| ----------------------------------------- | -------: | ----------------------------- |
| Site chrome (rspress core + page content) | 194.4 KB | every page                    |
| Eager plugin cost                         |  **0 B** | —                             |
| CodeMirror editor bundle (`899`)          | 183.0 KB | any page with a demo in view  |
| Sucrase (`554`)                           |  45.0 KB | same                          |
| Core/LiveDemo wrapper (`764`)             |   5.9 KB | same                          |
| `Button` re-export shim (`806`)           |   0.4 KB | demos importing it            |
| `qrcode.react` (`432`)                    |   6.4 KB | `usage`, only after scrolling |
| three.js core (`427`)                     | 176.0 KB | `goWild` only                 |
| `@react-three/drei` (`799`)               | 477.3 KB | `goWild` only                 |
| `@react-three/postprocessing` (`363`)     | 182.1 KB | `goWild` only                 |
| `@react-three/fiber` (`248`)              |  48.2 KB | `goWild` only                 |
| demo glue (`207`)                         |   2.5 KB | `goWild` only                 |

Chunks identified by fetching each uncompressed and grepping for distinguishing
strings (`jsxPragma` → Sucrase, `cm-content`/`CodeMirror` → the editor,
`THREE`/`EffectComposer`/`useFrame` → the three.js family), since the filenames
are content hashes.

Sucrase measures 45.0 KB here against the CHANGELOG's independently-measured
44.8 KB.

**The eager row is empty.** 194.4 KB on `customization` is rspress core and
the page's own prose; the plugin contributes nothing until a demo is about to
be seen.

Grepping `main`'s always-loaded vendor chunk (`922`) for `LiveDemo` returns
nothing, and its two hits for `live-demo` are both inside one string —
flexsearch's worker URL, which has the CI checkout path
`/home/runner/work/live-demo/live-demo/node_modules/…` baked into it. Not
plugin code; expect the same two hits on a rerun.

#### Viewport gating, measured

`usage` has a second demo ~2900px down the page. Loading `usage` and stopping
there costs 429.7 KB. Scrolling to that second demo adds **exactly one 6.4 KB
chunk** (`qrcode.react`) and nothing else — the editor, compiler and wrapper
were already down from the first demo, so a second demo on an already-loaded
page costs only its own imports.

On upstream and v2.0.6 both demos on `usage` render without any scrolling at
all. There is nothing to gate.

### upstream (`@rspress/plugin-playground@2.0.18`)

|                                              |    demo page | no-demo page |
| -------------------------------------------- | -----------: | -----------: |
| Site chrome (own origin)                     |     191.9 KB |     191.9 KB |
| **Eager** — Monaco loader + editor (`cdnjs`) | **665.6 KB** | **665.6 KB** |
| Sitewide externals union chunk (`994`)       |     887.9 KB |            — |
| Monaco TypeScript worker (`tsWorker.js`)     |     807.0 KB |            — |
| `babel-standalone@7.22.20` (`cdnjs`)         |     377.1 KB |            — |
| Monaco worker bootstrap + nls                |      81.0 KB |            — |
| Monaco codicon font                          |      36.7 KB |            — |
| Monaco editor CSS + localization             |      33.3 KB |            — |
| Monaco language modes (`tsMode` + basic)     |       8.9 KB |            — |
| **Total**                                    | **~3090 KB** | **857.5 KB** |

Monaco's loader and editor are registered through `html.tags` as
`<link rel="preload">` in the plugin's `builderConfig` — unconditionally, on
every page of the site. That's the 665.6 KB the no-demo page pays. Babel is
_not_ eager: it's fetched on demand when a `Runner` first compiles.

**The 887.9 KB union chunk is on all three demo pages, unchanged.** It's the
generated `_rspress_playground_imports` virtual module, which does
`import * as i_n from '<pkg>'` statically for every package any demo anywhere on
the site uses. `getStarted`, whose demo imports `react`, downloads all of
three.js through it.

#### A `.jsx` demo does not avoid the TypeScript worker

Upstream's single biggest line item is Monaco's TypeScript language service.
`goWild` is `.jsx`, and it still loads `tsWorker.js` (807.0 KB) — the only
difference from `getStarted` is `basic-languages/javascript/javascript.js` in
place of the TypeScript equivalent, 2.6 KB against 2.7 KB. Monaco implements
JavaScript language support _through_ the TypeScript worker, so there is no
`.jsx` discount.

### v2.0.6 (published `@live-demo/rspress`)

|                                                     |    demo page | no-demo page |
| --------------------------------------------------- | -----------: | -----------: |
| Site chrome (own origin, excl. the Shiki row below) |     199.3 KB |     199.3 KB |
| **Eager** — `@babel/standalone@7.28.3` (`jsdelivr`) | **532.1 KB** | **532.1 KB** |
| **Eager** — `@rollup/browser` JS (`jsdelivr`)       | **110.7 KB** | **110.7 KB** |
| **Eager** — Shiki runtime + theme barrel, in `470`  |  **53.6 KB** |  **53.6 KB** |
| Plugin web runtime + externals union (`6834`)       |    1070.4 KB |            — |
| Rollup wasm binary (`jsdelivr`)                     |     282.4 KB |            — |
| **Total**                                           | **~2251 KB** | **895.6 KB** |

Both Babel and Rollup's _JS_ load on every page; only Rollup's wasm is properly
lazy — matching the CHANGELOG's `@rollup/browser` entry.

`6834` is the same shape of problem as upstream's `994`: the plugin's web
runtime plus every external any demo on the site imports, in one chunk, on every
demo page. `getStarted` pays for three.js here too.

#### v2.0.6's eager shared chunk still carries Shiki

Its always-loaded vendor chunk `470` is 394.5 KB uncompressed / 126.8 KB brotli,
against 218.8 KB / 73.2 KB for the equivalent chunk on `main` and 217.5 KB /
72.8 KB on upstream — 53.6 KB brotli of extra weight on every page, demo or not.
Grepping all three:
`470` contains `createOnigScanner`, `codeToTokens` and TextMate grammar
handling, plus 62 references to `@rspress/core/theme` component classes
(`rp-prompt`, `rp-llms`, `PageTabs`). `main` and upstream have none of it —
their only `shiki` hits are the `.shiki` CSS class names that compile-time
highlighting emits anyway.

53.6 KB is the whole delta between `470` and its counterparts. The grep proves
Shiki and the theme barrel are in `470` and absent from the other two; it does
not prove they account for the entire 53.6 KB. What's established: this chunk
is 53.6 KB heavier on every page, and this is what's in it that isn't in the
others.

Either way it's the `@rspress/core/theme` default-external cost, independently
reproduced: the 2026-08-01 section below found it as a before/after on `main`;
this measures it against the published version, on a different deploy, by a
different method.

## Resolving the `[VERIFY]` markers

| claim                                                                                | verdict                          |
| ------------------------------------------------------------------------------------ | -------------------------------- |
| CHANGELOG — "plugin runtime is smaller: ~X against v2, ~Y against plugin-playground" | Two different numbers, see below |
| CHANGELOG — "Per-page layout injection"                                              | **Confirmed**                    |
| CHANGELOG — "Lazy external imports"                                                  | **Confirmed**                    |
| README — "TypeScript w/o red squiggles" as a difference                              | **False; removed from README**   |

**The top-line CHANGELOG figure conflates two measurements** and needs one
number per clause:

- _Eager tax_ — what a page with no demo pays: current 194.4 KB against
  v2.0.6's 895.6 KB (**−701 KB**) and upstream's 857.5 KB (**−663 KB**).
- _Demo-specific cost_ — demo page minus no-demo page, on the cheap demo:
  current 236.1 KB against v2.0.6's 1355.4 KB (**−1119 KB**) and upstream's
  2233.3 KB (**−1997 KB**).

**Per-page layout injection** — confirmed directly. `customization` on upstream
fetches Monaco's `loader.js` and `editor.main.js`; on v2.0.6 it fetches
`@babel/standalone` and `@rollup/browser`; on current it fetches nothing
plugin-related at all.

**Lazy external imports** — confirmed, and stronger than the entry claims. It
isn't only that a page downloads the union: on both other legs the heavy demo's
page and the trivial demo's page are the _same size_.

**The README's red-squiggles claim is false and has been removed.**
`@rspress/plugin-playground`'s own `Playground.tsx` calls
`monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions` with
`noSemanticValidation`, `noSyntaxValidation` and `noSuggestionDiagnostics` all
`true`. Confirmed in-browser on the deploy: zero `.squiggly-*` elements in the
editor. Upstream has no squiggles either; this was never a difference.

## 2026-08-01: dropping the `@rspress/core/theme` default external

The mechanism below is corroborated from the other direction by "v2.0.6's
eager shared chunk still carries Shiki" above.

`@rspress/core/theme` was in the plugin's `defaultModules`, so every demo could
import it without declaring it. It's a barrel: making it an external marks all
of its exports live, `CodeBlockRuntime` included, which pulls in Shiki and ~30
TextMate grammars. The site's layout needs that same barrel eagerly, so the
bundler merged the two — putting a runtime syntax highlighter into the initial
chunk of **every page**, demo or not.

A stock `create-rspress@latest --template basic` site on the same
`@rspress/core@2.0.18` ships no Shiki runtime at all (checked: no chunk
containing `createOnigScanner` or `codeToTokensBase`). So this was ours, not
core's: a Shiki chunk in an Rspress build otherwise reads as something Rspress
added.

Measured then as production `main` against a branch preview, both the full
untrimmed site:

|                                      |   before |    after |    delta |
| ------------------------------------ | -------: | -------: | -------: |
| Demo page (`getStarted`) total       | 471.5 KB | 410.9 KB | −60.6 KB |
| No-demo page (`customization`) total | 237.5 KB | 176.1 KB | −61.5 KB |
| Demo-specific cost (demo − no-demo)  | 233.9 KB | 234.8 KB |  +0.9 KB |

Those figures are on the old `size_download` basis (body bytes, no header
allowance) and aren't directly comparable to this run's `transferSize` numbers;
the delta is the point.

**The demo-specific cost doesn't move.** The entire saving is on the shared
eager side: it's the no-demo page that gets 25.9% lighter.

### 2.4 KB of it was CSS

The sitewide stylesheet went 16,566 → 14,086 B brotli (84,978 → 70,351 raw).
**Not Shiki's CSS** — both stylesheets still carry all 35 `.shiki` selectors,
since compile-time highlighting emits `.shiki` markup for ordinary code blocks
and always needed those rules.

What went is the CSS for _theme components the site never renders_, which the
barrel kept alive. 151 selectors dropped: `rp-prompt` 50 (the "Copy Prompt"
agent block), `rp-llms` 22, `rp-page` 21 (`PageTabs`), `rp-banner` 6,
`rp-source` 5, `rp-steps` 4, `rp-outline` 2, and 41 keyframes and one-offs.
Marking every export live pinned each component's stylesheet whether or not the
site used the component — the same failure in a second dimension.

Build output dropped too: 190 of 322 async chunks were TextMate grammars (5.5 MB
raw), emitted but never fetched. Dead deploy weight, not reader cost — don't
quote it as a payload win.

### The part that isn't sealed

`visitFilePaths` folds each demo's own imports into the same sitewide virtual
module, so **one demo importing `@rspress/core/theme` brings the whole cost back
for every page.** Removing it from the defaults only stops the plugin imposing
it unprompted. `usage.mdx` warns demo authors, and `plugin.ts`'s
`defaultModules` docblock records why it must not return.

## What's inside the CodeMirror bundle

Measured 2026-07-27 and not re-measured here. The chunk was
`3899.09416e05e5.js`; it's now `899.a789894b09.js` (556,371 B raw, 183.0 KB
brotli), so read these figures as relative weights, not current absolutes.
Produced with `webpack-bundle-analyzer` wired temporarily into
`builderConfig.tools.rspack`, parsing the report's embedded `chartData`.

Per-package, minified and gzip:

| Package                                      | Minified |    Gzip |
| -------------------------------------------- | -------: | ------: |
| `@codemirror/view`                           | 190.5 KB | 60.4 KB |
| `@codemirror/lang-javascript`                | 108.3 KB | 40.9 KB |
| `@uiw/react-codemirror` (React wrapper)      |  62.9 KB | 20.6 KB |
| `@codemirror/state`                          |  47.4 KB | 15.7 KB |
| `@codemirror/autocomplete`                   |  34.2 KB | 11.9 KB |
| `react-resizable-panels`                     |  32.2 KB | 10.6 KB |
| `@codemirror/language`                       |  24.6 KB |  8.9 KB |
| `@lezer/common`                              |  20.2 KB |  6.9 KB |
| `@lezer/highlight`                           |   6.8 KB |  2.7 KB |
| `@mantine/hooks`                             |   5.5 KB |  2.4 KB |
| `@uiw/codemirror-theme-vscode`               |   4.8 KB |  1.4 KB |
| `@tabler/icons-react`                        |   2.5 KB |  1.7 KB |
| `style-mod` + `crelt` (CodeMirror internals) |   2.7 KB |  1.5 KB |
| `@babel/runtime`                             |   0.2 KB |  0.2 KB |

Per-module gzip sums to 185.8 KB against the chunk's real 180.3 KB — expected,
since gzip-ing each module separately misses cross-module redundancy.

CodeMirror proper (`@codemirror/*` + `@lezer/*` + `style-mod` + `crelt`) is
~149 KB gzip of the total. `@uiw/react-codemirror`, the React binding, adds
another 20.6 KB over talking to CodeMirror directly. `@tabler/icons-react`
tree-shakes to 1.7 KB — the two icons the control panel uses, not the icon set.

`react-error-boundary` has no line here: it's inlined into `Core.mjs` at the
package's `tsdown` build step, so the analyzer can't attribute it. Bounded
regardless — the whole wrapper chunk it lives in is 5.9 KB.

## Caveats for reproducing this

- **`current` is unreleased and will keep moving.** These are a snapshot of one
  branch point. Rerun before quoting them anywhere permanent.
- **`transferSize` includes 300 B/request of headers.** Subtract 300 × the
  request count for body bytes. Don't mix these figures with the 2026-08-01
  section's, which are `curl -w "%{size_download}"` body bytes.
- **Two different Babel builds appear across legs** —
  `babel-standalone@7.22.20` (upstream, cdnjs, 377.1 KB) and
  `@babel/standalone@7.28.3` (v2.0.6, jsdelivr, 532.1 KB). Different package,
  version and CDN, not one dependency measured twice; the ~155 KB gap is not a
  methodology inconsistency.
- **The CHANGELOG's Sucrase entry's Babel figures were inaccurate.** Its
  Sucrase figures reproduce exactly (44.8 KB brotli, 196.3 KB uncompressed —
  chunk `554`), but its Babel figures (481.2 KB brotli, 2251.0 KB uncompressed)
  match no artifact reachable today: `@babel/standalone@7.28.3`, the version
  this plugin actually shipped, measures 531.8 KB brotli / 644.6 KB gzip /
  3001.9 KB identity on jsdelivr. The entry now carries the measured numbers;
  what the original 481.2 figure measured is unknown.
- **`icon-dark.png` (12.7 KB) is in every row.** Because every page load got its
  own isolated browser context, the favicon is fetched every time instead of
  appearing only on whichever page loaded first. Uniform across all 12 cells, so
  it cancels — but it's in the totals.
- **Monaco's duplicate worker fetches are counted once.** See Methodology.
- **The two non-`main` branches don't pass `pnpm run verify`** — they don't
  build against this repo's own package and the e2e suite expects this plugin's
  markup. Push them with `git push --no-verify`; don't disable the husky hook,
  there's nothing to restore afterwards that way.
- **Reproducing this**: branches `asset-size-2/upstream` and
  `asset-size-2/v2.0.6` on `origin`, both off `main`. Rebase on newer `main` and
  re-push for fresh preview URLs, then rerun the resource-timing pass above.
  Don't trust `Content-Length` — it's absent on most of these responses.
