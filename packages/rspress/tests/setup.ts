import { ensureCompilerLoaded } from "~web/compiler/loadCompiler";

// In production Babel + Rollup are code-split async chunks the browser
// imports on demand (see loadCompiler.ts). Load them once up front so the
// compiler pipeline's getBabel()/getRollup() are populated in this Node env;
// the memo makes bundleCode's own ensureCompilerLoaded() call a no-op.
await ensureCompilerLoaded();
