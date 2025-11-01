---
spec: S60
phase: 2
title: TreeView Integration
status: Completed
priority: High
created: 2025-10-16
updated: 2025-10-16
---

# Phase 2: TreeView Integration

## Overview

This phase integrates the `PlanningDragAndDropController` (created in Phase 1) with the Cascade TreeView. The integration requires updating TreeView registration in `extension.ts` to pass the controller instance and updating barrel exports for clean imports.

After this phase, drag-and-drop will be fully functional in the TreeView, allowing users to drag Stories and Bugs between status groups.

## Prerequisites

- Phase 1 completed: `PlanningDragAndDropController.ts` exists and compiles
- Understanding of extension activation flow in `extension.ts`
- Familiarity with barrel export pattern in `treeview/index.ts`

## Tasks

### Task 1: Update Barrel Exports

**Objective:** Export `PlanningDragAndDropController` from `treeview/index.ts` for clean imports.

**File:** `vscode-extension/src/treeview/index.ts`

**Current State:**
```typescript
/**
 * Barrel export for treeview module.
 *
 * Provides clean import paths:
 * - import { PlanningTreeProvider, PlanningTreeItem } from './treeview';
 *
 * Instead of:
 * - import { PlanningTreeProvider } from './treeview/PlanningTreeProvider';
 * - import { PlanningTreeItem } from './treeview/PlanningTreeItem';
 */

export { PlanningTreeItem } from './PlanningTreeItem';
export { PlanningTreeProvider } from './PlanningTreeProvider';
```

**Updated Code:**
```typescript
/**
 * Barrel export for treeview module.
 *
 * Provides clean import paths:
 * - import { PlanningTreeProvider, PlanningTreeItem, PlanningDragAndDropController } from './treeview';
 *
 * Instead of:
 * - import { PlanningTreeProvider } from './treeview/PlanningTreeProvider';
 * - import { PlanningTreeItem } from './treeview/PlanningTreeItem';
 * - import { PlanningDragAndDropController } from './treeview/PlanningDragAndDropController';
 */

export { PlanningTreeItem } from './PlanningTreeItem';
export { PlanningTreeProvider } from './PlanningTreeProvider';
export { PlanningDragAndDropController } from './PlanningDragAndDropController';
```

**Validation:**
- TypeScript compiles without errors
- Import path works in extension.ts: `import { PlanningDragAndDropController } from './treeview';`
- Barrel export follows existing patterns

**References:**
- Existing barrel export: `vscode-extension/src/treeview/index.ts:1-14`

---

### Task 2: Update Extension Imports

**Objective:** Add import for `PlanningDragAndDropController` in extension.ts.

**File:** `vscode-extension/src/extension.ts`

**Current Import Block:**
```typescript
// Import cache for file watcher integration
import { FrontmatterCache } from './cache';
import { PlansDecorationProvider } from './decorationProvider';
import { PlanningTreeProvider } from './treeview';
```

**Updated Import Block:**
```typescript
// Import cache for file watcher integration
import { FrontmatterCache } from './cache';
import { PlansDecorationProvider } from './decorationProvider';
import { PlanningTreeProvider, PlanningDragAndDropController } from './treeview';
```

**Validation:**
- TypeScript compiles without errors
- Import resolves correctly through barrel export
- No unused import warnings

**References:**
- Extension imports: `vscode-extension/src/extension.ts:8-11`

---

### Task 3: Declare Module-Level Variable for Controller

**Objective:** Add module-level variable to store drag-and-drop controller instance for cleanup.

**File:** `vscode-extension/src/extension.ts`

**Current Module-Level Variables (around line 14-26):**
```typescript
// Output channel for extension logging
let outputChannel: vscode.OutputChannel;

// Frontmatter cache for extension (module-level for deactivate access)
let frontmatterCache: FrontmatterCache | null = null;

// Decoration provider for extension (module-level for FileSystemWatcher access)
let decorationProvider: PlansDecorationProvider | null = null;

// PlanningTreeProvider for extension (module-level for disposal)
let planningTreeProvider: PlanningTreeProvider | null = null;

// TreeView instance for Cascade planning panel (module-level for disposal)
let cascadeTreeView: vscode.TreeView<any> | null = null;
```

