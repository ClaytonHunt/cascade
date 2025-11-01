---
spec: S36
phase: 3
title: Extension Entry Point
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 3: Extension Entry Point

## Overview

Implement the core extension entry point with activate/deactivate lifecycle functions and output channel logging. This phase creates the actual extension code that VSCode will execute, completing the minimal viable extension scaffold.

## Prerequisites

- Phase 1 completed (project initialized)
- Phase 2 completed (TypeScript and build configuration)
- Working directory: `D:\projects\lineage\vscode-extension\`

## Tasks

### Task 1: Create src/extension.ts

Implement the extension entry point with lifecycle functions.

**File**: `vscode-extension/src/extension.ts`

```typescript
import * as vscode from 'vscode';

// Output channel for extension logging
let outputChannel: vscode.OutputChannel;

/**
 * Called when the extension is activated.
 * Activation events are defined in package.json (currently: onStartupFinished).
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('Lineage Planning');
  context.subscriptions.push(outputChannel);

  // Log activation message
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('Lineage Planning & Spec Status Extension');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(`Activated at: ${new Date().toLocaleString()}`);
  outputChannel.appendLine(`Extension version: ${getExtensionVersion()}`);
  outputChannel.appendLine(`VSCode version: ${vscode.version}`);
  outputChannel.appendLine('');
  outputChannel.appendLine('✅ Extension activated successfully');
  outputChannel.appendLine('');
  outputChannel.appendLine('Next steps:');
  outputChannel.appendLine('  - S37: Workspace activation logic');
  outputChannel.appendLine('  - S38: File system watcher');
  outputChannel.appendLine('  - S39: YAML frontmatter parser');
  outputChannel.appendLine('  - S40: Frontmatter cache layer');
  outputChannel.appendLine('='.repeat(60));

  // Log to console as well (visible in Debug Console)
  console.log('Lineage Planning extension activated');
}

/**
 * Called when the extension is deactivated.
 * Cleanup resources here.
 */
export function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine('');
    outputChannel.appendLine('👋 Extension deactivated');
    outputChannel.dispose();
  }

  console.log('Lineage Planning extension deactivated');
}

/**
 * Get the extension version from package.json.
 */
function getExtensionVersion(): string {
  const extension = vscode.extensions.getExtension('lineage.lineage-planning-extension');
  return extension?.packageJSON?.version ?? 'unknown';
}
```

**Code Explanation**:

**Output Channel**:
- Created once in `activate()` and stored in module-level variable
- Registered with `context.subscriptions` for automatic cleanup
- Name "Lineage Planning" matches extension display name (consistency)

**Activation Function**:
- Entry point when extension activates (triggered by `onStartupFinished` event)
- Creates output channel for logging
- Logs detailed activation information (timestamp, versions, next steps)
- Receives `ExtensionContext` with utilities for managing extension lifecycle

**Deactivation Function**:
- Called when extension is deactivated (VSCode shutdown or extension disable)
- Cleanup opportunity for future resources (watchers, caches, etc.)
- Disposes output channel (though VSCode handles this automatically via subscriptions)

**Helper Function**:
- `getExtensionVersion()` reads version from package.json via VSCode API
- Useful for debugging (users can report which version they're using)

**Expected Outcome**: Extension code ready to compile

**Validation**: Run `npx tsc --noEmit` - should compile without errors

**References**:
- Extension API: https://code.visualstudio.com/api/references/vscode-api
- Extension Context: https://code.visualstudio.com/api/references/vscode-api#ExtensionContext
- Output Channel: https://code.visualstudio.com/api/references/vscode-api#OutputChannel

---

### Task 2: Build Extension

Compile TypeScript and bundle with esbuild.

```bash
npm run compile
```

**Expected Outcome**: Build succeeds with output:

```
✅ Build complete

  dist/extension.js      XX.Xkb
  dist/extension.js.map  XX.Xkb

