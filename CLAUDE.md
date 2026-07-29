# Live Demo: Interactive Examples for Documentation

Rspress plugin that turns code blocks/files in MDX into interactive, editable
examples (CodeSandbox-style) that run in the browser.

````mdx
```tsx file="./examples/Button.tsx" live
```

```jsx live
export const App = () => {
  return <div>Hello World!</div>;
};
```
````

## Scale

This is an experimental side project with nearly zero users (~22 weekly npm
downloads, none of them known). Treat that as a design input, not trivia:
abstract "users would pay X" arguments carry little weight here, and a change
that adds real complexity needs to justify itself on the code's own terms.
Exploring interesting problems (in-browser bundling, for one) is an explicit
and legitimate goal alongside shipping something useful.

One thing that survives having no users, and shouldn't be mistaken for a
"users would want X" argument: **wire payload**, because it's measured rather
than argued and it's the substance of the one comparative claim `README.md`
makes. See [ADR 0004](docs/decisions/0004-payload-ranking-axis.md), which also
sets the rule that a payload claim needs a real measurement before it reaches
the README, the changelog, or `docs/decisions/`.

### Origins

The project started based off of the official plugins: `@rspress/plugin-playground` and `@rspress/plugin-preview`. Source of both is available in `.claude/source-code/` as an upstream reference (each has a `docs-api.md` file reflecting their v2 API). See `README.md` for differences. `resources/issues-analysis.md` is an attempt to analyze the long standing issues that users face with the official plugins (needs further digging)

## Monorepo layout

- `packages/rspress/`: the published plugin (`@live-demo/rspress`). Has its own
  `packages/rspress/CLAUDE.md`. Read it before working inside that package.
- `website/`: the docs site that consumes the plugin. `pnpm build:web` runs
  `build:lib` first so `website` always builds against a fresh `dist/`. It's
  also the target `packages/rspress/`'s Playwright suite builds and tests
  against (see that package's CLAUDE.md, "Testing" section).

## Project docs (`docs/`)

Three tiers, by lifetime. Put a fact in the shortest-lived one that can hold
it, and promote it when it turns out to outlive that tier.

- **`docs/decisions/`** — ADRs. Durable, numbered, and binding on future work:
  they constrain what gets built and what was built.
- **`docs/ongoing/`** — working documents with a finite life: research
  snapshots, measurement runs, and the ordered action list. These get items
  checked off and are eventually deleted, so **nothing durable should live
  here alone.** Do not reference them in durable docs either.
  If a working doc grows a principle that will outlive the list it's in,
  move it to an ADR.
- **`docs/.open-questions.md`** and **`docs/.shelved-questions.md`** —
  investigated far enough to have an answer, deliberately not acted on. Each
  entry records what was measured, why it's parked, and what would unpark it.
  Check these before re-deriving an idea from scratch; several look obvious
  and were already probed and rejected for recorded reasons.

## Maintaining this file

Update this file when your changes affect what's documented here. Keep a
fact here only if it's true across the whole monorepo, or if an agent needs
it to decide which package to open. Otherwise it belongs in a docblock
next to the code, or in the relevant package's own CLAUDE.md.

## Library references

- `rspress/core`: https://rspress.rs/llms.txt
- `oxfmt`: https://github.com/oxc-project/website/tree/main/src/docs/guide/usage/formatter
- `oxlint`: https://github.com/oxc-project/website/tree/main/src/docs/guide/usage/linter

## Verification

```sh
# From the repo root:
pnpm run check # lint+format
pnpm run verify # build + typecheck + unit tests + knip + e2e tests
pnpm check:all # check && verify
```

### Special notes

**No MDX comments in `.mdx` files.** `oxfmt` formats them as Markdown and
rewrites `*` as `_`, so a `{/* … */}` comment becomes `{/_ … _/}` — which then
fails the docs build with "Could not parse expression with acorn: Unterminated
regular expression". HTML comments aren't an escape hatch either (MDX parses
`<!--` as JSX). Put the note in the code that depends on the markup instead.

## Active initiative: major version upgrade

This repo went dormant for ~7 months and is now being brought current: dev tooling reconsidered, dev + runtime dependencies bumped, source updated for any breaking changes. The goal is to improve on this foundation and eventually release a new major version. Code clarity, simplicity, maintainability would be important driving factors.

### 3.0.0 Release

When 3.0 actually ships, `packages/rspress/README.md`'s and
`website/docs/guide/getStarted.mdx`'s version-tag guidance (currently
"v2 = current, install `@1` for Rspress v1") needs a row for whether 3.0
tracks Rspress v2 and whether `@2` becomes the new legacy tag.

Before releasing 3.0:

- Verify Improvements over `@rspress/plugin-playground` section in README empirically.
- Tidy up changelog - it should be an actual changelog
- Review and clean up docs website
