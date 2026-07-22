- [ ] Would switching from the magic `<code src>` to explicit `<LiveDemo src>` reduce code complexity? Pros and Cons (one being UX)
- [ ] Review architecture, file organization
- [ ] Review exposed API surface
- [ ] Delegate styles to rspress theme as much as possible: use its variables, components, etc.
- [ ] Explore building a minimalist in-browser bundler. For fun, and because
      the current Babel + Rollup pipeline is by far the heaviest thing the
      plugin ships.
- [ ] Investigate single-file-only demos to reduce overhead.

  The measured cost today: on a demo page, the compiler (`@babel/standalone`
  - `@rollup/browser` + its wasm) is ~75% of all JS a reader downloads, and
    it's a fixed cost — identical for a counter demo and a three.js scene.
    Multi-file support is what forces a real bundler into the browser.

  Dropping it would collapse most of `src/web/compiler/`: no `bundleCode.ts`,
  no `pluginResolveModules`, no module graph. It would also largely dissolve
  the build→runtime seam documented in `packages/rspress/CLAUDE.md` (the
  posix-relative `files` keys shared by `collectDemoFiles.ts` and
  `pluginResolveModules.ts`), which is currently the one contract spanning
  both phases and the thing most likely to break silently.

  Two caveats before committing:

  - Check first whether Rollup can be dropped _without_ dropping multi-file
    support, by transpiling each module to CJS and running a small in-memory
    `require` loop over the existing `files` record. If that works, most of
    the win is available while multi-file demos keep working, and single-file
    becomes a much smaller, separable simplification.
  - Multi-file demos are a real feature (`website/docs/guide/external/`
    shows them off). Decide whether they're worth their cost as a _product_
    question, not only a bundle-size one. It's also one of the pain points with the
    official playground plugin which makes the whole project valuable to someone.
