# Test fixtures

`valid/` — demos that should build and run. `invalid/` — demos that should
fail the build (an unresolvable import, a syntax error). `mdx/` — MDX files
that drive `visitFilePaths` and `remarkPlugin`.

A fixture belongs in `invalid/` only if the expected outcome is a thrown
error. Anything merely unusual — a cycle, a diamond, a dot in a directory
name — is a `valid/` fixture, because the point of it is that it *works*.

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
  noticed `babelTransformCode` applied preset-typescript to `.tsx` only. Any
  `.ts` file with a type annotation failed to compile in the browser.

So: a `.tsx` fixture should contain JSX. A `.ts` fixture should contain type
annotations. A `.jsx`/`.js` fixture should contain neither, to prove nothing
over-transforms.

## Prefer fixtures shaped like real usage

Minimal trees hide whole classes of bug. The dependency shapes below each
exist because a flat single-file fixture missed something real:

| Fixture | Shape it pins |
|---|---|
| `valid/Diamond/` | shared dependency reached twice — must not read as circular |
| `valid/SharedNames/` | same base name in different folders — must not collide |
| `valid/IndexDir/` | `./Widget` resolving to `Widget/index.tsx` |
| `valid/dotted.dir/` | a dot in a parent directory — not the file's extension |
| `valid/Precedence/` | competing extensions on disk, so precedence is real |
| `valid/Circular/` | mutually recursive imports — legal, must still run |
| `valid/CircularEntry/` | the *entry file itself* inside the cycle, so the walk revisits its own starting point |
| `mdx/collidingSrc/{a,b}/` | two pages writing the identical `<code src="./SimpleComponent.tsx">` string, resolving to different files — demo data is keyed by the page path *plus* the src (`demoRefKey`), so keying by the raw string alone would collide these |
| `valid/Climbing/` + `valid/shared/` | an entry file importing `../` above its own directory — the key keeps the `../` prefix (see `pathHelpers.ts`'s `resolveRelativePath`) |
