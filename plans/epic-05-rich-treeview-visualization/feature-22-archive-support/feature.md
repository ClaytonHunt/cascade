---
item: F22
title: Archive Support
type: feature
parent: E5
status: Completed
priority: High
dependencies: []
estimate: M
created: 2025-10-23
updated: 2025-10-23
---

# F22 - Archive Support

## Description

Implement comprehensive archive support for the Cascade TreeView, enabling users to hide completed/abandoned work while preserving it for historical reference. This feature addresses the current issue where archived items in `plans/archive/` are displayed alongside active work, cluttering the TreeView and causing confusion.

The implementation will support three complementary approaches:
- **A**: Filter archived items (hide by default with toggle to show)
- **C**: Add "Archived" as a new status value
- **D**: Treat `plans/archive/` directory items as archived

## Objectives

- **Hide archived items by default** to reduce TreeView clutter
- **Provide toggle control** to show/hide archived items on demand
- **Add "Archived" status** to the Status type definition
- **Auto-detect archived items** from `plans/archive/` directory location
- **Support `archived:` frontmatter field** for metadata tracking
- **Maintain performance** when filtering large numbers of archived items

## Current Issues

1. **Archived items displayed**: Items in `plans/archive/` appear in normal status groups
2. **No filter mechanism**: No way to hide completed/abandoned work
3. **Status confusion**: Archived items still show original status (Not Started, Completed, etc.)
4. **Type system gap**: "Archived" is not a valid Status value in types.ts
5. **Cluttered TreeView**: Historical items mixed with active work

## Requirements

### A: Filter Archived Items (Hide by Default with Toggle)

- **Default behavior**: Hide items with `archived:` frontmatter field or in `plans/archive/` directory
- **Toggle command**: "Show Archived Items" command to reveal archived items
- **Visual indicator**: Archived items shown with muted colors or special icon when visible
- **Persistence**: Remember toggle state across VSCode sessions (workspace state)
- **Performance**: Filter operation must not slow down TreeView refresh

### C: Add "Archived" as New Status

- **Type definition**: Update `Status` type in types.ts to include 'Archived'
- **Status group**: Create "Archived" status group (collapsed by default)
- **Status transition**: Any status → Archived (via Change Status command)
- **Frontmatter**: Update parsers to recognize "Archived" as valid status
- **Icon mapping**: Assign appropriate icon/color for Archived status (e.g., gray archive box icon)

### D: Treat `plans/archive/` Directory as Archived

- **Auto-detection**: Items in `plans/archive/` automatically treated as archived
- **Directory pattern**: Support glob pattern `plans/archive/**/*.md`
- **Override**: Items can have `status: Archived` in frontmatter OR be in archive directory (either triggers archived treatment)
- **Nested structure**: Support archived epics with nested features/stories
- **Migration path**: Moving file to archive directory auto-marks as archived

## Acceptance Criteria

1. **Type System**:
   - [ ] Status type includes 'Archived' value
   - [ ] STATUS_ICONS mapping includes Archived icon
   - [ ] Frontmatter parser accepts "Archived" status

2. **Filtering**:
   - [ ] Archived items hidden by default on TreeView load
   - [ ] Toggle command shows/hides archived items
   - [ ] Toggle state persists across VSCode sessions
   - [ ] Filter applies to all tree levels (Epics, Features, Stories, Bugs)

3. **Directory Detection**:
   - [ ] Items in `plans/archive/` treated as archived
   - [ ] Path checking works with nested directory structure
   - [ ] Archive directory items appear in "Archived" status group when shown

4. **Visual Design**:
   - [ ] Archived status group appears last in TreeView (after Completed)
   - [ ] Archived items have muted/grayed appearance when shown
   - [ ] Archive icon distinct from other status icons

5. **Performance**:
   - [ ] No measurable slowdown with 100+ archived items
   - [ ] Filter operation < 10ms

6. **User Experience**:
   - [ ] Toggle button visible in TreeView toolbar
   - [ ] Clear visual feedback when archived items shown/hidden
   - [ ] Archived count displayed (e.g., "Archived (23)")

## Technical Approach

### Status Type Update
```typescript
// vscode-extension/src/types.ts
export type Status =
  'Not Started' |
  'In Planning' |
  'Ready' |
  'In Progress' |
  'Blocked' |
  'Completed' |
  'Archived';
```

### Archive Detection Logic
```typescript
function isItemArchived(item: PlanningTreeItem): boolean {
  // Option 1: Frontmatter status is "Archived"
  if (item.status === 'Archived') return true;

  // Option 2: File is in archive directory
  if (item.filePath.includes('/archive/') || item.filePath.includes('\\archive\\')) {
    return true;
  }

  // Option 3: Frontmatter has 'archived:' field (requires reading full frontmatter)
  // TODO: Add archived field to PlanningTreeItem interface

  return false;
}
```

### Filter Application
```typescript
// In PlanningTreeProvider.getChildren()
let items = await this.loadAllPlanningItems();

// Apply archive filter if toggle is OFF
if (!this.showArchivedItems) {
  items = items.filter(item => !isItemArchived(item));
}
```

### Toggle Command
```typescript
// In extension.ts
vscode.commands.registerCommand('cascade.toggleArchived', () => {
  provider.toggleArchivedItems();
  // Persist state in workspace storage
  context.workspaceState.update('cascade.showArchived', provider.showArchivedItems);
});
```

## Architecture Impact

### Files to Modify

1. **types.ts**: Add 'Archived' to Status type
2. **statusIcons.ts**: Add icon mapping for Archived status
3. **PlanningTreeProvider.ts**:
   - Add `showArchivedItems` boolean flag
   - Add `toggleArchivedItems()` method
   - Add archive filtering logic in `getChildren()`
4. **PlanningTreeItem.ts**: Add optional `archived?: string` field
5. **extension.ts**: Register toggle command, persist toggle state
6. **package.json**: Add toggle command to contributions

### Performance Considerations

- Filtering happens after loading items (not during file scan)
- Archive check is O(1) string comparison
- No additional file reads required (uses existing frontmatter cache)
- Toggle state stored in memory (no disk I/O on each filter)

## Child Items

- **S75**: Type System Updates for Archived Status - Priority: High - Status: Not Started
- **S76**: Archive Directory Detection Logic - Priority: High - Status: Not Started
- **S77**: Toggle Command and UI Integration - Priority: High - Status: Not Started
- **S78**: Archive Filtering in TreeView - Priority: High - Status: Not Started
- **S79**: Persist Toggle State Across Sessions - Priority: Medium - Status: Not Started
- **S80**: Visual Design for Archived Items - Priority: Low - Status: Not Started
## Success Metrics

- Archived items hidden by default (0 visible on fresh load)
- Toggle command reveals archived items (all visible when enabled)
- No performance regression (< 500ms refresh with 100+ items)
- User can cleanly focus on active work vs historical work
- Archive directory items automatically treated as archived

## Dependencies

- Existing TreeView infrastructure (PlanningTreeProvider)
- Status type definition (types.ts)
- Icon mapping system (statusIcons.ts)
- VSCode workspace state API for persistence
