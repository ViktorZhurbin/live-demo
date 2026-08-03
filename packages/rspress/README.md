# Live Demo - Interactive Examples for Rspress

https://github.com/user-attachments/assets/5cabccfc-2357-4d7f-bb3d-76195a065e1e

## Quick start

### Install

```sh
# Rspress v2
npm install @live-demo/rspress

# Rspress v1
npm install @live-demo/rspress@1

# Not ready for 3.0's breaking changes yet?
npm install @live-demo/rspress@2
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

https://live-demo.vktrz.workers.dev/guide/getStarted

## Compared to `@rspress/plugin-playground`

This plugin is based off of [@rspress/plugin-playground](https://rspress.dev/plugin/official-plugins/playground). Differences:

- Multi-file support: an external demo's entry file can import local siblings,
  and each one gets its own editor tab. `@rspress/plugin-playground` compiles a
  demo as a single standalone file.
- Small runtime that loads only when needed and only what's needed.

Migrating: `playground` is accepted as an alias for `live`, so existing
fences keep working unchanged — swapping the plugin registration is the whole
migration. The two can't be registered on the same site, since both claim the
same fence keyword.

### Payload

Both plugins deployed to Cloudflare Pages from the same 9-page docs site, with just one page having a Three.js demo. Same `@rspress/core@2.0.18`, brotli, real page loads:

| page                              |      here | `plugin-playground@2.0.18` |
| --------------------------------- | --------: | -------------------------: |
| no demo at all                    |  191.6 kB |                   870.1 kB |
| demo importing only `react`       |  432.6 kB |                  3155.8 kB |
| demo importing the three.js graph | 1334.3 kB |                  3151.5 kB |

Upstream preloads Monaco on every page and imports every external statically
— full reasoning in the breakdown below.

Full breakdown:
[asset-size comparison](https://github.com/ViktorZhurbin/live-demo/blob/main/docs/explorations/asset-size-comparison.md).
Method:
[measuring reader payload](https://github.com/ViktorZhurbin/live-demo/blob/main/docs/measuring-payload.md).