**Add After `planningTreeProvider` Declaration:**
```typescript
// PlanningTreeProvider for extension (module-level for disposal)
let planningTreeProvider: PlanningTreeProvider | null = null;

// Drag-and-drop controller for TreeView (module-level for disposal)
let dragDropController: PlanningDragAndDropController | null = null;

// TreeView instance for Cascade planning panel (module-level for disposal)
let cascadeTreeView: vscode.TreeView<any> | null = null;
```

**Validation:**
- Variable declared at module level (accessible in activate() and deactivate())
- Follows naming convention (camelCase, descriptive)
- Initialized to null for proper cleanup detection

**References:**
- Module variables: `vscode-extension/src/extension.ts:14-26`

---

### Task 4: Instantiate Controller in activate()

**Objective:** Create drag-and-drop controller instance before TreeView registration.

**File:** `vscode-extension/src/extension.ts`

**Location:** In `activate()` function, after `PlanningTreeProvider` creation and before `createTreeView()` call.

**Current Code (around line 554-570):**
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
```

**Updated Code:**
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

// Create drag-and-drop controller for TreeView
dragDropController = new PlanningDragAndDropController(outputChannel);
outputChannel.appendLine('✅ Drag-and-drop controller created');

// Register TreeView with provider and drag-and-drop support
cascadeTreeView = vscode.window.createTreeView('cascadeView', {
  treeDataProvider: planningTreeProvider,
  dragAndDropController: dragDropController  // Enable drag-and-drop
});
```

**Validation:**
- Controller instantiated with output channel
- TreeView registration includes `dragAndDropController` parameter
- Output channel logs controller creation
- TypeScript compiles without errors

**Benefits:**
- Controller shares output channel with TreeView provider (consistent logging)
- Controller lifecycle managed by extension (proper cleanup)
- Drag-and-drop enabled at TreeView registration time

