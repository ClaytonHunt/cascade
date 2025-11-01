---
spec: S77
phase: 1
title: Toggle State Management
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 1: Toggle State Management

## Overview

This phase adds the toggle state infrastructure to PlanningTreeProvider. We implement a simple boolean flag (`showArchivedItems`) and a toggle method that flips the flag and triggers a TreeView refresh.

This establishes the foundation for archive visibility control without implementing actual filtering logic (that comes in S78). The focus is on state management and logging for verification.

## Prerequisites

- S75 completed (Archived status type exists)
- S76 completed (`isItemArchived()` utility available, though not used yet)
- Understanding of PlanningTreeProvider architecture (refresh pattern, output channel logging)

## Tasks

### Task 1: Add showArchivedItems Property to PlanningTreeProvider

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:194`

**Location:** Add after `debounceDelay` property declaration (around line 192)

**Implementation:**
```typescript
/**
 * Controls visibility of archived items in TreeView (S77).
 *
 * When false (default), archived items are filtered out.
 * When true, archived items are shown in TreeView.
 *
 * State is session-scoped (lost on reload) until S79 implements persistence.
 *
 * Used by:
 * - S78 (Archive Filtering): Filter logic checks this flag
 * - S77 (Toggle Command): toggleArchivedItems() method flips this flag
 * - S79 (Persistence): Will read/write this from VSCode memento
 */
private showArchivedItems: boolean = false;
```

**Why this location:**
- Grouped with other state properties (hierarchyCache, progressCache, etc.)
- After debounceDelay (similar configuration-style property)
- Before propagationEngine (which is a complex object, not simple state)

**Expected Outcome:**
- TypeScript compilation succeeds
- No type errors in PlanningTreeProvider
- Property accessible within class methods

**Validation:**
```bash
npm run compile
# Should complete without errors related to showArchivedItems
```

**References:**
- Similar property pattern: `debounceDelay` at line 192 (vscode-extension/src/treeview/PlanningTreeProvider.ts:192)
- Documentation: [VSCode TreeDataProvider](https://code.visualstudio.com/api/extension-guides/tree-view)

---

### Task 2: Implement toggleArchivedItems() Method

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:404`

**Location:** Add after `updateDebounceDelay()` method (around line 403)

**Implementation:**
```typescript
/**
 * Toggles visibility of archived items in TreeView (S77).
 *
 * Flips the showArchivedItems flag and triggers full refresh
 * to rebuild status groups with new filter.
 *
 * Triggered by:
 * - Command Palette: "Cascade: Toggle Archived Items"
 * - TreeView toolbar button (archive icon)
 *
 * Output channel logs state change for debugging.
 */
toggleArchivedItems(): void {
  this.showArchivedItems = !this.showArchivedItems;

  const state = this.showArchivedItems ? 'visible' : 'hidden';
  this.outputChannel.appendLine(`[Archive] Toggled archived items: ${state}`);

  // Trigger full refresh to rebuild tree with new filter
  this.refresh();
}
```

**Why this location:**
- Grouped with other public methods (refresh, scheduleRefresh, etc.)
- After configuration-related methods (updateDebounceDelay)
- Before private helper methods (getStatusGroups, etc.)

**Expected Outcome:**
- Method flips `showArchivedItems` boolean
- Output channel logs state change
- `refresh()` is called to rebuild TreeView
- No type errors

**Validation Steps:**
1. Compile: `npm run compile`
2. Verify no TypeScript errors
3. Add temporary test call in constructor (for verification):
   ```typescript
   // Temporary test - remove after verification
   this.toggleArchivedItems();
   ```
4. Package and install extension
5. Check output channel for log: `[Archive] Toggled archived items: visible`
6. Remove temporary test call

**References:**
- Similar method pattern: `updateDebounceDelay()` at line 372 (vscode-extension/src/treeview/PlanningTreeProvider.ts:372)
- Refresh pattern: `refresh()` at line 427 (vscode-extension/src/treeview/PlanningTreeProvider.ts:427)
- Output channel usage: `scheduleRefresh()` at line 238 (vscode-extension/src/treeview/PlanningTreeProvider.ts:238)

