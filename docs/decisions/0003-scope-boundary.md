# 0003. Scope boundary: one architectural test for whether a feature belongs

- **Status:** Accepted, 2026-07-27. No implementation — constrains future work.
- **Scope:** all of `packages/rspress`. A product decision, not a code change.
- **Supersedes:** nothing. **Superseded by:** nothing.
- **Absorbs:** the rationale behind `packages/rspress/CLAUDE.md`'s "Isolation
  model" entry, which was a scope decision filed under an anti-defensive-code
  heading. That file now points here.

## Context

### How plugins in this category actually get used

No usage data exists for this plugin (~22 weekly downloads, no known users), so
this is inferred from three things: which requests generate GitHub issues
upstream, what the two official plugins optimize for by default, and the
adjacent ecosystem (Sandpack in the React docs, Docusaurus live codeblocks,
VitePress demo plugins). Treat the ordering as confident and the proportions as
a guess.

**1. Illustrative snippet.** Dominant by volume. Prose needs a running example:
5–40 lines, one file, imports React plus whatever is being documented. The
reader tweaks a value and watches it change. Both official plugins are shaped
for this, and every example in their docs is this.

**2. Component-library self-documentation.** A design system documenting its own
components. Multi-file — component plus mock data plus a helper — and imports
its own package by bare name. This mode generates most of the _issues_, because
the official tools were built for mode 1: rspress#2402 (relative imports),
rspress#1269 and #1394 (style bleed), rspress#133 (props tables). It is also the
mode this plugin already serves better than upstream.

**3. Storybook substitute.** Controls/knobs, viewport matrix, a11y checks,
visual regression, per-story isolation. rspress#133, rspress#2812. Note the
shape of this demand: it is mostly _not_ about running code better, it is about
a test-harness UI wrapped around code that already runs.

**4. REPL / CodeSandbox-in-docs.** Arbitrary npm at runtime, shareable links,
persistence. Neither official plugin does this and the people asking generally
want a different product.

This plugin serves modes 1 and 2. Mode 3 is a different product. Mode 4 is a
different product that shares a lot of machinery, which is what makes it
dangerous rather than obviously out.

### Prior art: this boundary was drawn once already

