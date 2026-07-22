# Changelog

Notable changes to `@live-demo/rspress`, kept in the style of
[Keep a Changelog](https://keepachangelog.com/). This project uses semantic
versioning: entries under **Breaking** bump the major version. This file
starts with the 3.0 major; earlier history is in git log.

<!--
Maintaining this file:
- User-facing only: what a consumer notices, needs to change, or can now do.
  Not how the plugin implements it internally.
- Just the decision: state the change and its consequence. Don't justify why
  it was the right call or argue against objections.
- 1-2 sentences per entry. A short before/after code sample can stand in for
  prose. Reach for more than a couple sentences only when the entry is a
  reference table (e.g. a renamed-exports list), not free-form explanation.
-->

## [Unreleased]

### Breaking

#### Demo machinery no longer loads on every page

Babel, Rollup, and the demo layout now load only on pages that have a demo,
instead of on every page. `window.Babel` and `window.rollup` are no longer
set globally, and a compiler that fails to load now shows an error in the
preview instead of a blank page. The layout loads its demo runtime lazily
behind a new `@live-demo/rspress/web/lazy` entry point, showing a loading
skeleton while it loads and an inline message if it fails.

#### `customLayout` removed; `web` barrel narrows to `Button` + `LiveDemoStringifiedProps`

The `customLayout` plugin option is gone; the default layout is now the only
layout, and structurally rearranging the demo chrome (file tabs, control
panel, panel wrapping) is no longer possible. `options.ui` and `colors.css`
still work as before.

`@live-demo/rspress/web` drops from ten exports to two: `Button` and
`LiveDemoStringifiedProps`. `Core`, `Editor`, `FileTabs`, `ControlPanel`,
`Preview`, `CodeRunner`, `ResizablePanels`, `Wrapper`, `LiveDemoProvider`,
and `useLiveDemoContext` are no longer exported.

#### Errors are now structured, with a stable message format

Errors thrown by the plugin itself now carry a `code` and a structured
payload instead of freeform text, and the in-preview error overlay renders
that structured info instead of a raw message. Breaking if you pattern-matched
on the old wording, e.g. `"[LiveDemo]: Couldn't resolve..."` is now
`"[live-demo] Import couldn't be resolved\nCouldn't resolve..."`. Runtime
errors thrown by demo code itself are unchanged.

#### `IMPORT_NOT_RESOLVED` split from unsupported-extension errors, and both now name the importer

A missing file and an import with an unsupported extension (e.g.
`import "./styles.css"`) used to throw the same error. The extension case
now throws `IMPORT_EXTENSION_NOT_SUPPORTED` instead. Both errors now name
the file whose import failed and the MDX page that triggered the scan.
Breaking if you pattern-matched on the old message.

#### Demos no longer get an implicit `React` binding

Demos now compile with the automatic JSX runtime, so `React` is no longer
injected into scope automatically. A demo using `React.useState(...)`
without importing `React` will throw "React is not defined":

```jsx live
import { useState } from "react";

export const App = () => {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
};
```

`import React from "react"` still works, and type-only uses (`React.FC`) are
unaffected.

#### `files` keys are demo-relative paths, not base names

`files` is now keyed by each file's path relative to the entry file's
directory (e.g. `buttons/styles.ts`) rather than its base name. Editor tabs
now show the relative path, and custom layouts indexing `files` by base name
need updating. This also fixes two same-named files in different folders
overwriting each other.

#### Extension resolution prefers `.tsx`

An extensionless import (`./Button`) now resolves in the order `.tsx`, `.ts`,
`.jsx`, `.js`, then `Button/index.*`. It was `.ts`, `.tsx`, `.js`, `.jsx`.
Only affects demos where both `Button.ts` and `Button.tsx` exist side by side.

### Fixed

#### Inline ` ```lang live ` matching no longer triggers on substrings

The remark transform checked `node.meta?.includes("live")`, so any meta
string merely containing "live" (e.g., ` ```jsx live-off `, `alive`, `livestream`)
was treated as a live demo. It now splits the meta string on whitespace
and matches "live" as a whole token.

#### A demo only downloads the externals it actually imports

Previously every demo's page downloaded the externals used by every demo on
the site (a `useState` counter could pull in an unrelated demo's three.js
dependency, for instance). Each page now only downloads what its own demo
imports, and the first compile starts immediately instead of waiting out the
edit debounce.

#### The preview pane shows a loading skeleton

The preview used to stay blank until the first compile finished. It now
shows a loading skeleton. Later edits are unaffected: the last successful
render stays on screen instead of flashing a skeleton on every keystroke.

### Newly allowed

- **Circular imports** no longer fail the build.
- **Directory imports** resolve to `Button/index.tsx`.
- **`.ts` files with type annotations** now compile; previously only `.tsx`
  got the TypeScript preset.
- **Paths containing a dot** (e.g. `~/my.app/demos/`) resolve correctly.
- **`import type` / `export type ... from`** are no longer treated as
  dependencies, so a type-only external import can no longer fail the build.
  Mixed imports (`import { type A, B }`) are unaffected.

### Newly warned

- **A `<code src>` that resolves on disk but has no demo data collected for
  it** (e.g. added to a page during a dev session, after the scan already
  ran) now logs a console warning naming the file and suggesting a dev-server
  restart, instead of silently rendering an empty `<code>` element.