---

### Task 3: Verify TypeScript Compilation

**Goal:** Ensure all changes compile without errors

**Steps:**
1. Run TypeScript compiler:
   ```bash
   cd vscode-extension
   npm run compile
   ```

2. Verify output contains no errors related to:
   - `showArchivedItems` property
   - `toggleArchivedItems()` method
   - Access to `this.refresh()` or `this.outputChannel`

3. If errors occur, check:
   - Property is declared before methods (TypeScript class order matters)
   - Method signature matches pattern (no return type, void)
   - All referenced properties exist (`refresh`, `outputChannel`)

**Expected Output:**
```
[compilation complete with no errors]
```

**Common Issues:**
- **Error: Property 'showArchivedItems' does not exist:** Check property declaration is inside class body, not inside a method
- **Error: Cannot find name 'refresh':** Ensure method is instance method (uses `this.refresh()`)

**References:**
- Compilation script: `vscode-extension/esbuild.js`
- TypeScript config: `vscode-extension/tsconfig.json`

---

### Task 4: Create Temporary Test for Toggle Method

**Goal:** Verify toggle method works before UI integration

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:217`

**Location:** End of constructor method (temporary code, will be removed)

**Implementation:**
```typescript
// === TEMPORARY TEST CODE (S77 Phase 1) ===
// Remove after verifying toggle method works
this.outputChannel.appendLine('[S77 Test] Testing toggle method...');
this.outputChannel.appendLine(`[S77 Test] Initial state: ${this.showArchivedItems}`);

// Toggle ON
this.toggleArchivedItems();
this.outputChannel.appendLine(`[S77 Test] After first toggle: ${this.showArchivedItems}`);

// Toggle OFF
this.toggleArchivedItems();
this.outputChannel.appendLine(`[S77 Test] After second toggle: ${this.showArchivedItems}`);

this.outputChannel.appendLine('[S77 Test] Toggle method verified, remove this code');
// === END TEMPORARY TEST CODE ===
```

**Expected Output Channel Logs:**
```
[S77 Test] Testing toggle method...
[S77 Test] Initial state: false
[Archive] Toggled archived items: visible
[TreeView] Refreshing TreeView...
[S77 Test] After first toggle: true
[Archive] Toggled archived items: hidden
[TreeView] Refreshing TreeView...
[S77 Test] After second toggle: false
[S77 Test] Toggle method verified, remove this code
```

**Validation Steps:**
1. Add temporary test code to constructor
2. Compile: `npm run compile`
3. Package: `npm run package`
4. Install: `code --install-extension cascade-0.1.0.vsix --force`
5. Reload VSCode window: Ctrl+Shift+P → "Developer: Reload Window"
6. Open output channel: Ctrl+Shift+P → "View: Toggle Output" → "Cascade"
7. Verify logs match expected output
8. **Remove temporary test code** after verification
9. Recompile and reinstall clean version

**Why Temporary:**
- Allows testing toggle logic before command registration (Phase 2)
- Provides early feedback on method implementation
- Verifies refresh is triggered correctly
- Must be removed before Phase 2 (don't ship test code)

---

## Completion Criteria

Mark this phase complete when:

- ✅ `showArchivedItems` property added to PlanningTreeProvider
- ✅ Property initialized to `false` (default)
- ✅ `toggleArchivedItems()` method implemented
- ✅ Method flips boolean flag correctly
- ✅ Method logs state changes to output channel
- ✅ Method calls `refresh()` after state change
- ✅ TypeScript compilation succeeds (`npm run compile`)
- ✅ Temporary test code executed and verified
- ✅ Temporary test code removed from codebase
- ✅ Clean compilation after test removal

## Next Phase

**Phase 2: Command and Button Registration**
- Register `cascade.toggleArchived` command in extension.ts
- Add command to package.json
- Add TreeView toolbar button configuration
- Verify command appears in Command Palette and toolbar
