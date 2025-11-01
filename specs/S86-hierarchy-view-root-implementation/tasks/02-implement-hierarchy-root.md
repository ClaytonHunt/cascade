---
spec: S86
phase: 2
title: Implement getHierarchyRoot() and Routing
status: Completed
priority: High
created: 2025-10-24
updated: 2025-10-24
---

# Phase 2: Implement getHierarchyRoot() and Routing

## Overview

This phase implements the `getHierarchyRoot()` method that provides root-level nodes for hierarchy view, and modifies `getChildren()` to route between status and hierarchy views based on the view mode setting.

This phase builds on Phase 1's extended `buildHierarchy()` method to deliver the full hierarchy view functionality.

## Prerequisites

- Completed Phase 1 (buildHierarchy() extended for Projects)
- S85 completed (viewMode property and state management)
- Understanding of archive filtering (S76-S79)

## Tasks

### Task 1: Implement getHierarchyRoot() Method

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**What to do**: Add new `getHierarchyRoot()` method that returns root-level hierarchy nodes.

**Location**: Add after `getStatusGroups()` method (around line 873)

**Implementation**:
```typescript
/**
 * Gets root-level nodes for hierarchy view (F28).
 *
 * Returns the top-most items in the planning hierarchy:
 * - Projects (type: 'project')
 * - Orphan Epics (no parent Project via dependencies)
 * - Orphan Features (no parent Epic directory)
 * - Orphan Stories/Bugs (no parent Feature directory)
 *
 * This method powers the hierarchy view mode where items are
 * organized by parent-child relationships (P→E→F→S) instead of status groups.
 *
 * ## Hierarchy Structure
 *
 * ```
 * Root Level:
 * ├─ P1 - Lineage RPG Game Systems
 * │  ├─ E1 - Character Movement System (attached via dependencies)
 * │  └─ E2 - Testing System (attached via dependencies)
 * ├─ E3 - Orphan Epic (no project dependency)
 * ├─ F10 - Orphan Feature (no parent epic directory)
 * └─ S99 - Orphan Story (no parent feature directory)
 * ```
 *
 * ## Archive Filtering (S78)
 *
 * Archived items are excluded unless `showArchivedItems` toggle is ON:
 * - Uses existing `isItemArchived()` utility for detection
 * - Filters items BEFORE building hierarchy (efficient)
 * - Detection methods: `status: Archived` OR `/archive/` directory
 *
 * ## Performance
 *
 * - Reuses existing items cache (no additional file reads)
 * - O(n) hierarchy building where n = number of items
 * - Typical execution time < 100ms with 100+ items
 * - Logs hierarchy statistics to output channel for monitoring
 *
 * @returns Array of root-level tree nodes (Projects + orphans)
 */
private async getHierarchyRoot(): Promise<TreeNode[]> {
  const startTime = Date.now();

  // Load all planning items (from cache)
  const allItems = await this.loadAllPlanningItems();

  // Filter archived items if toggle is OFF (S78)
  let filteredItems = allItems;
  if (!this.showArchivedItems) {
    const beforeCount = allItems.length;
    filteredItems = allItems.filter(item => !isItemArchived(item));
    const archivedCount = beforeCount - filteredItems.length;

    if (archivedCount > 0) {
      this.outputChannel.appendLine(
        `[Hierarchy] Filtered ${archivedCount} archived items (toggle OFF)`
      );
    }
  } else {
    this.outputChannel.appendLine(
      `[Hierarchy] Including archived items (toggle ON)`
    );
  }

  // Build hierarchy from filtered items
  // buildHierarchy() now handles Projects (Phase 1)
  const hierarchy = this.buildHierarchy(filteredItems);

  // Calculate duration
  const duration = Date.now() - startTime;
  this.outputChannel.appendLine(
    `[Hierarchy] Built hierarchy with ${hierarchy.length} root nodes in ${duration}ms`
  );

  // Log performance warning if threshold exceeded
  if (duration > 100) {
    this.outputChannel.appendLine(
      `[Hierarchy] ⚠️  Performance warning: Root build exceeded 100ms threshold (${duration}ms)`
    );
  }

  // Return root-level items
  // buildHierarchy() returns HierarchyNode[], we need TreeNode[] (which is the item field)
  return hierarchy.map(node => node.item);
}
```

