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

### Compared to upstream

#### External demos now use `file=` meta, matching upstream

External demos are now authored the same way upstream's v2
(`@rspress/plugin-playground`) does — a fenced code block's `file=` meta,
carrying the plugin's own `live` word alongside it:

```tsx file="./snippets/Component.tsx" live

```

`<code src="./snippets/Component.tsx" />` still works, but is deprecated and
logs a one-time console warning pointing at the new syntax; it will be
removed in a future major version. `file=` also supports the `/` (doc-root)
and `<root>/` (cwd) path prefixes core itself accepts, which `<code src>`
never did — see `usage.mdx`'s "Path prefixes" table.

**`file=` requires an explicit, supported extension** (`.tsx`/`.ts`/`.jsx`/`.js`)
— unlike `<code src>`, it can't be extensionless (`file="./Button"`). This
isn't this plugin's choice: `@rspress/core` reads `file=` literally off disk,
with no extension-guessing, so an extensionless path fails the MDX compile
regardless. Migrating an extensionless `<code src>` to `file=` needs the
extension added back in.

#### `playground` accepted as an alias for `live`

A site migrating off `@rspress/plugin-playground` can swap the plugin
registration and keep its existing `playground` fences unchanged — no MDX
find-and-replace needed. One consequence: the two plugins can't be
registered on the same site, since both would then claim the same fence
keyword. See `usage.mdx` for the rest of the tradeoff.

#### Per-page layout injection, not a global component

Upstream (`@rspress/plugin-playground`) registers the playground via
`globalComponents`/`globalStyles`, so every page on the site pays for the
demo runtime whether or not it has a demo. This plugin injects the layout
import only on pages that actually have one, keeping the demo runtime graph
(CodeMirror, the compiler, every collected external) out of every other page's
bundle.

#### Lazy external imports, not static ones

