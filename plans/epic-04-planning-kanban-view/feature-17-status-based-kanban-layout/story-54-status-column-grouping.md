---
item: S54
title: Status Column Grouping
type: story
parent: F17
status: Completed
priority: High
dependencies: []
estimate: M
spec: specs/S54-status-column-grouping/
created: 2025-10-14
updated: 2025-10-14
---

# S54 - Status Column Grouping

## Description

Create virtual "status nodes" as top-level tree items that group planning items by their current status. Transform the flat TreeView from F16 into a kanban-style layout with status columns: Not Started → In Planning → Ready → In Progress → Blocked → Completed.

This story implements the foundational kanban structure that makes the planning pipeline status visible at a glance.

### Key Requirements

**Status Node Creation:**
- Create virtual status nodes (not backed by files)
- Each status node represents one status column
- Display format: "[Status] ([count])" (e.g., "Ready (5)")
- Order: Not Started → In Planning → Ready → In Progress → Blocked → Completed
- Default to expanded state for visibility

**Item Grouping:**
- Group all planning items under their respective status node
- Read status from frontmatter `status:` field
- Update grouping when status changes (via refresh)
- Maintain items within each status group

**Empty Status Handling:**
- Show empty status sections with "(empty)" label OR
- Hide empty status sections entirely (configurable via settings)
- Default: show empty sections to maintain consistent layout

**Status Node Interface:**
```typescript
interface StatusGroupNode {
  type: 'status-group';
  status: string;           // "Ready", "In Progress", etc.
  label: string;            // "Ready (5)"
  count: number;            // Number of items in this status
  collapsibleState: vscode.TreeItemCollapsibleState.Expanded;
}
```

### Technical Implementation

**Modified getChildren():**
```typescript
async getChildren(element?: PlanningTreeItem | StatusGroupNode): Promise<any[]> {
  if (!element) {
    // Root level: return status groups
    return this.getStatusGroups();
  }

  if (element.type === 'status-group') {
    // Status group clicked: return items with this status
    return this.getItemsForStatus(element.status);
  }

  // Item clicked: return empty (no children yet - hierarchy in S55)
  return [];
}
```

**Status Group Generation:**
```typescript
private async getStatusGroups(): Promise<StatusGroupNode[]> {
  const statuses = [
    'Not Started',
    'In Planning',
    'Ready',
    'In Progress',
    'Blocked',
    'Completed'
  ];

  // Load all items to calculate counts
  const allItems = await this.loadAllItems();

  // Build status group for each status
  const groups: StatusGroupNode[] = [];

  for (const status of statuses) {
    const itemsInStatus = allItems.filter(item => item.status === status);
    const count = itemsInStatus.length;

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

**Item Filtering:**
```typescript
private async getItemsForStatus(status: string): Promise<PlanningTreeItem[]> {
  const allItems = await this.loadAllItems();
  return allItems.filter(item => item.status === status);
}
```

**Modified getTreeItem():**
- Handle StatusGroupNode type separately
- Set appropriate icon (folder icon for status groups)
- Configure collapsible state
- Skip command assignment (status nodes aren't clickable)

### Integration Points

**Existing Infrastructure:**
- Extends PlanningTreeProvider from F16
- Uses FrontmatterCache for status extraction
- Leverages existing loadAllItems() logic (modified to cache)

**VSCode API:**
- TreeItem with virtual nodes (no resourceUri)
- Collapsible state management
- Dynamic label with count badges

### Testing Approach

**Unit Tests:**
- getStatusGroups() returns 6 status groups
- Status groups have correct counts
- getItemsForStatus() filters correctly
- Empty status sections handled properly

**Manual Verification:**
- TreeView shows 6 status columns
- Items appear under correct status
- Count badges update when status changes
- Empty sections show "(empty)" or hide

## Acceptance Criteria

- [ ] TreeView displays 6 status groups at root level
- [ ] Status groups ordered: Not Started → Completed
- [ ] Each status group shows count badge (e.g., "Ready (3)")
- [ ] Status groups default to expanded state
- [ ] Items grouped under their current status
- [ ] Empty status groups show "(empty)" or hide (configurable)
- [ ] Status groups collapsible/expandable
- [ ] Count badges update on refresh
- [ ] No errors when plans directory is empty
- [ ] Performance acceptable with 100+ items

## Analysis Summary

**Dependencies:**
- F16 (TreeView Foundation) - Completed ✅
- PlanningTreeProvider.ts - Extends getChildren() and getTreeItem()
- PlanningTreeItem.ts - Status field available in frontmatter

**Refactoring Required:**
- Modify getChildren() signature to accept StatusGroupNode | PlanningTreeItem
- Split root-level logic (status groups) from child logic (items)
- Add caching to avoid repeated file scans

**VSCode Patterns:**
- Virtual tree nodes (status groups without file backing)
- Dynamic tree item generation
- Conditional rendering based on node type