**Expected Outcome**:
- `getHierarchyRoot()` returns Projects at root level
- Orphan Epics/Features/Stories also at root level
- Archive filtering works correctly
- Performance logged to output channel
- Method signature matches TreeView expectations (returns `TreeNode[]`)

**Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:872` (after getStatusGroups)

---

### Task 2: Modify getChildren() to Route Based on View Mode

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**What to do**: Update `getChildren()` method to check view mode at root level and delegate accordingly.

**Current Code** (line 815-848):
```typescript
async getChildren(element?: TreeNode): Promise<TreeNode[]> {
  // Root level: Return status groups
  if (!element) {
    return await this.getStatusGroups();
  }

  // Status group expanded: Return top-level items in hierarchy
  if (element.type === 'status-group') {
    const statusGroup = element as StatusGroupNode;

    // Enhanced logging for debugging (F22)
    this.outputChannel.appendLine(`[getChildren] Status group expanded: "${statusGroup.status}" (count: ${statusGroup.count})`);

    const hierarchy = await this.getHierarchyForStatus(statusGroup.status);

    // Enhanced logging for debugging (F22)
    const childCount = hierarchy.length;
    this.outputChannel.appendLine(`[getChildren] Returning ${childCount} root items for "${statusGroup.status}" group`);

    // Return root-level items (epics + orphans)
    return hierarchy.map(node => node.item);
  }

  // Planning item expanded: Return children based on type
  const item = element as PlanningTreeItem;

  if (item.type === 'epic' || item.type === 'feature') {
    // Parent item - return children from hierarchy
    return await this.getChildrenForItem(item);
  }

  // Leaf item (story, bug, spec, phase) - no children
  return [];
}
```

**New Code**:
```typescript
async getChildren(element?: TreeNode): Promise<TreeNode[]> {
  // Root level: Check view mode (F28)
  if (!element) {
    if (this.viewMode === 'status') {
      // Status-grouped view (existing behavior)
      return await this.getStatusGroups();
    } else {
      // Hierarchy view (F28 - NEW)
      this.outputChannel.appendLine('[getChildren] Using hierarchy view mode');
      return await this.getHierarchyRoot();
    }
  }

  // Status group expanded: Return top-level items in hierarchy
  if (element.type === 'status-group') {
    const statusGroup = element as StatusGroupNode;

    // Enhanced logging for debugging (F22)
    this.outputChannel.appendLine(`[getChildren] Status group expanded: "${statusGroup.status}" (count: ${statusGroup.count})`);

    const hierarchy = await this.getHierarchyForStatus(statusGroup.status);

    // Enhanced logging for debugging (F22)
    const childCount = hierarchy.length;
    this.outputChannel.appendLine(`[getChildren] Returning ${childCount} root items for "${statusGroup.status}" group`);

    // Return root-level items (epics + orphans)
    return hierarchy.map(node => node.item);
  }

  // Planning item expanded: Return children based on type
  const item = element as PlanningTreeItem;

  // Phase 1 extended this to include 'project'
  if (item.type === 'project' || item.type === 'epic' || item.type === 'feature') {
    // Parent item - return children from hierarchy
    return await this.getChildrenForItem(item);
  }

  // Leaf item (story, bug, spec, phase) - no children
  return [];
}
```

**Key Changes**:
1. Root level now checks `this.viewMode`
2. Delegates to `getStatusGroups()` for 'status' mode (existing)
3. Delegates to `getHierarchyRoot()` for 'hierarchy' mode (NEW)
4. Logs mode selection to output channel
5. Status group and planning item expansion logic unchanged

**Expected Outcome**:
- Hierarchy view shows Projects at root when mode is 'hierarchy'
- Status view still works when mode is 'status'
- View mode switching triggers TreeView refresh (handled by S85's setViewMode)
- No breaking changes to status view behavior

**Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:815-848`

---

### Task 3: Verify Archive Filtering Integration

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**What to do**: Verify that `getHierarchyRoot()` correctly filters archived items.

**Test Cases**:

1. **Toggle OFF + Archived Items Exist**
   - Expected: Archived items filtered out
   - Log: `[Hierarchy] Filtered N archived items (toggle OFF)`

2. **Toggle ON + Archived Items Exist**
   - Expected: Archived items included in hierarchy
   - Log: `[Hierarchy] Including archived items (toggle ON)`

