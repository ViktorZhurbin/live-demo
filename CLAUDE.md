# Live Demo Plugin - LLM Context Guide

## Project Overview

This is a **monorepo for an Rspress plugin** that transforms code blocks into live, editable playgrounds with real-time preview. It compiles code entirely in the browser using Babel and Rollup loaded from CDN.

**Demo:** https://live-demo.pages.dev

## Critical Architecture Concepts

### Build-Time vs Runtime Separation

**Build-Time (Node.js - `/packages/core/src/node/`)**
- Remark plugin transforms MDX code blocks into `<LiveDemo>` components
- **oxc-parser** parses TypeScript/JSX to analyze imports
- Recursively resolves relative imports to build file graphs
- Generates virtual module for external dependency resolution

**Runtime (Browser - `/packages/core/src/web/`)**
- User edits code → 800ms debounce → Rollup bundles → Babel transforms → Execute as Function
- Uses `@rollup/browser` and `@babel/standalone` loaded from CDN
- Custom Rollup plugins handle in-memory file resolution and JSX/TS transformation

**Key Principle:** Build-time uses fast Rust parser (oxc), runtime uses battle-tested JS tools (Babel/Rollup).

## Technology Stack

- **TypeScript 5.9** - Strict mode enabled
- **React 19** - JSX transform (no React imports needed)
- **pnpm workspaces** - Monorepo with 3 packages
- **tsdown** - TypeScript bundler for library builds
- **Biome** - Formatting and linting (no ESLint/Prettier)
- **CodeMirror** - Code editor with VS Code themes
- **react-resizable-panels** - Split pane layout
- **Vitest** - Testing framework with dual environment support

## Testing

### Test Infrastructure
- **Framework:** Vitest v4 with native ESM support
- **Environments:** Node (build-time tests) + jsdom (runtime tests)
- **Location:** `/packages/core/tests/`
- **Run tests:** `pnpm test` (root) or `pnpm -F @live-demo/core test`
- **Watch mode:** `pnpm test:watch`
- **Coverage:** `pnpm test:coverage`

### Test Structure
```
packages/core/tests/
├── fixtures/              # Test fixtures (valid/invalid components, MDX files)
│   ├── valid/            # Working React components
│   ├── invalid/          # Broken code for error testing
│   └── mdx/              # MDX file examples
├── shared/               # Shared utility tests (pathHelpers, parseProps)
├── node/helpers/         # Build-time logic tests
│   ├── resolveFileInfo.test.ts
│   ├── getFilesAndAst.test.ts
│   ├── getFilesAndImports.test.ts
│   └── getVirtualModulesCode.test.ts
├── web/compiler/         # Runtime compilation tests
│   ├── babel/            # Babel transformation tests
│   └── rollup/           # Rollup bundling tests
└── integration/          # End-to-end tests
```

### Current Test Coverage (as of December 2025)
- **78 tests passing, 4 skipped** covering all critical paths
- **8 test files** across shared, node (build-time), and web (runtime) directories
- **Shared utilities (24 tests):** Path resolution, import detection, JSON parsing
- **Build-time (31 tests):** File resolution, AST parsing (oxc-parser), import graph traversal, virtual module generation
- **Runtime (23 tests):** Rollup module resolution, code execution pipeline, Function constructor usage
- **Integration:** End-to-end tests (future work)

### Key Test Areas
1. **Path Resolution** - Ensures Node and browser resolve files identically
2. **Import Analysis** - Tests recursive import resolution and external dependency detection
3. **oxc-parser Integration** - Validates TypeScript/JSX parsing
4. **Virtual Module Generation** - Tests dependency injection code generation
5. **Babel Transformations** - Tests import/export rewriting and React auto-import
6. **Rollup Bundling** - Tests in-browser module bundling

### Writing Tests
**Pattern for new tests:**
1. Create test file in appropriate directory (shared/node/web/integration)
2. Import from path aliases (`node/*`, `web/*`, `shared/*`)
3. Use test fixtures from `tests/fixtures/` for realistic test data
4. Test behavior, not implementation details
5. Add `.skip` for tests requiring features not yet implemented

**Example:**
```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "shared/myModule";

describe("myFunction", () => {
  it("should handle valid input", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

### Test Coverage Breakdown
**Shared Utilities (24 tests):**
- ✅ Path helpers: extension inference, relative imports, getPossiblePaths
- ✅ Props parsing: JSON stringification/parsing with special characters

**Build-Time / Node (31 tests):**
- ✅ Virtual module generation: import mapping, module escaping
- ✅ File resolution: extension inference, nested paths, error handling
- ✅ AST parsing: oxc-parser integration, TypeScript support
- ✅ Import graph traversal: recursive resolution, local vs external detection

**Runtime / Web (23 tests):**
- ✅ Rollup module resolution: in-memory files, relative imports, consistency with node-side
- ✅ Code execution: Function constructor, closure handling, getImport injection

### Known Gaps (Future Work)
- ⏭️ Circular import detection not implemented (test skipped)
- ⏭️ Error handling for invalid JSON parsing (test skipped)
- ⏭️ Error handling for oxc-parser failures (test skipped)
- ⏭️ Babel transformation tests (requires window.Babel mock setup)
- ⏭️ MDX remark plugin tests (complex, requires unified/remark mocking)
- ⏭️ Integration tests for full pipeline (MDX → virtual modules → runtime)
- ⏭️ Component testing with React Testing Library

## Project Structure

```
packages/
  core/                          # @live-demo/core
    src/
      node/                       # Build-time: Remark plugin, file parsing
      web/                        # Browser: React components, compiler
        context/                  # LiveDemoContext state
        hooks/                    # localStorage, active file hooks
        ui/                       # UI components
          editor/                 # CodeMirror + file tabs
          preview/                # Preview pane + compiler
            compiler/             # Rollup/Babel bundling logic
          liveDemo/               # Core LiveDemo component
      shared/                     # Types and utilities
  plugin-rspress/                # @live-demo/plugin-rspress
    src/plugin.ts                # Plugin registration
    static/LiveDemo.tsx          # Default layout component
