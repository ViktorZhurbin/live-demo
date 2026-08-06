# How to measure reader payload

The procedure behind [ADR 0004](./decisions/0004-payload-ranking-axis.md)'s
"measure, don't assert" rule. Follow this whenever a payload number is going to
reach `README.md`, `CHANGELOG.md`, or `docs/decisions/` — including re-checking
numbers already there, since `main` keeps moving and the published comparison
is the project's one falsifiable claim.

This file persists across runs; write-ups in `explorations/` don't. Last
exercised 2026-08-06 (`asset-size-4`).

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
plugin-playground branch. Leave it; editing it moves bytes.

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

There may be no vendored copy of plugin-playground in this repo. Check `.claude/source-code/` first - if it's not there, install the version and read
its `dist/` — for `@rspress/plugin-playground` that's `dist/cli/index.js` (the
plugin: remark transform, `routeGenerated` scan, `builderConfig`) and
`static/global-components/Playground.tsx` (the rendered component). `pnpm`
nests real paths under `node_modules/.pnpm/`; `website/node_modules/<pkg>` is
a symlink.

### Adaptations, and the honesty rule

Each adaptation is a place a reader can question whether the comparison was
rigged in this plugin's favor. **Record every one in the branch's commit
message and in the write-up's setup section**, and for anything that inflates
the alternative's numbers, say explicitly why there was no alternative.

Worked example, from the 2026-08-02 run: plugin-playground's `routeGenerated`
scan can't see a `file=` fence's imports, so `include: [...]` had to be added by
hand — that's what puts three.js in its union chunk. State the mechanism, then
confirm it on a page whose externals came only from plugin-playground's own
scan, with no `include` involved. **Every adaptation carrying a fairness objection needs
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

| page                               | answers                                                                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no demo at all                     | the eager tax — ADR 0004's invariant                                                                                                                                                |
| demo importing one trivial package | with the row below: does a page pay for other pages' demos?                                                                                                                         |
| demo importing something heavy     | proves the union claim; not a headline figure — few readers put something like three.js in a demo, so this page's totals don't belong in the write-up's headline or its ratio table |
| a page with a below-the-fold demo  | the viewport gate                                                                                                                                                                   |

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

**Assert on a property only the demo's own output can produce** — the QR's
`viewBox="0 0 29 29"`, the canvas's `data-engine` — not a selector like
`[data-testid="…"] svg`, which matches the first SVG in the container (an
editor toolbar icon on this plugin's legs). The asset-size-4 run read
`width="24"` against a demo declaring `size={128}` on two of three legs
before catching it. When a check fails, dump every candidate: the failure is
as likely in the selector as in the demo.

## 5. Measure

**One isolated browser context per (deploy × page).** Every request is then a
cold fetch. Without this, the second page of a session inherits the first's
cache and reads as nearly free.

If driving the browser via the Playwright MCP tools, the ordinary navigate/tab
tools share one browser profile — cache and all — across every call, which
defeats isolation silently. `browser_run_code_unsafe` gets around this: it
hands you the live `page` object, so `page.context().browser().newContext()`
gives a genuinely fresh, cold context per (deploy × page), and
`context.newCDPSession()` on the page created from it gives a `Network`
domain listener that sees requests resource timing can't (§ below). Close the
context after each page; a leaked context is a leaked cold-cache guarantee
for whatever runs next.

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

**Figures in this repo are kB — bytes ÷ 1000, not ÷ 1024.** A 1,583,696 B chunk
is 1583.7 kB. This matches what Chrome DevTools reports, so a reader checking a
published claim against their own network panel sees the same number instead of
one 2.4% off. Write `kB`, not `KB` or `KiB`, and convert with a script rather
than by eye — both readings look plausible in a table and neither is
recoverable from a rounded figure later.

### Two gaps to close by hand

**Worker-initiated fetches don't appear.** Resource timing only sees the main
thread. Monaco pulls `workerMain.js`, `simpleWorker.nls.js` and `tsWorker.js`
(900+ kB) from inside workers, and its codicon font doesn't show either.
Confirmed twice now, in the 2026-08-02 and asset-size-4 runs.

**Get that list with a context-level request listener, not a page-level CDP
session.** `context.on("request", ...)` reports worker-initiated requests. A
CDP `Network.enable` on the _page_ session doesn't — dedicated workers are
separate targets, requiring their own `Target.setAutoAttach` wiring. A
page-level session's silence is not evidence of absence: the asset-size-4
run used the page-session approach, saw no worker URLs, and understated
plugin-playground by 946.8 kB before catching it. Cross-check any "the gap
closed" result against `context.on("request")` or the network panel.

**Diff against the union of every snapshot taken on that page, not the first
one.** If the page has a scroll-triggered fetch (the below-the-fold check),
diffing the request list against a stale pre-scroll snapshot manufactures a
fake gap for whatever the scroll itself fetched.

Then curl whatever's genuinely missing:

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

**Confirm the compression algorithm on every origin, every run — and check
each origin separately.** `content-encoding`, own origin _and each CDN_.
Don't inherit it from a previous run; it's third-party behavior and it
changes: the 2026-08-02 run measured brotli everywhere, asset-size-4 found
the deploy origins on `zstd` (Cloudflare now prefers it when Chrome
advertises support) while cdnjs still served `br`. `transferSize` is real
wire bytes whichever algorithm produced them, so a mixed run's totals stay
valid — but say so, and don't summarise a run as "brotli" or "zstd" from one
origin's header. Do keep curl's `Accept-Encoding` list matched to what the
browser sent, or a hand-curled figure lands on a different algorithm than the
`transferSize` it's being added to.

**Test eagerness per component, not per leg.** "Does this plugin load its
editor/compiler on every page?" is really several separate questions — one
per piece of the stack — and they can have different answers. The
2026-08-02 run found plugin-playground's editor shell (`editor.main.js` +
`loader.js`) present on a no-demo page while its compiler and worker-fetched
extras were absent from that same page, and v2's compiler was present on a
no-demo page while its editor's presence there was never checked. Diff the
no-demo page's request list against each named component individually;
don't infer one component's load timing from another's, and don't infer a
whole leg is "eager" or "lazy" from a single component that happened to get
checked.