3. **No Archived Items**
   - Expected: No filtering needed
   - Log: `[Hierarchy] Filtered 0 archived items (toggle OFF)` or `[Hierarchy] Including archived items (toggle ON)`

**Verification Steps**:
1. Create test item with `status: Archived`
2. Call `getHierarchyRoot()` with toggle OFF
3. Verify item NOT in returned array
4. Set toggle ON
5. Call `getHierarchyRoot()` again
6. Verify item IS in returned array

**Integration with Existing Code**:
- Uses `isItemArchived()` from `archiveUtils.ts` (S76)
- Checks `this.showArchivedItems` flag (S77)
- No new dependencies needed

**Expected Outcome**:
- Archive filtering works identically in hierarchy and status views
- Toggle state correctly controls visibility
- Logging provides visibility into filtering behavior

**Reference**:
- `vscode-extension/src/treeview/archiveUtils.ts:145` (isItemArchived function)
- `vscode-extension/src/treeview/PlanningTreeProvider.ts:243` (showArchivedItems property)

---

### Task 4: Add Performance Logging and Monitoring

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**What to do**: Ensure `getHierarchyRoot()` logs performance metrics to output channel.

**Logging Requirements**:

1. **Hierarchy Build Time**
   - Log: `[Hierarchy] Built hierarchy with N root nodes in Xms`
   - Target: < 100ms with 100+ items

2. **Performance Warning**
   - Log: `[Hierarchy] ⚠️  Performance warning: Root build exceeded 100ms threshold (Xms)`
   - Trigger: When duration > 100ms

3. **Archive Filtering Stats**
   - Log: `[Hierarchy] Filtered N archived items (toggle OFF)`
   - Shows number of items excluded

4. **Root Node Breakdown** (already in buildHierarchy)
   - Log: `[Hierarchy] buildHierarchy summary: Projects: N, Epics: N, ...`
   - Helps diagnose unexpected results

**Implementation** (already included in Task 1):
```typescript
const startTime = Date.now();
// ... hierarchy building ...
const duration = Date.now() - startTime;

this.outputChannel.appendLine(
  `[Hierarchy] Built hierarchy with ${hierarchy.length} root nodes in ${duration}ms`
);

if (duration > 100) {
  this.outputChannel.appendLine(
    `[Hierarchy] ⚠️  Performance warning: Root build exceeded 100ms threshold (${duration}ms)`
  );
}
```

**Expected Outcome**:
- All hierarchy operations logged to output channel
- Performance bottlenecks visible
- Easy debugging via Output → Cascade channel

**Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts` (various logging patterns)

---

## Completion Criteria

- ✅ `getHierarchyRoot()` method implemented
- ✅ Returns Projects + orphan Epics/Features/Stories at root level
- ✅ Archive filtering works correctly
- ✅ `getChildren()` routes based on viewMode
- ✅ Status view unchanged (no regression)
- ✅ Hierarchy view functional
- ✅ Performance logging in place
- ✅ Output channel logs view mode selection
- ✅ All logging uses `[Hierarchy]` prefix for filtering

## Testing Strategy

**Manual Verification**:
1. Package and install extension: `npm run package && code --install-extension cascade-0.1.0.vsix --force`
2. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
3. Open Output channel: Ctrl+Shift+P → "View: Toggle Output" → "Cascade"
4. Open Cascade TreeView
5. Check viewMode (should default to 'hierarchy' per S85)
6. Verify Projects appear at root level
7. Expand Project, verify Epics appear
8. Toggle archive filter, verify items show/hide
9. Switch to status view (future S87), verify status groups appear

**Output Channel Verification**:
```
[ViewMode] Initialized to: hierarchy
[Hierarchy] Filtered 0 archived items (toggle OFF)
[Hierarchy] buildHierarchy summary:
  - Total items: 127
  - Projects: 2, Epics: 5, Features: 18, Stories/Bugs: 100
  - Orphans: 2 (items without parents)
  - Root nodes: 4
[Hierarchy] Built hierarchy with 4 root nodes in 42ms
[getChildren] Using hierarchy view mode
```

**Unit Tests** (to be added in Phase 3):
- Test `getHierarchyRoot()` returns Projects
- Test archive filtering toggle
- Test view mode routing in `getChildren()`
- Test orphan item detection

## Next Phase

Proceed to **Phase 3: Testing and Validation** after completing all tasks in this phase.

**File**: `tasks/03-testing-validation.md`
