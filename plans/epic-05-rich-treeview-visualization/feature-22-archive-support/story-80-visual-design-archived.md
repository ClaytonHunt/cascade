---
item: S80
title: Visual Design for Archived Items
type: story
parent: F22
status: Completed
priority: Low
dependencies: [S75, S76, S78]
estimate: S
spec: specs/S80-visual-design-archived/
created: 2025-10-23
updated: 2025-10-24
---

# S80 - Visual Design for Archived Items

## Description

Apply visual styling to archived items to distinguish them from active work when both are visible in the TreeView. Archived items should appear muted/grayed to indicate their inactive status, making it easy to focus on active work even when archived items are shown.

This story enhances the user experience by providing clear visual differentiation between archived and active items without requiring the user to read status labels.

## Acceptance Criteria

1. **Icon Styling**:
   - [ ] Archived items use muted/gray icon color (from S75 icon mapping)
   - [ ] Icon distinct from active status icons (but not jarring)
   - [ ] Icon consistent across all item types (epic, feature, story, bug)

2. **Label Styling** (Optional Enhancement):
   - [ ] Archived item labels appear dimmed/grayed (if VSCode API supports)
   - [ ] Alternative: Use strikethrough or italic font style
   - [ ] Styling applied only when archived items visible (toggle ON)

3. **Status Badge/Indicator**:
   - [ ] "Archived" text appears in description field (similar to other statuses)
   - [ ] Description color matches muted theme (gray)
   - [ ] No bold or bright colors for archived items

4. **Archived Status Group**:
   - [ ] "Archived" status group uses folder icon (consistent with other groups)
   - [ ] Status group label clearly indicates archived content
   - [ ] Collapsed by default to minimize visual clutter

5. **Accessibility**:
   - [ ] Visual styling does not rely solely on color (use icon shape + color)
   - [ ] Muted styling does not obscure readability
   - [ ] Tooltip text clearly indicates "Archived" status

## Technical Implementation

### Files to Modify

1. **vscode-extension/src/statusIcons.ts** (Already done in S75)
2. **vscode-extension/src/treeview/PlanningTreeProvider.ts** (Optional label styling)

### Icon Styling (S75 Implementation)

Icon and color already defined in S75:
```typescript
// In statusIcons.ts (from S75)
export const STATUS_ICONS = {
  'Archived': 'archive',       // Archive box icon
};

export const STATUS_COLORS = {
  'Archived': 'charts.gray',   // Muted gray color
};
```

No additional changes needed for icon styling (handled by S75).

### Label Styling (Optional Enhancement)

VSCode TreeItem API has limited label styling options. Options:

**Option A**: Use `description` field for status text (current approach)
```typescript
// In PlanningTreeProvider.getTreeItem()
if (isItemArchived(element)) {
  treeItem.description = 'Archived';  // Simple status text
}
```

**Option B**: Use `resourceUri` + FileDecoration (complex, overkill)
- Requires FileDecorationProvider
- Allows color/opacity changes
- Too heavyweight for simple muting

**Option C**: Use context value + CSS (not supported in TreeView)
- TreeView does not support custom CSS
- Cannot apply strikethrough or font styles

**Recommendation**: Stick with Option A (description field) for simplicity. The muted icon is sufficient visual distinction.

### Tooltip Enhancement

```typescript
// In PlanningTreeProvider.buildTooltip()
private buildTooltip(element: PlanningTreeItem): string {
  const relativePath = path.relative(this.workspaceRoot, element.filePath);

  // Check if item is archived
  const archivedLabel = isItemArchived(element) ? ' [ARCHIVED]' : '';

  const lines = [
    `${element.item} - ${element.title}${archivedLabel}`,
    `Type: ${element.type} | Status: ${element.status} | Priority: ${element.priority}`,
    `File: ${relativePath}`
  ];

  return lines.join('\n');
}
```

This adds `[ARCHIVED]` tag to tooltip for clarity.

### Status Group Styling

Status group already uses folder icon (consistent with other groups):
```typescript
// In PlanningTreeProvider.getTreeItem() for status groups
if (element.type === 'status-group') {
  const statusGroup = element as StatusGroupNode;

  const treeItem = new vscode.TreeItem(
    statusGroup.label,  // "Archived (23)"
    vscode.TreeItemCollapsibleState.Collapsed  // Collapsed by default
  );

  treeItem.iconPath = new vscode.ThemeIcon('folder');  // Folder icon
  treeItem.contextValue = 'status-group';

  return treeItem;
}
```

No changes needed (already implemented in S78).

### Testing Approach

1. **Icon Color Test**:
   - Create archived item: `plans/archive/test-archived.md`
   - Toggle archived items ON
   - Open TreeView
   - Verify icon is gray/muted (not bright blue/green)

2. **Comparison Test**:
   - Create active item: `plans/test-active.md` with `status: Ready`
   - Create archived item: `plans/archive/test-archived.md` with `status: Ready`
   - Toggle ON
   - Compare icons side-by-side
   - Verify archived icon is visually distinct (muted)

3. **Tooltip Test**:
   - Hover over archived item
   - Verify tooltip shows "[ARCHIVED]" tag
   - Verify tooltip is readable (not obscured)

4. **Accessibility Test**:
   - Use high-contrast theme
   - Verify archived items still visible and distinguishable
   - Verify color + icon combination provides clear indication

### Visual Design Examples

**Active Item** (Ready status):
- Icon: Green play button (debug-start)
- Label: "S49 - TreeDataProvider Core Implementation"
- Description: "Ready"

**Archived Item** (originally Ready):
- Icon: Gray archive box (archive)
- Label: "S22 - Convert Manual Verification Scripts"
- Description: "Archived"

**Archived Status Group**:
- Icon: Gray folder
- Label: "Archived (23)"
- State: Collapsed by default

## Dependencies

- **S75**: Requires 'Archived' icon and color mapping
- **S76**: Requires `isItemArchived()` function for detection
- **S78**: Requires "Archived" status group implementation

## Notes

- Visual styling is intentionally subtle (muted, not jarring)
- Icon + tooltip provide sufficient indication (no need for label styling)
- Archived status group collapsed by default to reduce clutter
- Accessibility is critical - don't rely solely on color (use icon shape + color)
- Future enhancement: Consider FileDecoration for opacity/strikethrough (if needed)
