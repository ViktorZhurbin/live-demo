# Major upgrade — working notes

Reference doc for the "bring this dormant repo current" effort. Update this
as phases complete; don't let it drift like the old CLAUDE.md file map did.
See `CLAUDE.md` → "Active initiative" for the one-paragraph summary.

Last updated: 2026-07-17.

## Sequence

1. **✅ Done — Tooling (no publish impact).** CI added (`.github/workflows/ci.yml`:
   install → typecheck → test → build:lib on push/PR to `main`). Husky
   deprecation warning fixed (hook files no longer source the `husky.sh`
   boilerplate). Biome 2.3.9 → 2.5.4 bumped.
2. **⬜ Not started — `@rspress/core` rc.4 → 2.0.18.** Still pinned at
   `2.0.0-rc.4` in both `packages/rspress/package.json` and the website.
   Do this before other dependency bumps — see findings below, it's more
   contained than expected but still needs a real build+render test, not
   just typecheck.
3. **⬜ Not started — Runtime dependency majors** (each needs actual UI
   testing against the website, not just typecheck):
   - `react-resizable-panels` 3 → 4
   - `@mantine/hooks` 8 → 9
   - `@rsbuild/plugin-react` 1.4.2 → 2.1.0 (see note below — confirmed still
     unused anywhere in `src/` or config; may be dead weight, confirm before
     just bumping)
   - `@babel/types` 7 → 8 (dev-only, used for babel plugin type-checking)
   - `@types/mdast` 3 → 4 (dev-only)
4. **🟡 Mostly done — Everything else**, patch/minor bumps, low risk, batch
   together. Already resolved to current via normal lockfile updates: react
   19.2.3→19.2.7, `@codemirror/lang-javascript`, `@uiw/react-codemirror`,
   `@uiw/codemirror-theme-vscode`, `vitest`, `@tabler/icons-react`,
   `react-error-boundary`. Still outdated per `pnpm outdated -r`:
   `oxc-parser`/`@oxc-project/types` (0.103.0 → 0.140.0) and `tsdown`
   (0.18.4 → 0.22.9). `@types/node` has a new major available (24 → 26) —
   out of scope for this pass, revisit separately.
5. **⬜ Not started — Single major version bump + publish** once the above
   lands and the website builds/renders correctly (both `<code src="...">`
   and ` ```jsx live ` demo forms, external-file and multi-file cases).
   Package is still at `2.0.6`.

## `@rspress/core` rc.4 → 2.0.18 findings

Checked by diffing the actual installed rc.4 type declarations against the
2.0.18 tarball from npm (not just changelogs), and by checking what this
plugin's source (`src/plugin/plugin.ts`) actually touches from the package.

**The plugin's real API surface is small** — just the `RspressPlugin` type
and the `"@rspress/core/theme"` subpath import. Both are unchanged between
rc.4 and 2.0.18:
- `RspressPlugin` interface (name, `markdown.remarkPlugins`,
  `markdown.globalComponents`, `builderConfig`, `addRuntimeModules`,
  `routeGenerated`) — identical shape in both versions.
- `RouteMeta` (what `routeGenerated` receives) only gained an additive
  `pureRoutePath` field; `absolutePath`, the field this plugin reads, is
  unchanged.
- `./theme` export path unchanged.
- Plugin doesn't use the deprecated `builderPlugins` field or the removed
  `markdown.mdxRs` option, so the documented v1→v2 migration-guide breaking
  changes don't apply here — this repo was already past that transition at
  rc.4.

**Real risk is the MDX parser swap, not the plugin API.** rspress's own
dependency list changed: `@rspress/mdx-rs` (Rust MDX parser) and
`chokidar`/`tinyglobby`/`tinypool` were dropped; `remark-parse`,
`remark-cjk-friendly(-gfm-strikethrough)`, `unist-util-remove`,
`react-render-to-markdown` were added. This means MDX parsing moved off the
Rust parser onto a remark-based pipeline sometime in the rc.4→2.0.18 window.
No breaking change for `remarkPlugins` is documented, but since
`remarkPlugin.ts`/`getMdxJsxAttribute.ts` walk the MDX AST directly, **this
needs to actually be exercised** — build the website and confirm both
`<code src="...">` and ` ```jsx live ` demo forms still render, especially
any edge cases in JSX attribute parsing.

**Other notes:**
- `engines.node` tightened from `>=20.9.0` to `^20.19.0 || >=22.12.0` — no
  action needed, this repo already requires Node ≥22 (`.nvmrc`, root
  `package.json`).
- `addRuntimeModules` (used in `plugin.ts`) has been `@deprecated` in favor
  of `rsbuild-plugin-virtual-module` since at least rc.4 — still works in
  2.0.18, not urgent, but flag as a followup since a future rspress major
  could remove it.
- rspress core's own internal `@rsbuild/plugin-react` pin moved `~1.4.2` →
  `~2.1.0` between rc.4 and 2.0.18, matching what `pnpm outdated` shows for
  our own devDependency of the same name — **except this repo's
  `@rsbuild/plugin-react` devDependency isn't actually imported anywhere in
  `src/` or `tests/`.** Before bumping it, confirm what it's for (leftover
  scaffold dependency?) — it may be safe to just remove.

## CDN-pinned Babel/Rollup — a separate, easy-to-miss upgrade surface

`htmlTags.ts` pins `@babel/standalone@7.28.3` and `@rollup/browser@4.46.3`
via CDN `<script>` tags — invisible to `pnpm outdated -r`. Confirmed
breakage risk: Babel 8 removes the `.allExtensions`/`.isTSX` preset-typescript
options `babelTransformCode.ts` relies on, so bumping the CDN pin to 8.x
would silently break every `.tsx` demo at runtime with no build-time check.
Both devDependencies now pin the exact CDN versions (see `CLAUDE.md`).
Future phase: reconcile the CDN pins with the dependency-bump work in step
3/4, and consider making `htmlTags.ts` read from `package.json` so drift
shows up in `pnpm outdated`.

## Open questions for a future session

- Is `@rsbuild/plugin-react` still needed as a direct devDependency?
  (Confirmed as of this update: not imported anywhere in `src/` or any
  config file — likely safe to remove instead of bumping.)
- Worth migrating `addRuntimeModules` → `rsbuild-plugin-virtual-module` in
  this pass, or defer to a later cycle?
