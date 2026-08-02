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
- **`[VERIFY]`** marks a claim pinned for later confirmation (e.g. an
  upstream version comparison that may have moved on since). Resolve every
  `[VERIFY]` before release.
- Breaking means a consumer has to edit config, MDX, or demo source to keep
  working. A behavior difference that needs no edit is Changed; a change
  that only made an error message or edge case more correct is Fixed.
-->

## [Unreleased]

What browser downloads, measured on real Cloudflare Pages deploys of the same
9-page docs site (one page with a Three.js demo), brotli, `@rspress/core@2.0.18`:

| page                        | 3.0                                                                           | `plugin-playground@2.0.18`                                                                        | `@live-demo/rspress@2.0.6`                                   |
| --------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| no demo                     | **194.4 KB** — site chrome only, zero plugin bytes                            | 857.5 KB — Monaco preloaded from a CDN on every page of the site                                  | 895.6 KB — Babel, Rollup's JS and a Shiki runtime, all eager |
| demo importing only `react` | **430.5 KB** — CodeMirror + Sucrase, fetched once the demo nears the viewport | 3090.8 KB — Monaco's TypeScript worker, Babel, and a union chunk of every external used site-wide | 2251.0 KB — the same union chunk, plus Rollup's wasm binary  |
| demo importing three.js     | **1311.1 KB** — plus three.js and `@react-three/*`, on this page only         | 3086.2 KB — unchanged; three.js was already on the page above                                     | 2246.2 KB — unchanged, same reason                           |

Both alternatives statically import the union of every external any demo on the
site uses, which is why their two demo rows are the same size and 3.0's aren't.

### Breaking

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

<details>
<summary>Details</summary>

`import React from "react"` still works, and type-only uses (`React.FC`) are
unaffected.

</details>

#### `@rspress/core/theme` is no longer an implicit demo import

<details>
<summary>Details</summary>

Demos used to resolve `@rspress/core/theme` without listing it anywhere; now
only `react` and `react/jsx-runtime` do.

Reasoning: `@rspress/core/theme` is a barrel — importing it pulls Shiki into
the eager bundle of every page on the site, not just the page holding the
demo. This plugin does not use Shiki at all. A demo can still import it
explicitly, just beware of the cost: dropping it made a page with no demo
about a quarter lighter, and it's the largest part of the eager row in the
table above.

Some of that was CSS, not JS: keeping the barrel live also kept the styles
for theme components the site never renders (`Banner`, `PageTabs`, the
llms.txt buttons, `Steps`, `SourceCode`). Shiki's own code-block CSS stays —
compile-time highlighting still needs it.

</details>

#### `window.Babel` / `window.rollup` no longer set globally

<details>
<summary>Details</summary>

Demo runtime now only loads on pages with a demo, `window.Babel`
and `window.rollup` are no longer set globally, and a compiler that fails to
load shows an error in the preview instead of a blank page. The layout loads
its demo runtime lazily behind a new `@live-demo/rspress/web/lazy` entry
point, showing a loading skeleton while it loads and an inline message if it
fails.

</details>

#### `customLayout` removed; related components are no longer exported

<details>
<summary>Details</summary>

The `customLayout` plugin option is gone; the default layout is now the only
layout, and structurally rearranging the demo layout (file tabs, control
panel, panel wrapping) is no longer possible. `options.ui` and `colors.css`
still work as before.

`@live-demo/rspress/web` drops from ten exports to two: `Button` and
`LiveDemoStringifiedProps`. `LiveDemoRoot`, `Editor`, `FileTabs`, `ControlPanel`,
`Preview`, `CodeRunner`, `ResizablePanels`, `Wrapper`, `LiveDemoProvider`,
and `useLiveDemoContext` are no longer exported.

</details>

#### `includeModules` plugin option removed

<details>
<summary>Details</summary>

It existed to make a package available to inline demos, which weren't
scanned for their own imports. Now that they are (see "Newly allowed"
below), any package a demo's source actually imports resolves on its own,
whether inline or external. If your config set `includeModules`, drop it and
make sure the package is imported somewhere in a demo's source instead.

</details>

#### Circular local imports follow Node's CommonJS semantics, not a bundler's

<details>
<summary>Details</summary>

Demos with circularly-importing files no longer get bundled by Rollup, which
resolved cycles by hoisting; the runtime now evaluates them through a
CommonJS `require` graph instead. A value read by property access after both
modules finish their own initial evaluation (the common case — mutually
recursive functions) is unaffected. A value used immediately at module-eval
time, before the cycle unwinds, may now see whatever `exports` existed at
that moment instead of the fully-resolved value, same as any other CJS
require cycle.

</details>

#### Import resolution inside a demo prefers `.tsx`

<details>
<summary>Details</summary>

