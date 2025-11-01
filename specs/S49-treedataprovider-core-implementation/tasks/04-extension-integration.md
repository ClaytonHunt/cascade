---
spec: S49
phase: 4
title: Integrate Provider in Extension
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 4: Integrate Provider in Extension

## Overview

Replace the PlaceholderTreeProvider with the real PlanningTreeProvider in extension.ts. This connects the data layer to the VSCode TreeView, enabling actual planning items to appear in the Cascade view.

## Prerequisites

- Phase 1-3 completed (PlanningTreeItem, PlanningTreeProvider, index.ts all created)
- Understanding of extension.ts structure
- Familiarity with VSCode extension activation pattern

## Tasks

### Task 1: Remove PlaceholderTreeProvider Class

**Action:**
Delete the placeholder class that was added in S48.

**File:** `vscode-extension/src/extension.ts`

**Lines to Remove:** Lines 31-47 (approximately)

**Code to Delete:**
```typescript
/**
 * Placeholder TreeDataProvider for initial Cascade view setup.
 * Returns empty tree until replaced by full implementation in S49.
 *
 * This minimal provider satisfies VSCode's TreeDataProvider interface requirements
 * while allowing the view to register and appear in the Activity Bar.
 */
export class PlaceholderTreeProvider implements vscode.TreeDataProvider<string> {
  /**
   * Required by TreeDataProvider interface.
   * Returns TreeItem for given element (not called for empty tree).
   */
  getTreeItem(element: string): vscode.TreeItem {
    return new vscode.TreeItem(element);
  }

  /**
   * Required by TreeDataProvider interface.
   * Returns empty array - no items to display yet.
   */
  getChildren(element?: string): Thenable<string[]> {
    return Promise.resolve([]);
  }
}
```

**References:**
- PlaceholderTreeProvider location: `vscode-extension/src/extension.ts:31-47`
- Added in S48: Phase 2, Task 2

**Validation:**
- PlaceholderTreeProvider class removed
- No references to PlaceholderTreeProvider remain in file

---

### Task 2: Add Import for PlanningTreeProvider

**Action:**
Import the new provider from the treeview module.

**File:** `vscode-extension/src/extension.ts`

**Location:** Add after existing imports (around line 11)

**Code to Add:**
```typescript
import { PlanningTreeProvider } from './treeview';
```

**Existing Imports (for context):**
```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Export parser for testing
export { parseFrontmatter } from './parser';

// Import cache for file watcher integration
import { FrontmatterCache } from './cache';
import { PlansDecorationProvider } from './decorationProvider';

// ADD NEW IMPORT HERE
import { PlanningTreeProvider } from './treeview';
```

**Validation:**
- Import statement added
- TypeScript compiles without errors

---

### Task 3: Add Module-Level Variable for Provider

**Action:**
Add module-level variable to store provider instance for disposal.

**File:** `vscode-extension/src/extension.ts`

**Location:** Add after existing module-level variables (around line 22)

**Code to Add:**
```typescript
// PlanningTreeProvider for extension (module-level for disposal)
let planningTreeProvider: PlanningTreeProvider | null = null;
```

**Existing Variables (for context):**
```typescript
// Frontmatter cache for extension (module-level for deactivate access)
let frontmatterCache: FrontmatterCache | null = null;

// Decoration provider for extension (module-level for FileSystemWatcher access)
let decorationProvider: PlansDecorationProvider | null = null;

// TreeView instance for Cascade planning panel (module-level for disposal)
let cascadeTreeView: vscode.TreeView<string> | null = null;

// ADD NEW VARIABLE HERE
let planningTreeProvider: PlanningTreeProvider | null = null;
```

**Note:** The cascadeTreeView generic type will be updated in Task 5 to use PlanningTreeItem.

**Validation:**
- Variable declared with correct type
- Initialized to null

---

### Task 4: Replace TreeView Registration in activate()

**Action:**
Replace placeholder provider registration with real provider.

**File:** `vscode-extension/src/extension.ts`

**Location:** Lines 558-569 (approximately)

**Code to Replace:**
```typescript
  // Initialize Cascade TreeView
  outputChannel.appendLine('--- Cascade TreeView ---');

  const placeholderProvider = new PlaceholderTreeProvider();
  cascadeTreeView = vscode.window.createTreeView('cascadeView', {
    treeDataProvider: placeholderProvider
  });

  context.subscriptions.push(cascadeTreeView);

  outputChannel.appendLine('✅ TreeView registered in Activity Bar');
  outputChannel.appendLine('   View: "Planning Items" (empty until S49)');
  outputChannel.appendLine('');
```

