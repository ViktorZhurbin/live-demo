# Live Demo plugin for Rspress

![demo](https://github.com/user-attachments/assets/70744765-a147-41bf-96d8-93f30aded8fb)

## Quick start

### Install

```sh
npm install @live-demo/core @live-demo/plugin-rspress -D
```

### Register

```ts
import { defineConfig } from "rspress/config";
import { liveDemoPluginRspress } from "@live-demo/plugin-rspress";

export default defineConfig({
	plugins: [liveDemoPluginRspress()],
});
```

### Use

Now you can use it in your MDX files in either of the two ways:

1. As an **"external"** demo (snippet in a dedicated file):

```tsx
<code src="../snippets/MyDemo.tsx" />
```

2. As an **"inline"** demo:
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
This is a wildly reworked fork of [@rspress/plugin-playground](https://rspress.dev/plugin/official-plugins/playground), which adds some important features.

### Features:
- Multi-file demos with relative imports
- Typescript support

### Plus, some niceties:
- toggle code wrap
- resizable panels
- layout switcher
- fullscreen view
- etc.
