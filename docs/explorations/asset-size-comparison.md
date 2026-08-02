# Asset size comparison: current vs. upstream vs. published v2

Original question: does this plugin's unreleased work (Sucrase, per-page layout
injection, dropping `@rollup/browser`, viewport-gated demo loading) actually
cost less over the wire than `@rspress/plugin-playground` and the last
published `@live-demo/rspress@2.0.6`? Measured on real Cloudflare Pages
deploys, same site content, same four pages.

**Answered below: yes, on every page, and the margin widens the less a page
asks for.** A page with no demo at all is 4.5–4.7× lighter. A page whose demo
imports nothing but `react` is 5.3–7.3× lighter, because both of the others
ship every external used anywhere on the site to every page that has a demo.
Only on the one page whose demo genuinely needs three.js does the gap narrow —
and current is still 1.7–2.4× lighter there.

**Run: `asset-size-3` generation**, measured 2026-08-02, branches cherry-picked
onto `main@eac341a`. This supersedes the earlier `asset-size-2` run of the same
date; where both are cited, the branch generation is the distinguishing label.
The method is [`measuring-payload.md`](../measuring-payload.md); this file
carries only what was deployed, what had to be adapted, the numbers, and the
caveats specific to this run.

**Basis**, everywhere except the two dated sections at the end: `transferSize`
from each page's own resource timing, one isolated browser context per
(deploy × page), brotli confirmed this run on all three own origins **and** on
cdnjs and jsDelivr. It includes a flat +300 B/request of headers — subtract
300 × the request count for body bytes (the curl cross-check behind that
constant is in `measuring-payload.md`). Monaco's worker fetches and its codicon
font never appear in resource timing; those four were measured by curl and
added on the same +300 basis.

## Setup

Three deploys of the same untrimmed 9-page site, `@rspress/core` pinned to
exact `2.0.18` on all three (`pnpm why @rspress/core` showed exactly one
version on each leg — an alternative plugin's peer range can otherwise drag a
newer core in around an exact pin):

| Leg          | Deploy                                      | What it runs                                      |
| ------------ | ------------------------------------------- | ------------------------------------------------- |
| **current**  | `live-demo.pages.dev`                       | `main`, this repo's unreleased `packages/rspress` |
| **upstream** | `asset-size-3-upstream.live-demo.pages.dev` | `@rspress/plugin-playground@2.0.18`               |
| **v2.0.6**   | `asset-size-3-v2-0-6.live-demo.pages.dev`   | published `@live-demo/rspress@2.0.6` from npm     |

Branches `asset-size-3/upstream` and `asset-size-3/v2.0.6`, each cut from
`main` independently and carrying exactly one commit — the previous
generation's adaptation commit, cherry-picked forward. All 9 pages and all
prose stay byte-identical to `main` on both, so site chrome and the sitewide
virtual module's demo set are comparable across legs.

### The four pages

