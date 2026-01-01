# Live Demo - Interactive Examples for Documentation

## Overview

This Rspress plugin transforms code blocks and files into interactive, editable examples that run in the browser. Think CodeSandbox embedded directly in your documentation.

**Example Usage:**
```mdx
<!-- External file demo -->
<code src="./examples/Button.tsx" />

<!-- Inline code demo -->
```jsx live
function App() {
  return <div>Hello World!</div>
}
```
```

Both become interactive editors where users can edit code and see results instantly.

## Architecture

### Two-Phase System

**Phase 1: Build Time (Node.js)**
- Scan MDX files for interactive example components
- Build module graphs (analyze dependencies)
- Generate virtual module for external imports
- Inject data into MDX AST

**Phase 2: Runtime (Browser)**
- User edits code in Monaco editor
- Babel transpiles JSX/TS → JS in browser
- Rollup bundles modules in browser
- Code executes in sandboxed iframe

### Why This Design?

- **Build-time analysis**: Extract dependencies once, not on every page load
- **Browser bundling**: No server needed for code execution
- **Virtual modules**: External packages (react, lodash) bundled once and reused

## Build Process Flow

```
1. Rspress build starts
   ↓
2. visitFilePaths() scans all MDX files
   ↓
3. For each <code src="./Demo.tsx" />:
   - buildModuleGraph() creates dependency graph
   - Collects external imports (react, etc.)
   ↓
4. Generate virtual module with all external imports
   ↓
5. remarkPlugin() transforms MDX AST:
   - <code src="..."/> → <LiveDemo files={...} />
   - ```jsx live → <LiveDemo files={...} />
   ↓
6. MDX compilation produces React components
```

## Module Graph System

**Inspired by webpack and Rollup bundlers.**

### Why Module Graphs?

When you write `<code src="./Button.tsx" />`, Button.tsx might import other files:
```tsx
// Button.tsx
import { theme } from './theme'
import { Icon } from './Icon'
```

We need to include ALL files, not just Button.tsx. The module graph tracks this.

### How It Works

**Step 1: Analyze Module (analyzeModule.ts)**
- Parse file with OXC (fast Rust parser)
- Extract all import/export statements
- Return Module object with dependencies

**Step 2: Build Graph (buildModuleGraph.ts)**
- Start with entry file
- Use BFS (breadth-first search) to traverse dependencies
- Cache modules to analyze each file once
- Detect circular imports with O(1) Set lookup
- Assign sequential IDs (0, 1, 2, ...)
- Build mapping: relative path → module ID

**Output:**
```typescript
{
  modules: [
    {id: 0, fileName: 'Button.tsx', dependencies: ['./theme', 'react'], mapping: {'./theme': 1}},
    {id: 1, fileName: 'theme.ts', dependencies: [], mapping: {}}
  ],
  externalImports: Set(['react'])
}
```

### Key Optimizations

- **O(1) circular detection**: Use Set instead of array.includes()
- **Module caching**: Each file analyzed once (Map lookup)
- **Sequential IDs**: Deterministic output for testing

## Runtime Process Flow

```
1. User edits code in Monaco editor
   ↓
2. Babel.transform() - Transpile JSX/TS → JS
   ↓
3. Rollup.rollup() - Bundle modules
   - Uses custom plugin to resolve imports
   - Mapping: require('./Button') → modules[1]
   ↓
4. Execute bundled code in iframe
   ↓
5. Render result
```

## Key Files & Responsibilities

### Build Time (Node.js)

**visitFilePaths.ts**
- Scans MDX files for `<code src="..." />`
- Builds module graph for each interactive example
- Collects external imports

**buildModuleGraph.ts**
- Core bundler logic (BFS algorithm)
- Analyzes file dependencies
- Detects circular imports
- Returns: modules array + external imports

**analyzeModule.ts**
- Parses single file to AST
- Extracts import/export statements
- Returns Module with dependencies

**remarkPlugin.ts**
- Transforms MDX AST during compilation
- `<code src="..."/>` → `<LiveDemo files={...} />`
- Injects demo data as props

**getVirtualModulesCode.ts**
- Generates virtual module code
- Re-exports all external packages
- Injected into node_modules at build time

### Runtime (Browser)

**LiveDemo.tsx**
- React component (Monaco editor + preview)
- Manages code editing state
- Triggers compilation on changes

**compiler/ directory**
- Babel transpilation (JSX/TS → JS)
- Rollup bundling (modules → single file)
- Custom plugins for import resolution

## Important Patterns

### Module Structure

```typescript
type Module = {
  id: number              // Sequential: 0, 1, 2, ...
  fileName: string        // "Button.tsx"
  absolutePath: string    // "/path/to/Button.tsx"
  dependencies: string[]  // ["react", "./theme"]
  content: string         // Raw source code
  mapping: Record<string, number>  // {"./theme": 1}
}
```

### Import Resolution

**Build time:**
```typescript
// "./Button" → check these paths:
["./Button.tsx", "./Button.ts", "./Button.jsx", "./Button.js",
 "./Button/index.tsx", "./Button/index.ts", ...]