An extensionless local `import` in a demo's own source (`./Button`) now resolves in
the order `.tsx`, `.ts`, `.jsx`, `.js`, then `Button/index.*`. It was `.ts`,
`.tsx`, `.js`, `.jsx`.
Only affects demos where both `Button.ts` and `Button.tsx` exist side by side.

</details>

#### A syntax error in a demo file now fails the build, not just the demo

<details>
<summary>Details</summary>

Saving a demo file with a syntax error fails the page's MDX compile with
`PARSE_FAILED`, naming the file and the offending line. It previously built
fine and surfaced the error in the demo's own preview pane once the page
loaded. Editing in the browser editor is unchanged — that still shows the
error in the preview.

</details>

### Changed

#### Widget colors now follow the Rspress theme

Every `--live-demo-colors-*` property resolves to an Rspress theme variable
(`--rp-c-bg`, `--rp-code-title-bg`, `--rp-c-text-0`, …) instead of a fixed
palette, so a demo matches the site it's on. The most visible default change:
in light mode the active file tab and view toggle are now `--rp-c-text-0`
rather than blue. Overriding `--live-demo-colors-accent` restores a brand
color, as documented.

New properties: `--live-demo-colors-selected` (the active tab's raised
surface) and `--live-demo-radius` / `--live-demo-radius-control`, which follow
`--rp-radius` — the widget's corners now match Rspress code blocks and tabs.

#### File tabs no longer look like the view selector

File tabs are styled as an Rspress-style tab strip; the Split/Preview/Editor
toggle stays a segmented control. Previously both rendered the same active
pill.

#### `@babel/standalone` replaced with `sucrase`

The runtime compiler is now Sucrase instead of Babel. Same demo behavior
(JSX, TypeScript, the automatic JSX runtime), roughly a tenth of the download:
`@babel/standalone@7.28.3` is 531.8 KB brotli against Sucrase's 44.8 KB. No
action needed for most demos.

<details>
<summary>One difference to know about</summary>

- **Sucrase doesn't validate JSX.** A mismatched closing tag or a duplicate
  prop transpiles and runs whatever that produces, instead of failing with a
  parse error. Codemirror's self-closing tags helps with tag mismatch to some extent.
  Genuine syntax errors (unterminated strings, unbalanced
  braces, and so on) still throw `PARSE_FAILED` with a codeframe.

</details>

#### `@rollup/browser` removed; demos run via a small in-memory CommonJS `require`

The runtime used to Babel-transpile a demo's files, bundle them with
`@rollup/browser`, then evaluate the single bundle. It now transpiles each
file straight to CommonJS and evaluates them lazily through a small
`require` that resolves relative imports against the demo's `files` and
caches each module's `exports`. Same demo behavior.

<details>
<summary>Measured impact</summary>

Rollup's JS and its wasm binary both go, leaving the compiler alone: 341.3 KB
less on a page with a demo, measured when this landed with Babel still the
compiler. Sucrase replaced Babel on top of that, above.

</details>

#### A demo loads when it nears the viewport, not on page load

A demo below the fold no longer loads anything — editor, compiler, or its
external imports — until the reader scrolls within 400px of it. A reader who
never reaches the demo downloads none of it; a page of demos costs whatever
its reader actually looks at. Until then the same loading skeleton that
already covered the runtime chunk holds the demo's place, so nothing shifts
when it swaps in. A demo already in view starts loading as soon as the page
hydrates.

<details>
<summary>Testing note</summary>

Worth knowing if you test your own docs site: an assertion against a
below-the-fold demo now has to scroll to it first, and the elements inside a
demo don't exist until it has loaded — scroll to something outside it (the
demo's own wrapper in your MDX, say).

</details>

#### Error messages are now structured, with a stable format

Errors thrown by the plugin itself now carry a `code` and a structured
payload instead of freeform text, and the in-preview error overlay renders
that structured info instead of a raw message: `"[LiveDemo]: Couldn't
resolve..."` is now `"[live-demo] Import couldn't be resolved\nCouldn't
resolve..."`. Runtime errors thrown by demo code itself are unchanged.

#### A bad named external import now throws where it's used, not before the demo runs

Importing a named export a package doesn't have (a typo, or an export
removed in a newer version) still throws "Import 'x' from 'y' is undefined",
but now at the point demo code _reads_ the missing property rather than up
front, before any demo code runs. One consequence: feature-detecting a
missing export by reading it (`if (pkg.maybeThing)`) now throws instead of
seeing `undefined`. Use `'maybeThing' in pkg`, which is unaffected.

#### `files` keys are demo-relative paths, not base names

`files` is now keyed by each file's path relative to the entry file's
directory (e.g. `buttons/styles.ts`) rather than its base name. Editor tabs
now show the relative path.

### Fixed

#### A demo's files, not just its entry, now stay fresh across a page recompile

Previously, only edits to a demo's _entry_ file showed up without a
dev-server restart — a file the entry merely imported stayed frozen at
whatever the dev server saw on startup. Now, whenever a demo's page
recompiles, every file in its graph reflects current disk content.

