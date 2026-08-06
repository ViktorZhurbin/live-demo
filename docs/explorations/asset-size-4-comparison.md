# Reader payload: v3 vs. v2 vs. plugin-playground

## Terms

- **v3** — this plugin, current release (`@live-demo/rspress@3.0.1`)
- **v2.0.6** — this plugin's last release before the v3 rewrite (`@live-demo/rspress@2.0.6`)
- **plugin-playground** — `@rspress/plugin-playground@2.0.18`, the official plugin this project initially forked from

## Runtime cost

Size in kB:

|                  |        v3 | plugin-playground |      v2.0.6 |
| ---------------- | --------: | ----------------: | ----------: |
| editor           |     192.6 |             762.4 |      ~192.6 |
| editor's workers |         — |             909.2 |           — |
| compiler         |      48.4 |             386.2 |       947.4 |
| **total**        | **241.0** |        **2057.8** | **~1140.0** |

On a page with no demo, v3 ships nothing at all; the other two still ship part of their stack unconditionally. Measured on real Cloudflare Workers deploys of the same site, same pages, three plugins.

## What loads, and when

**Confirmed present even on a page with no demo**

|                                                      | plugin-playground |   v2.0.6 |  v3 |
| ---------------------------------------------------- | ----------------: | -------: | --: |
| Monaco editor shell (`editor.main.js` + `loader.js`) |          681.6 kB |        — |   — |
| Babel + Rollup JS (compiler)                         |                 — | 658.2 kB |   — |
| `@rspress/core/theme` barrel pulled into site chrome |                 — |  58.3 kB |   — |

v3 on a no-demo page ships zero kB.

v2.0.6 defaulted to `@rspress/core/theme`, which cost an extra 58.3 kB —
Shiki's _runtime_ highlighter, dragged in even though the page's code blocks
were highlighted at build time.

**Confirmed absent from the no-demo page — only fetched once a demo is
actually on the page:**

|                          |                  v3 |          plugin-playground |                       v2.0.6 |
| ------------------------ | ------------------: | -------------------------: | ---------------------------: |
| editor (rest of it)      | CodeMirror 192.6 kB | Monaco extras 80.8 kB more | bundled with the union chunk |
| editor's workers         |                   — |                   909.2 kB |                            — |
| compiler                 |     Sucrase 48.4 kB |             Babel 386.2 kB |         Rollup wasm 289.2 kB |
| union of all demos' deps |  0 — per-demo chunk |                   935.1 kB |                    1128.3 kB |

v3 goes a step further than "a demo exists on the page": it gates on the demo
actually scrolling into view (per-page totals, below). plugin-playground's
Babel likewise stays off the no-demo page — its no-demo `cdn` total is
exactly `loader.js` + `editor.main.js`, confirmed by direct sum. v2.0.6's
Babel is the opposite: eager, per the table above.

**v2.0.6's editor isn't a separate chunk.** Its bundler puts CodeMirror inside
the same chunk as the externals union (that 1128.3 kB chunk greps both
`cm-content` and `THREE`), so there's no clean line between editor cost and
other demos' dependencies on this leg — why its Runtime-cost cell above is
estimated rather than read off the deploy.

**What this run didn't establish**, so the next reader doesn't assume it was:

- Whether plugin-playground's Monaco shell actually instantiates on a
  no-demo page. No worker or `nls`/`tsMode` file loads there, consistent with
  "loaded but not instantiated," not proof. A DOM check for `.monaco-editor`
  would confirm it.
- Which packages make up the 935.1 kB / 1128.3 kB union chunks beyond three.js
  and CodeMirror. They're greps, not a per-package breakdown; the rsdoctor
  pass above was scoped to CodeMirror only and wasn't extended to the rest
  of either union chunk.
- Whether plugin-playground's and v2.0.6's own demo code is separable from
  their union chunks. It isn't; those cells read "not separable" rather than
  a number.
- Any figure for `@live-demo/rspress@3.0.0`. Only 3.0.1 was measured.

## Per-page totals

A different question than the runtime-cost table above: not "what does the
plugin's own tooling weigh," but "what does a reader on _this_ site actually
pay" — which, for the two alternatives, depends on what else is on the site,
not just on the page they're looking at. Plugin payload only: the 196.3 kB
Rspress baseline (v3's own no-demo page, the only leg confirmed to ship zero
plugin bytes) is netted out of every cell.

| page                            |                    v3 | plugin-playground |    v2.0.6 |
| ------------------------------- | --------------------: | ----------------: | --------: |
| no demo                         |              **0 kB** |          678.5 kB |  716.4 kB |
| one demo importing only `react` |          **251.1 kB** |         2992.9 kB | 2138.2 kB |
| + a second demo below the fold  | **+6.7 kB** on scroll |                +0 |        +0 |

