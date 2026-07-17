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
2. **✅ Done — `@rspress/core` rc.4 → 2.0.18.**
3. **⬜ Not started — Runtime dependency majors** (each needs actual UI
   testing against the website, not just typecheck):
   - `react-resizable-panels` 3 → 4
   - `@mantine/hooks` 8 → 9
   - `@rsbuild/plugin-react` 1.4.2 → 2.1.0 (see note below — confirmed still
     unused anywhere in `src/` or config; may be dead weight, confirm before
     just bumping)
   - `babel` 7 → 8
4. Still outdated per `pnpm outdated -r`:
   `oxc-parser`/`@oxc-project/types` (0.103.0 → 0.140.0). `@types/node` has
   a new major available (24 → 26) — out of scope for this pass, revisit
   separately.
5. **⬜ Not started — Single major version bump + publish** once the above
   lands and the website builds/renders correctly (both `<code src="...">`
   and ` ```jsx live ` demo forms, external-file and multi-file cases).
   Package is still at `2.0.6`.

**Other notes:**
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
