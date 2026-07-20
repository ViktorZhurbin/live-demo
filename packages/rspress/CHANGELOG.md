# Changelog

Notable changes to `@live-demo/rspress`, kept in the style of
[Keep a Changelog](https://keepachangelog.com/). This project uses semantic
versioning — entries under **Breaking** bump the major version. This file
starts with the 3.0 major; earlier history is in git log.

## [Unreleased]

### Breaking

#### Demo machinery no longer loads on every page

Two changes stop a consuming site from paying for demos on pages that have
none:

- **Babel and Rollup load lazily.** They were injected as render-blocking
  CDN `<script>`s in every page's `<head>`; they're now real
  `dependencies` pulled in with dynamic `import()` the first time a demo
  compiles, which the consuming site code-splits into async chunks that load
  only on demo pages. `window.Babel` / `window.rollup` are therefore no
  longer defined globally, and a compiler that fails to load now surfaces in
  the preview overlay (new `COMPILER_LOAD_FAILED`) instead of rendering a
  silent blank.
- **`LiveDemo` is no longer a global component.** `remarkPlugin` imports the
  layout per-page (only into pages that contain a demo) rather than
  registering it via `markdown.globalComponents`. The default layout
  (`static/LiveDemo.tsx`) also loads `Core` behind `React.lazy`/`Suspense`
  instead of a static import — without that, the consuming bundler's own
  module concatenation can still pull the demo graph — CodeMirror, the
  virtual-modules bundle with every collected external — into a chunk shared
  by every page.

#### New: `@live-demo/rspress/web/lazy`

A layout should now render `LiveDemoLazy` from this new subpath instead of
importing `Core` from `@live-demo/rspress/web`:

```jsx
import { LiveDemoLazy } from "@live-demo/rspress/web/lazy";

const LiveDemo = (props) => <LiveDemoLazy pluginProps={props} isDark={isDark} />;
```

It owns the async boundary and both of its failure modes: a loading skeleton
while the runtime chunk arrives, and an inline "couldn't load" message if it
never does. A static import of anything from `@live-demo/rspress/web` pulls
the whole demo runtime into the importer's chunk, so `customLayout` authors
who reached for `Core` directly should switch to this — it's a separate build
entry precisely so it can be imported statically without that cost.

Breaking for anything that relied on `window.Babel` / `window.rollup` or on a
global `<LiveDemo>` being available on pages the plugin didn't transform.

Note: the consuming bundler (rspack) may cache a _failed_ dynamic-import
promise; the loader retries on the next edit, but a persistently failed
chunk load can need a page reload to recover.

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

#### `IMPORT_NOT_RESOLVED` split from unsupported-extension errors, and both now name the importer

Previously a genuinely-missing file and an import with an unsupported
extension (e.g. `import "./styles.css"`) both threw `IMPORT_NOT_RESOLVED`
with the same "Only .js(x) and .ts(x) files are supported" hint — misleading
for the missing-file case, since the typo'd path could exist under a
different extension. The unsupported-extension case now throws
`IMPORT_EXTENSION_NOT_SUPPORTED` instead, and the not-found hint no longer
mentions extensions.

Both codes' messages now name the file whose import (or `<code src>`)
couldn't be resolved and, when a demo's _own_ import fails rather than the
`<code src>` reference itself, the MDX page that started the scan — so a
single broken import on a site with many demos no longer requires a manual
hunt to find the source. Breaking for the same reason as the entry above:
anything pattern-matching on the exact previous message.

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

### Fixed

#### Inline ` ```lang live ` matching no longer triggers on substrings

The remark transform checked `node.meta?.includes("live")`, so any meta
string merely containing "live" — ` ```jsx live-off `, `alive`, `livestream`
— was treated as a live demo. It now splits the meta string on whitespace
and matches "live" as a whole token.

#### A demo only downloads the externals it actually imports

The generated virtual module registers each external as a
`() => import("pkg")` thunk instead of a static `import * as`, and
`bundleCode` awaits only the ones the demo being compiled imports (Rollup
already reports them as the bundle's external imports).

Previously the module held a static import for the union of externals across
every demo on the site, so the consuming bundler put all of them in the same
chunk as the demo runtime. Any page with any demo downloaded all of them: on
this repo's own docs site, a `useState` counter pulled in the three.js and
`@react-three/*` packages belonging to a demo on an unrelated page.

This is invisible to demo authors — `includeModules` and demo source are
unchanged — but sites with a heavy external in one demo should see that
weight disappear from their other demo pages.

Externals are no longer discovered only after bundling, which would have put
them at the end of a serial chain (runtime chunk → Babel/Rollup → bundle →
externals). The build step records what each `<code src>` demo imports, and
the runtime starts fetching them when the demo mounts, alongside the
compiler. The first compile also no longer waits out the edit debounce.

#### The preview pane shows a loading skeleton

It previously stayed blank from mount until the first compile finished —
through the compiler download, the bundle and the demo's externals. It now
shows a skeleton, and it's the same `PreviewSkeleton` component `web/lazy`
already rendered while the runtime chunk loaded, so that area doesn't change
appearance when `Core` mounts partway through the wait. Later edits are
unaffected: the last good render stays mounted rather than flashing a
skeleton on every keystroke.

A `customLayout` that reimplements `web/lazy`'s fallback rather than
rendering `LiveDemoLazy` will show its own treatment for the first phase and
this one for the second.

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
