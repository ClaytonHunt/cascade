---
spec: S41
phase: 2
title: Extension Integration
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 2: Extension Integration

## Overview

Integrate the `PlansDecorationProvider` into the extension's activation lifecycle by registering it in `extension.ts`. This phase establishes the provider as an active VSCode service that VSCode will call when decorations are needed.

The provider must be registered after the frontmatter cache is initialized (S40 dependency) and must be accessible at module level for future FileSystemWatcher integration (S47).

## Prerequisites

- Phase 1 completed (`PlansDecorationProvider` class exists and compiles)
- Understanding of VSCode extension activation lifecycle
- Familiarity with `extension.ts` structure (lines 462-563)

## Tasks

### Task 1: Add Module-Level Provider Variable

Declare a module-level variable to hold the provider instance (similar to `frontmatterCache` pattern).

**File**: `vscode-extension/src/extension.ts`

**Code to add** (after line 15, near `frontmatterCache` declaration):
```typescript
// Decoration provider for extension (module-level for FileSystemWatcher access)
let decorationProvider: PlansDecorationProvider | null = null;
```

**Reference**: See existing pattern at `extension.ts:14-15` for `frontmatterCache`.

**Expected outcome**: Provider instance can be accessed from `deactivate()` and future FileSystemWatcher code.

---

### Task 2: Import PlansDecorationProvider

Add import statement for the new provider class.

**File**: `vscode-extension/src/extension.ts`

**Code to add** (after line 9, after cache import):
```typescript
import { PlansDecorationProvider } from './decorationProvider';
```

**Expected outcome**: TypeScript can resolve `PlansDecorationProvider` class.

---

### Task 3: Initialize Provider in activate() Function

Create provider instance and register it with VSCode in the `activate()` function.

**File**: `vscode-extension/src/extension.ts`

**Location**: After frontmatter cache initialization (after line 505), before file system watchers section (before line 508).

**Code to add**:
```typescript
// Initialize decoration provider for plans/ directory
outputChannel.appendLine('--- File Decoration Provider ---');
decorationProvider = new PlansDecorationProvider(outputChannel);

// Register provider with VSCode
const decorationDisposable = vscode.window.registerFileDecorationProvider(decorationProvider);
context.subscriptions.push(decorationDisposable);

outputChannel.appendLine('✅ Decoration provider registered');
outputChannel.appendLine('   Provider will decorate files in plans/ directory');
outputChannel.appendLine('');
```

