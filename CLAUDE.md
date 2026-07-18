# Live Demo — Interactive Examples for Documentation

Rspress plugin that turns code blocks/files in MDX into interactive, editable
examples (CodeSandbox-style) that run in the browser.

````mdx
<code src="./examples/Button.tsx" />

```jsx live
function App() {
  return <div>Hello World!</div>;
}
```
````

## Monorepo layout

- `packages/rspress/` — the published plugin (`@live-demo/rspress`). Has its own
  `packages/rspress/CLAUDE.md`. Read it before working inside that package.
- `website/` — the docs site that consumes the plugin. `pnpm build:web` runs
  `build:lib` first so `website` always builds against a fresh `dist/`.

## Maintaining this file

Update this file when your changes affect what's documented here. Keep a
fact here only if it's true across the whole monorepo, or if an agent needs
it to decide which package to open — before that, it belongs in a docblock
next to the code, or in the relevant package's own CLAUDE.md.

## Library references

- `rspress/core`: https://rspress.rs/llms.txt
- `oxfmt`: https://github.com/oxc-project/website/tree/main/src/docs/guide/usage/formatter
- `oxlint`: https://github.com/oxc-project/website/tree/main/src/docs/guide/usage/linter

## Change Verification

From the root:

```sh
pnpm run check
pnpm run verify
```

## Active initiative: major version upgrade

This repo went dormant for ~7 months and is now being brought current: dev tooling reconsidered, dev + runtime dependencies bumped, source updated for any breaking changes. The goal is to improve on this foundation and eventually release a new major version. Code clarity, simplicity, maintainability would be important driving factors.
