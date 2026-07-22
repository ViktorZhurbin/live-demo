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

Usage, examples, API: https://live-demo.pages.dev/guide/getStarted

## Motivation

This is a fork of [@rspress/plugin-playground](https://rspress.dev/plugin/official-plugins/playground), which adds some important features.

### Features:

- Multi-file support

### Improvements over `@rspress/plugin-playground`:

- Typescript w/o red squiggles (no intellisense still)
- Per-page layout injection: `@rspress/plugin-playground` injects it globally, ie it's loaded on a 404 page too
- Lazy external imports: `@rspress/plugin-playground` loads all dependencies used in playgrounds across the project, ie if one page had Three.js it would be loaded on every page too.

### Plus, some niceties:

- toggle code wrap
- resizable panels
- switch between split view/editor/preview
- fullscreen view
- etc.
