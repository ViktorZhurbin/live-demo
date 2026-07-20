# Audit: `src/node/` (+ `src/plugin/` and the build→runtime seam)

**Verify:** `pnpm check:all` from the repo root (lint/format + build →
typecheck → test). Per `feedback_verify_with_real_syntax` / fixtures README:
green is necessary, not sufficient, for compiler-pipeline changes.

## Decisions — do not re-litigate

| Decision                                                                                                          | Source                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Inline ` ```lang live ` demos don't auto-resolve external imports                                                 | root+pkg CLAUDE.md, `remarkPlugin.ts` comment, `otherImports.mdx` |
| Build time collects reachability only, never bundles                                                              | `collectDemoFiles.ts` docblock                                    |
| Circular imports are allowed                                                                                      | `collectDemoFiles.ts` docblock, CHANGELOG                         |
| Parse errors fail the build loudly                                                                                | `readAndParseFile.ts` comment                                     |
| `console.warn`, not `vfile.message` (rspress swallows the latter)                                                 | `remarkPlugin.ts` comment                                         |
| `.tsx → .ts → .jsx → .js` resolution order                                                                        | `constants.ts` docblock, CHANGELOG                                |
| Editing an existing demo's source file needs a dev-server restart (no rspress watch-file hook exists to fix this) | `remarkPlugin.ts` comment, `website/docs/guide/usage.mdx`         |
| No sandboxing / Windows paths / read-race recovery / option validation                                            | pkg CLAUDE.md "Deliberately not handled"                          |
| Babel 7 type packages stay despite runtime Babel 8                                                                | pkg CLAUDE.md                                                     |

## Findings

Severity: HIGH / MED / LOW. Tag: **breaking** (consumer-visible contract) vs
**internal** (fix is consumer-visible only as improvement → CHANGELOG).

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
