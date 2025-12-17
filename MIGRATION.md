# Package Restructure: Merge into @live-demo/rspress

## Overview

**Goal:** Merge `@live-demo/core` and `@live-demo/plugin-rspress` into a single package `@live-demo/rspress`

**Approach:** Complete merge (Option 1) with package rename
- Move all core source code into plugin-rspress
- Rename package from `@live-demo/plugin-rspress` to `@live-demo/rspress`
- Delete core package
- Breaking change: v2.0.0

**User Benefits:**
- Single package install: `npm install @live-demo/rspress`
- No weird dependency architecture
- Simpler maintenance

---

## Implementation Steps

### 1. Move Core Source Files

**Copy directory structure:**
```bash
packages/core/src/node/     → packages/plugin-rspress/src/node/
packages/core/src/web/      → packages/plugin-rspress/src/web/
packages/core/src/shared/   → packages/plugin-rspress/src/shared/
```

**Files affected:** ~58 files from core/src

**Key directories:**
- `/Users/viktor/code/live-demo/packages/core/src/node/` (remark plugin, helpers)
- `/Users/viktor/code/live-demo/packages/core/src/web/` (React components, compiler)
- `/Users/viktor/code/live-demo/packages/core/src/shared/` (types, utilities)

### 2. Reorganize Plugin Files

**Create new structure:**
```
packages/plugin-rspress/src/
  node/              # From core
  web/               # From core
  shared/            # From core
  rspress/           # New: plugin-specific code
    plugin.ts        # Move from src/plugin.ts
    LiveDemo.tsx     # Move from static/LiveDemo.tsx
    index.ts         # Move from src/index.ts
```

**Delete:**
- `packages/plugin-rspress/static/` directory

### 3. Update Package Configuration

**File: `/Users/viktor/code/live-demo/packages/plugin-rspress/package.json`**

Changes:
```json
{
  "name": "@live-demo/rspress",
  "version": "2.0.0",
  "description": "Transform code blocks into live, editable playgrounds for Rspress",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs"
    },
    "./web": {
      "types": "./dist/web/index.d.ts",
      "import": "./dist/web/index.mjs"
    },
    "./web/index.css": "./dist/web/index.css"
  },
  "dependencies": {
    // Merge from core's dependencies:
    "@codemirror/lang-javascript": "...",
    "@codemirror/state": "...",
    "@codemirror/view": "...",
    "@mantine/hooks": "...",
    "@tabler/icons-react": "...",
    "clsx": "...",
    "oxc-parser": "...",
    "react-error-boundary": "...",
    "react-resizable-panels": "...",
    // Keep existing:
    "react": "^19",
    "react-dom": "^19"
  },
  "peerDependencies": {
    "@mdx-js/mdx": ">=2.3.0",
    "@rspress/core": ">=1.0.0",
    // ... other peer deps from core
  }
}
```

### 4. Update Build Configuration

**File: `/Users/viktor/code/live-demo/packages/plugin-rspress/tsdown.config.mts`**

Build three targets:
```typescript
import { defineConfig } from "tsdown";
import { lightningcssPlugin } from "unplugin-lightningcss";

export default defineConfig([
  // Node-side: remark plugin
  {
    entry: ["./src/node/index.ts"],
    platform: "node",
    outDir: "dist/node",
    external: ["@types/react", "@mdx-js/mdx", "@types/mdast"],
    dts: true,
  },
  // Browser-side: React components
  {
    entry: ["./src/web/index.ts"],
    platform: "browser",
    outDir: "dist/web",
    external: ["@types/react", "_live_demo_virtual_modules"],
    plugins: [lightningcssPlugin()],
    dts: true,
  },
  // Rspress plugin
  {
    entry: ["./src/rspress/index.ts"],
    platform: "node",
    outDir: "dist",
    dts: true,
  },
]);
```

### 5. Update Internal Imports

**File: `/Users/viktor/code/live-demo/packages/plugin-rspress/src/rspress/plugin.ts`**

Change imports from package imports to relative:
```typescript
// Before:
import {
  type DemoDataByPath,
  getVirtualModulesCode,
  htmlTags,
  type LiveDemoPluginOptions,
  remarkPlugin,
  visitFilePaths,
} from "@live-demo/core";

// After:
import {
  type DemoDataByPath,
  getVirtualModulesCode,
  htmlTags,
  type LiveDemoPluginOptions,
  remarkPlugin,
  visitFilePaths,
} from "../node/index.js";
```

Update globalComponents path:
```typescript
// Before:
globalComponents: [
  customLayout ?? path.join(__dirname, "../static/LiveDemo.tsx"),
]

// After:
globalComponents: [
  customLayout ?? path.join(__dirname, "./LiveDemo.tsx"),
]
```

**File: `/Users/viktor/code/live-demo/packages/plugin-rspress/src/rspress/LiveDemo.tsx`**

Update imports:
```tsx
// Before:
import "@live-demo/core/web/index.css";
import {
  LiveDemoCore,
  type LiveDemoStringifiedProps,
} from "@live-demo/core/web";

// After:
import "@live-demo/rspress/web/index.css";
import {
  LiveDemoCore,
  type LiveDemoStringifiedProps,
} from "@live-demo/rspress/web";
```

### 6. Update Workspace Configuration

**File: `/Users/viktor/code/live-demo/pnpm-workspace.yaml`**

Remove core package:
```yaml
packages:
  - "packages/plugin-rspress"
  - "website"
```

