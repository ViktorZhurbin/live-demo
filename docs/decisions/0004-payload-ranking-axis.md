# 0004. Reader payload is a ranking axis, and the eager row stays empty

- **Status:** Accepted, 2026-07-28. The invariant already holds; the ranking
  rule constrains future work.
- **Scope:** all of `packages/rspress`. A prioritization decision, one
  architectural invariant, and how to tell a real payload win from a
  plausible one.
- **Depends on:** [ADR 0003](./0003-scope-boundary.md) for what's in scope.
  This ADR only ranks things 0003 has already admitted.

## Context

Root `CLAUDE.md` says ~22 weekly downloads, no known users, and that
"users would want X" carries little weight. Payload is the exception:

1. It's the one claim the project actually makes — `README.md`'s
   "Improvements over `@rspress/plugin-playground`" section is mostly
   payload. A README claim has to be true or come out.
2. It's falsifiable. "Cleaner" and "simpler" are arguable forever; bytes on
   the wire aren't — the closest thing here to an external referee.
3. The measurement already exists and was expensive:
   `docs/explorations/asset-size-comparison.md` is real Cloudflare deploys,
   brotli end-to-end, three branches, every demo clicked before any number
   was trusted.

### What was measured

From `asset-size-comparison.md`, real transferred bytes, brotli:

|                                     |      current | `plugin-playground` | `@live-demo/rspress@2.0.6` |
| ----------------------------------- | -----------: | ------------------: | -------------------------: |
| Demo page, total                    | **481.4 KB** |           2260.8 KB |                  1355.7 KB |
| No-demo page, total                 | **234.8 KB** |            900.1 KB |                   878.3 KB |
| Demo-specific cost                  |     246.6 KB |           1360.7 KB |                   477.4 KB |
| Loads a runtime on demo-free pages? |       **No** |                 Yes |                        Yes |

~92% of the demo-specific cost is two dependencies — CodeMirror (182.4 KB)
and Sucrase (44.8 KB) — so payload work outside those two is rounding error.
"current" is also the only one of the three whose eager row is empty: both
alternatives ship a working demo runtime to every page via a CDN request
rather than a bundled chunk, invisible unless compared.

## Decision

### 1. Payload ranks alongside clarity, simplicity, and migration

Not a tiebreaker — a first-class axis alongside the others.

### 2. The eager invariant: a page with no demo loads zero plugin bytes

Currently true, and the project's largest differentiator (4× margin on the
no-demo row). **A change that puts plugin bytes on a demo-free page is an
architectural regression, not a tradeoff** — it's invisible from a demo
page's own numbers.

Held up by four mechanisms, treated as one invariant:

- per-page layout injection, not a global component (`createLayoutImportNode.ts`)
- the `React.lazy` boundary in `web/lazy.tsx`, which stops the consumer's
  bundler from scope-hoisting `Core` into a shared chunk
- `() => import(...)` thunks in the generated virtual module, so one page's
  externals aren't every page's
- the compiler loaded by dynamic `import()` at `loadCompiler.ts`

Changing any of them requires re-measuring, not reasoning. `web/lazy.tsx`'s
docblock covers the least obvious one (scope-hoisting).

### 3. A payload gate is worth only what the chunk boundary above it withholds

Deferring _when_ something runs saves nothing if the bundler already fetched
it. **Check the emitted chunk graph, not the component tree** — a gate's
value is decided by where the `import()` calls sit and how the bundler groups
what they pull in, which the source's nesting doesn't show.

Learned the expensive way: the viewport gate was first built inside `Core`,
where it deferred the compiler and a demo's externals but not the editor,
because rendering `<Core>` is what fires its `import()` and CodeMirror rides
in that same chunk group. Since `Core` mounted unconditionally, both chunks
were fetched on page load regardless. Moving the gate above the `React.lazy`
boundary in `web/lazy.tsx` withholds the editor as well — by the component
sizes above, the difference between deferring Sucrase alone and deferring
essentially the whole demo-specific cost. Same behavior, one boundary up.

Those two figures are read off the existing measurement, not a fresh deploy;
"Measure, don't assert" below is why no number from this paragraph belongs in
README or CHANGELOG until one is taken.

This is the eager invariant read forwards: the four mechanisms listed there
are all chunk boundaries, which is why changing any of them requires
re-measuring.

### 4. Measure, don't assert

- A payload claim needs a **real measurement on a real deploy** before it
  reaches README, CHANGELOG, or `docs/decisions/`. Local `rspress preview`
  serves gzip, not brotli — don't compare across the two.
  `asset-size-comparison.md`'s Methodology/Caveats sections are the
  procedure.
- Never mix compression units in one sentence: per-package figures in that
  file are gzip, deploy totals are brotli.
- Per-module gzip figures are relative weights, not additive — summing
  overshoots the real chunk total, since gzip misses cross-module
  redundancy.

## Consequences

- **Not a license to micro-optimize.** The axis operates at dependency or
  architecture scale — dropping a wrapper, moving a lazy boundary, gating a
  compile — not byte-shaving. If a payload argument produces tedium rather
  than an interesting problem, it has failed on its own terms.
- **Not every payload argument wins.** "Deliver site-wide `ui` once instead
  of per demo" was closed by this method: priced honestly, it saves a few
  hundred bytes of options object against a 246.6 KB demo-specific cost,
  and costs a second generated module and build seam.
- **It also defers things.** The TS/JS view toggle doubles every demo's
  `files` payload, which is why it's Deferred rather than ranked.
- **Relationship to ADR 0003.** 0003 decides whether a feature belongs at
  all; this one ranks the survivors. A large payload win can't buy a
  feature past 0003.
- **`README.md`'s comparison section is downstream of this ADR** — must be
  re-measured before 3.0, with a date and branch point attached.
  "current is unreleased and will keep moving" applies to every number
  quoted from it.
