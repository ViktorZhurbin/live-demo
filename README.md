# Live Demo plugin for Rspress

This is a fork of `@rspress/plugin-playground` ([code](https://github.com/web-infra-dev/rspress/tree/main/packages/plugin-playground), [docs](https://rspress.dev/plugin/official-plugins/playground)).

## Docs
Full documentation is here:

## Quick Start

### Inline

Add `live` when declaring a code block:

```tsx live
const Component = () => {
  return <div>Hello there</div>
}
```

This mode currently doesn't support any imports. We can make it work if requested.

### More complex demos
You can also use the following notation:

```tsx
<code src='./path/to/Component.tsx' >
```
You can use both relative and external package imports inside the `Component.(t|j)sx`:
- Relative imports will be shown as separate (editable) file tabs.
- External modules need to be installed and available in `node_modules` at build time

:::info
Path aliases are not supported yet. You can use relative imports instead, and file a feature request (or PR) to support it.
:::

## Motivation

### Multi-file demos
`@rspress/plugin-playground` doesn't handle local imports ([source](https://github.com/web-infra-dev/rspress/blob/main/packages/plugin-playground/src/cli/utils.ts#L16)), which doesn't work for more complex multi-file demos.

### Typescript

`@rspress/plugin-playground` [explicitly recommends](https://rspress.dev/plugin/official-plugins/playground#internal-components) not to use `.ts(x)`. If you do, you get red squiggly type errors all over in the editor.
