---
spec: S85
phase: 1
title: Type Definition and Property
status: Completed
priority: High
created: 2025-10-24
updated: 2025-10-24
---

# Phase 1: Type Definition and Property

## Overview

This phase establishes the foundational type definition and property infrastructure for view mode state management. We'll add the `ViewMode` type to the centralized types module and add the property to PlanningTreeProvider with a basic getter method.

This phase prepares the codebase for Phase 2's workspace state integration by defining the data structures and access patterns.

## Prerequisites

- Understanding of TypeScript union types
- Familiarity with VSCode extension type definitions
- Access to existing codebase (vscode-extension/src/)

## Tasks

### Task 1: Define ViewMode Type in types.ts

**Location:** `vscode-extension/src/types.ts`

**Action:** Add `ViewMode` type definition after the existing type definitions (around line 25, after `Estimate` type)

**Code to Add:**

```typescript
/**
 * TreeView display mode.
 * - 'status': Items grouped by status (Not Started, In Progress, etc.)
 * - 'hierarchy': Items organized by parent-child relationships (P→E→F→S)
 */
export type ViewMode = 'status' | 'hierarchy';
```

**Rationale:**
- Centralized type location follows existing pattern (Status, Priority, ItemType all in types.ts)
- Union type ensures type safety at compile time
- JSDoc comment explains both modes for future developers
- Exported for use by S86, S87, and other consumers

**Validation:**
- TypeScript compiler accepts the type definition
- No type errors after adding the export

**File Reference:** vscode-extension/src/types.ts:1-25

---

### Task 2: Add viewMode Property to PlanningTreeProvider

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Action:** Add private `viewMode` property to the class (around line 234, after `showArchivedItems` property)

**Code to Add:**

```typescript
/**
 * Current TreeView display mode (F28).
 *
 * Controls whether TreeView displays items grouped by status or
 * organized by hierarchy (P→E→F→S structure).
 *
 * - 'status': Status-grouped view (current default behavior)
 * - 'hierarchy': Hierarchy view (P→E→F→S structure, F28 default)
 *
 * State persists across VSCode sessions via workspace storage.
 * Default: 'hierarchy' (aligns with ChatGPT reference design)
 */
private viewMode: ViewMode;
```

**Import Statement to Add:**

Add `ViewMode` to the imports from types.ts (around line 5):

```typescript
import { Status, ViewMode } from '../types';
```

**Rationale:**
- Private property follows encapsulation pattern
- Positioned near related toggle state (`showArchivedItems`)
- Comprehensive JSDoc explains purpose and behavior
- Type safety enforced by `ViewMode` union type

**Validation:**
- TypeScript compiler accepts the property declaration
- No type errors after adding the import

**File Reference:** vscode-extension/src/treeview/PlanningTreeProvider.ts:233-234

---

### Task 3: Add getViewMode() Getter Method

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Action:** Add public getter method (around line 502, after `toggleArchivedItems()` method)

**Code to Add:**

```typescript
/**
 * Gets the current TreeView display mode (F28).
 *
 * Used by:
 * - S86: getChildren() to determine display logic (status groups vs hierarchy)
 * - S87: Toolbar button to show current mode state
 * - Future features: Any component needing to inspect view mode
 *
 * @returns Current view mode ('status' or 'hierarchy')
 */
public getViewMode(): ViewMode {
  return this.viewMode;
}
```

**Rationale:**
- Public getter provides controlled read access
- No setter yet (Phase 2 adds `setViewMode()` with validation)
- JSDoc lists known consumers (S86, S87)
- Simple accessor method, no side effects

**Validation:**
- TypeScript compiler accepts the method signature
- Method returns correct type (ViewMode)

**File Reference:** vscode-extension/src/treeview/PlanningTreeProvider.ts:502

---

### Task 4: Initialize viewMode Property

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Action:** Add temporary initialization in constructor (around line 273, after `showArchivedItems` initialization)

**Code to Add:**

```typescript
// Initialize view mode (F28)
// Phase 1: Temporary hardcoded default
// Phase 2: Will load from workspace state
this.viewMode = 'hierarchy';
this.outputChannel.appendLine(`[ViewMode] Initialized to: ${this.viewMode} (Phase 1 - hardcoded)`);
```

**Rationale:**
- Ensures property is always initialized (prevents undefined errors)
- Temporary hardcoded value for Phase 1 (Phase 2 adds workspace state loading)
- Default to 'hierarchy' matches final design
- Output channel logging aids debugging

**Note:** This code will be replaced in Phase 2 with workspace state loading.

**Validation:**
- No TypeScript errors about uninitialized property
- Output channel shows initialization log when TreeView activates

**File Reference:** vscode-extension/src/treeview/PlanningTreeProvider.ts:273

---

## Completion Criteria

- ✅ `ViewMode` type defined in types.ts and exported
- ✅ `viewMode` property added to PlanningTreeProvider class
- ✅ `getViewMode()` method implemented and returns correct type
- ✅ Property initialized in constructor (temporary hardcoded value)
- ✅ TypeScript compilation succeeds with no errors
- ✅ Output channel shows initialization log
- ✅ No breaking changes to existing functionality

## Testing Validation

**Manual Testing:**
1. Compile TypeScript: `npm run compile` (no errors)
2. Package extension: `npm run package`
3. Install extension: `code --install-extension cascade-0.1.0.vsix --force`
4. Reload VSCode window
5. Open Output Channel → Cascade
6. Verify initialization log: `[ViewMode] Initialized to: hierarchy (Phase 1 - hardcoded)`

**Expected Results:**
- Compilation succeeds
- Extension activates without errors
- Output channel shows view mode initialization
- Existing TreeView functionality unchanged (status grouping still works)

## Next Phase

**Phase 2: Workspace State Integration**
- Replace hardcoded initialization with workspace state loading
- Implement `setViewMode()` method with validation
- Add persistence logic
- Add comprehensive logging for state changes

**Dependencies for Next Phase:**
- Phase 1 must complete successfully (type and property exist)
- Understanding of VSCode Memento API