**References:**
- TreeView registration: `vscode-extension/src/extension.ts:554-570`
- createTreeView API: [vscode.window.createTreeView](https://code.visualstudio.com/api/references/vscode-api#window.createTreeView)

---

### Task 5: Update Output Channel Logging

**Objective:** Update activation logging to reflect new drag-and-drop capability.

**File:** `vscode-extension/src/extension.ts`

**Location:** In `activate()` function, after TreeView registration (around line 573-577).

**Current Logging:**
```typescript
outputChannel.appendLine('✅ TreeView registered with PlanningTreeProvider');
outputChannel.appendLine('   View: "Planning Items" in Activity Bar');
outputChannel.appendLine('   Provider: Scanning plans/ directory for items');
outputChannel.appendLine('');
```

**Updated Logging:**
```typescript
outputChannel.appendLine('✅ TreeView registered with PlanningTreeProvider');
outputChannel.appendLine('   View: "Planning Items" in Activity Bar');
outputChannel.appendLine('   Provider: Scanning plans/ directory for items');
outputChannel.appendLine('   Drag-and-drop: Enabled for Stories and Bugs');
outputChannel.appendLine('');
```

**Also Update Feature Summary (around line 659-668):**

**Current:**
```typescript
outputChannel.appendLine('Active features:');
outputChannel.appendLine('  - File decoration provider (status visualization)');
outputChannel.appendLine('  - Cascade TreeView with PlanningTreeProvider (flat list)');
outputChannel.appendLine('  - Planning items loaded from plans/ directory');
outputChannel.appendLine('');
```

**Updated:**
```typescript
outputChannel.appendLine('Active features:');
outputChannel.appendLine('  - File decoration provider (status visualization)');
outputChannel.appendLine('  - Cascade TreeView with status-based kanban layout');
outputChannel.appendLine('  - Drag-and-drop for Stories and Bugs (status transitions)');
outputChannel.appendLine('  - Planning items loaded from plans/ directory');
outputChannel.appendLine('');
```

**Validation:**
- Output channel clearly indicates drag-and-drop is enabled
- User knows which items can be dragged (Stories and Bugs)
- Feature summary reflects S60 completion

**References:**
- Activation logging: `vscode-extension/src/extension.ts:573-577`
- Feature summary: `vscode-extension/src/extension.ts:659-668`

---

### Task 6: Add Controller Cleanup in deactivate()

**Objective:** Dispose drag-and-drop controller during extension deactivation for proper cleanup.

**File:** `vscode-extension/src/extension.ts`

**Location:** In `deactivate()` function, after TreeView disposal (around line 719-727).

**Current Code:**
```typescript
// Dispose TreeView
if (cascadeTreeView) {
  cascadeTreeView.dispose();
  cascadeTreeView = null;

  if (outputChannel) {
    outputChannel.appendLine('✅ Cascade TreeView disposed');
  }
}

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

**Add After PlanningTreeProvider Disposal:**
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

// Dispose drag-and-drop controller
if (dragDropController) {
  // Controller doesn't need explicit disposal (no resources to clean up)
  // Set to null for consistency
  dragDropController = null;

  if (outputChannel) {
    outputChannel.appendLine('✅ Drag-and-drop controller disposed');
  }
}
```

**Validation:**
- Controller reference cleared on deactivation
- Output channel logs disposal
- No memory leaks (null assignment prevents holding references)

**Note:** The controller does not maintain any persistent state or subscriptions, so explicit disposal logic is not needed. Setting to null prevents holding references after deactivation.

**References:**
- Deactivate function: `vscode-extension/src/extension.ts:679-747`

---

### Task 7: Test TreeView with Drag-and-Drop

**Objective:** Verify drag-and-drop integration works correctly in VSCode.

**Manual Testing Steps:**

1. **Package and Install Extension:**
   ```bash
   cd vscode-extension
   npm run compile
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

2. **Reload VSCode:**
   - Press `Ctrl+Shift+P` → "Developer: Reload Window"

3. **Open Cascade Output Channel:**
   - Press `Ctrl+Shift+P` → "View: Toggle Output"
   - Select "Cascade" from dropdown

4. **Verify Activation Logging:**
   - Output channel should show:
     ```
     --- Cascade TreeView ---
     ✅ Drag-and-drop controller created
     ✅ TreeView registered with PlanningTreeProvider
        View: "Planning Items" in Activity Bar
        Provider: Scanning plans/ directory for items
        Drag-and-drop: Enabled for Stories and Bugs
     ```

5. **Test Dragging Stories/Bugs:**
   - Open Cascade TreeView (Activity Bar → Cascade icon)
   - Expand any status group
   - Hover over Story item → Drag cursor should appear
   - Start dragging → Output channel logs:
     ```
     [DragDrop] Drag started: S49 - TreeDataProvider Core Implementation
       Status: Completed
       Type: story
     ```

6. **Test Dropping on Status Groups:**
   - Drag Story to different status group
   - Drop on status group header
   - Output channel logs:
     ```
     [DragDrop] Drop received:
       Item: S49 - TreeDataProvider Core Implementation
       Source status: Completed
       Target status: In Progress
       File: D:\projects\lineage\plans\...\story-49-core.md
     [DragDrop] ℹ️  Status update deferred to S61
     ```

7. **Test Invalid Drag Sources:**
   - Try dragging Epic → No drag cursor
   - Try dragging Feature → No drag cursor
   - Output channel logs warnings for attempts

8. **Test Invalid Drop Targets:**
   - Try dropping on Story item (not status group) → Warning logged
   - Try dropping outside TreeView → Warning logged

**Expected Results:**
- ✅ Stories and Bugs show drag cursor
- ✅ Epics and Features do not show drag cursor
- ✅ Dropping on status groups logs drop event
- ✅ Dropping on invalid targets logs warning
- ✅ No TypeScript compilation errors
- ✅ No runtime errors in Output channel

**Troubleshooting:**

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| No drag cursor on Stories | Controller not registered | Verify `dragAndDropController` parameter in `createTreeView()` |
| Drop does nothing | MIME type mismatch | Check `dragMimeTypes` and `dropMimeTypes` match |
| Extension crashes | TypeScript error | Run `npm run compile` and fix errors |
| No output logs | Output channel closed | Reopen "Cascade" output channel |

---

## Completion Criteria

- [ ] Barrel exports updated to include `PlanningDragAndDropController`
- [ ] Extension imports controller from barrel export
- [ ] Module-level variable declared for controller
- [ ] Controller instantiated in `activate()` with output channel
- [ ] TreeView registration includes `dragAndDropController` parameter
- [ ] Activation logging reflects drag-and-drop capability
- [ ] Controller disposal added to `deactivate()`
- [ ] TypeScript compiles without errors
- [ ] Extension activates without errors
- [ ] Manual testing confirms drag-and-drop behavior
- [ ] Output channel shows drag-and-drop events

## Next Phase

Proceed to **Phase 3: Testing and Documentation** to perform comprehensive acceptance testing and document the drag-and-drop workflow.
