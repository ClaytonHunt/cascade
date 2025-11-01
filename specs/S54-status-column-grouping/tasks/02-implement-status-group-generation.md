---
spec: S54
phase: 2
title: Implement Status Group Generation
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 2: Implement Status Group Generation

## Overview

This phase implements the core logic for generating status groups with counts. It adds two new private methods to `PlanningTreeProvider`:

1. `getStatusGroups()` - Creates 6 status group nodes with counts
2. `getItemsForStatus()` - Filters items by status

These methods will be called by `getChildren()` (implemented in Phase 3) to provide the tree structure data.

## Prerequisites

- Phase 1 completed (`StatusGroupNode` and `TreeNode` types available)
- Understanding of `PlanningTreeProvider.getChildren():103-158` (existing implementation)
- Familiarity with array filtering and mapping in TypeScript

## Tasks

### Task 1: Import StatusGroupNode and TreeNode Types

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Update the import statement at line 3 to include the new types:

```typescript
import { PlanningTreeItem, StatusGroupNode, TreeNode } from './PlanningTreeItem';
```

**Expected Outcome:**
- `StatusGroupNode` available for method return types
- `TreeNode` available for union type parameters

**Validation:**
TypeScript compilation should succeed.

---

### Task 2: Import Status Type from types.ts

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Add import for `Status` type to access the status enum values:

```typescript
import { Status } from '../types';
```

This should be added near line 4, after the cache import.

**Expected Outcome:**
- `Status` type available for type annotations
- Access to status values like `'Not Started'`, `'Ready'`, etc.

---

### Task 3: Implement getStatusGroups() Method

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Add this private method after the `getChildren()` method (around line 159):

```typescript
  /**
   * Generates status group nodes for the root level of the tree.
   *
   * Creates 6 status groups ordered by workflow progression:
   * Not Started → In Planning → Ready → In Progress → Blocked → Completed
   *
   * Each group displays a count badge showing the number of items in that status.
   * Groups default to expanded state for immediate visibility.
   *
   * This method loads all planning items once and filters them by status to
   * calculate counts efficiently (single file scan, multiple filters).
   *
   * @returns Array of 6 status group nodes (always 6, even if counts are zero)
   */
  private async getStatusGroups(): Promise<StatusGroupNode[]> {
    // Define status order (workflow progression)
    const statuses: Status[] = [
      'Not Started',
      'In Planning',
      'Ready',
      'In Progress',
      'Blocked',
      'Completed'
    ];

    // Load all planning items once for efficient filtering
    // Reuses existing getChildren() logic to avoid duplication
    const allItems = await this.loadAllPlanningItems();

    // Build status group for each status
    const groups: StatusGroupNode[] = [];

    for (const status of statuses) {
      // Filter items matching this status
      const itemsInStatus = allItems.filter(item => item.status === status);
      const count = itemsInStatus.length;

      // Create status group node
      groups.push({
        type: 'status-group',
        status: status,
        label: `${status} (${count})`,
        count: count,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded
      });
    }

    return groups;
  }
```

**Expected Outcome:**
- Method returns 6 status groups in workflow order
- Each group has accurate count from filtering
- Labels formatted as "Status (count)"

**Validation:**
TypeScript should compile. Method will be tested in Phase 4.

---

### Task 4: Implement loadAllPlanningItems() Helper Method

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

The `getStatusGroups()` method references `loadAllPlanningItems()`, which doesn't exist yet. Extract the item-loading logic from the current `getChildren()` method:

Add this private method after `getStatusGroups()`:

```typescript
  /**
   * Loads all planning items from the plans/ directory.
   *
   * This is a refactored extraction of the core logic from getChildren().
   * It scans the plans/ directory for .md files, parses frontmatter using
   * the cache, and converts to PlanningTreeItem objects.
   *
   * Used by:
   * - getStatusGroups() - to calculate status counts
   * - getItemsForStatus() - to filter items by status
   *
   * @returns Array of all planning items found in plans/
   */
  private async loadAllPlanningItems(): Promise<PlanningTreeItem[]> {
    try {
      // Scan plans/ directory for all .md files recursively
      const plansPath = path.join(this.workspaceRoot, 'plans');
      const pattern = new vscode.RelativePattern(plansPath, '**/*.md');

      // Find all markdown files
      const files = await vscode.workspace.findFiles(pattern);

      this.outputChannel.appendLine(`[TreeView] Found ${files.length} markdown files in plans/`);

      // Load and parse each file
      const items: PlanningTreeItem[] = [];

      for (const fileUri of files) {
        const filePath = fileUri.fsPath;

        // Parse frontmatter using cache
        const frontmatter = await this.cache.get(filePath);

        if (frontmatter) {
          // Convert Frontmatter to PlanningTreeItem
          const item: PlanningTreeItem = {
            item: frontmatter.item,
            title: frontmatter.title,
            type: frontmatter.type,
            status: frontmatter.status,
            priority: frontmatter.priority,
            filePath: filePath
          };

          items.push(item);
        } else {
          // Parse failed - log warning and skip file
          const relativePath = path.relative(this.workspaceRoot, filePath);
          this.outputChannel.appendLine(`[TreeView] ⚠️  Skipping file with invalid frontmatter: ${relativePath}`);
        }
      }

      // Sort items by item number
      items.sort((a, b) => this.compareItemNumbers(a.item, b.item));

      this.outputChannel.appendLine(`[TreeView] Loaded ${items.length} planning items`);

      return items;

    } catch (error) {
      this.outputChannel.appendLine(`[TreeView] ❌ Error loading planning items: ${error}`);
      return [];
    }
  }
```

**Note:** This is the exact logic from the current `getChildren()` method (lines 109-157), extracted into a reusable helper.

**Expected Outcome:**
- Reusable method for loading all items
- Consistent with existing behavior
- Logged output matches current implementation

---

### Task 5: Implement getItemsForStatus() Method

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Add this private method after `loadAllPlanningItems()`:

```typescript
  /**
   * Filters planning items by status.
   *
   * Returns all items that match the specified status value.
   * Used when expanding a status group node to show its children.
   *
   * @param status - The status to filter by (e.g., "Ready", "In Progress")
   * @returns Array of planning items with the specified status
   */
  private async getItemsForStatus(status: Status): Promise<PlanningTreeItem[]> {
    const allItems = await this.loadAllPlanningItems();
    return allItems.filter(item => item.status === status);
  }
```

**Expected Outcome:**
- Efficient filtering using array filter
- Returns only items matching the status
- Reuses `loadAllPlanningItems()` (cache makes this efficient)

**Validation:**
TypeScript should compile successfully.

---

### Task 6: Add Path Import (if missing)

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Verify that `path` module is imported at the top of the file (should already exist at line 2):

```typescript
import * as path from 'path';
```

**Expected Outcome:**
- `path.join()` and `path.relative()` available in `loadAllPlanningItems()`

---

## Completion Criteria

- ✅ `StatusGroupNode` and `TreeNode` types imported
- ✅ `Status` type imported
- ✅ `getStatusGroups()` method implemented
- ✅ `loadAllPlanningItems()` helper method implemented
- ✅ `getItemsForStatus()` method implemented
- ✅ All imports present
- ✅ `npm run compile` succeeds with no errors
- ✅ No breaking changes to existing functionality

## Next Phase

Proceed to **Phase 3: Modify TreeView Provider Methods** to integrate the status group logic into `getChildren()` and `getTreeItem()`.
