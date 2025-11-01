---
item: S82
title: TreeView Badge Integration
type: story
parent: F23
status: Completed
priority: High
dependencies: [S81]
estimate: S
created: 2025-10-24
updated: 2025-10-24
spec: specs/S82-treeview-badge-integration/
---

# S82 - TreeView Badge Integration

## Description

Integrate the badge renderer utility (S81) into the TreeView rendering pipeline by modifying `PlanningTreeProvider.getTreeItem()` to include status badges in the TreeItem description field. This story connects the badge rendering logic to the actual TreeView UI.

The integration replaces plain-text status strings with color-coded Codicon badges, making status information visually distinct and immediately recognizable.

## Acceptance Criteria

1. **TreeItem Description Update**:
   - [ ] Modify `PlanningTreeProvider.getTreeItem()` to use `renderStatusBadge()`
   - [ ] Badge appears in `treeItem.description` field
   - [ ] Badge appears before progress indicator for Epic/Feature items
   - [ ] Badge appears alone for Story/Bug items (no progress indicator)

2. **Description Format**:
   - [ ] Epic/Feature with children: `$(icon) Status (3/5)`
   - [ ] Epic/Feature without children: `$(icon) Status`
   - [ ] Story/Bug: `$(icon) Status`
   - [ ] Archived items: Badge shows "$(archive) Archived"

3. **Integration Points**:
   - [ ] Import `renderStatusBadge` from `badgeRenderer.ts`
   - [ ] Replace all `element.status` assignments with badge-rendered versions
   - [ ] Preserve existing progress calculation logic (don't modify)
   - [ ] Maintain existing tooltip and icon behavior

4. **Visual Verification**:
   - [ ] Badges visible in Cascade TreeView
   - [ ] Icons render correctly (no broken syntax)
   - [ ] Colors adapt to VSCode theme (test in Dark+ and Light+)
   - [ ] Badges don't truncate or overflow TreeItem labels

5. **Dynamic Updates**:
   - [ ] Badges update when status changes via drag-and-drop (S61)
   - [ ] Badges update when status changes via context menu (F19)
   - [ ] TreeView refresh shows new badges immediately

## Technical Notes

**Integration Location**:
`PlanningTreeProvider.ts:631-648` - `getTreeItem()` description assignment

**Current Code**:
```typescript
if (element.type === 'epic' || element.type === 'feature') {
  const progress = await this.calculateProgress(element);
  if (progress) {
    treeItem.description = `${element.status} ${progress.display}`;
  } else {
    treeItem.description = element.status;
  }
} else {
  treeItem.description = element.status;
}
```

**Updated Code**:
```typescript
import { renderStatusBadge } from './badgeRenderer';

// ... in getTreeItem() ...

const statusBadge = renderStatusBadge(element.status);

if (element.type === 'epic' || element.type === 'feature') {
  const progress = await this.calculateProgress(element);
  if (progress) {
    treeItem.description = `${statusBadge} ${progress.display}`;
  } else {
    treeItem.description = statusBadge;
  }
} else {
  treeItem.description = statusBadge;
}
```

**Archived Items Handling**:
S80 added archived item detection. Ensure archived items display archive badge:
```typescript
const status = isArchived ? 'Archived' : element.status;
const statusBadge = renderStatusBadge(status);
```

## Files to Modify

- `vscode-extension/src/treeview/PlanningTreeProvider.ts` - Add badge rendering to description

## Testing Strategy

1. **Visual Testing**:
   - Package extension: `npm run package`
   - Install locally: `code --install-extension cascade-0.1.0.vsix --force`
   - Reload window: Ctrl+Shift+P → "Developer: Reload Window"
   - Verify badges in TreeView for all status types

2. **Manual Test Cases**:
   - Expand Epic/Feature → Verify badge + progress
   - Expand Story/Bug → Verify badge only
   - Change status via drag-and-drop → Verify badge updates
   - Switch theme (Dark+ ↔ Light+) → Verify badge colors adapt

3. **Automated Testing**:
   - Update existing TreeView tests to expect badge syntax
   - Verify description field contains Codicon syntax
   - Test badge updates on status changes

## Success Metrics

- All TreeView items display color-coded badges
- Badges are readable in both light and dark themes
- No performance degradation (TreeView refresh < 500ms with 100+ items)
- Badges update correctly when status changes
