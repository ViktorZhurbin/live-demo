# Live Demo plugin for Rspress

This is a fork of [@rspress/plugin-playground](https://rspress.dev/plugin/official-plugins/playground).

## Docs

[Documentation website](https://live-demo.pages.dev) (quick start, examples, API, etc)

## Motivation

### Multi-file demos

`@rspress/plugin-playground` can't handle local imports ([source](https://github.com/web-infra-dev/rspress/blob/main/packages/plugin-playground/src/cli/utils.ts#L16)), and doesn't fit more complex multi-file demos.

### Typescript

`@rspress/plugin-playground` [explicitly recommends](https://rspress.dev/plugin/official-plugins/playground#internal-components) not to use `.ts(x)`. If you still try, you get red squiggly type errors all over the editor.

### Adding some niceties
- resizable panels
- layout switcher
- fullscreen view
- toggle code wrap
- etc.
