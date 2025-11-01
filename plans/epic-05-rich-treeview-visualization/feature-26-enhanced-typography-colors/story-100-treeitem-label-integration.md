---
item: S100
title: TreeItem Label Integration
type: story
parent: F26
status: Completed
priority: High
dependencies: [S99]
estimate: S
created: 2025-10-28
updated: 2025-10-28
spec: specs/S100-treeitem-label-integration/
---

# S100 - TreeItem Label Integration

## Description

Integrate the type label formatter into `PlanningTreeProvider.getTreeItem()` to display enhanced labels with type prefixes throughout the TreeView.

This story updates the core TreeItem rendering logic to use the new label format while maintaining backward compatibility with existing description badges and progress bars.

## Acceptance Criteria

1. **Label Integration**:
   - [ ] Import `formatItemLabel` from `labelFormatter.ts`
   - [ ] Update `getTreeItem()` to use `formatItemLabel(element)` instead of inline format
   - [ ] Apply to all item types (epic, feature, story, bug, spec, phase)

2. **Display Format**:
   - [ ] TreeItem label shows: `Type # - Title`
   - [ ] Example: `Story 75 - Archive Detection`
   - [ ] Status groups remain unchanged (no type prefix needed)

3. **Description Preservation**:
   - [ ] Status badges continue to display in description field
   - [ ] Progress bars continue to display for parent items
   - [ ] Spec phase indicators continue to display for stories with specs
   - [ ] Format: `{label} | {description with badges/progress}`

4. **Status Group Handling**:
   - [ ] Status group labels remain unchanged (no type prefix)
   - [ ] Format: `{StatusName} ({count})` continues as-is

5. **Performance**:
   - [ ] No measurable performance degradation (< 10ms difference)
   - [ ] Label formatting completes in O(1) time

6. **Backward Compatibility**:
   - [ ] All existing TreeView functionality continues to work
   - [ ] Badges and progress bars unaffected
   - [ ] Tooltips unaffected
   - [ ] Click handling unaffected

## Technical Approach

**File to Modify**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Changes**:

```typescript
// Line ~10: Add import
import { formatItemLabel } from './labelFormatter';

// Line ~840: Update label formatting
async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
  // Handle status group nodes (unchanged)
  if (element.type === 'status-group') {
    const statusGroup = element as StatusGroupNode;
    const treeItem = new vscode.TreeItem(
      statusGroup.label,
      statusGroup.collapsibleState
    );
    // ... rest of status group logic unchanged
    return treeItem;
  }

  // Update label format for planning items
  // OLD: const label = `${element.item} - ${element.title}`;
  // NEW:
  const label = formatItemLabel(element);

  // Determine collapsible state
  const collapsibleState = this.getCollapsibleState(element);

  // Create TreeItem
  const treeItem = new vscode.TreeItem(label, collapsibleState);

  // ... rest of getTreeItem logic unchanged (badges, icons, etc.)
}
```

**Testing Strategy**:
- Manual verification: Open TreeView, verify all items show type prefix
- Check all item types: Project, Epic, Feature, Story, Bug
- Verify badges/progress bars still display correctly
- Test with spec phase indicators (S95)

## Analysis Summary

**Current Implementation** (line 840):
```typescript
const label = `${element.item} - ${element.title}`;
```

**Files Modified**:
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` (1 import, 1 line changed)

**Impact**:
- Visual change only (label format)
- No API changes
- No data structure changes
- No performance impact (simple function call)

**Integration Points**:
- Existing `getTreeItem()` method (line 814)
- Status badge rendering (line 861) - unchanged
- Progress bar rendering (line 870) - unchanged
- Spec phase indicator (line 887) - unchanged

## Implementation Notes

- Simple string replacement (minimal risk)
- Test in both status mode and hierarchy mode
- Verify long titles don't break layout
- Check with archived items (should show "Archived" prefix if detected)
