# How to measure reader payload

The procedure behind [ADR 0004](./decisions/0004-payload-ranking-axis.md)'s
"measure, don't assert" rule. Follow this whenever a payload number is going to
reach `README.md`, `CHANGELOG.md`, or `docs/decisions/` — including re-checking
numbers already there, since `main` keeps moving and the published comparison
is the project's one falsifiable claim.

Durable by design: it survives each run, unlike the run write-ups in
`explorations/`. Last exercised 2026-08-02 —
[asset-size-comparison.md](./explorations/asset-size-comparison.md) is that
run's output and the worked example of everything below.

Budget: about half a day end to end, most of it in setup, not measurement.

## 1. Decide what you're comparing

Two shapes of question, and they need different rigs:

- **Did our own change help?** One deploy before, one after. Cheap. The
  2026-08-01 `@rspress/core/theme` measurement was this.
- **Are we lighter than the alternatives?** Three deploys, one per plugin.
  Expensive, and everything below is about getting it right.

For the three-way, `main`'s own production deploy is the current leg. Don't
build a fourth branch for it.

## 2. Build the comparison branches

This is where the time goes and where the comparison is won or lost.

**Branch each alternative off `main` independently**, so each diff reads
against `main` rather than against the previous branch.

**Do not trim the site.** Keep all pages and all prose byte-identical to
`main`. Site chrome — the search index, route manifest, nav tree, per-page
prose — is built from the whole page set, and a 3-page branch against a 9-page
`main` contaminates every absolute total. Change only the plugin wiring and the
minimum needed to make demos run. Specifically: **don't fix prose that becomes
inaccurate** on a branch (a page documenting our own features will be wrong on
the upstream branch — that's fine, it's a measurement rig, and editing it moves
bytes).

Pin `@rspress/core` to the same exact version on every leg. A caret range
re-resolves on a fresh install and shifts chrome bytes underneath you.

### Getting the published version, not the workspace

`packages/rspress/package.json`'s version often equals the published one you
want to compare against, in which case a plain range silently resolves to the
local unreleased source:

```jsonc
// website/package.json — WRONG, links the workspace
"@live-demo/rspress": "2.0.6"
// RIGHT, fetches the registry tarball
"@live-demo/rspress": "npm:@live-demo/rspress@2.0.6"
```

Verify before trusting anything: read the installed package's `exports` map and
confirm it lacks a subpath the local source has.

### Reading an alternative plugin's actual behavior

There's no vendored copy of upstream in this repo. Install the version and read
its `dist/` — for `@rspress/plugin-playground` that's `dist/cli/index.js` (the
plugin: remark transform, `routeGenerated` scan, `builderConfig`) and
`static/global-components/Playground.tsx` (the rendered component). Twenty
minutes there tells you what adaptations the branch needs and, more usefully,
_why_ the numbers come out how they do. `pnpm` nests real paths under
`node_modules/.pnpm/`; `website/node_modules/<pkg>` is a symlink.

### Adaptations, and the honesty rule

Each adaptation is a place a reader can question whether the comparison was
rigged in this plugin's favor. **Record every one in the branch's commit
message and in the write-up's setup section**, and for anything that inflates
the alternative's numbers, say explicitly why there was no alternative.

Worked example, from the 2026-08-02 run: upstream's `routeGenerated` scan
can't see a `file=` fence's imports, so `include: [...]` had to be added by
hand, which is exactly what puts three.js in its union chunk. State the
mechanism, then confirm it independently on a page whose externals came only
from upstream's own scan.

**Find that independent confirmation.** Any adaptation carrying a fairness
objection needs one page in the set where the objection doesn't apply and the
effect still shows.

### Pushing the branches

A comparison branch won't pass `pnpm run verify` — it doesn't build against
this repo's own package and the e2e suite expects this plugin's markup. Ask user to push with `git push --no-verify`; don't disable the husky hook, there's nothing to
restore afterwards that way.

Keep the branches on `origin` when the run is done. Rerunning against a newer
`main` is a rebase and a re-push, which mints fresh preview URLs — much cheaper
than rebuilding the rig.

## 3. Choose the page set

Four pages, minimum. Each answers a different question, and dropping any of
them collapses a distinct finding:

