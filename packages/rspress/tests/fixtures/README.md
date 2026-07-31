# Test fixtures

`valid/` contains demos that should build and run. `invalid/` contains demos that should
fail the build (an unresolvable import, a syntax error). `mdx/` contains MDX files
that drive `visitFilePaths` and `remarkPlugin`.

A fixture belongs in `invalid/` only if the expected outcome is a thrown
error. Anything merely unusual (a cycle, a diamond, a dot in a directory
name) is a `valid/` fixture, because the point of it is that it *works*.

## Write the syntax the extension implies

A fixture with the right *extension* proves nothing unless it contains the
right *syntax*. Two real bugs shipped past a fully green suite because of
this:

- Every `.tsx` fixture happened to contain no JSX (only interfaces and
  types), so the whole JSX transform path was untested. Babel 8 changed
  `@babel/preset-react`'s default `runtime` to `"automatic"`, which emits an
  implicit `react/jsx-runtime` import the virtual-module system never sees.
  Every JSX demo broke at runtime; `pnpm verify` stayed green.
- Every `.ts` fixture happened to contain no type annotations, so nobody
  noticed the runtime transform applied TypeScript stripping to `.tsx` only
  (`babelTransformCode`, since replaced by `transformCode.ts`). Any `.ts`
  file with a type annotation failed to compile in the browser.

So: a `.tsx` fixture should contain JSX. A `.ts` fixture should contain type
annotations. A `.jsx`/`.js` fixture should contain neither, to prove nothing
over-transforms.

## Prefer fixtures shaped like real usage

Minimal trees hide whole classes of bug. The dependency shapes below each
exist because a flat single-file fixture missed something real:

| Fixture | Shape it pins |
|---|---|
| `valid/Diamond/` | shared dependency reached twice (must not read as circular) |
| `valid/SharedNames/` | same base name in different folders (must not collide) |
| `valid/IndexDir/` | `./Widget` resolves to `Widget/index.tsx` |
| `valid/dotted.dir/` | dot in a parent directory (not the file's extension) |
| `valid/Precedence/` | competing extensions on disk; precedence is real |
| `valid/Circular/` | mutually recursive imports (legal, must still run) |
| `valid/CircularEntry/` | the *entry file itself* inside the cycle, so the walk revisits its own starting point |
| `mdx/collidingSrc/{a,b}/` | two pages with identical `file="./SimpleComponent.tsx"` strings resolving to different files. `remarkPlugin` resolves each reference fresh against its own page's directory (`path.dirname(vfile.path)`), so nothing keyed by the raw string alone could collide these. |
| `valid/Climbing/` + `valid/shared/` | entry file importing `../` above its own directory. The key keeps the `../` prefix (see `pathHelpers.ts`'s `resolveRelativePath`). |
| `mdx/rootPrefixDemo.mdx` | `file=` using the `<root>/` prefix — resolved against `process.cwd()`, not the MDX file's own directory. |
| `mdx/docRootPrefixDemo.mdx` | `file=` using the `/` prefix — resolved against the doc root, passed in as `docRoot` rather than derived from disk layout. |
| `mdx/fileMetaWithoutLive.mdx` | a `file=` block missing the bare `live` word — must be left alone by both the scan and the transform, since core still renders it as a plain file code block. |
| `mdx/deprecatedSrcDemo.mdx` + `mdx/extensionlessSrc.mdx` | the deprecated `<code src>` alias, kept on the old syntax on purpose (see `remarkPlugin.ts`'s deprecated branch) rather than migrated to `file=`. |
| `mdx/inlineDemoWithImports.mdx` | inline blocks contribute their own imports to the virtual module (`collectInlineImports`): externals collected, relative and type-only imports skipped, across two fences and two languages on one page. |
| `mdx/inlineDemoBrokenSyntax.mdx` | an unparseable inline block must not fail the scan — a syntax error in a code fence stays a runtime preview error rather than becoming a failed docs build. |
| `mdx/partialHost.mdx` + `mdx/_partialDemo.mdx` | a demo living in a file that is never a route. `_`-prefixed files are excluded from core's route table but still compiled when a page imports them, so the scan has to follow `.mdx` imports to reach them. The host also imports one `.mdx` that doesn't exist, which the scan must step over rather than throw on. |