**New Code:**
```typescript
  // Initialize Cascade TreeView
  outputChannel.appendLine('--- Cascade TreeView ---');

  // Get workspace root (guaranteed to exist after shouldActivateExtension check)
  const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;

  // Create PlanningTreeProvider with dependencies
  planningTreeProvider = new PlanningTreeProvider(
    workspaceRoot,
    frontmatterCache,
    outputChannel
  );

  // Register TreeView with provider
  cascadeTreeView = vscode.window.createTreeView('cascadeView', {
    treeDataProvider: planningTreeProvider
  });

  context.subscriptions.push(cascadeTreeView);

  outputChannel.appendLine('✅ TreeView registered with PlanningTreeProvider');
  outputChannel.appendLine('   View: "Planning Items" in Activity Bar');
  outputChannel.appendLine('   Provider: Scanning plans/ directory for items');
  outputChannel.appendLine('');
```

**Key Changes:**
1. Get workspace root from workspace folders
2. Instantiate PlanningTreeProvider with 3 dependencies
3. Pass provider to createTreeView()
4. Update logging messages to reflect real data loading

**References:**
- FrontmatterCache: Already initialized at line 535
- Output channel: Already initialized at line 496
- Workspace folders: Guaranteed to exist (shouldActivateExtension check at line 516)

**Validation:**
- PlaceholderTreeProvider reference removed
- PlanningTreeProvider instantiated with correct parameters
- TreeView created with new provider
- Logging messages updated

---

### Task 5: Update cascadeTreeView Type Declaration

**Action:**
Update the generic type parameter to use PlanningTreeItem.

**File:** `vscode-extension/src/extension.ts`

**Location:** Module-level variable declaration (around line 22)

**Code to Change:**
```typescript
// OLD:
let cascadeTreeView: vscode.TreeView<string> | null = null;

// NEW:
let cascadeTreeView: vscode.TreeView<any> | null = null;
```

**Note:** We use `any` instead of `PlanningTreeItem` because:
1. PlaceholderTreeProvider used `string` generic type
2. PlanningTreeProvider uses `PlanningTreeItem` generic type
3. Module-level variable needs to accommodate both during transition
4. Using `any` avoids type errors and is safe here (internal variable)

**Alternative (if you want strict typing):**
```typescript
import { PlanningTreeItem } from './treeview';

let cascadeTreeView: vscode.TreeView<PlanningTreeItem> | null = null;
```

**Validation:**
- Type declaration updated
- TypeScript compiles without errors

---

### Task 6: Add Provider Disposal in deactivate()

**Action:**
Add cleanup code to dispose provider on deactivation.

**File:** `vscode-extension/src/extension.ts`

**Location:** In `deactivate()` function, after TreeView disposal (around line 682)

**Code to Add:**
```typescript
  // Dispose PlanningTreeProvider
  if (planningTreeProvider) {
    // Provider doesn't need explicit disposal (no resources to clean up)
    // Set to null for consistency
    planningTreeProvider = null;

    if (outputChannel) {
      outputChannel.appendLine('✅ PlanningTreeProvider disposed');
    }
  }
```

**Existing Code (for context):**
```typescript
  // Dispose TreeView
  if (cascadeTreeView) {
    cascadeTreeView.dispose();
    cascadeTreeView = null;

    if (outputChannel) {
      outputChannel.appendLine('✅ Cascade TreeView disposed');
    }
  }

  // ADD DISPOSAL CODE HERE
```

**Note:** PlanningTreeProvider doesn't have resources that need disposal (no file handles, timers, etc.), but we set to null for consistency.

**Validation:**
- Disposal code added
- Logging message added

---

### Task 7: Update Feature Logging Section

**Action:**
Update the final logging section to reflect S49 implementation.

**File:** `vscode-extension/src/extension.ts`

**Location:** End of activate() function (around line 619-624)

