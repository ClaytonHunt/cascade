---
spec: S54
phase: 1
title: Create StatusGroupNode Type
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 1: Create StatusGroupNode Type

## Overview

This phase defines the TypeScript interfaces and types needed to represent virtual status group nodes in the TreeView. Status groups are non-file-backed nodes that serve as containers for planning items with the same status.

The key design decision is using **discriminated unions** to distinguish between `PlanningTreeItem` (file-backed) and `StatusGroupNode` (virtual) at compile time and runtime.

## Prerequisites

- Understanding of TypeScript discriminated unions
- Familiarity with `vscode-extension/src/treeview/PlanningTreeItem.ts:20-38`
- Understanding of `vscode-extension/src/types.ts:14` (Status enum)

## Tasks

### Task 1: Define StatusGroupNode Interface

**File:** `vscode-extension/src/treeview/PlanningTreeItem.ts`

Add the following interface after the existing `PlanningTreeItem` interface definition (after line 38):

```typescript
/**
 * Virtual node representing a status group in the TreeView.
 *
 * Status groups are container nodes that group planning items by their
 * current lifecycle status. They are not backed by files - they exist
 * only in memory as tree structure.
 *
 * Each status group displays a label with count badge (e.g., "Ready (5)")
 * and contains all planning items with that status as children.
 */
export interface StatusGroupNode {
  /** Discriminator field for type guards (always 'status-group') */
  type: 'status-group';

  /** Status this group represents (e.g., "Ready", "In Progress") */
  status: Status;

  /** Display label with count (e.g., "Ready (5)") */
  label: string;

  /** Number of items in this status group */
  count: number;

  /** Collapsible state (always Expanded by default) */
  collapsibleState: vscode.TreeItemCollapsibleState;
}
```

**Expected Outcome:**
- Interface compiles without errors
- `type: 'status-group'` field enables discriminated union pattern
- `status` field typed as `Status` enum from `types.ts:14`

**Validation:**
Run `npm run compile` in `vscode-extension/` directory. Should compile without TypeScript errors.

---

### Task 2: Create TreeNode Union Type

**File:** `vscode-extension/src/treeview/PlanningTreeItem.ts`

Add union type alias after the `StatusGroupNode` interface:

```typescript
/**
 * Union type for all tree nodes displayed in Cascade TreeView.
 *
 * - PlanningTreeItem: File-backed planning items (stories, epics, features, etc.)
 * - StatusGroupNode: Virtual status grouping nodes (not backed by files)
 *
 * Use the `type` field for type discrimination:
 * - PlanningTreeItem: `type` is ItemType ('story', 'epic', etc.)
 * - StatusGroupNode: `type` is literal 'status-group'
 */
export type TreeNode = PlanningTreeItem | StatusGroupNode;
```

**Expected Outcome:**
- `TreeNode` type can represent both planning items and status groups
- Type guards can differentiate using `node.type === 'status-group'`

**Validation:**
Verify TypeScript recognizes the union type:
```typescript
// Example type guard that should work:
function isStatusGroup(node: TreeNode): node is StatusGroupNode {
  return node.type === 'status-group';
}
```

---

### Task 3: Import VSCode TreeItemCollapsibleState

**File:** `vscode-extension/src/treeview/PlanningTreeItem.ts`

The `StatusGroupNode` interface references `vscode.TreeItemCollapsibleState`. Verify the import exists at the top of the file (it may already exist):

```typescript
import * as vscode from 'vscode';
import { ItemType, Status, Priority } from '../types';
```

**Expected Outcome:**
- `vscode.TreeItemCollapsibleState` is accessible in interface definition
- Import statement exists (line 11 if using current file structure)

**Validation:**
Run `npm run compile` - no import errors should appear.

---

### Task 4: Update PlanningTreeItem Documentation

**File:** `vscode-extension/src/treeview/PlanningTreeItem.ts`

Update the file-level JSDoc comment (lines 1-9) to reflect the new union type:

```typescript
/**
 * Data models for tree nodes displayed in the Cascade TreeView.
 *
 * PlanningTreeItem: File-backed planning items (stories, epics, features, etc.)
 * StatusGroupNode: Virtual status grouping nodes (not backed by files)
 * TreeNode: Union type representing all possible tree nodes
 *
 * Conversion from Frontmatter to PlanningTreeItem happens in
 * PlanningTreeProvider.getChildren() when loading planning items.
 */
```

**Expected Outcome:**
- Documentation clearly explains both types and their purpose
- Developers understand the distinction between file-backed and virtual nodes

---

### Task 5: Export StatusGroupNode and TreeNode

**File:** `vscode-extension/src/treeview/PlanningTreeItem.ts`

Verify that both new types are exported (using `export interface` and `export type`). TypeScript will export them automatically with the `export` keyword in the definitions from Tasks 1 and 2.

**Expected Outcome:**
- `StatusGroupNode` can be imported in `PlanningTreeProvider.ts`
- `TreeNode` can be imported in `PlanningTreeProvider.ts`

**Validation:**
Add temporary import to `PlanningTreeProvider.ts` to verify:
```typescript
import { PlanningTreeItem, StatusGroupNode, TreeNode } from './PlanningTreeItem';
```

Should compile without errors.

---

## Completion Criteria

- ✅ `StatusGroupNode` interface defined with all required fields
- ✅ `TreeNode` union type created
- ✅ VSCode API imports present
- ✅ Documentation updated
- ✅ All types exported and importable
- ✅ `npm run compile` succeeds with no TypeScript errors

## Next Phase

Proceed to **Phase 2: Implement Status Group Generation** to create the logic that builds status group nodes from planning items.