Upstream's virtual module imports every external statically
(`import * as i_0 from "react"`), so each demo page downloads the union of
externals used across _every_ demo on the site (a `useState` counter could
pull in an unrelated demo's three.js dependency, for instance). This plugin
exports each external as a `() => import(...)` thunk, downloaded only when a
page's own demo actually needs it.

### Changed

#### `@babel/standalone` replaced with `sucrase`

The runtime compiler is now Sucrase instead of Babel. Same demo behavior
(JSX, TypeScript, the automatic JSX runtime), roughly a tenth of the
download. Measured on the real deployment (Cloudflare-served, brotli):
`@babel/standalone` was 481.2 KB, Sucrase is 44.8 KB — 2251.0 KB and 196.3 KB
uncompressed, respectively. No action needed for most demos. One difference
to know about:

- **Sucrase doesn't validate JSX.** A mismatched closing tag or a duplicate
  prop transpiles and runs whatever that produces, instead of failing with a
  parse error. Codemirror's self-closing tags helps with tag mismatch to some extent.
  Genuine syntax errors (unterminated strings, unbalanced
  braces, and so on) still throw `PARSE_FAILED` with a codeframe.

#### `@rollup/browser` removed; demos run via a small in-memory CommonJS `require`

The runtime used to Babel-transpile a demo's files, bundle them with
`@rollup/browser`, then evaluate the single bundle. It now transpiles each
file straight to CommonJS and evaluates them lazily through a small
`require` that resolves relative imports against the demo's `files` and
caches each module's `exports`. Same demo behavior. Measured on the real
deployment (Cloudflare-served, brotli) when this landed, with Babel still the
compiler: 341.3 KB less to download on a page with a demo (945.8 KB
uncompressed) — for `guide/external/basic`, Rollup's JS (112.2 KB) and wasm
binary (229.1 KB) both go, leaving the compiler alone. Sucrase replaced Babel
on top of that, above.

#### A demo loads when it nears the viewport, not on page load

A demo below the fold no longer loads anything — editor, compiler, or its
external imports — until the reader scrolls within 400px of it. A reader who
never reaches the demo downloads none of it; a page of demos costs whatever
its reader actually looks at. Until then the same loading skeleton that
already covered the runtime chunk holds the demo's place, so nothing shifts
when it swaps in. A demo already in view starts loading as soon as the page
hydrates.

Worth knowing if you test your own docs site: an assertion against a
below-the-fold demo now has to scroll to it first, and the elements inside a
demo don't exist until it has loaded — scroll to something outside it (the
demo's own wrapper in your MDX, say).

### Breaking

#### `window.Babel` / `window.rollup` no longer set globally

Now that the demo runtime only loads on pages with a demo, `window.Babel`
and `window.rollup` are no longer set globally, and a compiler that fails to
load shows an error in the preview instead of a blank page. The layout loads
its demo runtime lazily behind a new `@live-demo/rspress/web/lazy` entry
point, showing a loading skeleton while it loads and an inline message if it
fails.

#### `customLayout` removed; `web` barrel narrows to `Button` + `LiveDemoStringifiedProps`

The `customLayout` plugin option is gone; the default layout is now the only
layout, and structurally rearranging the demo chrome (file tabs, control
panel, panel wrapping) is no longer possible. `options.ui` and `colors.css`
still work as before.

`@live-demo/rspress/web` drops from ten exports to two: `Button` and
`LiveDemoStringifiedProps`. `Core`, `Editor`, `FileTabs`, `ControlPanel`,
`Preview`, `CodeRunner`, `ResizablePanels`, `Wrapper`, `LiveDemoProvider`,
and `useLiveDemoContext` are no longer exported.

#### `includeModules` plugin option removed

It existed to make a package available to inline demos, which weren't
scanned for their own imports. Now that they are (see "Newly allowed"
below), any package a demo's source actually imports resolves on its own,
whether inline or external. If your config set `includeModules`, drop it and
make sure the package is imported somewhere in a demo's source instead.

#### Errors are now structured, with a stable message format

Errors thrown by the plugin itself now carry a `code` and a structured
payload instead of freeform text, and the in-preview error overlay renders
that structured info instead of a raw message. Breaking if you pattern-matched
on the old wording, e.g. `"[LiveDemo]: Couldn't resolve..."` is now
`"[live-demo] Import couldn't be resolved\nCouldn't resolve..."`. Runtime
errors thrown by demo code itself are unchanged.

#### A bad named external import now throws where it's used, not before the demo runs

Importing a named export a package doesn't have (a typo, or an export removed
in a newer version) still throws "Import 'x' from 'y' is undefined", but at
the point demo code _reads_ the missing property rather than up front, before
any demo code runs. The error names the property directly, so it points at the
line that's wrong.

One consequence: feature-detecting a missing export by reading it
(`if (pkg.maybeThing)`) now throws instead of seeing `undefined`. Use
`'maybeThing' in pkg`, which is unaffected.

#### Circular local imports follow Node's CommonJS semantics, not a bundler's

Demos with circularly-importing files no longer get bundled by Rollup, which
resolved cycles by hoisting; the runtime now evaluates them through a
CommonJS `require` graph instead. A value read by property access after both
modules finish their own initial evaluation (the common case — mutually
recursive functions) is unaffected. A value used immediately at module-eval
time, before the cycle unwinds, may now see whatever `exports` existed at
that moment instead of the fully-resolved value, same as any other CJS
require cycle.

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

#### `@rspress/core/theme` is no longer an implicit demo import

Demos used to resolve `@rspress/core/theme` without listing it anywhere; now
only `react` and `react/jsx-runtime` do.

Reasoning: `@rspress/core/theme` is a barrel — importing it pulls
Shiki into the eager bundle of every page on the site, not just the page holding the demo. This plugin does not use Shiki at all. A demo can still import it explicitly, just beware of the cost. Measured on the real
deployment (Cloudflare-served, brotli):

- a page with no demo drops from 237.5 KB to 176.1 KB,
- a page with a demo from 471.5 KB to 410.9 KB.

2.4 KB of that is CSS, not JS: keeping the barrel live also kept the styles
for theme components the site never renders (`Banner`, `PageTabs`, the
llms.txt buttons, `Steps`, `SourceCode`). Shiki's own code-block CSS stays —
compile-time highlighting still needs it.

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

#### A syntax error in a demo file now fails the build, not just the demo

