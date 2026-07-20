# Audit: `src/node/` (+ `src/plugin/` and the build→runtime seam)

Audited 2026-07-19 against commit `7afaea3` (working tree clean; this file is
the only addition). Compared throughout with the upstream source this package
forked from (`.claude/.tmp/plugin-playground/src/cli/`).

Pruned 2026-07-20: F1–F3, F5–F6 shipped (see CHANGELOG and git history for
what changed); their write-ups are gone from here since a fixed finding has
no ongoing value. This file now only tracks what's still open.

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

## Findings

Severity: HIGH / MED / LOW. Tag: **breaking** (consumer-visible contract) vs
**internal** (fix is consumer-visible only as improvement → CHANGELOG).

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