**VSCode API Reference**: [registerFileDecorationProvider](https://code.visualstudio.com/api/references/vscode-api#window.registerFileDecorationProvider)

**Integration points**:
- Uses existing `outputChannel` (created at line 464)
- Follows same logging style as cache initialization (lines 502-505)
- Registered in `context.subscriptions` for automatic disposal

**Expected outcome**: Provider registered and active when extension activates.

---

### Task 4: Add Disposal Logic in deactivate() Function

Add cleanup for decoration provider in the `deactivate()` function.

**File**: `vscode-extension/src/extension.ts`

**Location**: After cache disposal (after line 596), before final deactivation message (before line 599).

**Code to add**:
```typescript
// Dispose decoration provider
if (decorationProvider) {
  decorationProvider.dispose();
  decorationProvider = null;

  if (outputChannel) {
    outputChannel.appendLine('✅ Decoration provider disposed');
  }
}
```

**Reference**: See existing pattern for `frontmatterCache` disposal at `extension.ts:571-596`.

**Expected outcome**: Provider cleaned up properly on extension deactivation.

---

### Task 5: Update Feature Initialization Logging

Update the feature initialization section to mention decoration provider.

**File**: `vscode-extension/src/extension.ts`

**Location**: Line 557 (inside "Next features" section)

**Code to change**:
```typescript
// OLD:
outputChannel.appendLine('Next features:');
outputChannel.appendLine('  - F12: Planning status visualization');
outputChannel.appendLine('  - F13: Spec phase progress tracking');

// NEW:
outputChannel.appendLine('Active features:');
outputChannel.appendLine('  - File decoration provider (F12 foundation)');
outputChannel.appendLine('');
outputChannel.appendLine('Next features:');
outputChannel.appendLine('  - F12: Status icons and progress badges');
outputChannel.appendLine('  - F13: Spec phase progress tracking');
```

**Expected outcome**: Output channel reflects that decoration provider is active.

---

### Task 6: Verify TypeScript Compilation

Compile the extension to verify no errors were introduced.

**Command to run**:
```bash
cd vscode-extension && npm run compile
```

**Expected output**: No TypeScript errors.

**Validation checks**:
- Provider variable declared correctly
- Import resolves correctly
- Registration uses correct VSCode API
- All type signatures match

**Common errors to fix**:
- Import path incorrect → Verify `./decorationProvider` path
- Registration API mismatch → Check `vscode.window.registerFileDecorationProvider` signature
- Context subscriptions type error → Verify disposable pattern

---

### Task 7: Test Extension Activation in Development Host

Launch Extension Development Host and verify provider activates.

**Steps**:
1. Open `vscode-extension/` folder in VSCode
2. Press `F5` to launch Extension Development Host
3. In new window, open Lineage workspace (`D:\projects\lineage`)
4. Open Output panel → Select "Lineage Planning" channel

**Expected output in console**:
```
============================================================
Lineage Planning & Spec Status Extension
============================================================
Activated at: [timestamp]
Extension version: 0.1.0
VSCode version: [version]

--- Workspace Detection ---
🔍 Checking 1 workspace folder(s):

   ✅ lineage
      Path: D:\projects\lineage
      Found: plans/

✅ Extension activated - found required directories

--- Frontmatter Cache ---
✅ Cache initialized (maxSize: 1000)

--- File Decoration Provider ---
✅ Decoration provider registered
   Provider will decorate files in plans/ directory

--- File System Watchers ---
   ✅ Watching: lineage/plans/**/*.md
📁 Watching 1 directories for file changes

✅ Extension features initialized successfully

🔄 Workspace monitoring active (will detect folder changes)
   💾 Cache invalidation active (file changes tracked)

Active features:
  - File decoration provider (F12 foundation)

Next features:
  - F12: Status icons and progress badges
  - F13: Spec phase progress tracking
============================================================
```

**Validation**:
- ✅ "Decoration provider registered" appears in output
- ✅ No errors in Debug Console
- ✅ Extension activates successfully

**Common issues**:
- Provider not registered → Check registration code in activate()
- Errors in Debug Console → Check TypeScript compilation errors
- Output channel empty → Check output channel selection

---

### Task 8: Verify Provider Calls with Debug Logging

Open a file in `plans/` directory and verify provider is called.

**Steps**:
1. With Extension Development Host running
2. In Lineage workspace, open `plans/` folder in explorer
3. Navigate through files in `plans/` directory
4. Check Output channel for decoration logs

**Expected output** (in "Lineage Planning" output channel):
```
[DECORATION] provideFileDecoration called: D:\projects\lineage\plans\epic-03-vscode-planning-extension\feature-12-plans-visualization\story-41-file-decoration-provider-foundation.md
[DECORATION] provideFileDecoration called: D:\projects\lineage\plans\epic-03-vscode-planning-extension\feature-12-plans-visualization\feature.md
...
```

**Validation**:
- ✅ Provider method called for each visible file
- ✅ File paths appear in output channel
- ✅ No errors or crashes

**Common issues**:
- No logs appearing → Provider may not be registered correctly
- Errors on decoration calls → Check `provideFileDecoration()` implementation
- Crashes → Check for null reference errors in provider

---

### Task 9: Test Extension Deactivation

Verify provider disposes correctly when extension deactivates.

**Steps**:
1. With Extension Development Host running
2. Close Extension Development Host window (or reload window)
3. Check original VSCode Debug Console for deactivation logs

**Expected output** (in Debug Console):
```
--- Cache Statistics (Final) ---
Hits: [count]
Misses: [count]
...
✅ Cache cleared
✅ Decoration provider disposed

👋 Extension deactivated
```

**Validation**:
- ✅ "Decoration provider disposed" appears
- ✅ No errors during disposal
- ✅ Clean shutdown

---

## Completion Criteria

✅ Module-level `decorationProvider` variable declared
✅ `PlansDecorationProvider` imported in `extension.ts`
✅ Provider initialized in `activate()` function after cache
✅ Provider registered with `vscode.window.registerFileDecorationProvider()`
✅ Registration added to `context.subscriptions` for disposal
✅ Disposal logic added to `deactivate()` function
✅ Output channel logging updated to reflect provider status
✅ TypeScript compiles without errors
✅ Extension activates successfully in Development Host
✅ Output channel shows provider registration message
✅ `provideFileDecoration()` called for files in explorer (verified via logs)
✅ Provider disposes cleanly on deactivation

## Next Phase

**Phase 3: Path Filtering & Testing** - Implement plans/ directory filtering and comprehensive edge case handling.
