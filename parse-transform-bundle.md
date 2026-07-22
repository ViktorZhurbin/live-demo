You probably don't need to leave Babel to get most of Babel's size back. @babel/standalone is 564 KB gzip because it bundles every preset and plugin Babel ships — preset-env, all of it. You need the parser plus transform-typescript, transform-react-jsx, and transform-modules-commonjs. A custom browser bundle of @babel/core with exactly those should land far below standalone. I'd guess 150–250 KB gzip, but that's a guess and it's exactly the kind of number I just told you not to repeat unmeasured.

The unknown there is whether @babel/core bundles cleanly for the browser with esbuild, since @babel/standalone exists precisely to paper over Node assumptions. That's the thing to check, and it's a contained experiment.

Worth a look too: this repo already runs oxc at build time (readAndParseFile, @oxc-project/types), and you're on oxfmt/oxlint. If oxc's transformer has a usable wasm build, it's the option most aligned with the tooling you've already chosen. Treat that as "check," not "consider." esbuild-wasm and swc-wasm are both multi-megabyte, so they're out on size regardless.

Suggested order

1. Drop Rollup, keep Babel, CJS require loop. ~350 KB, four files deleted, one dependency gone, no new risk. Best ratio in this entire thread, and the only change that ends with less code and fewer dependencies than it started with.
2. Then measure a minimal custom Babel bundle. If it lands near 200 KB, the Sucrase question is moot and you keep a maintained transpiler with good error messages.
3. Sucrase only if step 2 disappoints, with the maintenance risk accepted explicitly.
4. Single-file: reassess after step 1, when it's worth much less.