**Code to Change:**
```typescript
  // OLD:
  outputChannel.appendLine('Active features:');
  outputChannel.appendLine('  - File decoration provider (status visualization)');
  outputChannel.appendLine('  - Cascade TreeView in Activity Bar (empty until S49)');
  outputChannel.appendLine('');
  outputChannel.appendLine('Next features:');
  outputChannel.appendLine('  - S49: Load planning items into TreeView');
  outputChannel.appendLine('  - F17: Status-based Kanban layout');

  // NEW:
  outputChannel.appendLine('Active features:');
  outputChannel.appendLine('  - File decoration provider (status visualization)');
  outputChannel.appendLine('  - Cascade TreeView with PlanningTreeProvider (flat list)');
  outputChannel.appendLine('  - Planning items loaded from plans/ directory');
  outputChannel.appendLine('');
  outputChannel.appendLine('Next features:');
  outputChannel.appendLine('  - S50: Add icons and status badges to tree items');
  outputChannel.appendLine('  - S51: Click-to-open functionality');
  outputChannel.appendLine('  - S52: Refresh mechanism');
  outputChannel.appendLine('  - F17: Hierarchical grouping (Epic → Feature → Story)');
```

**Validation:**
- Messages updated to reflect S49 completion
- Next features list updated

---

### Task 8: Verify TypeScript Compilation

**Action:**
Compile and verify no type errors.

**Command:**
```bash
cd vscode-extension && npm run compile
```

**Expected Output:**
```
✓ TypeScript compilation successful
```

**Common Errors:**
- Import not found: Verify `./treeview` path is correct
- Type mismatch: Verify PlanningTreeProvider constructor parameters
- Undefined variable: Verify frontmatterCache and outputChannel exist

**Validation:**
- No TypeScript errors
- Build succeeds

---

### Task 9: Manual Integration Testing

**Action:**
Test the integrated provider in Extension Development Host.

**Steps:**
1. Package and install extension locally: `cd vscode-extension && npm run package && code --install-extension cascade-0.1.0.vsix --force`
2. Reload window (Ctrl+Shift+P → "Developer: Reload Window")
3. Open workspace with plans/ directory
4. Open Cascade view from Activity Bar
5. Verify planning items appear in tree
6. Verify format: "[item] - [title]"
7. Verify items sorted by item number
8. Check Output Channel ("Cascade") for errors and logs

**Expected Behavior:**
- TreeView populates with planning items
- Format: "S49 - TreeDataProvider Core Implementation"
- Sorted: P1, E1, E2, F1, S1, etc.
- No console errors
- Output channel shows:
  - "Found X markdown files in plans/"
  - "Loaded Y planning items"

**Troubleshooting:**
- Empty tree: Check if plans/ directory has .md files with valid frontmatter
- Missing items: Check output channel for warnings about invalid files
- Wrong order: Verify compareItemNumbers() logic
- Console errors: Check stack trace, verify all dependencies initialized

**Validation:**
- TreeView displays planning items
- Items formatted correctly
- Items sorted correctly
- No runtime errors

---

## Completion Criteria

- ✅ PlaceholderTreeProvider class removed from extension.ts
- ✅ PlanningTreeProvider imported from './treeview'
- ✅ Module-level planningTreeProvider variable declared
- ✅ Provider instantiated in activate() with correct parameters
- ✅ TreeView created with new provider
- ✅ cascadeTreeView type declaration updated
- ✅ Provider disposal added to deactivate()
- ✅ Logging messages updated
- ✅ TypeScript compiles without errors
- ✅ Manual testing confirms TreeView shows planning items
- ✅ Items formatted as "[item] - [title]"
- ✅ Items sorted by item number
- ✅ No runtime errors in console

## Next Steps

After S49 completion:
1. **S50** - Add icons and status badges to tree items (type-specific icons)
2. **S51** - Add click-to-open functionality (open file when item clicked)
3. **S52** - Connect refresh mechanism to FileSystemWatcher (auto-reload on changes)
4. **F17** - Implement hierarchical grouping (Epic → Feature → Story structure)

## References

**VSCode Extension API:**
- window.createTreeView(): https://code.visualstudio.com/api/references/vscode-api#window.createTreeView
- TreeDataProvider: https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider
- workspace.workspaceFolders: https://code.visualstudio.com/api/references/vscode-api#workspace.workspaceFolders

**Project Files:**
- Extension.ts: `vscode-extension/src/extension.ts`
- PlanningTreeProvider: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
- FrontmatterCache: `vscode-extension/src/cache.ts`