<details>
<summary>Caveat</summary>

Editing only an imported (non-entry) file doesn't itself trigger that
recompile — it needs another trigger, like editing the entry or a restart,
since the dev server only watches files named directly in the MDX. A
brand-new demo needs no restart, since editing the MDX is itself the
recompile; introducing a demo's first _external_ import still does.

</details>

#### Two same-named files in different folders no longer overwrite each other

Now that `files` is keyed by path relative to the entry file rather than
base name (see Changed), two files sharing a name in different folders (e.g.
`buttons/styles.ts` and `cards/styles.ts`) no longer collide within the same
demo.

#### A broken local import at runtime now names the file, instead of a generic bundler error

Editing a demo's code to import a local file that doesn't exist (e.g. a
typo'd path) used to surface Rollup's own unresolved-import message. It now
throws the same `IMPORT_NOT_RESOLVED` error the build step throws for the
same mistake, naming the import and the file that imports it.

#### `IMPORT_NOT_RESOLVED` split from unsupported-extension errors, and both now name the importer

A missing file and an import with an unsupported extension (e.g.
`import "./styles.css"`) used to throw the same error; the extension case
now throws `IMPORT_EXTENSION_NOT_SUPPORTED` instead. Both errors now name
the file whose import failed and the MDX page that triggered the scan.

#### Paths containing a dot now resolve correctly

A path like `~/my.app/demos/` previously failed to resolve; it works as
expected now.

#### A type-only external import no longer fails the build

`import type` / `export type ... from` are no longer treated as dependencies
requiring resolution, so a type-only external import can no longer fail the
build. Mixed imports (`import { type A, B }`) are unaffected.

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
routed pages were scanned for imports. Pages' `.mdx` imports are now
followed too.

<details>
<summary>Details</summary>

Restarting the dev server didn't help either — a partial is never in the
route table, so no run of that scan ever reached it.

</details>

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
- **Circular imports** no longer fail the build — the file-collection walk
  that used to error on revisiting a file now just marks it visited and
  continues.

  <details>
  <summary>How this differs from the Breaking entry on circular imports</summary>

  Separate from the runtime evaluation-order change described under
  "Circular local imports follow Node's CommonJS semantics" in Breaking,
  which is about what a resolved cycle's values look like, not whether the
  build tolerates one.

  </details>

- **`.ts` files with type annotations** now compile; previously only `.tsx`
  got the TypeScript preset.
- **Inline ` ```lang live ` demos now resolve their own external imports.**

  ```jsx live
  import { QRCodeSVG } from "qrcode.react"; // now resolves on its own
  ```

  <details>
  <summary>Details</summary>

  Previously only external (`file=`) demos did, and an inline block importing
  anything beyond the pre-defined modules failed unless some other demo on
  the site happened to import the same package (or `includeModules` named
  it — see "Breaking" for its removal).

  The package still has to be a dependency of your docs site and has to be
  imported by some demo's source at build time. An import typed at runtime,
  while editing a demo in the browser, still can't resolve — the consuming
  bundler needs to see every specifier statically.

  </details>

### Compared to `@rspress/plugin-playground@2.0.18`

#### External demos now use `file=` meta

````
```tsx file="./snippets/Component.tsx" live

```
````

<details>
<summary>Details</summary>

`<code src="./snippets/Component.tsx" />` still works, but is deprecated and
logs a one-time console warning pointing at the new syntax; it will be
removed in a future major version. `file=` also supports the `/` (doc-root)
and `<root>/` (cwd) path prefixes.

**`file=` requires an explicit, supported extension** (`file="./Button.tsx"`).
Migrating an extensionless `<code src>` to `file=` needs the extension added
back in.

</details>

#### `playground` accepted as an alias for `live`

<details>
<summary>Details</summary>

A site migrating off `@rspress/plugin-playground` can swap the plugin
registration and keep its existing `playground` fences unchanged.
The two plugins now can't be registered on the same site,
since both would then claim the same fence keyword.

</details>

#### Per-page layout injection

<details>
<summary>Details</summary>

`@rspress/plugin-playground` registers the playground via
`globalComponents`/`globalStyles` and preloads Monaco from a CDN through
`html.tags`, so even a 404 page pays for the demo runtime. This plugin injects
the layout import only on pages that actually have a demo. That's the no-demo
row of the table at the top of this release.

</details>

#### Lazy external imports

<details>
<summary>Details</summary>

`@rspress/plugin-playground`'s virtual module imports every external
statically, so each demo page downloads the union of externals used across
_every_ demo on the site — a heavy dependency from a single demo loads on every
demo page, even one using nothing but `useState`.

This plugin downloads only what a page's own demo actually needs — the two
demo rows of the table at the top of this release, where upstream's are the
same size as each other and this one's differ by exactly the three.js graph.

</details>
