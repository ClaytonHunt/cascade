---
spec: S54
phase: 3
title: Modify TreeView Provider Methods
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 3: Modify TreeView Provider Methods

## Overview

This phase integrates the status group logic into the existing `PlanningTreeProvider` methods. It modifies:

1. `getChildren()` - Returns status groups at root level, items when status group expanded
2. `getTreeItem()` - Renders both planning items and status group nodes correctly

This is the integration phase that makes the status grouping visible in the TreeView.

## Prerequisites

- Phase 1 completed (types defined)
- Phase 2 completed (generation methods implemented)
- Understanding of VSCode TreeDataProvider pattern
- Reference: [VSCode TreeDataProvider API](https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider)

## Tasks

### Task 1: Update getChildren() Method Signature

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Modify the `getChildren()` method signature (line 103) to accept `TreeNode` instead of just `PlanningTreeItem`:

**Before:**
```typescript
async getChildren(element?: PlanningTreeItem): Promise<PlanningTreeItem[]> {
```

**After:**
```typescript
async getChildren(element?: TreeNode): Promise<TreeNode[]> {
```

**Changes:**
- Parameter type: `PlanningTreeItem` → `TreeNode` (accepts both item types)
- Return type: `Promise<PlanningTreeItem[]>` → `Promise<TreeNode[]>` (can return status groups or items)

**Expected Outcome:**
- Method can handle both status groups and planning items as input
- Can return both status groups and planning items as output

---

### Task 2: Implement New getChildren() Logic

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Replace the current `getChildren()` implementation (lines 103-158) with the following:

```typescript
  /**
   * Returns child elements for the tree.
   *
   * Tree structure:
   * - Root level (element = undefined): Returns 6 status group nodes
   * - Status group level (element = StatusGroupNode): Returns planning items with that status
   * - Planning item level (element = PlanningTreeItem): Returns empty array (no children yet - hierarchy in S55)
   *
   * @param element - Parent element (undefined for root)
   * @returns Array of child nodes (status groups or planning items)
   */
  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    // Root level: Return status groups
    if (!element) {
      return await this.getStatusGroups();
    }

    // Status group expanded: Return items with that status
    if (element.type === 'status-group') {
      const statusGroup = element as StatusGroupNode;
      return await this.getItemsForStatus(statusGroup.status);
    }

    // Planning item expanded: No children (flat structure within status groups)
    // Hierarchical nesting (Epic → Feature → Story) will be added in S55
    return [];
  }
```

**Expected Outcome:**
- Root level shows 6 status groups
- Expanding status group shows items with that status
- Expanding planning item shows nothing (leaf nodes for now)

**Validation:**
TypeScript compilation should succeed. Visual testing in Phase 4.

---

### Task 3: Update getTreeItem() Method Signature

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Modify the `getTreeItem()` method signature (line 57) to accept `TreeNode`:

**Before:**
```typescript
getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
```

**After:**
```typescript
getTreeItem(element: TreeNode): vscode.TreeItem {
```

**Expected Outcome:**
- Method can render both status groups and planning items

---

### Task 4: Implement Status Group Rendering in getTreeItem()

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Add status group handling at the beginning of `getTreeItem()` (after line 57, before the existing logic):

```typescript
  getTreeItem(element: TreeNode): vscode.TreeItem {
    // Handle status group nodes
    if (element.type === 'status-group') {
      const statusGroup = element as StatusGroupNode;

      // Create TreeItem with label (includes count badge)
      const treeItem = new vscode.TreeItem(
        statusGroup.label,
        statusGroup.collapsibleState
      );

      // Set folder icon for status groups
      treeItem.iconPath = new vscode.ThemeIcon('folder');

      // Set context value for context menu filtering (future use)
      treeItem.contextValue = 'status-group';

      // No command assignment (status groups aren't clickable/openable)
      // No resourceUri (not backed by file)

      return treeItem;
    }

    // Existing logic for PlanningTreeItem continues below...
    // (lines 59-91 remain unchanged)
```

**Insert this code at line 58**, before the existing `const label = ...` line.

**Expected Outcome:**
- Status groups render with folder icon
- Label shows status name and count (e.g., "Ready (5)")
- Groups are collapsible/expandable
- No command assigned (groups don't open files)

**Validation:**
Ensure the existing PlanningTreeItem rendering logic (lines 59-91) remains intact after your insertion.

---

### Task 5: Update getTreeItem() Documentation

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Update the JSDoc comment for `getTreeItem()` (lines 49-56) to reflect the new dual behavior:

```typescript
  /**
   * Converts TreeNode to VSCode TreeItem for display.
   *
   * Handles two node types:
   * - StatusGroupNode: Renders as collapsible folder with count badge
   * - PlanningTreeItem: Renders with type icon, status, tooltip, and click command
   *
   * Configures all TreeItem properties including label, icon, tooltip,
   * collapsible state, and command for click handling (S51).
   *
   * @param element - The tree node to convert (status group or planning item)
   * @returns VSCode TreeItem with all properties configured
   */
```

---

### Task 6: Update Class-Level Documentation

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Update the class JSDoc comment (lines 6-14) to reflect the new status grouping behavior:

```typescript
/**
 * TreeDataProvider implementation for Cascade planning items.
 *
 * This provider scans the plans/ directory, loads planning items using
 * the frontmatter cache, and provides tree structure data to VSCode.
 *
 * Tree structure (S54):
 * - Root level: 6 status group nodes (Not Started → Completed)
 * - Status group children: Planning items with that status
 * - Item children: None (flat list within each status)
 *
 * Hierarchical grouping (Epic → Feature → Story) will be added in S55.
 */
```

---

## Completion Criteria

- ✅ `getChildren()` signature updated to accept/return `TreeNode`
- ✅ `getChildren()` logic implements status group branching
- ✅ `getTreeItem()` signature updated to accept `TreeNode`
- ✅ `getTreeItem()` renders status groups with folder icon
- ✅ Documentation updated for both methods
- ✅ Existing PlanningTreeItem rendering logic unchanged
- ✅ `npm run compile` succeeds with no errors
- ✅ No runtime errors expected

## Next Phase

Proceed to **Phase 4: Testing and Refinement** to validate the implementation with manual testing, edge cases, and performance verification.
