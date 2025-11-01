---
item: F17
title: Status-Based Kanban Layout
type: feature
parent: E4
status: Completed
priority: High
dependencies: [F16]
created: 2025-10-13
updated: 2025-10-15
---

# F17 - Status-Based Kanban Layout

## Description

Transform the basic TreeView from F16 into a status-grouped kanban layout. Items are organized into status columns (Not Started → Completed) with hierarchical display showing Epic → Feature → Story/Bug relationships within each status group. Parent items display progress indicators showing completion percentage.

This feature implements the core kanban visualization pattern that makes the planning pipeline visible at a glance.

### Key Components

**Status Column Grouping:**
- Create virtual "status nodes" as top-level tree items
- Group planning items under their respective status
- Order: Not Started → In Planning → Ready → In Progress → Blocked → Completed
- Collapsible status sections
- Empty status sections show "(empty)" or hide entirely (configurable)

**Hierarchical Item Display:**
- Within each status column, show Epic → Feature → Story hierarchy
- Indent child items appropriately
- Preserve parent-child relationships from directory structure
- Expand/collapse parent items to manage complexity

**Progress Indicators:**
- Calculate completion percentage for Epics and Features
- Display format: "Epic 02 (80%)" or "Feature 05 (3/5)"
- Update indicators when child statuses change
- Visual progress bar (optional, using VSCode's TreeItem.description)

**Icon Integration:**
- Adapt statusIcons.ts for TreeView usage
- Remove FileDecoration dependencies
- Apply status-specific icons to items
- Use color-coded icons matching status semantics

### Technical Details

**Tree Structure:**
```
Root
├─ Not Started
│  ├─ Epic 01
│  │  └─ Feature 03 (0/2)
│  │     ├─ Story 15
│  │     └─ Story 16
├─ In Planning
│  └─ Feature 04 (0/1)
│     └─ Story 17
├─ Ready
│  ├─ Story 18
│  └─ Story 19
├─ In Progress
│  └─ Story 20
├─ Blocked
│  └─ Story 21
└─ Completed
   └─ Epic 02 (100%)
      └─ Feature 01 (2/2)
         ├─ Story 10 ✅
         └─ Story 11 ✅
```

**Status Node Type:**
```typescript
interface StatusGroupNode {
  type: 'status-group';
  status: string;
  label: string;  // "Not Started (3)"
  count: number;
}
```

**Progress Calculation:**
```typescript
function calculateProgress(item: PlanningTreeItem): string {
  const children = getChildren(item);
  const completed = children.filter(c => c.status === 'Completed').length;
  const total = children.length;

  if (total === 0) return '';

  const percentage = Math.round((completed / total) * 100);
  return `${completed}/${total} (${percentage}%)`;
}
```

**StatusIcons Refactoring:**
- Remove `getFileDecoration()` function
- Keep STATUS_BADGES and STATUS_COLORS mappings
- Add `getTreeItemIcon(status: string): vscode.ThemeIcon`
- Use VSCode built-in icons: `circle-outline`, `sync`, `check`, `debug-start`, `warning`, `pass`

## Analysis Summary

### Dependencies

**F16 (TreeView Foundation):**
- Extends PlanningTreeProvider to support virtual status nodes
- Modifies `getChildren()` to return status groups at root level
- Modifies `getTreeItem()` to render status groups and nested items

**Existing Infrastructure:**
- S42 (Status Icons): Adapt for TreeView
- parser.ts: Extract item relationships from frontmatter
- cache.ts: Quick access to all items for grouping

### VSCode API Extensions

**TreeItem Configuration:**
```typescript
treeItem.description = progress;  // "3/5 (60%)"
treeItem.iconPath = new vscode.ThemeIcon('circle-outline',
  new vscode.ThemeColor('notStartedColor'));
treeItem.contextValue = 'planningItem';  // For context menus in F19
```

**Status Group Rendering:**
```typescript
const statusGroup = new vscode.TreeItem(
  `${status} (${count})`,
  vscode.TreeItemCollapsibleState.Expanded
);
statusGroup.contextValue = 'statusGroup';
```

### Performance Considerations

- Cache status groupings (invalidate on file change)
- Lazy-load child items (expand on demand)
- Batch progress calculations
- Use FrontmatterCache to avoid repeated file reads

## Acceptance Criteria

- [ ] TreeView displays 6 status columns (Not Started → Completed)
- [ ] Items grouped under their current status
- [ ] Hierarchical relationships preserved (Epic → Feature → Story)
- [ ] Parent items show progress indicators (e.g., "3/5 (60%)")
- [ ] Status-specific icons from adapted statusIcons.ts
- [ ] Empty status sections either show "(empty)" or are hidden
- [ ] Status sections collapsible/expandable
- [ ] Progress indicators update when child status changes
- [ ] Performance remains acceptable with 100+ items
- [ ] statusIcons.ts no longer depends on FileDecoration API
- [ ] Visual hierarchy clear with proper indentation

## Child Items

- **S54**: Status Column Grouping - Est: M - Priority: High - Status: Completed ✅
- **S55**: Hierarchical Item Display - Est: L - Priority: High - Status: Completed ✅
- **S56**: Progress Indicators - Est: M - Priority: Medium - Status: Completed ✅
- **S57**: StatusIcons TreeView Adaptation - Est: S - Priority: Medium - Status: Completed ✅
- **S58**: Kanban Performance Optimization - Est: M - Priority: Low - Status: Completed ✅

### Implementation Sequence

1. **S54** - Foundation: Create status column grouping with virtual status nodes
2. **S57** - Infrastructure: Adapt statusIcons for TreeView (can be done in parallel with S54)
3. **S55** - Hierarchy: Implement Epic → Feature → Story relationships within status groups
4. **S56** - Polish: Add progress indicators to parent items
5. **S58** - Optimization: Add caching and lazy-loading for performance

**Note**: S54 and S57 can be implemented in parallel as they have no dependencies on each other.

Total Estimate: 1L + 3M + 1S (approximately 3-4 days)