| page                    | demo on it                                                                 | what it isolates                           |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| `guide/customization`   | none                                                                       | the eager tax — ADR 0004's invariant       |
| `guide/getStarted`      | one `.tsx` file demo: `react` + this plugin's `Button`                     | the cheapest possible demo                 |
| `guide/external/goWild` | one `.jsx` file demo: three.js, `@react-three/{fiber,drei,postprocessing}` | the expensive demo                         |
| `guide/usage`           | two inline ` ```jsx live ` demos, the second ~2900px down                  | inline vs. external, and the viewport gate |

`getStarted` against `goWild` is the pair that decides the question: on current
those two pages should differ by exactly the three.js graph, and on the other
two legs they should not differ at all.

Every demo was verified on all three deploys before any byte was trusted:
`getStarted` counters increment (`Count is 0` → `Count is 1`), `goWild` renders
a live canvas with `data-engine="three.js r182"`, `usage`'s QR code renders at
128×128. **Verification happened after the resource-timing snapshot in each
context**, so no compile triggered by interaction is inside the numbers.

### Per-branch adaptations

The three plugins aren't drop-in compatible. Full reasoning is in each branch's
commit message; what matters for reading the numbers:

**upstream (`@rspress/plugin-playground@2.0.18`)**

- Meta word `live` → `playground`, on real demo fences only. Illustrative
  fences inside ` ```` ` blocks are left alone.
- Demos need an explicit `export default`; the `Runner` errors otherwise.
- This plugin's `Button` → a plain `<button>`.
- **No local sibling imports.** `./Imported` was inlined into `MultiFile.tsx`
  and `./Atom` into `ReactEllipseCurve.jsx`. Both files are still on disk,
  unimported and route-excluded — don't read their presence as upstream
  handling the import.
- `HomeDemo.tsx` dropped (uses this plugin's `web/lazy` API directly), and the
  `ui` plugin option dropped (no upstream equivalent).
- **`include: ["@react-three/drei", "@react-three/fiber",
"@react-three/postprocessing", "three"]` was required** — see below.

**v2.0.6 (published `@live-demo/rspress`)**

- `file=` reverted to the deprecated `<code src>`; 2.0.6 predates `file=`.
- `HomeDemo.tsx` dropped here too: no `./web/lazy` in 2.0.6's `exports`.
- `ui.resizablePanels.defaultPanelSizes` takes numbers, not `"55%"` strings.
- `includeModules: ["qrcode.react"]` — 2.0.6 doesn't scan inline
  ` ```lang live ` blocks for their own imports, so `usage`'s QR demo can't
  resolve it otherwise. External demos _are_ scanned, so three.js needs no
  entry. (Its removal is the CHANGELOG's `includeModules` entry.)
- `Button` and the local sibling imports stay — 2.0.6 exported `Button` and did
  support multi-file demos.
- Installed as `"npm:@live-demo/rspress@2.0.6"`, verified against the installed
  `exports` map (only `.`, `./web`, `./web/index.css` — no `./web/lazy`), since
  a plain `"2.0.6"` range resolves to the local workspace source instead.

#### Why upstream's `include` doesn't rig the comparison

Upstream's `routeGenerated` scan parses raw MDX with its own processor and
collects imports from inline ` ```jsx playground ` fences and `<code src>`
elements. A `file=` fence's body is still **empty** in that raw MDX —
`@rspress/core`'s `remarkFileCodeBlock` fills it during a later compile the
scan never sees — so a `file=` demo's imports are structurally invisible to it.
Without `include`, `goWild` throws "Module @react-three/fiber not found", and
there is no upstream-supported alternative.

**The `usage` page settles whether that mattered**, and it was checked directly
on this run's artifacts rather than inferred. Its two demos are inline fences
importing `react` and `qrcode.react`, both collected by upstream's own scan
with no `include` involvement — and `usage` fetches
`static/js/async/994.0d01f6d54f.js`, byte-for-byte the same chunk `goWild`
fetches. Grepping that chunk identity-encoded: `THREE` ×157, `EffectComposer`
×10, `useFrame` ×1, alongside `QRCodeSVG` ×2. One chunk carries three.js and
the QR library together, and a page that never mentioned three.js downloads it.
The union behavior is upstream's, not something the config produced. v2.0.6's
`6834.f29e6a6eec.js` greps identically (`THREE` ×157, `EffectComposer` ×10).

`customization` fetches neither union chunk — with no demo on the page there is
nothing to mount, which is why its totals sit well below the demo pages on all
three legs while still carrying each plugin's eager cost.

## Results

### Total transferred bytes, all resource types

| page                                  |                  **current** |             **upstream** |               **v2.0.6** |
| ------------------------------------- | ---------------------------: | -----------------------: | -----------------------: |
| _the plugin's share is_               | _CodeMirror + Sucrase, lazy_ | _Monaco + Babel + union_ | _Babel + Rollup + union_ |
| `customization` — no demo             |                 **187.1 KB** |                 849.7 KB |                 885.1 KB |
| `getStarted` — cheap demo             |                 **422.5 KB** |                3081.8 KB |                2239.2 KB |
| `goWild` — three.js demo              |                **1303.0 KB** |                3077.6 KB |                2234.5 KB |
| `usage` — inline demos, before scroll |                 **421.5 KB** |                3081.3 KB |                2238.3 KB |
| `usage` — after scrolling to the 2nd  |                 **427.9 KB** |                3081.3 KB |                2238.3 KB |

Request counts: `customization` 12 / 14 / 14, `getStarted` 16 / 24 / 16,
`goWild` 20 / 24 / 16, `usage` 16–17 / 24 / 17 (current / upstream / v2.0.6).
For body-only bytes subtract 300 × the count.

How much lighter current is, as a ratio:

| page                      | vs. upstream | vs. v2.0.6 |
| ------------------------- | -----------: | ---------: |
| `customization` — no demo |        4.54× |      4.73× |
| `getStarted` — cheap demo |        7.30× |      5.30× |
| `goWild` — three.js demo  |        2.36× |      1.71× |
| `usage` — before scroll   |        7.31× |      5.31× |

### The pair that decides it

Cheap-demo page against heavy-demo page, on the same leg:

| leg          | `getStarted` |  `goWild` |         delta |
| ------------ | -----------: | --------: | ------------: |
| **current**  |     422.5 KB | 1303.0 KB | **+880.5 KB** |
| **upstream** |    3081.8 KB | 3077.6 KB |       −4.2 KB |
| **v2.0.6**   |    2239.2 KB | 2234.5 KB |       −4.7 KB |

On current, a page pays for its own demo's dependency graph and nothing else.
On both alternatives the two pages are the same size — three.js is already on
the cheap-demo page. The heavy page comes out fractionally _smaller_ only
because its route chunk and prose are smaller; the demo payload is identical.

Chunk attribution on current confirms the separation is real, not coincidence
(identity-encoded, so these raw sizes don't belong beside the brotli totals
above): `799.28b0945ad8.js` (1546.6 KB raw) carries `THREE` ×103 and
`EffectComposer` ×5 and is fetched only by `goWild`; `899.a789894b09.js`
(543.3 KB raw) is CodeMirror (`cm-content` ×10); `554.561e42b916.js`
(196.3 KB raw) is Sucrase (`jsxPragma` ×5). No chunk mixes them.

### The eager tax — ADR 0004's invariant

`customization` has no demo. Current ships **no plugin bytes** to it: its eager
chunk `821.53d7c21a87.js` (228.7 KB raw) greps 0 for `jsxPragma`, `cm-content`,
`CodeMirror`, `THREE` and `createOnigScanner`. It matches `live-demo` twice,
both inside flexsearch's worker URL, which has the CI checkout path baked in
(`file:///home/runner/work/live-demo/live-demo/node_modules/...`) — the
documented false positive, not plugin code.

The alternatives both pay on that page: upstream fetches Monaco's
`editor.main.js` (657.3 KB) plus `loader.js` (8.3 KB); v2.0.6 fetches Babel
(532.1 KB) plus Rollup (110.7 KB). Neither page has anything to compile.

### The viewport gate

`usage`'s second demo sits ~2900px down. Scrolling to it:

| leg          | before scroll | after scroll |   delta |
| ------------ | ------------: | -----------: | ------: |
| **current**  |      421.5 KB |     427.9 KB | +6.4 KB |
| **upstream** |     3081.3 KB |    3081.3 KB |       0 |
| **v2.0.6**   |     2238.3 KB |    2238.3 KB |       0 |

Current's delta is exactly one chunk, `432.ad24a44a49.js` (6,513 B), which
greps `QRCodeSVG` ×2 — the below-the-fold demo's own import and nothing else.
Before scrolling, the QR code is not in the DOM at all. On both alternatives it
renders immediately and scrolling costs zero, because its code was already in
the eager/union payload that page had loaded regardless.

### Where the bytes go — upstream's worker gap

Resource timing sees 20 requests on each upstream demo page; **26 actually
fire**. The four URLs it misses, measured by curl with brotli:

| URL                              | body bytes | note                          |
| -------------------------------- | ---------: | ----------------------------- |
| `.../typescript/tsWorker.js`     |    825,985 | one fetch                     |
| `.../base/worker/workerMain.js`  |     81,987 | **two fetches, counted once** |
| `.../codicons/codicon.ttf`       |     37,252 | one fetch                     |
| `.../worker/simpleWorker.nls.js` |        363 | **two fetches, counted once** |

Subtotal with +300 B each: **946,787 B**. All four carry
`cache-control: no-transform, public, max-age=30672000, immutable`, so per the
method's rule the duplicated pair is counted once — making the effective
request count for the `300 × n` subtraction **24**, not 26.

This subtotal was curl'd once and applied to all three upstream demo pages:
same immutable URLs, same sizes, not three independent measurements.
`customization` has no worker rows at all — Monaco loads there but no editor is
instantiated.

Also excluded: two `blob:` rows per demo page. Those are locally-created worker
bootstraps and cost no network bytes.

### Cross-run validation

Demo-specific cost (cheap-demo page minus no-demo page) against the previous
`asset-size-2` run, both on the `transferSize` basis:

| leg          | asset-size-3 | asset-size-2 |   drift |
| ------------ | -----------: | -----------: | ------: |
| **current**  |     235.4 KB |     236.1 KB | −0.7 KB |
| **upstream** |    2232.1 KB |    2233.3 KB | −1.2 KB |
| **v2.0.6**   |    1354.1 KB |    1355.4 KB | −1.3 KB |

Within ~1.3 KB on all three legs, independently reproduced from cherry-picked
branches on a newer `main`. That's evidence the rig itself reproduces, not just
that the plugins didn't change.

Absolutes did move: the eager tax is now 187.1 KB against the previous run's
194.4 KB, mostly because `main` replaced its PNG favicons with SVGs
(`icon-dark.png` was 12.7 KB in every row; `icon-*.svg` are ~1.0 KB).

## Still current from earlier runs

The three sections below were **not re-measured in this run**.

### What the `[VERIFY]` markers resolved to

| claim                                                                                | verdict                            |
| ------------------------------------------------------------------------------------ | ---------------------------------- |
| CHANGELOG — "plugin runtime is smaller: ~X against v2, ~Y against plugin-playground" | Conflated two numbers; now a table |
| CHANGELOG — "Per-page layout injection"                                              | **Confirmed**                      |
| CHANGELOG — "Lazy external imports"                                                  | **Confirmed**                      |
| CHANGELOG — Sucrase entry's Babel figures                                            | **Wrong; entry re-measured**       |
| README — "TypeScript w/o red squiggles" as a difference                              | **False; removed from README**     |

**The Sucrase entry's Babel comparison was wrong.** Its Sucrase figures
reproduce exactly (44.8 KB brotli, 196.3 KB uncompressed — chunk `554`, whose
filename `554.561e42b916.js` and 196.3 KB raw size still match this run), but
the Babel figures it compared them against (481.2 KB brotli, 2251.0 KB
uncompressed) match no artifact reachable today: `@babel/standalone@7.28.3`,
the version this plugin actually shipped, measures 531.8 KB brotli / 644.6 KB
gzip / 3001.9 KB identity on jsdelivr. The entry now carries the measured
numbers; what the original 481.2 figure measured is unknown.

The red-squiggles claim was never true of upstream either:
`@rspress/plugin-playground`'s `Playground.tsx` calls
`monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions` with
`noSemanticValidation`, `noSyntaxValidation` and `noSuggestionDiagnostics` all
`true`, and the deploy shows zero `.squiggly-*` elements in the editor.

### 2026-08-01: dropping the `@rspress/core/theme` default external

Not re-measured in this run. Figures here are `curl -w "%{size_download}"` body
bytes, **not** `transferSize` — deltas are comparable, absolutes aren't.

`@rspress/core/theme` was in the plugin's `defaultModules`, so every demo could
import it without declaring it. It's a barrel: making it an external marks all
of its exports live, `CodeBlockRuntime` included, which pulls in Shiki and ~30
TextMate grammars. The site's layout needs that same barrel eagerly, so the
bundler merged the two — putting a runtime syntax highlighter into the initial
chunk of **every page**, demo or not. A stock `create-rspress@latest --template
basic` site on the same `@rspress/core@2.0.18` ships no Shiki runtime at all, so
this was ours, not core's.

Production `main` against a branch preview, both the full untrimmed site:

|                                      |   before |    after |    delta |
| ------------------------------------ | -------: | -------: | -------: |
| Demo page (`getStarted`) total       | 471.5 KB | 410.9 KB | −60.6 KB |
| No-demo page (`customization`) total | 237.5 KB | 176.1 KB | −61.5 KB |
| Demo-specific cost (demo − no-demo)  | 233.9 KB | 234.8 KB |  +0.9 KB |

**The demo-specific cost doesn't move.** The entire saving is on the shared
eager side: the no-demo page gets 25.9% lighter.

2.4 KB of it was CSS — the sitewide stylesheet went 16,566 → 14,086 B brotli
(84,978 → 70,351 raw). **Not Shiki's CSS**: both stylesheets still carry all 35
`.shiki` selectors, which ordinary compile-time-highlighted code blocks need.
What went is the CSS for _theme components the site never renders_, which the
barrel kept alive — 151 selectors: `rp-prompt` 50 (the "Copy Prompt" agent
block), `rp-llms` 22, `rp-page` 21 (`PageTabs`), `rp-banner` 6, `rp-source` 5,
`rp-steps` 4, `rp-outline` 2, and 41 keyframes and one-offs. Marking every
export live pinned each component's stylesheet whether or not the site used the
component.

Build output dropped too: 190 of 322 async chunks were TextMate grammars
(5.5 MB raw), emitted but never fetched. Dead deploy weight, not reader cost.

**The part that isn't sealed.** `visitFilePaths` folds each demo's own imports
into the same sitewide virtual module, so **one demo importing
`@rspress/core/theme` brings the whole cost back for every page.** Removing it
from the defaults only stops the plugin imposing it unprompted. Nothing in the
source currently records this — `plugin.ts`'s `defaultModules` docblock covers
only `react/jsx-runtime`.

### 2026-07-27: what's inside the CodeMirror bundle

Not re-measured here, but **still the current chunk**: `899.a789894b09.js`,
556,371 B raw, unchanged in this run (183.0 KB brotli). The relative weights
below still apply. Figures are **gzip** (`webpack-bundle-analyzer` `chartData`)
and don't belong in a sentence with the brotli totals above.

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
`react-error-boundary` has no line: it's inlined into `Core.mjs` at the
package's `tsdown` build step, so the analyzer can't attribute it. Bounded
regardless — the whole wrapper chunk it lives in is 5.9 KB.

## Caveats

- **`current` is unreleased and will keep moving.** These are a snapshot of one
  branch point. Rerun before quoting them anywhere permanent.
- **Three bases appear in this file.** `transferSize` (everything above the
  dated sections, +300 B/request), `size_download` body bytes (2026-08-01), and
  gzip per-module figures (2026-07-27). Don't combine them. The identity-encoded
  raw chunk sizes used for attribution are a fourth — they exist to name what's
  in a chunk, never to total anything.
- **Two different Babel builds appear across legs** —
  `babel-standalone@7.22.20` (upstream, cdnjs, 377.1 KB) and
  `@babel/standalone@7.28.3` (v2.0.6, jsdelivr, 532.1 KB). Different package,
  version and CDN, not one dependency measured twice; the ~155 KB gap is not a
  methodology inconsistency.
- **Favicons are in every row.** Each page load got its own isolated browser
  context, so they're fetched every time. Now SVG (~1.0 KB each) rather than the
  12.7 KB PNGs of the previous run — uniform across all 12 cells, so it cancels,
  but it's why absolutes shifted between runs.
- **Monaco's duplicate worker fetches are counted once**, per the method's
  `immutable` rule. Both `workerMain.js` responses were **200, not 304** —
  two workers raced before either response was cached, so a real reader
  plausibly paid 80.4 KB twice. Counting once understates upstream's demo pages
  by ~80 KB; the ratios above are the conservative reading.
- **Reproducing this**: branches `asset-size-3/upstream` and
  `asset-size-3/v2.0.6` on `origin`, both cut from `main@eac341a`. For a newer
  `main`, cherry-pick each branch's single commit forward rather than rebasing
  in place — see `measuring-payload.md`, "Rerunning against a newer main".
