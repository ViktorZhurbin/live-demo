# Does CJS actually simplify things?

Right now, independent of both Sucrase and single-file. This is the part of the pitch that's genuinely right, worth separating from everything it was bundled with.

## Current pipeline

Rollup's actual job in the pipeline:

- `pluginResolveModules` resolves specifiers against the files record using `getPossiblePaths`
- `pluginBabelTransform` hands each module to Babel
- `pluginBabelTransformImportsExports` runs `babelPluginTraverse` over the bundled output to turn surviving external imports into `__get_import` calls and normalize exports to `exports.default`
- `getFnFromString` does `new Function(getImport, exports, code)`

That last step is already a CommonJS module invocation: you have a `module.exports` stub, an injected `require`-equivalent, and a function body. Rollup's entire contribution is flattening N modules into 1 before you do the thing you were going to do anyway.

## The alternative: per-module require loop

Replace Rollup with a require loop over the same files record:

- `pluginResolveModules` becomes the body of `customRequire`, calling the identical `pathHelpers` functions. Not a rewrite, a relocation.
- `pluginBabelTransform` becomes a direct `babelTransformCode` call, no Rollup plugin wrapper.
- `pluginBabelTransformImportsExports` and most of `babelPluginTraverse` disappear. Babel's own `transform-modules-commonjs` turns `import { useState } from "react"` into `require("react")`, and your require decides: in files → evaluate that module; otherwise → `getImport`. The custom AST visitor only exists because Rollup left externals as ESM imports in the output.
- `bundleCode.ts` and `@rollup/browser` go away entirely.

**Result:** four files deleted, one dependency dropped, no new dependency added, Babel's codeframes preserved, multi-file demos keep working. ~350 KB saved (Rollup JS + wasm).

## Three wrinkles

All real, none fatal:

1. **Externals must be resolved before evaluation.** `getImport` is deliberately synchronous. Today `bundleCode` awaits `loadImports(chunk.imports)` using Rollup's report of what it externalized. Without Rollup: transpile every module first, gather the `require()` targets from the output, await `loadImports(...)`, then run. Build-time `externalImports` already reaches `CodeRunner` for `prefetchImports`, covering the unedited case; the scan covers the edited case.

2. **Circular imports change semantics.** `collectDemoFiles.ts` explicitly documents that cycles work because Rollup handles them correctly. A CJS require graph gives Node's partial-exports behavior instead. Obscure, rarely hit in demos, but it's a documented guarantee that would quietly change.

3. **`export const App` support.** `babelPluginTraverse`'s `ExportSpecifier` visitor lets demo authors write `export const App` instead of `export default`, with last-export-wins pinned by a test. Under CJS that becomes a few lines in the runner: take `module.exports.default`, else the last key of `module.exports`. Insertion order gives you last-wins for free. The visitor becomes plain JS instead of an AST pass—a simplification, not a loss.

## Impact on single-file simplification

After dropping Rollup, single-file only saves the require loop (~40 lines). Most of the value from dropping multi-file is already banked. This is why the TODO entry checks this ordering first.
