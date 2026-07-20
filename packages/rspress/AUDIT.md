# Audit: `src/node/` (+ `src/plugin/` and the build→runtime seam)

Audited 2026-07-19 against commit `7afaea3` (working tree clean; this file is
the only addition). Compared throughout with the upstream source this package
forked from (`.claude/.tmp/plugin-playground/src/cli/`).

Pruned 2026-07-20: F1–F3, F5 shipped (see CHANGELOG and git history for what
changed); their write-ups are gone from here since a fixed finding has no
ongoing value. This file now only tracks what's still open.

**Verify:** `pnpm check:all` from the repo root (lint/format + build →
typecheck → test). Per `feedback_verify_with_real_syntax` / fixtures README:
green is necessary, not sufficient, for compiler-pipeline changes.

## Decisions — do not re-litigate

| Decision                                                               | Source                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Inline ` ```lang live ` demos don't auto-resolve external imports      | root+pkg CLAUDE.md, `remarkPlugin.ts` comment, `otherImports.mdx` |
| Build time collects reachability only, never bundles                   | `collectDemoFiles.ts` docblock                                    |
| Circular imports are allowed                                           | `collectDemoFiles.ts` docblock, CHANGELOG                         |
| Parse errors fail the build loudly                                     | `readAndParseFile.ts` comment                                     |
| `console.warn`, not `vfile.message` (rspress swallows the latter)      | `remarkPlugin.ts` comment                                         |
| `.tsx → .ts → .jsx → .js` resolution order                             | `constants.ts` docblock, CHANGELOG                                |
| No sandboxing / Windows paths / read-race recovery / option validation | pkg CLAUDE.md "Deliberately not handled"                          |
| Babel 7 type packages stay despite runtime Babel 8                     | pkg CLAUDE.md                                                     |

## Verdict on the architecture

The fork is a substantial improvement over upstream, not a drift from it:
upstream scanned only top-level imports of a single file ("demos are not too
complicated, right?"), ignored parse errors (no check on oxc's error list),
and keyed nothing — this package does real transitive collection, fails
loudly on broken sources, dedupes demos by absolute entry path, and keeps
one definition of the resolution rules (`getPossiblePaths`) used by both the
filesystem (build) and in-memory (runtime) resolvers, with an integration
test spanning the seam. The two-phase design (scan in `routeGenerated`,
rewrite in remark) is forced by a real constraint: the virtual module must
know every external import before rsbuild starts. Its cost is the staleness
class below (F7).

## Findings

Severity: HIGH / MED / LOW. Tag: **breaking** (consumer-visible contract) vs
**internal** (fix is consumer-visible only as improvement → CHANGELOG).

### F6 · LOW · internal — the docs' own `<code src>` syntax is untested

`getStarted.mdx` teaches an **extensionless** src
(`<code src="./external/snippets/basic/Basic" />`); every MDX fixture uses an
explicit `.tsx`. The extensionless path is unit-tested in
`resolveFileInfo`/`pathHelpers`, so risk is low — but the exact syntax the
first page of the docs teaches never flows through `visitFilePaths` in a
test. One fixture closes it.

### F7 · LOW · known/architectural — dev-mode staleness of demo content is documented for one case, silent for the other

The scan runs once per dev-server process. Two staleness cases:

1. New `<code src>` added mid-session → warned (comment in `remarkPlugin.ts`,
   CHANGELOG "Newly warned"). Covered.
2. **Editing an existing demo's source file** → nothing recompiles (the MDX
   inlines content as JSON and imports nothing from the file, so there's no
   watch dependency) and no warning is possible. Not mentioned in any
   user-facing doc.

Minimum fix: document "restart dev to pick up demo-file edits" in the
website guide. Real fix is architectural (collect fresh in remark + a watch
dependency on demo files) and only worth it if rspress's plugin API offers a
hook for it — not investigated here.

### F8 · LOW · internal — consistency nits (one batch)

- `export function` (collectDemoFiles, analyzeModule, resolveFileInfo,
  plugin) vs `export const` arrows (everything else).
- `interface` (`plugin.ts`, `remarkPlugin.ts`) vs `type` (all helpers).
- `getMdxAst` param `filepath` vs `filePath` everywhere else; return type
  written as `ReturnType<Processor["parse"]>` where `Root` is meant.
- `resolveFileInfo.ts:31` loop variable shadows the outer `absolutePath`.
- Dead trailing `return;` at `remarkPlugin.ts:108`.
- `collectDemoFiles`/`analyzeModule` take `params` and dot into it; the
  other helpers destructure.

### F9 · INFO — candidates for "Deliberately not handled" (or small fixes)

- **Case-insensitive filesystems**: `fs.existsSync` resolves a mis-cased
  import on macOS; the same site breaks on Linux CI. Upstream identical.
- `customLayout` regex `LiveDemo\.(jsx?|tsx)$` accepts `.js` but not `.ts`
  (upstream accepted both). Almost certainly moot for a component file;
  note it or widen it.
- `getImport`'s `result.default || result` mishandles a falsy default
  export. Upstream identical. Vanishingly rare.
- `<code src={expression}>` (attribute as JSX expression, not string) is
  silently ignored by both scan and remark — arguably correct, nowhere
  stated.

## Outstanding from the F1 fix

Manual dev-server verification (per `feedback_website_verification`, left for
the user, not automatable): the `web/lazy` loading skeleton doesn't flash badly on
a throttled connection; blocking the compiler chunk surfaces the
`COMPILER_LOAD_FAILED` overlay instead of a blank demo.

## Investigation caveats for next time

- Bundle forensics via regex over minified chunks is error-prone (one false
  reverse-edge appeared mid-analysis). Trust: grepping export **signatures**
  (`ControlPanel:()=>`) to locate a module's chunk, and the literal
  `<script defer src>` tags in the HTML, over hand-rolled module-graph BFS.
- Repro: `pnpm build:web`; `heavy=$(grep -l WebGLRenderer
doc_build/static/js/*.js)`; `grep '<script' doc_build/404.html`.
- Env flake: `build:web` triggers rsbuild's `runDepsStatusCheck` →
  `pnpm install`; right after a `git stash` of `package.json` it can fail
  fetching pnpm's own tarball offline. `pnpm install --lockfile-only` (with
  network) clears it.
