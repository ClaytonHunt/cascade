---
item: F23
title: Status Badge Rendering
type: feature
parent: E5
status: Completed
priority: High
dependencies: []
estimate: M
created: 2025-10-23
updated: 2025-10-25
---

# F23 - Status Badge Rendering

## Description

Implement colored pill-shaped status badges in the TreeView description field to provide at-a-glance visual status indicators. Badges use color-coded backgrounds with contrasting text to display status values like "In Progress", "Ready", "Completed", and "Blocked".

This feature transforms the current plain-text status display into visually rich badges that match the reference design, making status information immediately recognizable through color and shape.

## Objectives

- **Colored Badges**: Implement pill-shaped badges with status-specific colors
- **High Contrast**: Ensure badges are readable in both light and dark themes
- **ANSI Support**: Use ANSI color codes or Unicode box characters for badge rendering
- **Status Mapping**: Map each Status value to appropriate color scheme
- **Performance**: Badge rendering must not slow down TreeView refresh

## Reference Design

From the ChatGPT reference design:
- **Yellow Badge**: "In Progress" status (warning color)
- **Blue Badge**: "Ready" status (info color)
- **Green Badge**: "Completed" status (success color)
- **Red Badge**: "Blocked" status (error color)
- **Gray Badge**: "Not Started" status (muted color)
- **Purple/Magenta Badge**: "In Planning" status (planning color)

Badge format: `[●] Status` or `⬤ Status` with background color

## Acceptance Criteria

1. **Badge Rendering**:
   - [ ] Each status value renders with color-coded badge
   - [ ] Badges use pill/rounded shape (Unicode characters or ANSI codes)
   - [ ] Badge color matches VSCode theme color tokens
   - [ ] Text inside badge has sufficient contrast for readability

2. **Color Mapping**:
   - [ ] Not Started: Gray/muted (charts.gray)
   - [ ] In Planning: Yellow/amber (charts.yellow)
   - [ ] Ready: Green (charts.green)
   - [ ] In Progress: Blue (charts.blue)
   - [ ] Blocked: Red (charts.red)
   - [ ] Completed: Green with checkmark (testing.iconPassed)
   - [ ] Archived: Gray/muted (charts.gray)

3. **TreeItem Integration**:
   - [ ] Badges appear in TreeItem.description field
   - [ ] Badge positioned before or after item title
   - [ ] Badge does not break existing tooltip/icon rendering
   - [ ] Badge updates when status changes (via drag-and-drop or context menu)

4. **Performance**:
   - [ ] Badge generation < 1ms per item
   - [ ] No observable lag when rendering 100+ items with badges
   - [ ] Badge strings cached or computed efficiently

5. **Theme Compatibility**:
   - [ ] Badges readable in Dark+ theme
   - [ ] Badges readable in Light+ theme
   - [ ] Badge colors adapt to user's color theme

## Technical Approach

### Badge Rendering Options

**Option 1: Unicode Characters with ANSI Codes**
```typescript
function renderStatusBadge(status: Status): string {
  const badge = {
    'Not Started': '\x1b[90m● Not Started\x1b[0m',
    'In Progress': '\x1b[94m● In Progress\x1b[0m',
    'Ready': '\x1b[92m● Ready\x1b[0m',
    // ...
  };
  return badge[status] || status;
}
```

**Option 2: Unicode Box Characters**
```typescript
function renderStatusBadge(status: Status): string {
  return `[${status}]`; // VSCode may apply color via theme
}
```

**Option 3: Custom ThemeColor Integration**
```typescript
// Set TreeItem.description with colored text using markdown or HTML
treeItem.description = `$(circle-filled) ${status}`;
```

### Integration Point

Modify `PlanningTreeProvider.getTreeItem()`:
```typescript
getTreeItem(element: TreeNode): vscode.TreeItem {
  // ... existing code ...

  if (element.type === 'item') {
    const badge = renderStatusBadge(element.item.status);
    treeItem.description = `${badge} ${progressString}`;
  }

  return treeItem;
}
```

## Architecture Impact

### Files to Modify

1. **Create utility file**: `vscode-extension/src/treeview/badgeRenderer.ts`
   - Export `renderStatusBadge(status: Status): string`
   - Export status-to-color mapping constants

2. **Update**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
   - Import `renderStatusBadge`
   - Modify `getTreeItem()` to include badge in description
   - Update tests to verify badge rendering

3. **Update**: `vscode-extension/src/test/suite/treeItemRendering.test.ts`
   - Add test cases for badge rendering
   - Verify badge format and color codes

### Performance Considerations

- Badge strings are simple string concatenations (O(1))
- No regex or complex parsing required
- Color codes are static constants (compiled once)
- Badge generation happens during TreeItem creation (already cached)

## Success Metrics

- All status values render with distinct, color-coded badges
- Badges are immediately recognizable without reading text
- No performance degradation (< 500ms refresh with 100+ items)
- User can distinguish status at a glance from badge color alone
- Badges work correctly in both light and dark themes

## Dependencies

- VSCode ThemeColor API for color token support
- Existing Status type definition (types.ts)
- TreeItem rendering infrastructure (PlanningTreeProvider)

## Notes

- This feature focuses on status badges only; progress badges are handled by F24
- Badge format may need experimentation to find best VSCode compatibility
- ANSI codes may not work in VSCode TreeView; Unicode + theme colors preferred
- Consider using `$(icon-name)` Codicon syntax for colored symbols

## Child Items

- **S81**: Badge Renderer Utility - Create standalone badge rendering function with Codicon syntax
- **S82**: TreeView Badge Integration - Integrate badges into PlanningTreeProvider.getTreeItem()
- **S83**: Badge Theme Compatibility Testing - Validate badges in light/dark themes with screenshots
- **S84**: Badge Performance Validation - Measure badge rendering overhead with 100+ item test data
