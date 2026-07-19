# Changelog

Notable changes to `@live-demo/rspress`, kept in the style of
[Keep a Changelog](https://keepachangelog.com/). This project uses semantic
versioning — entries under **Breaking** bump the major version. This file
starts with the 3.0 major; earlier history is in git log.

## [Unreleased]

### Breaking

#### Errors are now structured, with a stable message format

Both build-time (Node) and runtime (browser) errors thrown by the plugin
itself now go through `LiveDemoError`, a typed error carrying a `code` and a
`.payload` (`{ code, title, message?, hint?, notes? }`). `.message` is the
fully formatted, multi-line text — prefixed `[live-demo]` — since at build
time rspress owns the terminal and there's no separate renderer to hand a
payload to.

Breaking for anything that pattern-matched on the exact previous wording of
a thrown error (e.g. `"[LiveDemo]: Couldn't resolve..."` is now
`"[live-demo] Import couldn't be resolved\nCouldn't resolve..."`). The
in-preview error overlay also now renders the structured payload — title,
message, hint — instead of dumping `error.message` verbatim; this only
applies to the plugin's own errors, not runtime errors thrown by demo code
itself, which render unchanged.

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

#### `web` entry point narrowed to the documented custom-layout surface

`@live-demo/rspress/web` previously re-exported every `web/` module's entire
surface via `export *`. It now exports exactly what `customLayout.mdx`
documents, plus `Button`, which website's own external demos import for
consistent demo-authoring: `Core`, `ControlPanel`, `Editor`, `FileTabs`,
`LiveDemoProvider`, `LiveDemoStringifiedProps`, `Preview`,
`ResizablePanels`, `Wrapper`, `Button`.

Removed — none were documented or used outside the package:
`CodeRunner`/`CodeRunnerProps` (only meaningful wired to `Preview`'s
internal error state, not usable standalone), `useActiveCode`,
`useLiveDemoContext`, `ButtonProps`, `EditorProps`, `FileTabsProps`,
`ResizablePanelsProps`.

### Newly allowed

- **Circular imports** no longer fail the build. They're legal in ES modules
  and Rollup bundles them correctly; the previous check also mis-flagged plain
  diamond dependencies (`App → Left, Right`, both → `theme`).
- **Directory imports** resolve to `Button/index.tsx`.
- **`.ts` files with type annotations** now compile. Previously only `.tsx`
  got the TypeScript preset, so any annotation in a `.ts` file was a syntax
  error in the browser.
- **Paths containing a dot** (`~/my.app/demos/`) resolve correctly.
- **`import type` / `export type ... from` are no longer collected as
  dependencies.** Previously a type-only external import (e.g. from a
  types-only package) was bundled like a real one, and could fail the build
  if rsbuild couldn't resolve it as a JS module. Mixed imports
  (`import { type A, B }`) are unaffected — a value member keeps the
  specifier collected.

### Newly warned

- **A `<code src>` that resolves on disk but has no demo data collected for
  it** (e.g. added to an already-routed page during a dev session, after the
  scan phase that populates demo data last ran) now logs a console warning
  naming the file, and suggests restarting the dev server. It still renders
  as an empty `<code>` element rather than a live demo — previously that
  happened silently, and the empty element is hard to tell from a broken
  demo.
