---
item: S78
title: Archive Filtering in TreeView
type: story
parent: F22
status: Completed
priority: High
dependencies: [S75, S76, S77]
estimate: M
spec: specs/S78-archive-filtering-treeview/
created: 2025-10-23
updated: 2025-10-23
---

# S78 - Archive Filtering in TreeView

## Description

Implement the core filtering logic that hides archived items from the TreeView by default. When `showArchivedItems` flag is OFF, archived items are filtered out before building status groups and hierarchy. When ON, all items (including archived) are displayed.

This story also adds an "Archived" status group that appears ONLY when archived items are visible.

## Acceptance Criteria

1. **Default Behavior (Toggle OFF)**:
   - [ ] Archived items hidden from all status groups
   - [ ] "Archived" status group NOT displayed
   - [ ] TreeView shows only active work (non-archived items)
   - [ ] No "Archived" count badge in status groups

2. **Toggle ON Behavior**:
   - [ ] Archived items visible in appropriate status groups (based on original status)
   - [ ] "Archived" status group displayed (collapsed by default)
   - [ ] Archived status group shows count of archived items
   - [ ] Archived status group appears LAST (after "Completed")

3. **Filtering Logic**:
   - [ ] Filter applied in `loadAllPlanningItems()` or `getStatusGroups()`
   - [ ] Uses `isItemArchived()` from S76 for detection
   - [ ] Filter operation < 10ms with 100+ items (performance requirement)
   - [ ] No duplicate filtering (filter once, reuse result)

4. **Status Group Handling**:
   - [ ] Status group order: Not Started → In Planning → Ready → In Progress → Blocked → Completed → Archived
   - [ ] Archived status group only appears when `showArchivedItems = true`
   - [ ] Archived status group shows count: "Archived (23)"
   - [ ] Archived status group collapsed by default (not expanded)

5. **Edge Cases**:
   - [ ] Items with `status: Archived` appear in "Archived" status group (not original status)
   - [ ] Items in `plans/archive/` with `status: Ready` appear in "Archived" group (directory overrides status)
   - [ ] Empty status groups hidden (no "Archived (0)" when no archived items)
   - [ ] Hierarchy preserved within Archived status group (epics → features → stories)

## Technical Implementation

### Files to Modify

1. **vscode-extension/src/treeview/PlanningTreeProvider.ts**

### Filtering Approach

**Option A**: Filter in `loadAllPlanningItems()` (early filtering)
```typescript
private async loadAllPlanningItems(): Promise<PlanningTreeItem[]> {
  // ... existing cache check and loading logic ...

  let items = await this.loadAllPlanningItemsUncached();

  // Apply archive filter if toggle is OFF
  if (!this.showArchivedItems) {
    const beforeCount = items.length;
    items = items.filter(item => !isItemArchived(item));
    const afterCount = items.length;
    const filtered = beforeCount - afterCount;

    if (filtered > 0) {
      this.outputChannel.appendLine(`[Archive] Filtered ${filtered} archived items`);
    }
  }

  return items;
}
```

**Option B**: Filter in `getStatusGroups()` (late filtering)
- Allows more granular control per status group
- Can show archived items in separate "Archived" status group
- **Recommended approach** for F22 requirements

### Status Group Updates

```typescript
private async getStatusGroups(): Promise<StatusGroupNode[]> {
  const startTime = Date.now();

  // Define status order (workflow progression)
  const statuses: Status[] = [
    'Not Started',
    'In Planning',
    'Ready',
    'In Progress',
    'Blocked',
    'Completed'
  ];

  // Add Archived status ONLY if showArchivedItems is ON
  if (this.showArchivedItems) {
    statuses.push('Archived');
  }

  // Load all planning items once for efficient filtering
  const allItems = await this.loadAllPlanningItems();

  // Build status group for each status
  const groups: StatusGroupNode[] = [];

  for (const status of statuses) {
    // Special handling for Archived status group
    if (status === 'Archived') {
      // Include ALL items where isItemArchived() returns true
      const archivedItems = allItems.filter(item => isItemArchived(item));
      const count = archivedItems.length;

      if (count > 0) {
        groups.push({
          type: 'status-group',
          status: status,
          label: `${status} (${count})`,
          count: count,
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed  // Collapsed by default
        });
      }
    } else {
      // Normal status group - filter by status AND exclude archived items
      const itemsInStatus = allItems.filter(item => {
        // Item must match status
        const matchesStatus = item.status === status;

        // If toggle is OFF, exclude archived items
        const isArchived = isItemArchived(item);
        const includeItem = this.showArchivedItems || !isArchived;

        return matchesStatus && includeItem;
      });

      const count = itemsInStatus.length;

      groups.push({
        type: 'status-group',
        status: status,
        label: `${status} (${count})`,
        count: count,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded
      });
    }
  }

  const duration = Date.now() - startTime;
  this.outputChannel.appendLine(`[StatusGroups] Built ${groups.length} status groups in ${duration}ms`);

  return groups;
}
```

### Archived Status Group Children

```typescript
private async getItemsForStatus(status: Status): Promise<PlanningTreeItem[]> {
  const allItems = await this.loadAllPlanningItems();

  // Special handling for Archived status
  if (status === 'Archived') {
    return allItems.filter(item => isItemArchived(item));
  }

  // Normal status - filter by status and exclude archived items
  return allItems.filter(item => {
    const matchesStatus = item.status === status;
    const isArchived = isItemArchived(item);
    const includeItem = this.showArchivedItems || !isArchived;

    return matchesStatus && includeItem;
  });
}
```

### Import Statement

```typescript
import { isItemArchived } from './archiveUtils';
```

### Testing Approach

1. **Default Filtering Test**:
   - Create archived item: `plans/archive/test-archived.md` with `status: Ready`
   - Open TreeView with toggle OFF
   - Verify item does NOT appear in "Ready" status group
   - Verify "Archived" status group does NOT appear

2. **Toggle ON Test**:
   - Click "Show Archived" button
   - Verify "Archived" status group appears
   - Verify archived item appears in "Archived" group (not "Ready")
   - Verify status group order (Archived is last)

3. **Mixed Status Test**:
   - Create archived items with different statuses:
     - `plans/archive/story-a.md` with `status: Ready`
     - `plans/archive/story-b.md` with `status: In Progress`
   - Toggle ON
   - Verify both items appear in "Archived" group (not original status groups)

4. **Performance Test**:
   - Create 100 archived items in `plans/archive/`
   - Toggle ON and OFF
   - Verify filter operation < 10ms (check output channel)
   - Verify TreeView refresh < 500ms

5. **Hierarchy Test**:
   - Create archived epic with nested feature and story
   - Toggle ON
   - Verify hierarchy preserved within "Archived" status group
   - Expand epic → feature → story

## Dependencies

- **S75**: Requires 'Archived' status type
- **S76**: Requires `isItemArchived()` function
- **S77**: Requires `showArchivedItems` flag and toggle command

## Notes

- Archived items appear in "Archived" status group, NOT their original status group
- Directory location (`plans/archive/`) overrides frontmatter status for grouping
- Performance is critical - filter once, cache result during refresh cycle
- "Archived" status group collapsed by default to reduce visual clutter
