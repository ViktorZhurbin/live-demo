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
3. **Runtime dependency majors** (each needs actual UI
   testing against the website, not just typecheck):
   - `react-resizable-panels` 3 → 4 — ✅ done (2026-07-18).
   - `@mantine/hooks` 8 → 9 — ✅ done (2026-07-18).
   - `babel` 7 → 8 — ✅ done (2026-07-17), see CDN section below
4. **✅ Done — `oxc-parser`/`@oxc-project/types` 0.103.0 → 0.140.0.**
5. **✅ Done — `@types/node` 24.9.2 → 22** - `@types/node`'s major should track the
   lowest Node version this plugin claims to support.
6. **⬜ Not started — Single major version bump + publish** once the above
   lands and the website builds/renders correctly (both `<code src="...">`
   and ` ```jsx live ` demo forms, external-file and multi-file cases).
   Package is still at `2.0.6`.

**Other notes:**
- **✅ Done (2026-07-17) — `addRuntimeModules` → `rsbuild-plugin-virtual-module`.**
  `plugin.ts` now registers `pluginVirtualModule({ virtualModules: {
  _live_demo_virtual_modules: ... } })` via `builderConfig.plugins` instead
  of the deprecated `addRuntimeModules` hook.

## CDN-pinned Babel/Rollup — a separate, easy-to-miss upgrade surface

`htmlTags.ts` pins `@babel/standalone@8.0.4` and `@rollup/browser@4.62.2`
via CDN `<script>` tags — invisible to `pnpm outdated -r`. Both
devDependencies pin the exact CDN versions (see `CLAUDE.md`).

- **✅ Done (2026-07-17) — `@rollup/browser` 4.46.3 → 4.62.2.** Still Rollup
  4.x, no plugin-API impact (see git history for details).
- **✅ Done (2026-07-17) — `@babel/standalone` 7.28.3 → 8.0.4.** Type
  packages deliberately stay on Babel 7 — see `CLAUDE.md` for why.

Future phase: consider making `htmlTags.ts` read from `package.json` so
CDN-pin drift shows up in `pnpm outdated`.

