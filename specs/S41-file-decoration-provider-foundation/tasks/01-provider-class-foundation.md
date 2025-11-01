---
spec: S41
phase: 1
title: Provider Class Foundation
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 1: Provider Class Foundation

## Overview

Create the `PlansDecorationProvider` class that implements VSCode's `FileDecorationProvider` interface. This class serves as the foundation for all decoration functionality, providing the event system and method signatures required by VSCode's decoration API.

This phase focuses on interface compliance and basic structure without implementing actual decoration logic (that comes in later stories).

## Prerequisites

- Understanding of VSCode's FileDecorationProvider interface
- Familiarity with TypeScript interfaces and event emitters
- Knowledge of module exports for cross-file access

## Tasks

### Task 1: Create decorationProvider.ts File

Create new file at `vscode-extension/src/decorationProvider.ts`.

**File location**: `vscode-extension/src/decorationProvider.ts`

**Initial imports**:
```typescript
import * as vscode from 'vscode';
```

**Expected outcome**: Empty file with imports ready for class implementation.

---

### Task 2: Define PlansDecorationProvider Class Signature

Implement the class signature with interface declaration.

**Code to add** (in `decorationProvider.ts`):
```typescript
/**
 * FileDecorationProvider for plans/ directory.
 *
 * Provides visual decorations (icons, badges, tooltips) for planning hierarchy files.
 * Integrates with frontmatter cache (S40) to retrieve item metadata.
 *
 * This provider handles:
 * - Status icons for leaf items (Stories, Bugs) - S44
 * - Progress badges for parent items (Features, Epics) - S46
 * - Real-time updates via FileSystemWatcher - S47
 *
 * @see https://code.visualstudio.com/api/references/vscode-api#FileDecorationProvider
 */
export class PlansDecorationProvider implements vscode.FileDecorationProvider {
  // Implementation in next tasks
}
```

**VSCode API Reference**: [FileDecorationProvider Interface](https://code.visualstudio.com/api/references/vscode-api#FileDecorationProvider)

**Expected outcome**: Class compiles but is incomplete (missing required interface methods).

---

### Task 3: Add Output Channel Property

Add output channel for logging decoration activity.

**Code to add** (inside class):
```typescript
/** Output channel for logging decoration activity */
private outputChannel: vscode.OutputChannel;

/**
 * Creates a new PlansDecorationProvider instance.
 *
 * @param outputChannel - VSCode output channel for logging
 */
constructor(outputChannel: vscode.OutputChannel) {
  this.outputChannel = outputChannel;
}
```

**Expected outcome**: Provider can log decoration activity for debugging.

---

### Task 4: Implement onDidChangeFileDecorations Event

Add the required event emitter for decoration updates.

**Code to add** (inside class, before constructor):
```typescript
/** Event emitter for decoration changes */
private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();

/** Event fired when file decorations need to be refreshed */
readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;
```

**VSCode API Reference**: [EventEmitter Documentation](https://code.visualstudio.com/api/references/vscode-api#EventEmitter)

**Expected outcome**: VSCode can subscribe to decoration change events.

**How it works**:
- VSCode subscribes to `onDidChangeFileDecorations` event when provider is registered
- When event fires (via `_onDidChangeFileDecorations.fire(uri)`), VSCode calls `provideFileDecoration(uri)` to get updated decorations
- Can fire for specific URI, array of URIs, or undefined (all files)

---

### Task 5: Implement provideFileDecoration Method (Placeholder)

Add the required method that VSCode calls to get decorations for a file.

**Code to add** (inside class):
```typescript
/**
 * Provides file decoration for a given URI.
 *
 * Called by VSCode whenever:
 * - File is opened/visible in explorer
 * - onDidChangeFileDecorations event fires
 * - Explorer is refreshed
 *
 * Phase 1 implementation: Returns undefined (no decoration)
 * Later phases will implement actual decoration logic based on frontmatter.
 *
 * @param uri - File URI to decorate
 * @returns FileDecoration or undefined (no decoration)
 */
provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
  // Phase 1: Return undefined (no decoration)
  // Phase 3: Add path filtering (return undefined for non-plans files)
  // S44+: Implement actual decoration logic

  // Log call for debugging (helps verify provider is working)
  this.outputChannel.appendLine(`[DECORATION] provideFileDecoration called: ${uri.fsPath}`);

  return undefined; // No decoration yet (placeholder)
}
```

**VSCode API Reference**:
- [FileDecoration Interface](https://code.visualstudio.com/api/references/vscode-api#FileDecoration)
- [ProviderResult Type](https://code.visualstudio.com/api/references/vscode-api#ProviderResult)

**Expected outcome**: Method exists and compiles, returns undefined safely.

---

### Task 6: Implement refresh Method

Add public method for manually triggering decoration updates.

**Code to add** (inside class):
```typescript
/**
 * Manually triggers decoration refresh for specific URI or all files.
 *
 * Called by:
 * - FileSystemWatcher when files change (S47)
 * - Manual refresh commands
 * - Cache invalidation events
 *
 * @param uri - Optional specific URI to refresh. If undefined, refreshes all files.
 */
refresh(uri?: vscode.Uri): void {
  // Fire event to trigger VSCode to call provideFileDecoration
  this._onDidChangeFileDecorations.fire(uri);

  // Log refresh for debugging
  if (uri) {
    this.outputChannel.appendLine(`[DECORATION] Refresh requested: ${uri.fsPath}`);
  } else {
    this.outputChannel.appendLine(`[DECORATION] Refresh requested: ALL files`);
  }
}
```

**Expected outcome**: External code can trigger decoration updates via `provider.refresh()`.

**Usage example** (not implemented yet, for context):
```typescript
// In FileSystemWatcher (S47)
fileWatcher.onDidChange((uri) => {
  decorationProvider.refresh(uri); // Refresh specific file
});
```

---

### Task 7: Add Disposal Method

Add cleanup method for proper resource disposal.

**Code to add** (inside class):
```typescript
/**
 * Disposes of provider resources.
 *
 * Called when extension deactivates or provider is unregistered.
 * Cleans up event emitter to prevent memory leaks.
 */
dispose(): void {
  this._onDidChangeFileDecorations.dispose();
  this.outputChannel.appendLine('[DECORATION] Provider disposed');
}
```

**Expected outcome**: Provider can be cleanly disposed without memory leaks.

---

### Task 8: Verify TypeScript Compilation

Run TypeScript compiler to verify strict mode compliance.

**Command to run**:
```bash
cd vscode-extension && npm run compile
```

**Expected output**: No TypeScript errors.

**Common errors to fix**:
- Missing interface methods → Add required methods
- Type mismatches → Verify `vscode.FileDecorationProvider` types
- Strict mode violations → Add proper null checks

**Validation**: Check `vscode-extension/dist/decorationProvider.js` exists.

---

## Completion Criteria

✅ `decorationProvider.ts` file created with complete class implementation
✅ Class implements all required `FileDecorationProvider` interface methods
✅ `onDidChangeFileDecorations` event emitter configured
✅ `provideFileDecoration()` method exists (returns undefined)
✅ `refresh()` method exists for manual updates
✅ Output channel logging integrated
✅ `dispose()` method implemented
✅ TypeScript compiles without errors (`npm run compile` succeeds)
✅ All strict mode checks pass

## Next Phase

**Phase 2: Extension Integration** - Register provider in `extension.ts` and test activation.