**A wasm-based compiler needs its wasm binary checked separately.** Rollup,
esbuild-wasm, and swc-wasm can ship a JS entry that's cheap and a wasm
binary that's not, and the two can load at different times — the JS entry
eagerly, the wasm binary only once a bundle actually runs. Curling the
no-demo page catches only what's eager; confirm the wasm binary's load
timing the same way §5 confirms Monaco's worker gap, with a network-panel
diff on a page that has a demo.

**Reconcile a page-total-minus-chrome figure against directly curled
components before publishing both.** They describe the same bytes two
ways, and if they don't agree within a couple of kB, something in the rig
is unaccounted for — don't pick whichever number is more convenient. Say
the gap out loud and what's not yet attributed, rather than let the two
silently disagree in the same document.

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
`grep -o … | wc -l` for occurrences. **Re-derive an occurrence count rather
than carrying one forward** — the asset-size-4 write-up quoted `THREE` ×144
for a chunk that greps ×157, the same count the previous run recorded for the
same filename. A content hash that hasn't changed means the count can't have
either; a count that moved without the filename moving is a transcription
error, not a finding. Read the context of any surprising hit before drawing a
conclusion: `main`'s eager chunk matches `live-demo`
twice, both harmless — inside flexsearch's worker URL, which bakes in the CI
checkout path.

For a per-package breakdown inside one chunk, wire `webpack-bundle-analyzer`
temporarily into `website/rspress.config.ts`'s `builderConfig.tools.rspack` (an
array entry, gated on `!isServer`) and parse the report's `chartData`. Revert
it afterwards; it's never committed. Those figures are gzip, deploy totals are
brotli — never put the two in one sentence.

`@rsdoctor/rspack-plugin` is the rspack-native alternative (`tools.rspack` as
a function `(config, { isServer }) => {...}`, same gate, same never-committed
rule) and it's what to reach for when a component can't be isolated as its
own chunk on the leg you actually need it for — the asset-size-4 run used it
to estimate v2.0.6's CodeMirror weight, which ships bundled inside that leg's
externals union with no separate URL to curl. The technique: confirm the
lockfiles resolve the component's packages to the identical version on both
legs (not just a compatible range — the literal resolved version string),
then build both with rsdoctor and diff the component's modules by parsed
size. A match within a percent or so is noise, not a real difference, and
licenses using the _other_ leg's real deploy figure for the component as the
estimate — state it as estimated, not measured, everywhere it appears.

