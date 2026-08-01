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

- Multi-file support
- Typescript w/o red squiggles (no intellisense still) **[VERIFY]** if upstream still has this problem
- Small runtime that loads only when needed and only what's needed
