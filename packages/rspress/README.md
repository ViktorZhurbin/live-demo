# Live Demo - Interactive Examples for Rspress

![demo](https://github.com/user-attachments/assets/70744765-a147-41bf-96d8-93f30aded8fb)

## Quick start

### Install

```sh
# Rspress v2
npm install @live-demo/rspress

# Rspress v1
npm install @live-demo/rspress@1
```

### Register

```ts
// Rspress v1
import { defineConfig } from "rspress/config";
// Rspress v2
import { defineConfig } from "@rspress/core";

import { liveDemoPluginRspress } from "@live-demo/rspress";

export default defineConfig({
	plugins: [liveDemoPluginRspress()],
});
```

### Use

Now you can use it in your MDX files in either of the two ways:

1. As an **"external"** interactive example (snippet in a dedicated file):

````mdx
```tsx file="../snippets/MyDemo.tsx" live
```
````

2. As an **"inline"** interactive example:

````tsx
```jsx live
export const App = () => {
  return <div>Hello World</div>;
};
```
````

## Docs

https://live-demo.pages.dev/guide/getStarted

## Compared to `@rspress/plugin-playground`

This plugin is based off of [@rspress/plugin-playground](https://rspress.dev/plugin/official-plugins/playground). Differences:

- Multi-file support: an external demo's entry file can import local siblings,
  and each one gets its own editor tab. `@rspress/plugin-playground` compiles a
  demo as a single standalone file.
- Small runtime that loads only when needed and only what's needed.

### Payload

Both plugins deployed to Cloudflare Pages from the same 9-page docs site, same
`@rspress/core@2.0.18`, brotli, real page loads:

| page                              |      here | `plugin-playground@2.0.18` |
| --------------------------------- | --------: | -------------------------: |
| no demo at all                    |  194.4 KB |                   857.5 KB |
| demo importing only `react`       |  430.5 KB |                  3090.8 KB |
| demo importing the three.js graph | 1311.1 KB |                  3086.2 KB |

Upstream's two demo rows are the same size because its virtual module imports
every external statically — the three.js demo's dependencies land on the
`react`-only demo's page too. Its no-demo page is not free either: Monaco is
preloaded from a CDN on every page of the site.

Method and full breakdown:
[asset-size comparison](https://github.com/ViktorZhurbin/live-demo/blob/main/docs/explorations/asset-size-comparison.md).