| page                               | answers                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| no demo at all                     | the eager tax — ADR 0004's invariant                        |
| demo importing one trivial package | with the row below: does a page pay for other pages' demos? |
| demo importing something heavy     | as above, and it's the only page where we're not far ahead  |
| a page with a below-the-fold demo  | the viewport gate                                           |

**The cheap-demo/heavy-demo pair is the centrepiece.** On this plugin those two
pages should differ by exactly the heavy demo's dependency graph; on a plugin
that statically imports the union of all externals they'll be the same size.
One page can't show that — the union of one demo is that demo.

## 4. Verify every demo before trusting a byte

Click each one. A page whose demo silently renders nothing still produces a
plausible total, and the hand-made adaptations from step 2 are exactly the kind
of thing that breaks a demo quietly. Confirm state actually changes: a counter
increments, a canvas gets a `data-engine` attribute, a QR code renders at its
declared size.

## 5. Measure

**One isolated browser context per (deploy × page).** Every request is then a
cold fetch. Without this, the second page of a session inherits the first's
cache and reads as nearly free.

Load the page, wait for the demo to settle (6–12s; three.js is the slow one),
then run this in the page:

```js
() => {
  const kind = (u, t) => {
    if (t === "document") return "doc";
    if (/\.wasm(\?|$)/.test(u)) return "wasm";
    if (/\.js(\?|$)/.test(u) || t === "script") return "js";
    if (/\.css(\?|$)/.test(u)) return "css";
    if (/\.(ttf|woff2?|otf)(\?|$)/.test(u)) return "font";
    if (/\.(png|svg|jpe?g|webp|gif|ico)(\?|$)/.test(u)) return "img";
    if (/\.json(\?|$)/.test(u)) return "json";
    return "other";
  };
  const nav = performance.getEntriesByType("navigation")[0];
  const rows = nav ? [{ u: location.href, k: "doc", tr: nav.transferSize }] : [];
  for (const r of performance.getEntriesByType("resource")) {
    rows.push({ u: r.name, k: kind(r.name, r.initiatorType), tr: r.transferSize });
  }
  const byKind = {};
  const byOrigin = {};
  for (const r of rows) {
    byKind[r.k] = (byKind[r.k] || 0) + r.tr;
    const o = /cdnjs|jsdelivr|unpkg/.test(r.u) ? "cdn" : "own";
    byOrigin[o] = (byOrigin[o] || 0) + r.tr;
  }
  return {
    page: location.pathname,
    n: rows.length,
    total: rows.reduce((a, b) => a + b.tr, 0),
    byKind,
    byOrigin,
    rows: rows.sort((a, b) => b.tr - a.tr).map((r) => [r.u.replace(/^https?:\/\/[^/]+/, ""), r.tr]),
  };
};
```

`transferSize` is real bytes off the wire for that load: compression included,
cache hits as 0, cross-origin included (both CDNs used here send
`timing-allow-origin: *`). It carries a flat **+300 B per request** of header
allowance — subtract `300 × n` for body-only bytes. That allowance was
cross-checked in the 2026-08-02 run against
`curl -H "Accept-Encoding: br, gzip" -w "%{size_download}"` on the same URLs:
`transferSize − 300` matched curl's body count exactly on four of five samples
across Cloudflare and both CDNs, the fifth off by 32 B (0.02%, unexplained).
`byKind` gives the JS-only subtotal for free, which is usually the number worth
leading with.

### Two gaps to close by hand

**Worker-initiated fetches don't appear.** Resource timing only sees the main
thread. Monaco pulls `workerMain.js`, `simpleWorker.nls.js` and `tsWorker.js`
(800+ KB) from inside workers, and its codicon font doesn't show either. Get
the full request list from the browser's network panel, diff it against
`rows`, and curl whatever's missing:

```sh
curl -s -o /dev/null -H 'Accept-Encoding: br, gzip' -w '%{size_download}' "$URL"
curl -sI -H 'Accept-Encoding: br, gzip' "$URL" | grep -i content-encoding
```

Read the size off `%{size_download}`, not `Content-Length` — the header is
absent on most of these responses.

Add +300 each to keep the basis uniform. A URL fetched by two workers is one
cache-hit away from being counted twice — check `cache-control` and count it
once if it's `immutable`, saying so in the write-up.

**Confirm brotli on every origin, every run.** `content-encoding: br`, own
origin and each CDN. Don't inherit it from a previous run; it's third-party
behavior. Mixing a brotli CDN figure with a gzip own-origin figure inside one
total is worse than reporting nothing.

