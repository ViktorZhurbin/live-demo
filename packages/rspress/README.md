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

```tsx
<code src="../snippets/MyDemo.tsx" />
```

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

This plugin is based off of [@rspress/plugin-playground](https://rspress.dev/plugin/official-plugins/playground). It adds some important improvements:

- **Multi-file support**
- **Typescript w/o red squiggles** (no intellisense still)

### Plus, some niceties:

- toggle code wrap
- resizable panels
- view switcher (split view/editor only/preview only)
- fullscreen option
- and some more...

### Coming in v3:

- Per-page layout injection: `@rspress/plugin-playground` injects it globally, ie it's loaded on a 404 page too
- Lazy external imports: `@rspress/plugin-playground` loads all dependencies used in playgrounds across the project, ie if one page had Three.js it would be loaded on every page too.