Read `.rsdoctor/.rsdoctor/moduleGraph/0` as `zlib.decompress(base64.b64decode(raw))`,
not as plain JSON. **Dedupe its `modules` array by file path before summing
anything.** A module gets one entry per _chunk_ it appears in, not per file
— on this plugin, where each demo gets its own chunk, a shared dependency
like CodeMirror shows up once per demo page with identical sizes. Summing
without deduping silently doubles (or triples) a component that's actually
one file loaded once per page.

## 7. Interpret

Three checks that matter more than the totals:

1. **Is the eager row zero?** Diff the no-demo page's request list against
   `main`'s. Anything plugin-shaped there is an architectural regression per
   ADR 0004, not a tradeoff.
2. **Does the cheap-demo page pull the heavy demo's dependencies?** If the two
   demo pages are within a few kB of each other, externals are being imported
   statically as a union.
3. **Does the below-the-fold demo cost anything before scrolling?** Then
   scroll and diff. The delta should be that demo's own imports and nothing
   else.

Ratios travel better than absolutes, since absolutes go stale with every
`main` commit while the shape of the difference persists.

**Demo-specific cost is the rig's self-check.** Demo page minus no-demo page,
per leg. It cancels the site chrome, so it survives `main` moving underneath:
across the `asset-size-2` and `asset-size-3` runs it held within 1.3 kB on all
three legs while absolutes shifted ~7 kB (a PNG→SVG favicon swap on `main`). If
it drifts more than a couple of kB between runs and no plugin version changed,
suspect the rig before believing the result.

**Know how small the real noise floor is, or you'll excuse an error as
variance.** A compressed response isn't byte-identical between edges, but the
spread is tens of bytes, not kB: across the asset-size-4 verification pass the
same content-hashed 935 kB chunk came back 40 B apart on two loads, and
`lib-react` varied by 62 B across four. So **a kB-scale disagreement between
two measurements of an artifact whose content hash didn't change is a
transcription or attribution error, not edge variance** — chase it. The
asset-size-4 write-up had three: a union chunk quoted 1.8 kB below its measured
transfer, and two three.js-page cells ~2 kB light.

The union-chunk one shows how that hides: its breakdown table still summed to
the right total, because the missing 1.8 kB had been absorbed into the
residual row. **Never close a breakdown by adjusting the residual.** A residual
is what you didn't attribute, so it can only be computed once, from measured
components — if it moves to make a column add up, the error is now invisible
and the table looks more trustworthy than it is.

## 8. Write it up