website/                         # Documentation site
  docs/                          # MDX docs with live demos
  rspress.config.ts              # Plugin configuration
```

## TypeScript & Code Conventions

### TypeScript Configuration
- **Strict mode:** Always enabled
- **Path aliases** (in core package only):
  - `node/*` → `/packages/core/src/node/*`
  - `web/*` → `/packages/core/src/web/*`
  - `shared/*` → `/packages/core/src/shared/*`
- **Module resolution:** "bundler"
- **JSX:** `react-jsx` transform

### Coding Standards
- **NO non-null assertions** (`object!.property`) - Use proper type guards instead
- **NO createElement** in regular code (exception: dynamic component rendering in compiler)
- **Functional components only** - No class components
- **CSS Modules** for styling with `clsx` for conditional classes
- **Context + hooks** for state management (no Redux/Zustand)

### Naming Conventions
- Components: `PascalCase` (`LiveDemoCore.tsx`)
- Hooks: `camelCase` with `use` prefix (`useActiveCode`)
- CSS Modules: `ComponentName.module.css`
- Types: `PascalCase`, often suffixed (`Props`, `Options`)

## Key Patterns

### State Management
**LiveDemoContext** provides global state:
- `files` - Current file contents (editable)
- `activeFile` - Currently selected file
- `updateFiles()` - Update file contents
- `fullscreen` - Fullscreen toggle
- `isDark` - Theme preference
- `options` - Plugin configuration

**localStorage hooks** persist user preferences:
- Panel layout (`useLocalStorageView`)
- Code wrapping toggle (`useLocalStorageWrapCode`)

### File Organization
- **Colocation:** Components live with their CSS/tests in same directory
- **Barrel exports:** `index.ts` re-exports for clean imports
- **Separation:** `node/` (build-time), `web/` (browser), `shared/` (universal)

## Important Build Details

### Dual Package Exports
Core package exports both Node and browser code:
- `@live-demo/core` - Node-side remark plugin
- `@live-demo/core/web` - Browser-side React components

### Build Commands
- `pnpm build:lib` - Build core + plugin packages
- `pnpm build:web` - Build lib + website
- `pnpm format` - Run Biome (auto-runs on pre-commit)

### tsdown Configuration
Each package has `tsdown.config.mts`:
- Core: Dual build (node + browser targets)
- Plugin: Single build (node target)
- Uses `unplugin-lightningcss` for CSS bundling

## Compiler Implementation Details

### Rollup Browser Bundling (`/web/ui/preview/compiler/rollup/`)
Custom plugins for in-memory bundling:
- `pluginResolveModules` - Resolves files from in-memory map
- `pluginBabelTransform` - Transforms JSX/TSX to JS
- `pluginBabelTransformImportsExports` - Normalizes imports/exports

### Babel Transformation (`/web/ui/preview/compiler/babel/`)
- Uses `window.Babel` loaded from CDN
- Presets: React + TypeScript
- Transforms JSX/TSX files before execution

### Virtual Module System
- Build-time generates `_live_demo_virtual_modules`
- Provides `getImport()` function for external dependencies
- Maps imports like `react`, `rspress/theme` to global objects

## Common Development Tasks

### Adding a UI Component
1. Create in `/packages/core/src/web/ui/YourComponent/`
2. Include `YourComponent.tsx` and `YourComponent.module.css`
3. Export from `ui/index.ts`
4. Use LiveDemoContext hook for state if needed

### Modifying Build-Time Logic
1. Edit files in `/packages/core/src/node/`
2. Update `remarkPlugin.ts` for MDX transformations
3. Update helpers in `node/helpers/` for file parsing

### Adding New Configuration Options
1. Add type to `/packages/core/src/shared/types.ts`
2. Update `LiveDemoOptions` interface
3. Handle in `LiveDemoContext` provider
4. Document in website docs

### Debugging Tips
- Browser console shows: `Bundled in Xms`
- Compiler errors appear in preview via ErrorBoundary
- Build errors from oxc-parser show at build time
- Use React DevTools to inspect LiveDemoContext

## Critical Dependencies

**Runtime (CDN-loaded):**
- `window.Babel` - JSX/TS transformation
- `window.rollup` - Module bundling
- `_live_demo_virtual_modules` - Virtual import resolver

**Peer Dependencies:**
- React ≥17.0.0
- MDX ≥2.3.0
- Rspress ≥1.0.0 (for plugin users)

## Design Philosophy

1. **No Server Required:** All compilation happens in browser
2. **Fast Build Times:** Use Rust parser (oxc) at build time
3. **Reliable Runtime:** Use battle-tested Babel/Rollup in browser
4. **Zero Config:** Works out of box with sensible defaults
5. **Extensible:** Can be adapted for other doc frameworks

## Anti-Patterns to Avoid

- Don't use non-null assertions - TypeScript strict mode prevents runtime errors
- Don't create new dependencies on external APIs - Keep bundling self-contained
- Don't break build-time/runtime separation - Node APIs in `node/`, browser APIs in `web/`
- Don't add unnecessary abstractions - Keep it simple
- Don't skip error boundaries - User code can throw errors

## Testing

Currently no test suite. Error handling relies on:
- React Error Boundary in preview pane
- Build-time validation via oxc-parser
- Runtime validation in compiler pipeline
