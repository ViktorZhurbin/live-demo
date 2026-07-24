# Architecture review (external, 2026-07-22)

The review that started the 3.0 compiler work. **Trimmed 2026-07-23**: items that
have since been decided, implemented, or measured were removed from here once their
rationale was recorded elsewhere.

Are these still open or have been solved?

### 1. The two-parse build phase causes the dev-mode staleness you've had to document

`visitFilePaths` parses all MDX once per dev-server process in `routeGenerated`;
`remarkPlugin` parses again per compile and reads results through
`demoDataByRef`/`demoRefKey`. Consequences: the "restart the dev server" limitation, the
`console.warn` fallback for un-scanned demos, and the refKey machinery itself.

The scan exists for one reason: the externals union must be known to generate the
virtual module. But the _file collection_ doesn't need to happen in the scan. The remark
plugin has `vfile.path` and can run `collectDemoFiles` itself, synchronously, at compile
time. That would:

- delete `demoDataByRef`, `demoRefKey`, and the warning path entirely;
- make newly added `<code src>` blocks work without a restart;
- leave `routeGenerated` with only the cheap job of collecting the externals union (it
  still needs to parse MDX for that, but only to extract import specifiers).

Edits to existing demo files are a separate gap: the MDX module doesn't depend on them,
so rspack never recompiles. Worth researching whether rspress exposes the loader's
`addDependency` to remark plugins (or via a small rspack loader shim); if it does, both
staleness problems die together. If it doesn't, a dev-only chokidar watcher that touches
the referencing MDX file is a pragmatic fallback.

This is the largest remaining item from the original review, and the only one whose
payoff is purely code deletion plus a documented wart disappearing — which makes it a
better fit for this project's constraints than anything on the payload side.

### 2. The inline-demo externals asymmetry is smaller than it looks

Inline demos not resolving their own externals is documented as intended, but note
upstream _does_ parse inline block imports during its scan. The scan already walks every
MDX AST; parsing the fenced code's import statements there (same `oxc-parser`, same
`extractSourcePath`) would make `import { DateTime } from "luxon"` in an inline block
just work, at near-zero cost.

What stays impossible is _typing a new import at runtime_ that no demo registered, and
that's inherent to the virtual-module design (the consuming bundler must see specifiers
statically). If you ever want to lift that, the only real option is a CDN fallback
(esm.sh-style) at runtime, which trades away self-containment; keep it off by default or
skip it.
