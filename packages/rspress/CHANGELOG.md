# Changelog

Notable changes to `@live-demo/rspress`, kept in the style of
[Keep a Changelog](https://keepachangelog.com/). This project uses semantic
versioning — entries under **Breaking** bump the major version. This file
starts with the 3.0 major; earlier history is in git log.

## [Unreleased]

### Breaking

#### Demos no longer get an implicit `React` binding

Previously every demo had `const React = __get_import('react', true)` injected
into it, because the classic JSX runtime compiles `<div/>` to
`React.createElement(...)` and needs that identifier in scope. Demos are now
compiled with Babel's **automatic** JSX runtime, which imports
`react/jsx-runtime` directly, so no injected binding is needed.

Breaking for a demo that uses the `React` namespace at runtime without
importing it:

```jsx live
// Used to work, now throws "React is not defined"
export const App = () => {
  const [count, setCount] = React.useState(0);
  return <div>{count}</div>;
};
```

Fix by importing what you use — which is what the demo needed to be
copy-pasteable anyway:

```jsx live
import { useState } from "react";

export const App = () => {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
};
```

`import React from "react"` also still works. Type-only uses (`React.FC`,
`React.ReactNode`) were never affected — they're erased before execution. JSX
itself needs no import in either style; that part got _more_ permissive.

#### `files` keys are demo-relative paths, not base names

The `files` record handed to `<LiveDemo>` is now keyed by each file's path
relative to the entry file's directory (`buttons/styles.ts`) rather than its
base name (`styles.ts`).

Two consequences:

- **Editor tabs** show the relative path for files in subfolders.
- **Custom layouts** that index `files` by base name need updating.

This also fixes silent data loss: two files with the same base name in
different folders used to overwrite each other, so one demo file would render
with another's contents.

#### Extension resolution prefers `.tsx`

An extensionless import (`./Button`) now resolves in the order `.tsx`, `.ts`,
`.jsx`, `.js`, then `Button/index.*`. It was `.ts`, `.tsx`, `.js`, `.jsx`.
Only affects demos where both `Button.ts` and `Button.tsx` exist side by side.

#### `web` component exports dropped the `LiveDemo` prefix

The package name already namespaces these; consumers can alias on import.
`LiveDemoProvider`/`useLiveDemoContext` and `LiveDemoStringifiedProps` are
unchanged.

| Old export                     | New export             |
| ------------------------------ | ---------------------- |
| `LiveDemoCore`                 | `Core`                 |
| `LiveDemoEditor`               | `Editor`               |
| `LiveDemoEditorProps`          | `EditorProps`          |
| `LiveDemoFileTabs`             | `FileTabs`             |
| `LiveDemoFileTabsProps`        | `FileTabsProps`        |
| `LiveDemoControlPanel`         | `ControlPanel`         |
| `LiveDemoPreview`              | `Preview`              |
| `LiveDemoCodeRunner`           | `CodeRunner`           |
| `LiveDemoCodeRunnerProps`      | `CodeRunnerProps`      |
| `LiveDemoResizablePanels`      | `ResizablePanels`      |
| `LiveDemoResizablePanelsProps` | `ResizablePanelsProps` |
| `LiveDemoWrapper`              | `Wrapper`              |

```tsx
// Before
import { LiveDemoCore } from "@live-demo/rspress/web";

// After
import { Core as LiveDemoCore } from "@live-demo/rspress/web";
// or adopt the shorter name directly:
import { Core } from "@live-demo/rspress/web";
```

### Newly allowed

- **Circular imports** no longer fail the build. They're legal in ES modules
  and Rollup bundles them correctly; the previous check also mis-flagged plain
  diamond dependencies (`App → Left, Right`, both → `theme`).
- **Directory imports** resolve to `Button/index.tsx`.
- **`.ts` files with type annotations** now compile. Previously only `.tsx`
  got the TypeScript preset, so any annotation in a `.ts` file was a syntax
  error in the browser.
- **Paths containing a dot** (`~/my.app/demos/`) resolve correctly.
