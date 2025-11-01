---
spec: S36
phase: 2
title: TypeScript Configuration
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 2: TypeScript Configuration

## Overview

Configure TypeScript compiler and esbuild bundler to produce a CommonJS bundle compatible with VSCode's extension host. This phase sets up the build pipeline that transforms TypeScript source code into a single JavaScript file that VSCode can load.

## Prerequisites

- Phase 1 completed (project initialized with dependencies installed)
- Working directory: `D:\projects\lineage\vscode-extension\`

## Tasks

### Task 1: Create tsconfig.json

Configure TypeScript compiler for VSCode extension development.

**File**: `vscode-extension/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "declaration": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

**Key Options Explained**:
- `target: "ES2020"`: Output modern JavaScript (VSCode uses Node 16+)
- `module: "commonjs"`: Required for VSCode extension host (uses require())
- `strict: true`: Enable all strict type checking (catches bugs early)
- `outDir: "./dist"`: Compiled output directory (will be bundled by esbuild)
- `sourceMap: true`: Generate .map files for debugging
- `declaration: false`: Don't generate .d.ts files (not publishing as library)

**Expected Outcome**: TypeScript compiler configured for extension development

**Validation**: Run `npx tsc --showConfig` - should display merged configuration

**References**:
- TypeScript Compiler Options: https://www.typescriptlang.org/tsconfig
- VSCode Extension TypeScript: https://code.visualstudio.com/api/working-with-extensions/bundling-extension

---

### Task 2: Create esbuild.js Build Script

Create build script using esbuild for fast bundling.

**File**: `vscode-extension/esbuild.js`

```javascript
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'info',
    plugins: [
      // Plugin to log build completion
      {
        name: 'build-logger',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length > 0) {
              console.error('❌ Build failed with errors');
            } else {
              console.log('✅ Build complete');
            }
          });
        },
      },
    ],
  });

  if (watch) {
    await ctx.watch();
    console.log('👀 Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
```

**Key Configuration Explained**:
- `entryPoints: ['src/extension.ts']`: Start bundling from extension.ts
- `bundle: true`: Combine all imports into single file
- `format: 'cjs'`: Output CommonJS (required by VSCode)
- `platform: 'node'`: Target Node.js runtime (not browser)
- `outfile: 'dist/extension.js'`: Output path (matches package.json main field)
- `external: ['vscode']`: Don't bundle vscode module (provided by extension host)
- `minify: production`: Minify only for production builds
- `sourcemap: !production`: Generate sourcemaps for development

**Expected Outcome**: Build script ready to bundle extension

**Validation**: Run `node esbuild.js --help` - should not error (though no output expected)

**References**:
- esbuild API: https://esbuild.github.io/api/
- VSCode Extension Bundling: https://code.visualstudio.com/api/working-with-extensions/bundling-extension

---

### Task 3: Create .vscode/tasks.json

Configure VSCode build task for keyboard shortcuts (Ctrl+Shift+B).

**File**: `vscode-extension/.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$tsc-watch",
      "isBackground": true,
      "presentation": {
        "reveal": "never"
      },
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "label": "npm: watch"
    },
    {
      "type": "npm",
      "script": "compile",
      "problemMatcher": "$tsc",
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      },
      "group": "build",
      "label": "npm: compile"
    }
  ]
}
```

**Expected Outcome**: VSCode recognizes build tasks

**Validation**:
- Press Ctrl+Shift+B in VSCode
- Should show task options: "npm: watch" and "npm: compile"

**Note**: These tasks reference the `scripts` in package.json:
- `npm run watch` → Continuous rebuild on file changes
- `npm run compile` → Single build

**References**:
- VSCode Tasks: https://code.visualstudio.com/docs/editor/tasks

---

### Task 4: Test Build Script (Should Fail Expected)

Attempt to run the build script - it will fail because `src/extension.ts` doesn't exist yet. This confirms the build pipeline is configured correctly.

```bash
npm run compile
```

**Expected Outcome**: Build fails with error:

```
✘ [ERROR] Could not resolve "src/extension.ts"

  esbuild.js:10:16:
    10 │   entryPoints: ['src/extension.ts'],
       ╵                 ~~~~~~~~~~~~~~~~~~~

  The file "src/extension.ts" does not exist.
```

**Validation**: Error message confirms esbuild is looking for `src/extension.ts` (correct behavior)

**Why This Is Good**: The error proves:
1. esbuild.js script runs successfully
2. Configuration is syntactically correct
3. Build pipeline is ready for Phase 3 (when we create extension.ts)

---

### Task 5: Verify TypeScript Compiler Works

Test TypeScript compiler directly (will also fail, but differently).

```bash
npx tsc --noEmit
```

**Expected Outcome**: No output (or similar error about missing extension.ts)

**Validation**: Command completes without TypeScript configuration errors

**Note**: `--noEmit` flag checks types without generating output files (useful for CI/CD)

---

### Task 6: Create .vscode/ Directory

Ensure .vscode/ directory exists for next task (launch.json will be created in Phase 3).

```bash
mkdir .vscode 2>/dev/null || true
```

**Expected Outcome**: Directory `.vscode/` exists (may already exist from Task 3)

**Note**: The `|| true` ensures command succeeds even if directory already exists

---

### Task 7: Verify Build Configuration

Confirm all build-related files are in place.

```bash
ls -la
```

**Expected Files**:
```
vscode-extension/
├── .vscode/
│   └── tasks.json          ✓ VSCode build tasks
├── src/                    ✓ Source directory (empty)
├── node_modules/           ✓ Dependencies
├── esbuild.js              ✓ Build script
├── package.json            ✓ Extension manifest with scripts
├── tsconfig.json           ✓ TypeScript configuration
├── .gitignore              ✓ Git exclusions
└── .vscodeignore           ✓ Extension packaging exclusions
```

**Validation**: All files listed above exist

---

## Completion Criteria

- [x] File `tsconfig.json` exists with CommonJS module and ES2020 target
- [x] File `esbuild.js` exists with correct entry point and external configuration
- [x] File `.vscode/tasks.json` exists with watch and compile tasks
- [x] TypeScript compiler runs without configuration errors (`npx tsc --noEmit`)
- [x] Build script runs and reports missing `src/extension.ts` (expected error)
- [x] VSCode recognizes build tasks (Ctrl+Shift+B shows task options)

## Troubleshooting

**Issue**: `npx tsc --showConfig` shows incorrect module type
- **Solution**: Verify `"module": "commonjs"` in tsconfig.json (not "esnext" or "es2020")

**Issue**: esbuild.js fails with syntax error
- **Solution**: Check for typos, ensure valid JavaScript syntax (copy file exactly as shown)

**Issue**: VSCode doesn't show build tasks
- **Solution**: Reload VSCode window (Ctrl+Shift+P → "Developer: Reload Window")

**Issue**: npm scripts not found
- **Solution**: Verify `scripts` section in package.json includes "compile" and "watch"

## Next Phase

Proceed to **Phase 3: Extension Entry Point** to create the actual extension code.

Phase 3 will create:
- `src/extension.ts` - Extension entry point with activate/deactivate functions
- `.vscode/launch.json` - Debug configuration for Extension Development Host
- Test extension activation in VSCode

**Key Milestone**: After Phase 3, the extension will successfully activate and log messages!
