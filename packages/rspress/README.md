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

This plugin is based off of [@rspress/plugin-playground](https://rspress.rs/plugin/official-plugins/playground). Differences:

- **Multi-file demos.** An external demo's entry file can import local
  siblings, and each one gets its own editor tab. `@rspress/plugin-playground`
  compiles a demo as a single standalone file.
- **Smaller runtime** (see "Payload" below)
- **Nothing loads until it's needed.** A page with no demo gets no plugin
  bytes; a page with one loads the editor and compiler when the demo nears the
  viewport, and pulls only that demo's own dependencies.

Migrating: `playground` is accepted as an alias for `live`, so existing
fences keep working unchanged — swapping the plugin registration is the whole
migration. The two can't be registered on the same site, since both claim the
same fence keyword.

### Payload

All three deployed to Cloudflare Workers from the same docs site, on
`@rspress/core@2.0.18`. Figures are each plugin's own payload — the 196.3 kB
Rspress baseline is netted out. v3's total runtime cost is about a ninth of
plugin-playground's and a fifth of v2.0.6's, and — unlike either — it's zero
on a page with no demo.

**Runtime cost, kB**

|                  |        v3 | plugin-playground |      v2.0.6 |
| ---------------- | --------: | ----------------: | ----------: |
| editor           |     192.6 |             762.4 |      ~192.6 |
| editor's workers |         — |             909.2 |           — |
| compiler         |      48.4 |             386.2 |       947.4 |
| **total**        | **241.0** |        **2057.8** | **~1140.0** |

**Confirmed present even on a page with no demo, kB**

|                                                      |  v3 | plugin-playground | v2.0.6 |
| ---------------------------------------------------- | --: | ----------------: | -----: |
| Monaco editor shell (`editor.main.js` + `loader.js`) |   — |             681.6 |      — |
| Babel + Rollup JS (compiler)                         |   — |                 — |  658.2 |
| `@rspress/core/theme` barrel pulled into site chrome |   — |                 — |   58.3 |

Full breakdown:
[asset-size comparison](https://github.com/ViktorZhurbin/live-demo/blob/main/docs/explorations/asset-size-4-comparison.md).

Method:
[measuring reader payload](https://github.com/ViktorZhurbin/live-demo/blob/main/docs/measuring-payload.md).