**Never use `rspress preview` for a published number.** It serves gzip. Fine
for a quick relative check, useless for anything comparative.

## 6. Attribute the chunks

Filenames are content hashes. Fetch each uncompressed (no `Accept-Encoding`
header — this also gives you the raw size) and grep for a distinguishing
string:

| looking for                  | grep                                  |
| ---------------------------- | ------------------------------------- |
| Sucrase                      | `jsxPragma`                           |
| CodeMirror                   | `cm-content`, `CodeMirror`            |
| three.js family              | `THREE`, `useFrame`, `EffectComposer` |
| Shiki runtime                | `createOnigScanner`, `codeToTokens`   |
| `@rspress/core/theme` barrel | `rp-prompt`, `rp-llms`, `PageTabs`    |

Note `.shiki` **class names** appear in every build — compile-time
highlighting emits that markup. Only `createOnigScanner` / `codeToTokens`
indicate the runtime highlighter.

`grep -c` counts matching _lines_, and minified bundles are one line. Use
`grep -o … | wc -l` for occurrences, and read the context of any surprising
hit before drawing a conclusion from it: `main`'s eager chunk matches
`live-demo` twice, both inside flexsearch's worker URL, which has the CI
checkout path baked in. That looked like a violated invariant and wasn't.

For a per-package breakdown inside one chunk, wire `webpack-bundle-analyzer`
temporarily into `website/rspress.config.ts`'s `builderConfig.tools.rspack` (an
array entry, gated on `!isServer`) and parse the report's `chartData`. Revert
it afterwards; it's never committed. Those figures are gzip, deploy totals are
brotli — never put the two in one sentence.

## 7. Interpret

Three checks that matter more than the totals:

1. **Is the eager row zero?** Diff the no-demo page's request list against
   `main`'s. Anything plugin-shaped there is an architectural regression per
   ADR 0004, not a tradeoff.
2. **Does the cheap-demo page pull the heavy demo's dependencies?** If the two
   demo pages are within a few KB of each other, externals are being imported
   statically as a union.
3. **Does the below-the-fold demo cost anything before scrolling?** Then
   scroll and diff. The delta should be that demo's own imports and nothing
   else.

Ratios travel better than absolutes, since absolutes go stale with every
`main` commit while the shape of the difference persists.

## 8. Write it up

- **Run write-up** → `docs/explorations/`. What was deployed, what had to be
  adapted, the numbers, and the caveats that don't generalize past this run.
  **Not the method** — that's this file, and the write-up should link here
  instead of restating why isolated contexts or brotli or the untrimmed site
  matter. The test for a paragraph: is it needed to _read a number in the
  write-up_ (keep, stated flatly), or to _run the next measurement_ (it belongs
  here), or neither (delete). Supersede the previous run's file rather than
  appending to it; keep any section the new run didn't re-measure, marked as
  such.
- **Headline figures** → `README.md` / `CHANGELOG.md`, with the deploy basis
  named.
- **A rule that constrains future work** → an ADR.

Anything the run learned about the _method_ — a new trap, a correction to the
`transferSize` basis, a branch-pushing detail — gets folded back into this file
in the same pass, or the next run rediscovers it.

State the basis every time. Body bytes and `transferSize` differ by 300 B per
request, and older figures in this repo predate the isolated-context change
that put the favicon in every row. **If two numbers for the same page appear
in one file on different bases, say so where the reader hits them** — and if
one saving is a component of another, say that too, or it gets double-counted.

Finally: re-derive the old numbers you're replacing. The 2026-08-02 run found
the CHANGELOG's Babel figures matched no artifact reachable today, which is
only visible if you try to reproduce them rather than assuming a stale number
is merely stale.

## Traps, in one list

- Trimming the comparison site while `main` stays whole.
- A caret-ranged `@rspress/core` re-resolving between legs.
- A published-version range resolving to the workspace package.
- Sharing one browser session across pages, so cache makes pages look free.
- Missing worker-initiated requests entirely.
- Comparing a gzip local preview against a brotli deploy.
- Trusting `Content-Length`; it's absent on most of these responses.
- `grep -c` on a minified bundle.
- Quoting emitted-but-never-fetched build output as reader cost.
- Summing per-module gzip figures as if additive — gzip misses cross-module
  redundancy, so the sum overshoots the chunk.