**File: `/Users/viktor/code/live-demo/packages/plugin-rspress/tsconfig.json`**

Add path aliases (copy from core):
```json
{
  "compilerOptions": {
    "paths": {
      "node/*": ["./src/node/*"],
      "web/*": ["./src/web/*"],
      "shared/*": ["./src/shared/*"]
    }
  }
}
```

### 7. Update Website Configuration

**File: `/Users/viktor/code/live-demo/website/rspress.config.ts`**

```typescript
// Before:
import { liveDemoPluginRspress } from "@live-demo/plugin-rspress";

// After:
import { liveDemoPluginRspress } from "@live-demo/rspress";
```

**File: `/Users/viktor/code/live-demo/website/package.json`**

```json
{
  "dependencies": {
    "@live-demo/rspress": "workspace:*"
  }
}
```

Remove `@live-demo/core` dependency.

### 8. Update All Website Demo Files

Update imports in all demo files from `@live-demo/core/web` to `@live-demo/rspress/web`:

**Files to update:**
- `/Users/viktor/code/live-demo/website/docs/guide/external/snippets/basic/Basic.tsx`
- `/Users/viktor/code/live-demo/website/docs/guide/external/snippets/multiFile/*.tsx`
- Any custom layout examples in docs

```tsx
// Before:
import { Button } from "@live-demo/core/web";

// After:
import { Button } from "@live-demo/rspress/web";
```

### 9. Update Tests

**File: `/Users/viktor/code/live-demo/packages/plugin-rspress/vitest.config.ts`**

Copy from core:
```typescript
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      node: path.resolve(__dirname, "./src/node"),
      web: path.resolve(__dirname, "./src/web"),
      shared: path.resolve(__dirname, "./src/shared"),
    },
  },
});
```

**Move test files:**
```bash
packages/core/tests/ → packages/plugin-rspress/tests/
```

Update package.json scripts:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 10. Clean Up

**Delete entire core package:**
```bash
rm -rf /Users/viktor/code/live-demo/packages/core
```

**Update root package.json scripts** (if any reference core)

**Update CLAUDE.md** to reflect new single-package structure

### 11. Build and Test

```bash
# From root
pnpm install                  # Update lockfile
pnpm -F @live-demo/rspress build   # Build merged package
pnpm -F @live-demo/rspress test    # Run tests
pnpm -F website build         # Test website builds
pnpm -F website dev           # Test local dev server
```

---

## Critical Files

### To Move/Copy
- `/Users/viktor/code/live-demo/packages/core/src/**/*` → `/Users/viktor/code/live-demo/packages/plugin-rspress/src/`
- `/Users/viktor/code/live-demo/packages/core/tests/**/*` → `/Users/viktor/code/live-demo/packages/plugin-rspress/tests/`

### To Modify
- `/Users/viktor/code/live-demo/packages/plugin-rspress/package.json` - Rename, merge deps
- `/Users/viktor/code/live-demo/packages/plugin-rspress/tsdown.config.mts` - Triple build targets
- `/Users/viktor/code/live-demo/packages/plugin-rspress/src/rspress/plugin.ts` - Relative imports
- `/Users/viktor/code/live-demo/packages/plugin-rspress/src/rspress/LiveDemo.tsx` - Package name
- `/Users/viktor/code/live-demo/pnpm-workspace.yaml` - Remove core
- `/Users/viktor/code/live-demo/website/rspress.config.ts` - Package name
- `/Users/viktor/code/live-demo/website/package.json` - Dependency name
- `/Users/viktor/code/live-demo/CLAUDE.md` - Update architecture docs

### To Delete
- `/Users/viktor/code/live-demo/packages/core/` - Entire directory
- `/Users/viktor/code/live-demo/packages/plugin-rspress/static/` - Directory

---

## Migration Guide for Users

### Breaking Changes in v2.0.0

**Package renamed:**
```bash
# Before
npm install @live-demo/core @live-demo/plugin-rspress

# After
npm install @live-demo/rspress
```

**Import path changed in config:**
```typescript
// rspress.config.ts
// Before:
import { liveDemoPluginRspress } from "@live-demo/plugin-rspress";

// After:
import { liveDemoPluginRspress } from "@live-demo/rspress";
```

**Custom layout users** (if any):
```tsx
// Before:
import "@live-demo/core/web/index.css";
import { LiveDemoCore } from "@live-demo/core/web";

// After:
import "@live-demo/rspress/web/index.css";
import { LiveDemoCore } from "@live-demo/rspress/web";
```

**No other code changes required** - Plugin API remains identical.

---

## Testing Checklist

- [ ] Build succeeds: `pnpm build`
- [ ] All 86 tests pass: `pnpm test`
- [ ] Website builds: `pnpm -F website build`
- [ ] Website dev server works: `pnpm -F website dev`
- [ ] Live demos render correctly (check localhost:5173)
- [ ] Code editing works in demos
- [ ] Dark mode toggle works
- [ ] External file imports work
- [ ] Error handling displays properly
- [ ] TypeScript types resolve correctly

---

## Post-Merge Tasks

1. **Publish v2.0.0** to npm
2. **Deprecate old packages:**
   ```bash
   npm deprecate @live-demo/core "Merged into @live-demo/rspress@2.0.0"
   npm deprecate @live-demo/plugin-rspress "Renamed to @live-demo/rspress@2.0.0"
   ```
3. **Update documentation** on website
4. **Update README** with new package name
5. **Create GitHub release** with migration guide
6. **Update demo sites** to use new package