Saving a demo file with a syntax error fails the page's MDX compile with
`PARSE_FAILED`, naming the file and the offending line. It previously built
fine and surfaced the error in the demo's own preview pane once the page
loaded. Editing in the browser editor is unchanged — that still shows the
error in the preview.

### Fixed

#### A demo's files, not just its entry, now stay fresh across a page recompile

Previously, only edits to a demo's _entry_ file showed up without a
dev-server restart; a file the entry merely imported stayed frozen at
whatever the dev server saw on startup, however many times you edited it.
Now, whenever a demo's page recompiles, every file in its graph — entry and
imports alike — reflects current disk content. What still needs a nudge:
editing only an imported file doesn't itself cause that recompile (the dev
server doesn't watch a file that's only reached through the plugin's own
resolution, as opposed to one named directly in the MDX); it shows up on the
next recompile triggered another way — editing the entry too, or a restart.
Adding a brand-new demo to a page works without a restart, since editing the
MDX is itself the recompile; the one case that still needs one is a demo
introducing an _external_ import no demo used before.

#### A broken local import at runtime now names the file, instead of a generic bundler error

Editing a demo's code to import a local file that doesn't exist (e.g. a
typo'd path) used to surface Rollup's own unresolved-import message. It now
throws the same `IMPORT_NOT_RESOLVED` error the build step throws for the
same mistake, naming the import and the file that imports it.

#### Only a bare `live` token turns a code block into a demo

The remark transform checked `node.meta?.includes("live")`, so any meta merely
containing the word became an editor — ` ```jsx live-off `, `alive`,
`livestream`, and someone else's quoted value in
` ```jsx title="A live demo" `. Meta is now tokenized with quotes respected, so
only a bare `live` / `playground` token counts; a `file=` value containing
spaces survives too.

#### The first compile starts immediately, not after the edit debounce

Previously the preview waited out the same debounce used for edits before
its first compile. The first compile now starts immediately on load.

#### A demo in an imported `.mdx` partial now resolves its imports

A demo living in a file that isn't itself a page — an `_`-prefixed partial
imported into one, say — was transformed into a working editor, but any
package it imported failed at runtime with "Can't resolve …", since only
routed pages were scanned for imports. Restarting the dev server didn't help
either — a partial is never in the route table, so no run of that scan ever
reached it. Pages' `.mdx` imports are now followed too.

#### Inline demos start loading their imports at mount

Inline demos now carry the same build-time import list external demos do, so
their packages start downloading alongside the compiler instead of after the
first compile.

#### The preview pane shows a loading skeleton

The preview used to stay blank until the first compile finished. It now
shows a loading skeleton. Later edits are unaffected: the last successful
render stays on screen instead of flashing a skeleton on every keystroke.

### Newly allowed

- **The plugin's option types are exported**: `LiveDemoPluginOptions`,
  `ResizablePanelsOptions`, and `FileTabsOptions` can be imported from
  `@live-demo/rspress`, so a config hoisted out of the `liveDemoPluginRspress()`
  call can still be typed.
- **Circular imports** no longer fail the build.
- **Directory imports** resolve to `Button/index.tsx`.
- **`.ts` files with type annotations** now compile; previously only `.tsx`
  got the TypeScript preset.
- **Paths containing a dot** (e.g. `~/my.app/demos/`) resolve correctly.
- **`import type` / `export type ... from`** are no longer treated as
  dependencies, so a type-only external import can no longer fail the build.
  Mixed imports (`import { type A, B }`) are unaffected.
- **Inline ` ```lang live ` demos now resolve their own external imports.**
  Previously only external (`file=`) demos did, and an inline block importing
  anything beyond the pre-defined modules failed unless some other demo on
  the site happened to import the same package (or `includeModules` named
  it — see "Breaking" for its removal).

  ```jsx live
  import { QRCodeSVG } from "qrcode.react"; // now resolves on its own
  ```

  The package still has to be a dependency of your docs site and has to be
  imported by some demo's source at build time. An import typed at runtime,
  while editing a demo in the browser, still can't resolve — the consuming
  bundler needs to see every specifier statically.
