import { ensureCompilerLoaded } from "~web/compiler/loadCompiler";

// In production Babel is a code-split async chunk the browser imports on
// demand (see loadCompiler.ts). Load it once up front so the compiler
// pipeline's getBabel() is populated in this Node env; the memo makes
// runCode's own ensureCompilerLoaded() call a no-op.
await ensureCompilerLoaded();
