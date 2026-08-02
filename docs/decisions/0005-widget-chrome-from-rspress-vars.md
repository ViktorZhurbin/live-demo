# 0005. Widget chrome derives from Rspress's theme variables

- **Status:** Accepted, 2026-08-02.
- **Scope:** `packages/rspress/src/web/ui/` and `src/web/lazyFallback.css` —
  the chrome around a demo (toolbar, file tabs, panel surfaces, borders,
  radii). Not the demo's own rendered output, and not syntax highlighting.
- **Depends on:** nothing. Does **not** resolve the isolation question
  (iframe / shadow DOM) that used to sit beside it in
  `docs/explorations/.open-questions.md` — that one is about demo CSS
  escaping, and stays open.

## Context

The widget's palette was nine literal colors copied from Sandpack's theme
into `ui/LiveDemoRoot/colors.css`. It was internally consistent and had no
relationship to the page it renders on: a demo looked like an embedded
application, and the two palettes could drift apart whenever Rspress
retuned its own without anything noticing.

Rspress publishes its theme as CSS custom properties on `html`
(`dist/theme/styles/vars/*.css`) and keys dark mode off a class its own
toggle applies. Those are the same variables its `<Tabs>` and code blocks
are built from — the components a demo sits next to in a docs page.

## Decision

**Every chrome value is `var(--rp-*, <literal>)`, and the literal is
Rspress's own value for that mode.** Not a second palette that approximates
it — a fallback for the case where the theme CSS isn't loaded at all, which
is the package used outside Rspress. The two can't drift, because there is
only one intended value and the fallback is a copy of it.

The `--live-demo-colors-*` names stay. They're the documented theming
surface (`website/docs/guide/customization.mdx`), so they're an alias layer
over `--rp-*`, not a thing to delete. Overriding one still works and still
wins.

**Take the tokens, never the class names or the markup.** `.rp-tabs__*` is
`@rspress/core`'s internal CSS structure with no stability guarantee, and
its `<Tabs>` implementation uses `<div onClick>` with no role, `tabIndex`,
or key handling. The variables are the published part; the DOM isn't.

**File tabs and the view selector must not look alike.** File tabs pick one
of N files — the same "switch which content is shown" meaning Rspress tabs
have, so they get the tab-strip treatment: a `--rp-code-title-bg` band,
borderless labels, the selected one raised onto `--live-demo-colors-selected`
with a soft ring. The view selector (Split / Preview / Editor) switches
layout mode, and Split shows both panes at once — it isn't selecting one of
N contents. It stays a bordered segmented control.

That divergence is the point, not a side effect. Before this, both rendered
the identical active pill because both were the shared `Button`.

## Consequences

- `Button` keeps its border. `ToggleButtonGroup` joins segments by zeroing
  inner corners, which only reads as one group if the segments have edges —
  so "make Button look like a tab" is specifically ruled out.
- `FileTabs` no longer uses `Button`. It renders a plain `<button>`, which
  `website/e2e/multiFileTabsSwitch.spec.ts` depends on
  (`getByRole("button", …)`).
- New token `--live-demo-colors-selected`: the raised active surface needs
  `--rp-c-bg` in light and `--rp-c-bg-soft` in dark, because dark chrome is
  _lighter_ than the dark page background. A single alias can't express that.
  `--live-demo-radius` and `--live-demo-radius-control` are new too, following
  `--rp-radius` and `--rp-radius-small`.
- The light-mode active foreground is no longer blue. It's `--rp-c-text-0`,
  matching Rspress tabs. This is the most visible default change; the
  documented `--live-demo-colors-accent` override still restores a brand
  color.
- `ui/Editor/Editor.css` forces the CodeMirror surface to
  `--live-demo-colors-surface1`. The vscode themes hardcode `#1e1e1e` in
  dark, which would leave the largest surface in the widget lighter than
  everything around it. Syntax colors are left alone — they're why that
  theme is there.
- Standalone (no Rspress theme CSS) renders the light-mode fallbacks in both
  modes, because nothing puts `.dark` on `html`. Acceptable: the fallbacks
  exist so the widget _renders_, not so it themes itself.

## Verification

`pnpm check:all` catches none of this — nothing in the suite asserts on a
color, a radius, or a background. A light-mode screenshot with all three
view-selector segments visible is the check that matters: light is where
the segment borders (`--rp-c-divider-light`) sit closest to the toolbar
they're drawn on, and dark has contrast to spare either way.
