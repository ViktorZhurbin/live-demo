# How to measure reader payload

The procedure behind [ADR 0004](./decisions/0004-payload-ranking-axis.md)'s
"measure, don't assert" rule. Follow this whenever a payload number is going to
reach `README.md`, `CHANGELOG.md`, or `docs/decisions/` — including re-checking
numbers already there, since `main` keeps moving and the published comparison
is the project's one falsifiable claim.

This file persists across runs; write-ups in `explorations/` don't. Last
exercised 2026-08-02 —
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

**Branch each alternative off `main` independently**, so each diff reads
against `main` rather than against the previous branch.

**Do not trim the site.** Keep all pages and all prose byte-identical to
`main`. Site chrome — the search index, route manifest, nav tree, per-page
prose — is built from the whole page set, and a 3-page branch against a 9-page
`main` contaminates every absolute total. Change only the plugin wiring and the
minimum needed to make demos run. **Don't fix prose that becomes inaccurate**
on a branch — a page documenting our own features will be wrong on the
upstream branch. Leave it; editing it moves bytes.

Pin `@rspress/core` to the same exact version on every leg. A caret range
re-resolves on a fresh install and shifts chrome bytes underneath you. An
alternative plugin's own peer range can still drag a newer core in around an
exact pin — after install, `pnpm why @rspress/core` in `website/` on each leg
must show exactly one version.

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
minutes there tells you what adaptations the branch needs and why the numbers
come out how they do. `pnpm` nests real paths under
`node_modules/.pnpm/`; `website/node_modules/<pkg>` is a symlink.

### Adaptations, and the honesty rule

Each adaptation is a place a reader can question whether the comparison was
rigged in this plugin's favor. **Record every one in the branch's commit
message and in the write-up's setup section**, and for anything that inflates
the alternative's numbers, say explicitly why there was no alternative.

Worked example, from the 2026-08-02 run: upstream's `routeGenerated` scan
can't see a `file=` fence's imports, so `include: [...]` had to be added by
hand — that's what puts three.js in its union chunk. State the mechanism, then
confirm it on a page whose externals came only from upstream's own scan, with
no `include` involved. **Every adaptation carrying a fairness objection needs
one page like that in the set** — where the objection doesn't apply and the
effect still shows.

Make that confirmation an artifact check, not a totals check: show the clean
page fetching **the same content-hashed chunk filename** as the page the
objection is about, then grep that chunk (§6) for the dependency in question.
Two pages having equal totals is circumstantial. A chunk that greps `THREE`
×157 while being fetched by a page importing only `react` and `qrcode.react`
is not.

### Pushing the branches

A comparison branch won't pass `pnpm run verify` — it doesn't build against
this repo's own package and the e2e suite expects this plugin's markup. Ask
user to push with `git push --no-verify`; don't disable the husky hook,
there's nothing to restore afterwards that way.

Keep the branches on `origin` under their numbered name (`asset-size-N/<leg>`)
when the run is done — write-ups reference branches by that name, so don't
rebase one in place on a later run.

### Rerunning against a newer main

Don't rebuild the rig by hand. Check whether the old branch is exactly one
commit past its merge-base:

```sh
git diff <merge-base>..<old-branch> --stat   # NOT git diff main <old-branch>
```

`git diff main <old-branch>` is misleading once `main` has moved: it diffs
against the branch's stale base, so everything `main` changed since shows up
as if the branch had rewritten it. Use the merge-base.

If it's one commit, cherry-pick it onto a fresh branch cut from current
`main`, bumping the numbered suffix (`asset-size-3/<leg>` follows
`asset-size-2/<leg>`):

```sh
git switch -c asset-size-N/<leg> main && git cherry-pick <old-branch-commit>
```

Conflicts land wherever `main` moved prose or config the branch also touched.
**Resolve every conflict by taking `main`'s side**, then reapply only the
adaptation's mechanical transform (`live`→`playground`, `file=`→`<code src>`,
etc). Taking the branch's side re-introduces stale prose — the same
contamination as trimming the site, just harder to spot.

After resolving, confirm parity before building: `git diff main..<new-branch>
-- website/docs/` should show only the recorded adaptations, and the built
page count should match `main`'s. Anything under `packages/rspress/src/**` or
an asset (favicon, icon) delta in that diff means a conflict resolved the
wrong way.

## 3. Choose the page set

Four pages, minimum. Each answers a different question, and dropping any of
them collapses a distinct finding:

| page                               | answers                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| no demo at all                     | the eager tax — ADR 0004's invariant                        |
| demo importing one trivial package | with the row below: does a page pay for other pages' demos? |
| demo importing something heavy     | as above, and it's the only page where we're not far ahead  |
| a page with a below-the-fold demo  | the viewport gate                                           |

**The cheap-demo/heavy-demo pair decides the question.** On this plugin those two
pages should differ by exactly the heavy demo's dependency graph; on a plugin
that statically imports the union of all externals they'll be the same size.
One page can't show that — the union of one demo is that demo.

### What a rerun can reuse

An alternative pinned to a published version has **structural** properties that
don't move between runs, and **absolute** byte counts that do — chrome comes
from `@rspress/core`, the page set and the prose, all of which follow `main`.

Re-measure every absolute that reaches a published table. Establish these once
per pinned version and cite them:

| property                               | established by                 | why it holds                           |
| -------------------------------------- | ------------------------------ | -------------------------------------- |
| neither alternative gates on viewport  | a scroll delta of 0            | neither has an `IntersectionObserver`  |
| the union chunk carries every external | grepping the chunk for `THREE` | the chunk is content-hashed and pinned |
| which URLs the worker gap misses       | one network-panel diff         | a property of Monaco's loader          |

The worker gap's _sizes_ still get re-curl'd — brotli is third-party behavior
and §5 says don't inherit it — but you don't have to rediscover _which_ URLs
are missing.

So on a rerun with both alternatives unchanged: the scroll pass on the
alternatives is two zeroes you already know, and the below-the-fold page on
whichever leg isn't carrying the fairness confirmation adds no byte information
its cheap-demo page doesn't. **Keep the demo verification on every cell
regardless** — that checks your rig, not the plugin, and the rig is new each
run.

## 4. Verify every demo — after snapshotting it, not before

Click each one. A page whose demo silently renders nothing still produces a
plausible total, and the hand-made adaptations from step 2 are exactly the kind
of thing that breaks a demo quietly. Confirm state actually changes: a counter
increments, a canvas gets a `data-engine` attribute, a QR code renders at its
declared size.

**Order matters inside a context.** Typing or clicking in an editor can trigger
a compile that fetches chunks a passive reader never requests. Take §5's
snapshot first, then interact. If verification then shows a dead demo, discard
those numbers and redo that page in a fresh context.

Reading a rendered attribute — `canvas[data-engine]`, an SVG's `height` — is
passive, so it can ride along inside the snapshot call itself.

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

**Figures in this repo are KiB — bytes ÷ 1024, not ÷ 1000.** A 1,583,696 B
chunk is 1546.6 KB, not 1583.7. Both readings look plausible in a table and the
÷1000 slip is easy to make and hard to catch later; convert with a script
rather than by eye.

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
once if it's `immutable`, saying so in the write-up. **Check the status codes
too.** In the 2026-08-02 runs both `workerMain.js` requests returned 200, not
304: two workers raced before either response was cached, so a real reader
plausibly paid it twice. Counting once stays the conservative choice — say that
it understates, and by how much.

`blob:` rows are locally-created worker bootstraps. Zero network bytes, exclude
them; they only distort a request count if you diff lists carelessly.

**Confirm brotli on every origin, every run.** `content-encoding: br`, own
origin and each CDN. Don't inherit it from a previous run; it's third-party
behavior. Don't mix a brotli CDN figure with a gzip own-origin figure in one
total.

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
hit before drawing a conclusion: `main`'s eager chunk matches `live-demo`
twice, both harmless — inside flexsearch's worker URL, which bakes in the CI
checkout path.

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

**Demo-specific cost is the rig's self-check.** Demo page minus no-demo page,
per leg. It cancels the site chrome, so it survives `main` moving underneath:
across the `asset-size-2` and `asset-size-3` runs it held within 1.3 KB on all
three legs while absolutes shifted ~7 KB (a PNG→SVG favicon swap on `main`). If
it drifts more than a couple of KB between runs and no plugin version changed,
suspect the rig before believing the result.

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

Name the run by **branch generation**, not only by date (`asset-size-3`, cut
from `main@<sha>`). Two runs can land on the same date; a reader holding two
files that both say "run of 2026-08-02" can't tell which numbers they have.

When absolutes move against the previous run, find the shared-chrome cause
before writing it off as noise — the 2026-08-02 favicon swap moved every cell
by ~7 KB, and naming it is what makes the rest of the drift meaningful.

State the basis every time. Body bytes and `transferSize` differ by 300 B per
request, and older figures in this repo predate the isolated-context change
that put the favicon in every row. **If two numbers for the same page appear
in one file on different bases, say so where the reader hits them** — and if
one saving is a component of another, say that too, or it gets double-counted.

Finally: re-derive the old numbers you're replacing, don't assume they're
merely stale. The 2026-08-02 run found the CHANGELOG's Babel figures matched
no artifact reachable today — only visible by trying to reproduce them.

## Traps, in one list

- Trimming the comparison site while `main` stays whole.
- A caret-ranged `@rspress/core` re-resolving between legs, or an exact pin
  drifting anyway via an alternative plugin's own peer range.
- A published-version range resolving to the workspace package.
- Diffing a stale comparison branch against current `main` instead of its
  merge-base — reads as the branch rewriting everything `main` since changed.
- Resolving a rebase/cherry-pick conflict by keeping the branch's stale prose
  instead of `main`'s.
- Sharing one browser session across pages, so cache makes pages look free.
- Interacting with a demo before snapshotting it, so a compile-triggered fetch
  lands in a number meant to describe a passive reader.
- Missing worker-initiated requests entirely.
- Counting `blob:` worker bootstraps as network bytes.
- Dividing bytes by 1000 and labelling the result KB.
- Comparing a gzip local preview against a brotli deploy.
- Trusting `Content-Length`; it's absent on most of these responses.
- `grep -c` on a minified bundle.
- Quoting emitted-but-never-fetched build output as reader cost.
- Summing per-module gzip figures as if additive — gzip misses cross-module
  redundancy, so the sum overshoots the chunk.
