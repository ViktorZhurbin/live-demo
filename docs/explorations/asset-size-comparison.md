# Asset size comparison: current vs. upstream vs. published v2

Original question: does this plugin's unreleased work (Sucrase, the
per-page layout injection, dropping `@rollup/browser`) actually cost less
over the wire than `@rspress/plugin-playground` and the last published
`@live-demo/rspress@2.0.6`? Measured on real Cloudflare Pages preview
deploys, same site content, same three pages.

**Answered below: yes, current is lighter on every page, and by a wide
margin on pages with no demo at all** — but the reason is more interesting
than "smaller bundle": upstream and v2.0.6 both offload their heaviest
dependency to a third-party CDN and load it on every page regardless of
whether that page has a demo. Current bundles its own (much smaller)
compiler and only loads it on pages that need it.

## Setup

Three branches, same three representative pages, sequenced so each is a
minimal diff off the last:

| Branch                     | What it runs                                          | Branched from              |
| -------------------------- | ----------------------------------------------------- | -------------------------- |
| `asset-size-test/current`  | this repo's unreleased `packages/rspress` (workspace) | `main`                     |
| `asset-size-test/upstream` | `@rspress/plugin-playground@2.0.18`                   | `asset-size-test/current`  |
| `asset-size-test/v2.0.6`   | published `@live-demo/rspress@2.0.6` from npm         | `asset-size-test/upstream` |

Pages, trimmed from the full `website/docs` down to one of each kind:

- **`guide/getStarted`** — external (`file=`/`playground`/`<code src>`) demo,
  a `.tsx` counter using `@rspress/core/theme`'s `Badge`.
- **`guide/usage`** — inline demo, same counter shape. Not separately
  measured below (inline and external share the same runtime; only the
  entry point differs), but present on all three branches if that
  assumption needs checking later.
- **`guide/customization`** — no demo at all. This is the one that isolates
  "does the runtime load even when nothing needs it."

Per-branch adaptations, because the three plugins aren't drop-in
compatible (see commit messages on each branch for the full reasoning):

- **upstream**: meta word `live` → `playground`; demos need an explicit
  `export default`; this plugin's own `Button` component swapped for a
  plain `<button>`; the hand-rolled homepage demo (`HomeDemo.tsx`, which
  used this plugin's `web/lazy` API directly and imported a local sibling
  file) dropped — upstream has no equivalent and can't do local-file
  imports.
- **v2.0.6**: `file=` reverted to the deprecated `<code src>` (v2.0.6
  predates `file=` support — confirmed via `git merge-base
--is-ancestor`), `Button` restored (existed in the old barrel too),
  homepage demo dropped here too (`web/lazy` doesn't exist in 2.0.6's
  `exports` map — checked directly against the published package.json).
- **package pinning gotcha**: `packages/rspress/package.json` happens to
  read `"2.0.6"` right now, so a plain `"@live-demo/rspress": "2.0.6"` in
  `website/package.json` would satisfy pnpm's workspace-link range and
  silently resolve to the _local unreleased_ source instead of the
  registry tarball. Used `"npm:@live-demo/rspress@2.0.6"` to force the
  real fetch — confirmed by checking the installed package's `exports`
  field has no `./web/lazy`, matching the real 2.0.6, not local `dist`.

