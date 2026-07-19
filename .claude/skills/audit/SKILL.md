---
name: audit
description: Run a code-audit pass over a package or directory, producing one findings doc (fixes come later, batched by theme). Use when the user says "/audit", "audit this package", "do an audit of X", or asks for a systematic pass over a codebase area to find inconsistencies, dead abstractions, doc/code drift, or untested seams — as opposed to fixing a specific known bug.
---

# Code audit

A repeatable pass over a package or directory. Produces **one findings doc**;
fixes come after, batched by theme. Do not fix anything while auditing —
that's step 4, and it should be a decision the user signs off on, not
something that happens inline.

If the user gave a target (a package, a directory), audit that. If not, ask
which package/directory before starting — don't guess at scope.

## 0. Size it first

```sh
find <target> -type f \( -name '*.ts' -o -name '*.tsx' \) | xargs wc -l | sort -rn
```

CSS modules, fixtures, and other non-`.ts(x)` files a flow touches can carry
real bugs too — an undefined CSS custom property is as dead as an
unreachable branch. Widen the glob to whatever the flow actually reads.

File count × average length picks the granularity — decide from the numbers,
never default to "go file by file":

- **Many small files** (<100 lines avg) → problems live in the **boundaries**:
  needless indirection, one-caller helpers, concepts with two names. Trace
  flows. A file-by-file read scores each file "fine" and finds none of it.
- **Few large files** → problems live inside them. Read them directly.

## 1. Trace each flow in execution order

Find the entry points, follow the data. Write down only: where data changes
shape, where a hop adds nothing, where one concept has two names.

Note any **contract spanning two flows** (a build→runtime seam, a
serialization boundary). Those are the highest-consequence and usually the
least tested — every unit test on either side can pass while the whole thing
is broken.

## 2. Read the project's own docs against the source

Highest yield per minute, and the step most often skipped. Published docs,
README, CHANGELOG, CLAUDE.md. Look for:

- syntax the docs teach that no test covers
- examples that don't actually run
- behavior documented nowhere near the code that implements it
- the public API the docs imply vs. what's actually exported

Divergence is a finding in **either** direction — the doc may be right and
the code wrong, or the reverse.

## 3. Consistency sweep, mechanically

Grep across every file at once: comment style, naming, prop handling, error
construction, `type` vs `interface`. "Inconsistent" is a property of the
_set_ — invisible when reading one file at a time.

## Rules while auditing

**Don't fix during the read.** Local decisions made before the global
picture is in are how fragmented code gets more fragmented. Batch fixes by
theme afterward.

**Assume intent before defect.** Odd code is often load-bearing. Before
"fixing" anything that implies a design decision: check the docs, then ask
the user. Two findings that look like clear bugs have turned out to be
deliberate design before — and the evidence of the intent was sometimes the
odd code itself (e.g. a suspicious `display: none`).

**Verify by executing, not reading.** Two tricks that pay off:

- Test runners often suppress `console.log` (Vitest does) — force a value
  into an assertion failure (`expect({ actual }).toBe("SHOW")`) and read it
  off the diff.
- To prove a test actually guards something, break the source deliberately
  and confirm it fails. This is how overstated findings get caught.

**Record corrections.** When a finding turns out wrong or overstated, amend
it in place in the output doc and say so. An audit that only accumulates
claims can't be trusted.

**Tag breaking vs. internal as you go.** Nearly free during the pass,
expensive to reconstruct later — and it's what makes the doc usable for
release planning.

**CHANGELOG isn't just for "big" fixes.** A new build-time warning on a
previously-silent path is as consumer-visible as a renamed export — log
every fix that changes observable behavior, per the package's own
convention.

**One rationale, one home.** When a fix needs a comment explaining _why_,
write it once, at the site a future reader will actually hit first — don't
restate it elsewhere.

## The output doc

One file (e.g. `<package>/AUDIT.md`), amended in place as items resolve. It
must be readable **cold**, by someone with no context:

- state of the working tree — what's uncommitted
- the exact verify command, and which directory to run it from
- **Decisions — do not re-litigate**: a table with the source of each
- Done / Next / Not yet audited
- findings, each with severity and a breaking/internal tag

Say plainly what shipped **unverified**. If a layer has no automated
coverage, name it once, loudly, and note who verifies it instead.

## Retiring findings as they resolve

The findings doc is temporary. As each finding resolves:

1. **Give durable content a home before compressing the entry.**
   Deferred work, a confirmed-intentional oddity goes in the package's `CLAUDE.md`.
   A behavior change goes in `CHANGELOG.md`. A rationale the code needs goes
   in a comment at the relevant line. Nothing to home? The finding likely
   wasn't durable enough to need one.
2. **Then compress the entry** to a one-line pointer ("see `X.ts`'s
   comment", "see CHANGELOG"). Early on, the doc's job is proving findings
   are real; near the end it's tracking what's still open — don't leave
   resolved items at full length once they're no longer doing that job.
3. **Before deleting the file**, re-scan every "Decisions — do not
   re-litigate" row and every DONE item for content with no home yet.