⚡ Done in XXXms
```

**Validation**:
- File `dist/extension.js` exists
- File `dist/extension.js.map` exists
- No errors in build output

**Note**: Initial build creates the dist/ directory. File size should be ~10-20KB (small because we're only using VSCode API).

---

### Task 3: Create .vscode/launch.json

Configure VSCode debugger to launch Extension Development Host.

**File**: `vscode-extension/.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "npm: compile",
      "sourceMaps": true
    },
    {
      "name": "Run Extension (Watch Mode)",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "npm: watch",
      "sourceMaps": true
    }
  ]
}
```

**Configuration Explained**:

**"Run Extension"** (Standard Mode):
- Builds extension once before launching
- Use for final testing before committing

**"Run Extension (Watch Mode)"** (Development Mode):
- Rebuilds automatically on file changes
- Use during active development (faster iteration)

**Key Fields**:
- `type: "extensionHost"`: Launch VSCode extension host (separate VSCode window)
- `extensionDevelopmentPath`: Path to extension being developed
- `outFiles`: Location of compiled JS files (for breakpoint mapping)
- `preLaunchTask`: Build task to run before debugging
- `sourceMaps: true`: Enable TypeScript debugging (breakpoints in .ts files work)

**Expected Outcome**: VSCode recognizes debug configurations

**Validation**: Open Run and Debug panel (Ctrl+Shift+D) - should show "Run Extension" and "Run Extension (Watch Mode)" options

**References**:
- Debugging Extensions: https://code.visualstudio.com/api/working-with-extensions/testing-extension#debugging-the-extension
- Launch Configurations: https://code.visualstudio.com/docs/editor/debugging#_launch-configurations

---

### Task 4: Test Extension Activation

Launch Extension Development Host and verify activation.

**Steps**:
1. Open `vscode-extension/` folder in VSCode (File → Open Folder)
2. Press **F5** (or click Run → Start Debugging)
3. Wait for Extension Development Host to launch (new VSCode window opens)
4. In the new window, open View → Output
5. Select "Lineage Planning" from the dropdown

**Expected Outcome**: Output channel shows:

```
============================================================
Lineage Planning & Spec Status Extension
============================================================
Activated at: 10/12/2025, 3:45:12 PM
Extension version: 0.1.0
VSCode version: 1.95.0

✅ Extension activated successfully

Next steps:
  - S37: Workspace activation logic
  - S38: File system watcher
  - S39: YAML frontmatter parser
  - S40: Frontmatter cache layer
============================================================
```

**Validation**:
- Output channel "Lineage Planning" appears in dropdown
- Activation message displays with timestamp
- Extension version shows 0.1.0
- No errors in Debug Console (original VSCode window)

**Troubleshooting**: If Extension Development Host doesn't launch, check:
- Build succeeded (run `npm run compile` manually)
- launch.json exists in .vscode/
- VSCode is opened to vscode-extension/ folder (not parent directory)

---

### Task 5: Test Extension Deactivation

Close Extension Development Host and verify deactivation logging.

**Steps**:
1. In Extension Development Host window, close the window (X button or Alt+F4)
2. Return to original VSCode window (with extension source code)
3. Check Debug Console (Ctrl+Shift+Y)

**Expected Outcome**: Debug Console shows:

```
Lineage Planning extension deactivated
```

**Validation**: Deactivation message appears (confirms cleanup logic runs)

**Note**: Output channel in Extension Development Host also shows "👋 Extension deactivated" before window closes (may be brief).

---

### Task 6: Test Breakpoint Debugging

Verify TypeScript debugging works with source maps.

**Steps**:
1. Open `src/extension.ts`
2. Set a breakpoint on line with `outputChannel.appendLine('✅ Extension activated successfully')`
   - Click in left gutter (red dot appears)
3. Press **F5** to launch Extension Development Host
4. Debugger should pause at breakpoint

**Expected Outcome**:
- Execution pauses at breakpoint
- Variables panel shows `context`, `outputChannel`, etc.
- Can step through code with F10 (step over) or F11 (step into)

**Validation**: Breakpoint is hit, source maps correctly map to TypeScript file

**Why This Matters**: Debugging will be essential for S37-S40 (workspace logic, file watching, parsing, caching). Confirming source maps work now saves frustration later.

**Troubleshooting**: If breakpoint is gray/hollow (not hit):
- Verify `sourcemap: true` in esbuild.js
- Check dist/extension.js.map exists
- Rebuild with `npm run compile`

---

### Task 7: Test Watch Mode

Verify automatic rebuilding on file changes.

**Steps**:
1. Stop debugger if running (Shift+F5)
2. Press Ctrl+Shift+B → Select "npm: watch"
3. Terminal shows "👀 Watching for changes..."
4. Edit `src/extension.ts`:
   - Change activation message from "✅ Extension activated successfully" to "✅ Extension activated successfully (WATCH MODE TEST)"
5. Save file (Ctrl+S)
6. Terminal shows "✅ Build complete" (automatic rebuild)
7. Press F5 to launch Extension Development Host
8. Check output channel

**Expected Outcome**:
- File changes trigger automatic rebuild
- Extension Development Host shows updated message "(WATCH MODE TEST)"

**Validation**: Message updates without manually running `npm run compile`

**Note**: Watch mode is useful during development. Keep it running in a terminal while coding.

**Cleanup**: Change message back to original (remove "WATCH MODE TEST")

---

### Task 8: Create README.md

Document extension purpose and development workflow.

**File**: `vscode-extension/README.md`

```markdown
# Lineage Planning & Spec Status Extension

VSCode extension providing visual status tracking for the Lineage planning and specification system. Displays hierarchical progress through icons and badges in the file explorer.

## Features