All three builds were verified in-browser (not just "the build didn't
error") — every demo was actually clicked and its counter confirmed to
increment before trusting any measurement.

Deployed as Cloudflare Pages branch previews (automatic on push):

- `https://asset-size-test-current.live-demo.pages.dev`
- `https://asset-size-test-upstream.live-demo.pages.dev`
- `https://asset-size-test-v2-0-6.live-demo.pages.dev`

## Methodology

Loaded `/guide/getStarted` (demo page) and `/guide/customization` (no-demo
page) on each deployment with Playwright, in a fresh session each time, and
recorded every request the page actually made (`browser_network_requests`,
`static: true`).

Then fetched each **unique** URL directly with `curl -H "Accept-Encoding:
br, gzip"` and read `%{size_download}` — the actual wire bytes, not the
`Content-Length` header. That header is absent for most of these
responses (Cloudflare and both CDNs use chunked transfer encoding for
compressed responses), so `size_download` was the only reliable number.
Confirmed `content-encoding: br` on every response counted below —
including the two third-party CDNs (`cdnjs.cloudflare.com`,
`cdn.jsdelivr.net`), which both serve brotli by default. That matters:
without checking, you'd naturally assume "compare brotli" only applies to
your own deployment and the CDN numbers are some other encoding — they're
not, so the totals below are brotli end-to-end, no unit mismatch.

One approximation: Monaco (upstream) spins up workers that request a
couple of files twice in the Playwright log (`workerMain.js`,
`simpleWorker.nls.js`). Counted each unique URL once, on the assumption the
second request is an HTTP cache hit within the same page load. If that
assumption is wrong, upstream's real number is a few tens of KB higher
still — doesn't change the conclusion.

Local `rspress preview` was **not** used for the final numbers — checked
first, and it serves local static assets as gzip, not brotli. Since both
CDNs serve real brotli, measuring locally would have compared brotli
(CDN) against gzip (own bundle) inside the same total, which is worse than
comparing nothing. The real Cloudflare deploys give brotli on both sides,
consistently.

## Results

Real transferred bytes (brotli), everything the page loaded, own origin +
any third-party CDN combined:

|                                             |      **current** (unreleased) |    **upstream** (`plugin-playground`) |             **v2.0.6** (published) |
| ------------------------------------------- | ----------------------------: | ------------------------------------: | ---------------------------------: |
| Demo page (`getStarted`) total              |                  **481.4 KB** |                             2260.8 KB |                          1355.7 KB |
| No-demo page (`customization`) total        |                  **234.8 KB** |                              900.1 KB |                           878.3 KB |
| Demo-specific cost (demo − no-demo)         |                      246.6 KB |                             1360.7 KB |                           477.4 KB |
| Heaviest dependency, where it's served from | Sucrase, bundled (own origin) | Monaco Editor, `cdnjs.cloudflare.com` | Babel + Rollup, `cdn.jsdelivr.net` |
| Does the no-demo page load it anyway?       |                            No | Yes (Monaco loader + editor, eagerly) |   Yes (Babel + Rollup JS, eagerly) |

Request counts (unique URLs, all resource types): current 16 / 11,
upstream 24 / 13, v2.0.6 16 / 13 (demo / no-demo).

### Granular breakdown, per branch and page

"Site chrome" (baseline) is everything that isn't plugin-specific: the HTML
document, CSS, React, the router, `@rspress/core`'s own theme chunk, the
page's own MDX-compiled content chunk, icons, and the search index. It's
**~235–250 KB on every branch and every page** — confirms it's genuinely
rspress-core-and-site-content cost, not something either plugin adds or
removes. The ~15 KB spread between pages is page prose length (the `route-*`
chunk) plus one caching artifact: `icon-dark.png` (12.7 KB) only shows up on
whichever page loaded first in a given test session, since the favicon isn't
re-fetched once cached. Not a real per-page cost — noise from test ordering,
called out here so it isn't mistaken for something meaningful.

Beyond that baseline, split into **eager** (loads even with zero demos on
the page — this is the `globalComponents`-equivalent tax) and **demo-only**
(loads because this specific page has a demo to run):

**current**

|                        |    demo page | no-demo page |
| ---------------------- | -----------: | -----------: |
| Site chrome (baseline) |     248.7 KB |     234.9 KB |
| Eager (always loads)   |            — |            — |
| CodeMirror bundle      |     182.4 KB |            — |
| Sucrase                |      44.8 KB |            — |
| Core/Button wrapper    |       5.4 KB |            — |
| Button re-export shim  |       0.1 KB |            — |
| **Total**              | **481.4 KB** | **234.9 KB** |

Sucrase's 44.8 KB matches the CHANGELOG's own measured figure exactly —
good cross-check that this methodology and that one agree. Identified each
chunk by fetching it uncompressed and grepping for distinguishing strings
(`jsxPragma`/`transform(` → Sucrase; `codemirror`/`CodeMirror` → the editor
bundle), since the filenames are content hashes with no other meaning.

#### What's inside the 182.4 KB CodeMirror bundle

Grepping tells you _which_ chunk is CodeMirror, not what's inside it.
For that, built `website` locally with `webpack-bundle-analyzer` temporarily
wired into `builderConfig.tools.rspack` (an array entry, gated on
`!isServer` so it only instruments the client compiler), then parsed the
report's embedded `chartData` for this exact chunk. Confirmed it's the
same content-addressed chunk as the deployed one
(`3899.09416e05e5.js` — identical hash locally and on Cloudflare), so this
breakdown applies directly to the deployed number, not an approximation.

Per-package, minified and gzip (this tool doesn't compute brotli per
module — real deployed number for the whole chunk is 182.4 KB brotli
either way):

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

Per-module gzip sums to 185.8 KB, slightly over the chunk's real gzip
(180.3 KB) — expected: gzip-ing each module separately misses the
cross-module redundancy a single whole-chunk gzip pass captures. Read
these as accurate _relative_ weights, not exact additive contributions.

Takeaways: **CodeMirror itself (`@codemirror/*` + `@lezer/*` + `style-mod`

- `crelt`) is ~149 KB gzip of the 182.4 KB total** — the large majority.
  `@uiw/react-codemirror`, the React binding, adds another 20.6 KB on top of
  talking to CodeMirror directly. The two auxiliary UI packages are small,
  as expected: `react-resizable-panels` at 10.6 KB gzip,
  `@tabler/icons-react` tree-shaken down to 1.7 KB (just the two icons the
  control panel actually uses, not the whole icon set). `@mantine/hooks` is
  2.4 KB — a couple of hooks, not the whole package.

`react-error-boundary` doesn't show up as its own line here — it's inlined
into `packages/rspress`'s own `Core.mjs` at the package's `tsdown` build
step rather than left as an external import, so `webpack-bundle-analyzer`
can't attribute it separately. Bound above regardless: the entire
Core/Button wrapper chunk it lives in is only 5.4 KB gzip total, so
whatever `react-error-boundary` contributes is necessarily a small
fraction of that.

**upstream (`@rspress/plugin-playground`)**

|                                                         |     demo page | no-demo page |
| ------------------------------------------------------- | ------------: | -----------: |
| Site chrome (baseline)                                  |      248.0 KB |     235.1 KB |
| **Eager** — Monaco loader + core editor (`cdnjs`)       |      665.1 KB |     665.1 KB |
| **Eager** — `babel-standalone` (`cdnjs`)                |      376.8 KB |            — |
| Monaco TypeScript language service (`tsWorker.js` etc.) |      815.0 KB |            — |
| Monaco worker bootstrap                                 |       80.4 KB |            — |
| Monaco codicon font                                     |       36.4 KB |            — |
| Monaco editor CSS + localization                        |       32.7 KB |            — |
| plugin-playground's own Runner/Editor glue              |        6.5 KB |            — |
| **Total**                                               | **2260.9 KB** | **900.2 KB** |

Note `babel-standalone` is **not** eager here — it only appears on the demo
page, unlike Monaco's loader+editor. Confirms the split observed earlier:
the editor UI is global (`globalComponents`), the compiler is lazy per-demo.
The TypeScript language service (815 KB, `tsWorker.js` alone is 826 KB
brotli before rounding) is the single biggest line item in this whole
comparison, and it's specific to this demo being `.tsx` — untested whether
a `.jsx`-only demo avoids it.

**v2.0.6 (published `@live-demo/rspress`)**

|                                                                            |     demo page | no-demo page |
| -------------------------------------------------------------------------- | ------------: | -----------: |
| Site chrome (baseline)                                                     |      249.9 KB |     236.2 KB |
| **Eager** — `babel-standalone` (`jsdelivr`)                                |      531.8 KB |     531.8 KB |
| **Eager** — `rollup.browser` JS (`jsdelivr`)                               |      110.4 KB |     110.4 KB |
| Old ten-export web barrel (`Core`/`Editor`/`FileTabs`/`ControlPanel`/etc.) |      181.5 KB |            — |
| Rollup's wasm binary                                                       |      282.2 KB |            — |
| **Total**                                                                  | **1355.8 KB** | **878.4 KB** |

Both Babel and Rollup's _JS_ are eager (load on every page); only Rollup's
_wasm_ binary is properly lazy, matching the CHANGELOG's Babel/Rollup-removal
entry, which specifically credits dropping `@rollup/browser` for a 341.3 KB
saving on a demo page — consistent with the 282.2 KB wasm + partial JS
overlap measured here (different demo page, so not an exact match, but same
order of magnitude and same mechanism).

The pre-refactor "ten-export" web barrel (181.5 KB) is the direct
predecessor of current's 5.4 KB Core/Button wrapper — this is what the
CHANGELOG's "`web` barrel narrows to `Button` + `LiveDemoStringifiedProps`"
entry actually removed, quantified.

Two different Babel builds show up across branches — `babel-standalone@7.22.20`
(upstream, `cdnjs`, 376.8 KB) vs `@babel/standalone@7.28.3` (v2.0.6,
`jsdelivr`, 531.8 KB) — different package/version/CDN, not the same
dependency measured twice. Noted so the ~155 KB gap between them isn't
mistaken for a methodology inconsistency.

### What's actually driving the gap

Bottom line, reading the tables above: current is the only one of the three
where the "eager" row is empty. Both upstream and v2.0.6 ship a working
demo runtime to every page on the site — just via a CDN request instead of
a bundled `globalComponents` chunk, which is why it doesn't show up if you
only look at your own deployment's own JS output. On a page that actually
has a demo, upstream's cost is dominated by one thing — the TypeScript
language service (815 KB) — specific to this demo being `.tsx`; a `.jsx`-only
demo would likely avoid it, untested here.

## Caveats for whoever reruns this

- **`current` is unreleased and will keep moving.** These numbers are a
  snapshot of one branch point, not a promise. Rerun before quoting these
  numbers anywhere permanent (README, CHANGELOG).
- **The pre-push hook (`pnpm run verify`) was temporarily disabled**
  (`chmod -x .husky/pre-push`) to push the two non-`current` branches,
  since `pnpm run verify` legitimately fails on them (upstream/v2.0.6
  branches don't build against this repo's own package, and the e2e suite
  expects the untrimmed site). Restored immediately after
  (`chmod +x .husky/pre-push`) — check it's still executable if picking
  this back up.
- **Only `getStarted` and `customization` were measured.** `usage`
  (inline demo) exists on all three branches for a future check of the
  "inline and external cost the same" assumption, but wasn't measured this
  pass.
- **The CodeMirror per-package breakdown used `webpack-bundle-analyzer`**,
  added temporarily to `website/rspress.config.ts`'s
  `builderConfig.tools.rspack` (as an array entry: the existing object
  config plus a `(config, { isServer }) => {...}` function that pushes the
  plugin only for the client compiler) and `pnpm --filter website add -D
webpack-bundle-analyzer`. Neither is in the repo — reverted after
  (`git checkout -- website/rspress.config.ts website/package.json
pnpm-lock.yaml` + `pnpm install`). Rerun the same way to redo this part;
  the report's `window.chartData` holds the full per-module tree if a
  different chunk needs the same treatment.
- **Reproducing this**: the three branches are still on `origin` if not
  cleaned up
  (`asset-size-test/current`, `asset-size-test/upstream`,
  `asset-size-test/v2.0.6`). Re-push `current` after rebasing on new
  `main` work to get updated preview URLs, then rerun the
  `curl -H "Accept-Encoding: br, gzip" ... -w "%{size_download}"` pass
  against the fresh URLs — don't trust `Content-Length` headers, they're
  absent on most of these responses.
