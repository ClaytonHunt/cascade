---
item: S57
title: StatusIcons TreeView Adaptation
type: story
parent: F17
status: Completed
priority: Medium
dependencies: []
estimate: S
created: 2025-10-14
updated: 2025-10-14
spec: specs/S57-statusicons-treeview-adaptation/
---

# S57 - StatusIcons TreeView Adaptation

## Description

Refactor `statusIcons.ts` to work with TreeView instead of FileDecorationProvider. Remove FileDecoration dependencies and expose functions that return VSCode ThemeIcon instances for use in TreeItem rendering.

This story decouples status icon logic from file decorations, making it reusable for TreeView items.

### Key Requirements

**Remove FileDecoration Dependencies:**
- Delete `getFileDecoration()` function (no longer needed)
- Remove `vscode.FileDecorationProvider` interface implementation
- Remove `provideFileDecoration()` method
- Keep STATUS_BADGES and STATUS_COLORS mappings (still useful)

**Add TreeView Icon Functions:**
```typescript
/**
 * Returns a ThemeIcon for a given status, suitable for TreeItem.iconPath.
 *
 * @param status - Item status (e.g., "Ready", "In Progress")
 * @returns ThemeIcon with appropriate icon ID and color
 */
export function getTreeItemIcon(status: string): vscode.ThemeIcon {
  const iconMap: { [key: string]: string } = {
    'Not Started': 'circle-outline',
    'In Planning': 'sync',
    'Ready': 'debug-start',
    'In Progress': 'loading~spin',
    'Blocked': 'warning',
    'Completed': 'pass'
  };

  const colorMap: { [key: string]: string } = {
    'Not Started': 'charts.gray',
    'In Planning': 'charts.yellow',
    'Ready': 'charts.green',
    'In Progress': 'charts.blue',
    'Blocked': 'charts.red',
    'Completed': 'testing.iconPassed'
  };

  const iconId = iconMap[status] || 'circle-outline';
  const colorId = colorMap[status];

  return new vscode.ThemeIcon(iconId, colorId ? new vscode.ThemeColor(colorId) : undefined);
}
```

**Icon Selection Rationale:**
- `circle-outline` - Not Started (empty circle, work not begun)
- `sync` - In Planning (circular arrows, iterative planning)
- `debug-start` - Ready (play button, ready to start)
- `loading~spin` - In Progress (spinning loader, active work)
- `warning` - Blocked (warning triangle, attention needed)
- `pass` - Completed (checkmark, success)

**Keep Badge/Color Mappings:**
- Retain STATUS_BADGES for potential future use
- Retain STATUS_COLORS for consistency
- Export as constants for reuse in other modules

**Integration with PlanningTreeProvider:**
```typescript
// In PlanningTreeProvider.getTreeItem()
import { getTreeItemIcon } from './statusIcons';

getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
  const treeItem = new vscode.TreeItem(label, collapsibleState);

  // Use status-specific icon
  treeItem.iconPath = getTreeItemIcon(element.status);

  return treeItem;
}
```

### Technical Implementation

**File Structure:**
```typescript
// src/statusIcons.ts (refactored)

import * as vscode from 'vscode';

/**
 * Badge symbols for status indicators (for reference/future use).
 */
export const STATUS_BADGES: { [key: string]: string } = {
  'Not Started': '○',
  'In Planning': '◐',
  'Ready': '▶',
  'In Progress': '⟳',
  'Blocked': '⚠',
  'Completed': '✓'
};

/**
 * Color codes for status indicators (for reference/future use).
 */
export const STATUS_COLORS: { [key: string]: string } = {
  'Not Started': '#6E7681',
  'In Planning': '#DBAB09',
  'Ready': '#3FB950',
  'In Progress': '#2F81F7',
  'Blocked': '#F85149',
  'Completed': '#8957E5'
};

/**
 * Returns a ThemeIcon for TreeView rendering based on status.
 */
export function getTreeItemIcon(status: string): vscode.ThemeIcon {
  // ... implementation above ...
}
```

**Migration Steps:**
1. Remove `getFileDecoration()` and FileDecorationProvider interface
2. Add `getTreeItemIcon()` function
3. Update PlanningTreeProvider to use new function
4. Remove references to FileDecoration in extension.ts
5. Test icon rendering across all status types

### Integration Points

**Affected Files:**
- `src/statusIcons.ts` - Refactor to remove FileDecoration
- `src/treeview/PlanningTreeProvider.ts` - Use getTreeItemIcon()
- `src/extension.ts` - Remove FileDecorationProvider registration

**Existing Infrastructure:**
- STATUS_BADGES and STATUS_COLORS remain for reference
- ThemeIcon API for color-aware icons
- Automatic theme adaptation (light/dark mode)

### Testing Approach

**Unit Tests:**
- getTreeItemIcon() returns correct icon for each status
- Icon IDs match VSCode Codicon library
- ThemeColor IDs valid
- Fallback handling for unknown status

**Manual Verification:**
- Icons render correctly for all status types
- Colors appropriate for light/dark themes
- No console errors about missing icons
- Icons consistent across TreeView
- Icons scale correctly at different zoom levels

## Acceptance Criteria

- [ ] statusIcons.ts no longer implements FileDecorationProvider
- [ ] getFileDecoration() function removed
- [ ] getTreeItemIcon() function added and exported
- [ ] Function returns ThemeIcon with correct icon ID
- [ ] Function returns ThemeIcon with correct color
- [ ] STATUS_BADGES and STATUS_COLORS retained as constants
- [ ] PlanningTreeProvider uses getTreeItemIcon()
- [ ] Icons render correctly for all 6 status types
- [ ] Icons theme-aware (adapt to light/dark mode)
- [ ] No console errors or warnings

## Analysis Summary

**Refactoring Scope:**
- Remove: FileDecorationProvider interface, getFileDecoration()
- Add: getTreeItemIcon() function
- Preserve: Badge/color mappings for reference

**VSCode API:**
- ThemeIcon with Codicon IDs
- ThemeColor for automatic theme adaptation
- Tree item iconPath property

**Impact:**
- Low risk: Isolated refactoring
- No breaking changes to other modules
- Simple migration path

**Codicon Reference:**
Available icons: https://microsoft.github.io/vscode-codicons/dist/codicon.html
- circle-outline, sync, debug-start, loading~spin, warning, pass