```

**Runtime (browser):**
```typescript
// Custom Rollup plugin resolves:
require("./Button") → modules[mapping["./Button"]]
```

### Virtual Module Pattern

**Problem:** User code imports external packages (react, lodash)
**Solution:** Create virtual module that re-exports everything

```javascript
// Generated virtual module (_live_demo_virtual_modules)
import * as i_0 from 'react';
import * as i_1 from 'lodash';

const importsMap = new Map([
  ['react', i_0],
  ['lodash', i_1]
]);

export default (name) => importsMap.get(name);
```

**Usage in bundled code:**
```javascript
const getImport = require('_live_demo_virtual_modules');
const React = getImport('react');
```

## File Organization

```
packages/rspress/
├── src/
│   ├── node/              # Build-time code (Node.js)
│   │   ├── visitFilePaths.ts      # Scan MDX files
│   │   ├── remarkPlugin.ts        # Transform MDX AST
│   │   ├── htmlTags.ts            # Inject CDN scripts
│   │   └── helpers/
│   │       ├── buildModuleGraph.ts    # Module graph builder
│   │       ├── analyzeModule.ts       # Single file analyzer
│   │       ├── moduleTypes.ts         # Type definitions
│   │       ├── resolveFileInfo.ts     # Path resolution
│   │       ├── getFilesAndAst.ts      # File reader + parser
│   │       ├── getMdxAst.ts           # MDX parser
│   │       └── getVirtualModulesCode.ts  # Virtual module generator
│   │
│   ├── web/               # Runtime code (Browser)
│   │   ├── components/
│   │   │   └── LiveDemo.tsx       # Main React component
│   │   └── compiler/
│   │       ├── rollup/            # Rollup bundling
│   │       └── babel/             # Babel transpilation
│   │
│   └── shared/            # Shared types/utils
│       ├── types.ts
│       ├── constants.ts
│       └── pathHelpers.ts
│
└── tests/                 # Unit tests
    ├── node/              # Build-time tests
    └── web/               # Runtime tests
```

## Common Operations

### Adding New File Type Support

1. Update `PathWithAllowedExt` type in shared/types.ts
2. Update `getPossiblePaths()` in shared/pathHelpers.ts
3. Update Babel configuration in web/compiler/babel/

### Debugging Module Graph Issues

1. Check `buildModuleGraph.test.ts` for similar cases
2. Add console.log to see what's queued: `console.log(queue.map(m => m.fileName))`
3. Verify file resolution: `resolveFileInfo()` throws if file not found
4. Check circular import error message for dependency chain

### Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test buildModuleGraph.test.ts

# Watch mode
pnpm test --watch
```

## Performance Characteristics

### Build Time
- **Module analysis**: O(n) where n = number of modules
- **Circular detection**: O(1) per dependency check
- **File I/O**: Each file read once (cached)

### Bundle Size
- **Babel**: ~1MB (loaded from CDN)
- **Rollup**: ~1MB (loaded from CDN)
- **Plugin code**: ~50KB (bundled with Rspress)

### Runtime Performance
- **Initial compilation**: ~100-500ms (first edit)
- **Subsequent edits**: ~50-200ms (Babel + Rollup)
- **Large files (>1000 lines)**: May be slower

## Limitations & Trade-offs

1. **No CSS modules**: Only supports inline styles or external CSS
2. **No dynamic imports**: All imports must be static
3. **No Node.js APIs**: Runs in browser sandbox
4. **File size**: Large interactive examples (>100KB) may be slow

## Troubleshooting

**"Couldn't resolve import"**
- Check file extension exists (.tsx, .ts, .jsx, .js)
- Verify relative path is correct
- Only .js(x) and .ts(x) supported

**"Circular import detected"**
- Check the import chain in error message
- Refactor to break the cycle
- Use dependency injection or lazy loading

**"Can't resolve external package"**
- Package must be in dependencies
- Virtual module generation may have failed
- Check browser console for import errors

## Contributing

When modifying code:
1. Add tests for new functionality
2. Update comments (explain WHY, not just WHAT)
3. Run `pnpm test` before committing
4. Keep performance in mind (O(n) vs O(n²))

## Related Documentation

- OXC Parser: https://oxc-project.github.io/
- Babel Standalone: https://babeljs.io/docs/babel-standalone
- Rollup Browser: https://rollupjs.org/
- Rspress: https://rspress.dev/