- **Run write-up** → `docs/explorations/`. Written for a reader of the
  plugin, not for whoever runs the next measurement — plain language, short.
  Use this skeleton; adapt section count to what the run actually found and
  don't pad a section that has nothing to say:

  1. **Title** — `Reader payload: <subject>`, e.g. "v3 vs. v2 vs.
     plugin-playground".
  2. **Terms** — one line per release/alternative naming its exact package
     and pinned version (see the bullet below on names).
  3. **Headline paragraph**, right under Terms — the plugin's own payload
     (not page total) on the two pages that matter most: no-demo and
     one-cheap-demo. Numbers first, two or three sentences, plus the
     measurement basis in one clause (e.g. "measured on real Cloudflare
     Pages deploys"). **If an alternative bundles a site-wide externals
     union** (§7's check 2 is how you'd know), its per-page total is partly
     a statement about what _other_ pages on this site import, not about the
     plugin — headline the runtime-only figure instead (editor + compiler,
     no externals; see the bullet below) and demote the per-page table to a
     supporting section that says why it isn't the headline. The
     asset-size-4 run is the worked example: v3 vs. plugin-playground's
     "react-only demo" page totals both include a slice of a three.js demo
     on a third page neither reader is looking at.
  4. **What loads, and when** — the eager-tax story, broken into three
     parts: what's confirmed present on the no-demo page per leg (a table),
     what's confirmed absent there but present once a demo loads (another
     table), and what wasn't established this run — a bulleted list, each
     item naming what would confirm it, since an unflagged gap gets
     silently assumed away by the next reader.
  5. **Results** — the page × leg total table (§3's page set, each cell
     net of that leg's own chrome per the rule below), immediately followed
     by the breakdown table the rule below requires: editor / compiler /
     other demos' dependencies / this demo's own code / residual.
  6. **Anything the totals don't explain** — one short paragraph per
     structural finding that doesn't fit a table cell (a shared-union
     chunk, a viewport gate). Cut this section on a run with nothing like
     that.
  7. **Basis** — one closing paragraph: deploy basis (real network,
     compression algorithm confirmed), and a link back to this file for
     method and reproduction steps. Nothing else belongs here.

  Content rules that apply within that skeleton:
  - Define terms once, near the top: which release is being compared
    (`v3`, `v2`, ...) and what the third-party alternative is called — name
    the package (`plugin-playground`), not a role (`upstream`, `the
official plugin`). Use those names consistently after that.
  - **Report the plugin's payload, not the page total.** A page total folds
    in Rspress's own chrome, which isn't any plugin's doing — quoting it
    makes a plugin that ships zero bytes look like it ships ~196 kB, and
    makes a ratio between two legs smaller than the thing being compared.
    Net out the no-demo page total of the leg proven to ship no plugin code,
    and say that's what you did.

    Two things that baseline is _not_, both of which the asset-size-4 run
    had to state explicitly rather than let ride: it isn't the same page as
    the one being measured, so the measured page's own prose and search-index
    entry (~3.4 kB here) sit inside every leg's "plugin payload" — identical
    across legs, so comparisons survive, but no single total is purely plugin
    bytes. And chrome isn't necessarily identical across legs: check each
    leg's own-origin chunks against the baseline leg's before assuming a
    difference is the plugin's. When it _is_ the plugin's — v2.0.6's 54 kB
    came from the plugin importing `@rspress/core/theme`, confirmed in the
    published tarball — that's a finding, not noise to net away.

  - **When an alternative bundles a site-wide externals union, prefer a
    runtime-only headline over a per-page one.** Sum just the editor and
    compiler — no externals, no other demos' dependencies, no site chrome —
    for each leg. This number is immune to two confounds a per-page total
    always carries: which page got netted out as the baseline (its own
    prose leaks into every total), and what _other_ demos exist on the
    site (their externals leak into a shared union chunk). A component that
    isn't its own chunk on some leg (§6's `@rsdoctor/rspack-plugin` note)
    still goes in this table — estimated, clearly marked as such — rather
    than being dropped because it can't be read off that leg's deploy
    directly. Keep the per-page table too; it's a real, separate finding
    about the union-bundling strategy itself, just not the headline.
  - Headline the common case, not the extreme one. If one test page exists
    only to prove a structural claim (e.g. a three.js demo proving pages
    share a bundled union) and most readers won't hit that case, its numbers
    stay out of the headline and the ratio table — state them once, as
    evidence for the claim they support, and no more.
  - Show _why_ before showing totals: a short table of what each leg
    actually loads to run a demo — editor and compiler, **each with its
    measured kB** — before the results table. Naming the stack without sizes
    leaves the totals unexplained.
  - Break the results down, don't just total them. Every headline figure
    needs a companion table splitting it into editor / compiler / other
    demos' dependencies / this demo's own code. An unbroken four-digit kB
    figure is the failure mode this section exists to prevent. Where a
    component wasn't measured separately, fold it into a residual row and
    say so rather than estimating it.
  - Leave out anything that's about running the measurement rather than
    reading its result: commit SHAs, branch names, methodology rationale,
    caveats about the rig, previous-run deltas. That's this file's job —
    the write-up links here instead of restating it. The test for a
    paragraph: is it needed to _read a number in the write-up_ (keep,
    stated flatly), or to _run the next measurement_ (belongs here), or
    neither (delete).
  - Supersede the previous run's file rather than appending to it; keep any
    section the new run didn't re-measure, marked as such.

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
by ~7 kB, and naming it is what makes the rest of the drift meaningful.

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
- Dividing bytes by 1024 and labelling the result kB — the repo is kB (÷1000),
  matching DevTools. Figures written before 2026-08-02 were KiB under a `KB`
  label and were converted in one pass; don't reintroduce the mix.
- Comparing a gzip local preview against a brotli deploy.
- Trusting `Content-Length`; it's absent on most of these responses.
- `grep -c` on a minified bundle.
- Quoting emitted-but-never-fetched build output as reader cost.
- Summing per-module gzip figures as if additive — gzip misses cross-module
  redundancy, so the sum overshoots the chunk.
