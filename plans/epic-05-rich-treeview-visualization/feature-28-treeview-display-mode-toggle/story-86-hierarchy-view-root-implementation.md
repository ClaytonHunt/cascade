---
item: S86
title: Hierarchy View Root Implementation
type: story
parent: F28
status: Completed
priority: High
dependencies: [S85]
estimate: M
created: 2025-10-24
updated: 2025-10-25
spec: specs/S86-hierarchy-view-root-implementation/
---

# S86 - Hierarchy View Root Implementation

## Description

Implement hierarchy view root logic that displays planning items in a Project → Epic → Feature → Story → Spec tree structure (instead of status-grouped view). This story modifies `getChildren()` to check view mode and delegates to the new `getHierarchyRoot()` method when in 'hierarchy' mode.

The hierarchy view organizes items by their parent-child relationships as determined by directory structure, matching the ChatGPT reference design where Projects contain Epics contain Features contain Stories.

## Acceptance Criteria

1. **getHierarchyRoot() Method**:
   - [ ] Returns root-level hierarchy nodes (Projects + orphan Epics + orphan Features)
   - [ ] Reuses existing `buildHierarchy()` method (no duplication)
   - [ ] Filters archived items if `showArchivedItems` is OFF
   - [ ] Logs hierarchy statistics to output channel
   - [ ] Returns TreeNode[] for VSCode TreeView compatibility

2. **getChildren() Modification**:
   - [ ] Check view mode at root level (`if (!element)`)
   - [ ] Delegate to `getStatusGroups()` if mode is 'status' (existing)
   - [ ] Delegate to `getHierarchyRoot()` if mode is 'hierarchy' (NEW)
   - [ ] Preserve existing child expansion logic (unchanged for both modes)

3. **Hierarchy Structure**:
   - [ ] Root level shows Projects (type: 'project')
   - [ ] Root level shows orphan Epics (no parent Project directory)
   - [ ] Root level shows orphan Features (no parent Epic directory)
   - [ ] Root level shows orphan Stories/Bugs (no parent Feature directory)
   - [ ] Items sorted by item number (P1, P2, E1, E2, F1, ...)

4. **Archive Filtering Integration**:
   - [ ] Respect `showArchivedItems` flag in hierarchy view
   - [ ] Filter archived items before building hierarchy (if flag OFF)
   - [ ] Include archived items in hierarchy (if flag ON)
   - [ ] Use existing `isItemArchived()` utility for detection

5. **Performance**:
   - [ ] Hierarchy view uses existing items cache (no additional file reads)
   - [ ] `buildHierarchy()` called once per refresh (not per expansion)
   - [ ] Root level load time < 100ms with 100+ items
   - [ ] Log hierarchy build time to output channel

6. **Testing**:
   - [ ] Unit test: `getHierarchyRoot()` returns Projects at root level
   - [ ] Unit test: Orphan Epics appear at root level
   - [ ] Unit test: Archived items filtered when toggle OFF
   - [ ] Integration test: Switch view mode, verify correct root items
   - [ ] Integration test: Expand hierarchy, verify parent-child relationships

## Implementation Notes

### Code Structure

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**New Method** (add after `getStatusGroups()` around line 873):
```typescript
/**
 * Gets root-level nodes for hierarchy view.
 *
 * Returns the top-most items in the planning hierarchy:
 * - Projects (type: 'project')
 * - Orphan Epics (no parent Project directory)
 * - Orphan Features (no parent Epic directory)
 * - Orphan Stories/Bugs (no parent Feature directory)
 *
 * This method powers the hierarchy view mode (F28) where items are
 * organized by parent-child relationships (P→E→F→S) instead of status groups.
 *
 * Archive filtering (S78):
 * - Archived items excluded unless `showArchivedItems` is ON
 * - Uses existing `isItemArchived()` utility for detection
 *
 * Performance:
 * - Reuses existing items cache (no additional file reads)
 * - O(n) hierarchy building where n = number of items
 * - Typical execution time < 50ms with 100+ items
 *
 * @returns Array of root-level tree nodes (Projects + orphans)
 */
private async getHierarchyRoot(): Promise<TreeNode[]> {
  const startTime = Date.now();

  // Load all planning items (from cache)
  const allItems = await this.loadAllPlanningItems();

  // Filter archived items if toggle is OFF
  let filteredItems = allItems;
  if (!this.showArchivedItems) {
    filteredItems = allItems.filter(item => !isItemArchived(item));
    this.outputChannel.appendLine(
      `[Hierarchy] Filtered ${allItems.length - filteredItems.length} archived items`
    );
  }

  // Build hierarchy from filtered items
  const hierarchy = this.buildHierarchy(filteredItems);

  // Calculate duration
  const duration = Date.now() - startTime;
  this.outputChannel.appendLine(
    `[Hierarchy] Built hierarchy with ${hierarchy.length} root nodes in ${duration}ms`
  );

  // Return root-level items (Projects + orphan Epics/Features/Stories)
  return hierarchy.map(node => node.item);
}
```