plugin-playground's site chrome runs ~3.1 kB lighter than the baseline leg's
(smaller stylesheet, smaller entry chunk), so its 681.6 kB Monaco shell nets
to 678.5 kB. v2.0.6's row needs no such adjustment: 658.2 + 58.3 = 716.4
directly.

Breaking the React-demo row down:

|                                        |        v3 | plugin-playground |         v2.0.6 |
| -------------------------------------- | --------: | ----------------: | -------------: |
| editor                                 |     192.6 |             762.4 | in union chunk |
| editor's workers                       |         — |             909.2 |              — |
| compiler                               |      48.4 |             386.2 |          947.4 |
| union chunk / other demos' deps        |         0 |             935.1 |         1128.3 |
| this demo's own code                   |       6.6 |     not separable |  not separable |
| theme-barrel cost (above)              |         — |                 — |           53.9 |
| chrome + prose delta vs. baseline page |       3.4 |               0.0 |            8.6 |
| **total**                              | **251.1** |        **2992.9** |     **2138.2** |

**No total in this table is purely plugin bytes — why the runtime-cost table
above is the headline, not this one.** The netted-out baseline is the
`limitations` page (no demo); the measured page is `getStarted`, whose HTML
and search-index entry run ~3.4 kB heavier, a difference sitting inside every
leg's total here. More importantly, plugin-playground's and v2.0.6's 935.1 kB
and 1128.3 kB are the site-wide externals union, which scales with what
_other_ pages import — swap the three.js demo out elsewhere on the site and
these totals drop with nothing about the plugin itself changing. v3's genuine
plugin payload on this page is 247.7 kB (CodeMirror + Sucrase + demo chunks),
close to but not identical to the runtime-only 241.0 kB — the 6.6 kB gap is
this demo's own code.

## Two things the totals don't explain

**The no-demo row's split matters more than its size.** v3 ships nothing
there. plugin-playground ships its editor shell (Monaco) but neither its
compiler nor its workers — those only load once a demo is on the page.
v2.0.6 ships its full JS compiler (Babel + Rollup) unconditionally, on every
page, demo or not; only Rollup's wasm binary waits for a demo.

**On the alternatives, one demo page pays for every demo on the site.** On
plugin-playground and v2.0.6, a page whose demo imports only `react` fetches
the exact same content-hashed chunk as this site's three.js-demo page —
confirmed by filename, and that chunk greps `THREE` ×144. The `usage` page
(two inline demos importing only `react` and `qrcode.react`) fetches that
same chunk too. Both plugins bundle the union of every external used
anywhere on the site into every demo page; v3 doesn't — each page pays only
for what its own demo imports. It's a real, measured property of their
bundling strategy, but it means their per-page totals are partly a statement
about this site's content, not just about the plugin — the reason the
runtime-cost table above is designed to sidestep it. (The three.js page's
own totals are evidence for the union claim, not headline figures — few
readers put something like three.js in a demo: 2987.8 kB plugin-playground,
2133.0 kB v2.0.6, 1179.1 kB v3.)

## Basis

Real Cloudflare Workers deploys, `transferSize` (compressed, real network
bytes) plus directly-curled sizes for the four assets resource timing can't
see. **Compression is not uniform:** the three deploy origins serve `zstd`,
while cdnjs (plugin-playground's Monaco and Babel) and jsDelivr (v2.0.6's
Babel and Rollup) serve `br`. All are real wire bytes, so totals stay valid
— don't call the run "brotli" or "zstd".

Every cell is a single page load. Repeat loads of the same asset landed within
tens of bytes of each other, so the figures here are reproducible to well under
0.1%.

Monaco's `workerMain.js` and `simpleWorker.nls.js` are each requested twice
(two workers race, both 200). They're `immutable`, so they're counted once —
that understates plugin-playground by 83.0 kB if a real reader pays both.

The v2.0.6 CodeMirror estimate used `@rsdoctor/rspack-plugin`, wired
temporarily into `website/rspress.config.ts`'s `builderConfig.tools.rspack`
(function form, gated on `!isServer`, same slot the method file's "Attribute
the chunks" section already documents for `webpack-bundle-analyzer`) — not
committed, reverted after. Its `moduleGraph` output lands as base64+zlib-compressed JSON per
build (`.rsdoctor/.rsdoctor/moduleGraph/0`; decode with
`zlib.decompress(base64.b64decode(raw))`), one entry per module _per chunk_
it appears in — a module split across two independent chunks (as CodeMirror
is here, once per demo page in v3's per-page-chunk design) appears twice
with identical sizes. Dedupe by file path before comparing, or a same-site
duplicate reads as a mismatch that isn't one.

Full method, reproduction steps, and the three.js measurement:
[`measuring-payload.md`](../measuring-payload.md).
