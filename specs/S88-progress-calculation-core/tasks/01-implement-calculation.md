---
spec: S88
phase: 1
title: Implement calculateProgress() Method
status: Completed
priority: High
created: 2025-10-25
updated: 2025-10-25
---

# Phase 1: Implement calculateProgress() Method

## Overview

Implement the core progress calculation logic by modifying the existing `calculateProgress()` method in `PlanningTreeProvider.ts`. The method signature and integration points already exist - this phase focuses on adding the calculation logic.

## Prerequisites

- Familiarity with TypeScript
- Understanding of the `HierarchyNode` structure
- Read through the test suite to understand expected behavior

## Tasks

### Task 1: Review existing method structure

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:1872-1912`

The method skeleton already exists with JSDoc comments, correct signature, and cache integration. Review:

```typescript
private async calculateProgress(item: PlanningTreeItem): Promise<ProgressInfo | null> {
  // Check cache first for O(1) lookup
  if (this.progressCache.has(item.item)) {
    return this.progressCache.get(item.item)!;
  }

  // Get all direct children of this item
  const children = await this.getDirectChildren(item);

  if (children.length === 0) {
    // No children - no progress to calculate
    return null;
  }

  // Count completed children
  const completed = children.filter(child => child.status === 'Completed').length;
  const total = children.length;
  const percentage = Math.round((completed / total) * 100);

  // Format display string (count format)
  const display = `(${completed}/${total})`;

  // Build progress info object
  const progress: ProgressInfo = {
    completed,
    total,
    percentage,
    display
  };

  // Cache result for subsequent calls
  this.progressCache.set(item.item, progress);

  this.outputChannel.appendLine(`[Progress] Calculated for ${item.item}: ${display}`);

  return progress;
}
```

**Expected Outcome:** Understanding of existing code structure and cache integration.

### Task 2: Understand the ProgressInfo interface

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:18-30`

Review the interface definition:

```typescript
interface ProgressInfo {
  /** Number of completed children */
  completed: number;

  /** Total number of children */
  total: number;

  /** Completion percentage (0-100, rounded) */
  percentage: number;

  /** Formatted display string for TreeItem description */
  display: string;  // e.g., "(3/5)" or "(60%)"
}
```

**Expected Outcome:** Understanding of the data structure to return.

### Task 3: Verify the implementation logic

The existing implementation in lines 1872-1912 already contains all the necessary logic:

1. **Cache check** (lines 1874-1876): Return cached result if available
2. **Get children** (line 1879): Use `getDirectChildren()` helper
3. **Handle no children** (lines 1881-1884): Return null for leaf nodes
4. **Count completed** (line 1887): Filter children by `status === 'Completed'`
5. **Calculate percentage** (line 1889): Use `Math.round()` for rounding
6. **Format display** (line 1892): Use `"(completed/total)"` format
7. **Cache result** (line 1907): Store in progressCache for future lookups
8. **Log calculation** (line 1909): Output to logging channel

**Expected Outcome:** Confirmation that the existing implementation is complete and correct.

### Task 4: Review helper method - getDirectChildren()

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:1931-1949`

This method abstracts the complexity of finding children in the hierarchy:

```typescript
private async getDirectChildren(item: PlanningTreeItem): Promise<PlanningTreeItem[]> {
  // Determine effective status for hierarchy lookup (F22 fix)
  // Archived items (by directory or status) should use 'Archived' hierarchy
  // instead of their frontmatter status (e.g., E3 with status:Completed in archive/ dir)
  const effectiveStatus = isItemArchived(item) ? 'Archived' : item.status;

  // Get hierarchy for this item's effective status
  const hierarchy = await this.getHierarchyForStatus(effectiveStatus);

  // Find the node for this item
  const node = this.findNodeInHierarchy(hierarchy, item);

  if (!node) {
    this.outputChannel.appendLine(`[Progress] ⚠️  Node not found for ${item.item} (status: ${item.status}, effective: ${effectiveStatus})`);
    return [];
  }

  // Extract children as PlanningTreeItem array
  return node.children.map(child => child.item);
}
```

**Expected Outcome:** Understanding how children are retrieved from the hierarchy.

### Task 5: Understand integration point - getTreeItem()

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:766-783`

Review how `calculateProgress()` is called during TreeItem rendering:

```typescript
// For Epic/Feature: Include progress indicator if children exist
if (element.type === 'epic' || element.type === 'feature') {
  // Calculate progress for parent items
  const progress = await this.calculateProgress(element);

  if (progress) {
    // Has children - show status badge with progress
    treeItem.description = `${statusBadge} ${progress.display}`;
    // Example: "$(sync) In Progress (3/5)"
  } else {
    // No children - show status badge only
    treeItem.description = statusBadge;
    // Example: "$(circle-filled) Ready"
  }
} else {
  // Leaf items (story, bug) - show status badge only (no progress)
  treeItem.description = statusBadge;
  // Example: "$(sync) In Progress"
}
```

**Expected Outcome:** Understanding of how progress is displayed in TreeView.

### Task 6: Review cache invalidation

**Location:** `vscode-extension/src/treeview/PlanningTreeProvider.ts:670-672`

The progress cache is cleared during refresh operations:

```typescript
// Clear progress cache (depends on hierarchy data)
this.progressCache.clear();
this.outputChannel.appendLine('[Progress] Cache cleared');
```

**Expected Outcome:** Understanding of cache lifecycle and when recalculation occurs.

## Completion Criteria

- [X] Existing implementation reviewed and understood
- [X] ProgressInfo interface structure confirmed
- [X] Implementation logic verified as correct
- [X] Helper method `getDirectChildren()` understood
- [X] Integration point in `getTreeItem()` understood
- [X] Cache invalidation logic reviewed

**Note:** The implementation already exists and is complete in the codebase (lines 1872-1912). No code changes are required for this phase.

## Next Phase

Proceed to Phase 2: Test Validation to verify the implementation against all test cases.