**Modified getChildren()** (existing method around line 686):
```typescript
async getChildren(element?: TreeNode): Promise<TreeNode[]> {
  // Root level: Check view mode (F28)
  if (!element) {
    if (this.viewMode === 'status') {
      // Status-grouped view (existing)
      return await this.getStatusGroups();
    } else {
      // Hierarchy view (F28 - NEW)
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

  if (item.type === 'epic' || item.type === 'feature' || item.type === 'project') {
    // Parent item - return children from hierarchy
    return await this.getChildrenForItem(item);
  }

  // Leaf item (story, bug, spec, phase) - no children
  return [];
}
```

**Modified getChildrenForItem()** (add 'project' support around line 1450):
```typescript
private async getChildrenForItem(item: PlanningTreeItem): Promise<PlanningTreeItem[]> {
  const allItems = await this.loadAllPlanningItems();
  const hierarchy = this.buildHierarchy(allItems);

  // Find the node for this item
  const findNode = (nodes: HierarchyNode[]): HierarchyNode | null => {
    for (const node of nodes) {
      if (node.item.item === item.item) {
        return node;
      }
      const found = findNode(node.children);
      if (found) {
        return found;
      }
    }
    return null;
  };

  const node = findNode(hierarchy);
  if (node && node.children.length > 0) {
    // Return children sorted by item number
    return node.children
      .map(child => child.item)
      .sort((a, b) => this.compareItemNumbers(a.item, b.item));
  }

  return [];
}
```

### Hierarchy Building Logic

The existing `buildHierarchy()` method (lines 1231-1340) already:
- Parses file paths to detect parent-child relationships
- Creates HierarchyNode tree structure
- Handles Projects, Epics, Features, Stories, Bugs
- Returns root-level nodes (exactly what we need!)

We simply need to:
1. Call `buildHierarchy()` with filtered items
2. Extract root nodes
3. Map to PlanningTreeItem[] for TreeView

### Testing Strategy

**Unit Tests** (`vscode-extension/src/test/suite/hierarchyView.test.ts`):
- Test `getHierarchyRoot()` returns Projects at root
- Test orphan Epics appear at root
- Test archived filtering integration
- Test view mode switching in `getChildren()`

**Integration Tests**:
- Create mock hierarchy (P1 > E1 > F1 > S1)
- Switch to hierarchy view
- Verify root shows P1
- Expand P1, verify E1 appears
- Expand E1, verify F1 appears
- Expand F1, verify S1 appears

## Technical Notes

- Hierarchy view reuses 90% of existing code (`buildHierarchy`, `getChildrenForItem`)
- Only new code is `getHierarchyRoot()` wrapper and `getChildren()` routing
- Performance identical to status view (same caching, same hierarchy building)
- Projects are detected by `type: 'project'` in frontmatter
- Orphans are items without parent directory structure

## Dependencies

- **S85**: Requires `viewMode` property and `getViewMode()` method
- Existing `buildHierarchy()` method (PlanningTreeProvider.ts:1231)
- Existing `isItemArchived()` utility (archiveUtils.ts)
- Existing items cache (loadAllPlanningItems)

## Related Stories

- **S85**: Provides view mode state that this story checks
- **S87**: Provides UI for user to switch to hierarchy view