- **Status Visualization**: Icons/badges for planning items (Epics, Features, Stories, Bugs)
- **Spec Tracking**: Progress indicators for specification phases and tasks
- **Frontmatter-Driven**: Reads status from YAML frontmatter in markdown files
- **Real-Time Updates**: File system watching for instant status changes

## Development

### Prerequisites

- Node.js 16+
- VSCode 1.80.0+

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build extension:
   ```bash
   npm run compile
   ```

### Running

Press **F5** to launch Extension Development Host with the extension loaded.

### Debugging

- Set breakpoints in `src/extension.ts`
- Press F5 to start debugging
- Use Debug Console to view logs

### Watch Mode

Run `npm run watch` for automatic rebuilds on file changes.

## Project Structure

```
vscode-extension/
├── src/
│   └── extension.ts       # Extension entry point
├── dist/                  # Compiled output (gitignored)
├── .vscode/
│   ├── launch.json        # Debug configuration
│   └── tasks.json         # Build tasks
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript configuration
└── esbuild.js             # Build script
```

## Implementation Status

- ✅ **S36**: Extension Project Scaffold
- ⏳ **S37**: Workspace Activation Logic
- ⏳ **S38**: File System Watcher
- ⏳ **S39**: YAML Frontmatter Parser
- ⏳ **S40**: Frontmatter Cache Layer

## Related Documentation

- [Extension API](https://code.visualstudio.com/api)
- [Epic E3](../plans/epic-03-vscode-planning-extension/epic.md)
- [Feature F11](../plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/feature.md)
```

**Expected Outcome**: Documentation for future developers (and future you!)

**Validation**: README exists and contains development instructions

---

## Completion Criteria

- [x] File `src/extension.ts` exists with activate/deactivate functions
- [x] Output channel "Lineage Planning" created in activate()
- [x] Extension builds successfully (`npm run compile` completes without errors)
- [x] File `dist/extension.js` generated by build
- [x] File `.vscode/launch.json` exists with debug configurations
- [x] Extension activates in Extension Development Host (F5)
- [x] Activation message appears in "Lineage Planning" output channel
- [x] Deactivation message appears when closing Extension Development Host
- [x] Breakpoints work in TypeScript source files (source maps functional)
- [x] Watch mode automatically rebuilds on file changes
- [x] README.md documents development workflow

## Troubleshooting

**Issue**: Extension Development Host doesn't launch
- **Solution**: Ensure VSCode is opened to `vscode-extension/` folder, not parent directory
- **Solution**: Check preLaunchTask in launch.json matches task name in tasks.json

**Issue**: Output channel not showing
- **Solution**: Open View → Output, select "Lineage Planning" from dropdown (VSCode doesn't auto-focus output channels)

**Issue**: Breakpoints not hit
- **Solution**: Verify sourcemap generation (`sourcemap: true` in esbuild.js)
- **Solution**: Check dist/extension.js.map exists
- **Solution**: Rebuild extension (`npm run compile`)

**Issue**: "Cannot find module 'vscode'" error
- **Solution**: Verify `"external": ["vscode"]` in esbuild.js (vscode module is provided by extension host, not bundled)

**Issue**: Extension activates but no output
- **Solution**: Check outputChannel.appendLine() calls in extension.ts
- **Solution**: Verify createOutputChannel() is called before appendLine()

## Next Steps

🎉 **S36 Complete!** Extension scaffold is fully functional.

### Immediate Next Story: S37 - Workspace Activation Logic

**Purpose**: Add intelligent workspace detection (only activate when plans/ or specs/ directories present)

**Why This Matters**: Current implementation activates in ALL workspaces (even non-Lineage projects). S37 will make activation conditional.

**Key Changes**:
- Modify `activate()` function to check for plans/ or specs/
- Update `activationEvents` in package.json (add workspace-specific patterns)
- Add logic to handle multi-root workspaces
- Log activation status based on workspace structure

**Implementation Path**: Run `/build specs/S37-workspace-activation-logic/plan.md` when ready

### Alternative: S39 - YAML Frontmatter Parser (Parallel Path)

Can be developed independently of S37 if you want to test parsing before adding workspace complexity.

**Why This Works**: Parser is a pure utility function (doesn't depend on activation logic). Can create `src/parser.ts` and test it separately before integrating with file watching.

### Testing the Scaffold

Before moving to S37/S39, manually test the extension in Lineage workspace:

1. Launch Extension Development Host (F5)
2. In Extension Development Host, open File → Open Folder → `D:\projects\lineage`
3. Extension should activate (check "Lineage Planning" output)
4. This confirms extension activates in the actual target workspace

**What to Verify**:
- Extension activates without errors
- Output channel accessible
- Lineage project files visible in file explorer
- No interference with Godot project files

This validates the foundation is solid for S37-S40 features!