The mode taxonomy above is partly inferred, but for this project it is also
observed. The plugin began as `website/src/plugins/pluginPlayground` inside
[react-babylonjs](https://github.com/brianzinn/react-babylonjs) — a docs site
rewrite where `@rspress/plugin-playground` was tried, didn't fit, and delivered
less than the CodeSandbox wrapper it was meant to replace. A copy is kept at
`.claude/source-code/react-babylonjs/website`. Still live at
[/playground](https://brianzinn.github.io/react-babylonjs/playground/) and
[/examples/basic/moving-boxes](https://brianzinn.github.io/react-babylonjs/examples/basic/moving-boxes).

That original served **two modes from one component tree**, switched at runtime
by a route check (`useIsPlaygroundPage()`): CodeMirror on docs pages, Monaco on
the dedicated `/playground` page, which was a `pageType: 'custom'` page whose
entire body was one `<code src="./Template.tsx" />`. Mode 1/2 and mode 4 in a
single codebase.

Extracting the npm package _was_ the act of choosing modes 1 and 2. What got cut
is exactly the mode-4 half, and in two cases for structural reasons worth
recording, because they are more durable than "it was complex":

- **Hand-built type declarations for Monaco.** `getTypeDeclarationsMap.ts`
  harvested `.d.ts` files out of `node_modules` at build time into a
  `_playground_virtual_types` module, fed to Monaco via `addExtraLib`. It worked,
  but only against a **hand-curated list** — `react`, `react-babylonjs`,
  `@babylonjs/core`, `@babylonjs/gui`, each with its own include globs and
  path-remapping quirks. A plugin cannot curate its consumer's dependencies. The
  approach doesn't survive the move to a package, regardless of payload.
- **Shareable demos via InstantDB.** Save / fork / copy-link over a hosted
  database, with the app id in the source (`web/db/db.ts`). Fine for one site.
  A published plugin has no answer to whose backend it is or who owns the data.

The remaining cuts — Monaco itself, the StackBlitz/CodeSandbox export with its
vite and CRA templates, `transformAssetPaths.ts` rewriting `/assets/` to raw
GitHub URLs — were weight or site-specific glue.

Two details carried forward that look arbitrary without this history:
`<code src="...">` is the upstream v1 original syntax (hence its survival as a deprecated
alias), and `parseProps`' JSON round-trip dates to the original's comment that
unstringified code in MDX "tends to break things". One thing that was fixed
rather than carried: the original keyed nested files by base name, so
`buttons/styles.ts` and `cards/styles.ts` would collide — the reason
`collectDemoFiles.ts` now keys by path relative to the entry directory.

### Why a feature list can't hold the line

Requests arrive one at a time, each individually cheap and each locally
reasonable. "Add a resize handle" is four hours. So is "add a props table."
Neither is refusable on cost, and a list of forbidden features is just a record
of the arguments already had — it says nothing about the next request.

What does generalize is the architecture. Every request either fits the
commitment this codebase has already made or requires breaking it, and that is
decidable in advance.

## Decision

The commitment, already implicit across `src/web/compiler/` and stated
piecemeal in `packages/rspress/CLAUDE.md`, is made explicit here:

> A live demo is source code from the docs repo, compiled in the reader's
> browser with no bundler and no sandbox, mounted directly into the host page's
> React tree.

### The test

**Does this feature require a second build pipeline, an iframe, or a non-React
mount?** If yes, it is out of scope. If no, it is in scope and gets judged on
its own merits like any other work.

### Three rings

**Ring 1 — the product.** Modes 1 and 2. Multi-file demos, TypeScript, imports
resolvable at build time, rendered in-page, edited live. Everything here is fair
game and gets prioritized normally.

**Ring 2 — out.** Anything failing the test: style isolation, real viewport
testing, Vue/Svelte/Solid, arbitrary npm resolved at runtime, visual regression,
a controls/knobs harness. Not "bad ideas" — they belong to a product that made
different commitments, and adopting one means adopting its pipeline.

**Ring 3 — explorations.** Deliberate experiments that would cross the line,
undertaken because the territory is interesting, with no expectation of
shipping. The root `CLAUDE.md` names in-browser bundling as an explicit and
legitimate goal alongside shipping something useful; this ring is where that
lives. The rule that keeps it honest: an exploration is not allowed to quietly
become a supported feature. Promoting one requires superseding this ADR.

## Worked examples

Where the test lands on real requests, including the ones where the answer is
not the obvious one.

| Request                                | Verdict           | Why                                                                  |
| -------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| Per-block meta options                 | In                | No pipeline change; `parseCodeMeta.ts` already tokenizes `key=value` |
| Alias a bare specifier to a local path | In                | Resolution happens in the consuming bundler, which already exists    |
| CSS imports                            | In, with a caveat | See below — needs a transform, not a bundler                         |
| Viewport/responsive testing            | Out               | Looks in-scope, isn't — see below                                    |
| Props tables from types                | Out               | Passes the test, fails a second rule — see below                     |
| Style isolation                        | Out (Ring 3)      | Needs an iframe, or shadow DOM as the cheaper crossing               |
| Vue SFC demos                          | Out               | Non-React mount, though closer than it looks — see below             |
| Svelte demos                           | Out               | Needs a real compiler; Sucrase is a token rewriter                   |

**Viewport testing is out even though it looks in.** rspress#2812 asks for a
resize handle, and `ResizablePanels` already exists, so it reads as a small
step. It isn't: CSS media queries respond to the viewport, not to a container,
so dragging the preview pane wider will not fire a demo's
`@media (max-width: 600px)` rule. The feature would look implemented and not
work. Genuine viewport testing needs an iframe — the exact thing this project
declined to copy from `@rspress/plugin-preview`, whose `iframe-fixed` /
`iframe-follow` modes cost a second complete Rsbuild instance with its own dev
server.

**Props tables pass the test and are still out.** `react-docgen-typescript` runs
at build time and needs no second pipeline, so the architectural test clears it.
But it has nothing to do with _running_ a demo — it is a docs-generation feature
that happens to sit next to this one. Hence a second rule, which catches
adjacency creep the first rule can't:

> The feature must be about running, editing, or displaying a demo. Not about
> the code around it.

**Vue is closer than "React-only" suggests.** The usual framing puts the limit
at the compiler, but Sucrase is framework-agnostic and handles TS and JSX fine.
The React-specific part is narrower and later: `runCode` returns a component and
`CodeRunner` mounts it with `createElement` into the host tree. Vue needs a
different mount and a `.vue` parser; Svelte needs a compiler Sucrase cannot be.
Worth knowing before pricing either as a Ring 3 experiment — they are not the
same distance away.

## Explorations worth keeping (Ring 3)

- **Shadow DOM isolation.** The middle path both official plugins skipped:
  style isolation without a second bundler or dev server. Catch — it breaks the
  global-CSS escape hatch that is currently the only way a demo gets CSS at all.
- **CDN module resolution (esm.sh / jsdelivr).** The one that changes the
  product's ceiling: it removes `EXTERNAL_IMPORT_NOT_FOUND` and the entire
  build-time-discovery constraint. Squarely the in-browser-bundling territory
  the root `CLAUDE.md` blesses.
- **Real TypeScript diagnostics in a worker.** `README.md` currently promises
  "TypeScript w/o red squiggles (no intellisense still)". Payload is the obvious
  objection but not the real one: as "Prior art" above records, this was _built_
  once and the blocker was that type acquisition can't be curated on the
  consumer's behalf. Any serious attempt has to fetch `.d.ts` at runtime from a
  registry CDN, which makes this the same exploration as CDN module resolution
  rather than a separate one.
- **URL-encoded demo state.** Ring 1, not an exploration — encoding files into
  the URL needs no backend, which is what sank the original InstantDB version.
  Listed here only to correct a claim that has circulated in this repo's own
  notes: **this plugin does not have shareable links.** The _original_ did, over
  a hosted database, which is what that claim garbled.

## Consequences

- **`packages/rspress/CLAUDE.md`'s "Limitations" section is downstream of this
  ADR, not independent of it.** Every entry there — no CSS, no dynamic imports,
  no Node APIs, `.js(x)`/`.ts(x)` only — is a consequence of "no bundler". They
  should be maintained as consequences, and an argument to relax one is an
  argument against this ADR.
- **The "Isolation model" entry under "Deliberately not handled" now points
  here.** Demos are not sandboxed because they are mounted into the host React
  tree, which is a scope commitment, not a decision to skip defensive code.
- **The `README.md` "Compared to `@rspress/plugin-playground`" section should
  stay Ring 1 claims only.** Comparing against Storybook invites mode 3.
