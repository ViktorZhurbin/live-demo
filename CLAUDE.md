# Live Demo: Interactive Examples for Documentation

Rspress plugin that turns code blocks/files in MDX into interactive, editable
examples (CodeSandbox-style) that run in the browser.

````mdx
<code src="./examples/Button.tsx" />

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

### Origins

The project started based off of the official plugins: `@rspress/plugin-playground` and `@rspress/plugin-preview`. Source of both is available in `.claude/.tmp/` as an upstream reference (each has a `docs-api.md` file reflecting their v2 API). See `README.md` for differences. `resources/issues-analysis.md` is an attempt to analyze the long standing issues that users face with the official plugins (needs further digging)

## Monorepo layout

- `packages/rspress/`: the published plugin (`@live-demo/rspress`). Has its own
  `packages/rspress/CLAUDE.md`. Read it before working inside that package.
- `website/`: the docs site that consumes the plugin. `pnpm build:web` runs
  `build:lib` first so `website` always builds against a fresh `dist/`. It's
  also the target `packages/rspress/`'s Playwright suite builds and tests
  against (see that package's CLAUDE.md, "Testing" section).

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
pnpm check:all # both of the above
```

## Active initiative: major version upgrade

This repo went dormant for ~7 months and is now being brought current: dev tooling reconsidered, dev + runtime dependencies bumped, source updated for any breaking changes. The goal is to improve on this foundation and eventually release a new major version. Code clarity, simplicity, maintainability would be important driving factors.

When 3.0 actually ships, `packages/rspress/README.md`'s and
`website/docs/guide/getStarted.mdx`'s version-tag guidance (currently
"v2 = current, install `@1` for Rspress v1") needs a row for whether 3.0
tracks Rspress v2 and whether `@2` becomes the new legacy tag.

Before releasing 3.0:

- Verify Improvements over `@rspress/plugin-playground` section in README empirically.
- Tidy up changelog - it should be an actual changelog
