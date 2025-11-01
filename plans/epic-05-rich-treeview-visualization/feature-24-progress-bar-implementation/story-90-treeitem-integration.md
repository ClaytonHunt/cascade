---
item: S90
title: TreeItem Integration
type: story
parent: F24
status: Completed
priority: High
dependencies: [S88, S89]
estimate: M
created: 2025-10-25
updated: 2025-10-25
spec: specs/S90-treeitem-integration/
---

# S90 - TreeItem Integration

## Description

Integrate progress bars into the VSCode TreeView by modifying `getTreeItem()` to display progress bars in `TreeItem.description` for parent items (Epics, Features, Projects). Progress bars appear after status badges, providing immediate visual feedback on completion status.

This story connects the progress calculation (S88) and rendering (S89) modules to the TreeView display layer, making progress visible to users without expanding tree nodes.

## Acceptance Criteria

1. **getTreeItem() Modification**:
   - [ ] Import `calculateProgress()` from S88
   - [ ] Import `renderProgressBar()` from S89
   - [ ] Modify `getTreeItem(element: TreeNode)` method in PlanningTreeProvider.ts
   - [ ] Add progress bar to TreeItem.description for parent items only

2. **Parent Item Detection**:
   - [ ] Show progress bar for Epics (have Features as children)
   - [ ] Show progress bar for Features (have Stories/Bugs as children)
   - [ ] Show progress bar for Projects (have Epics as children)
   - [ ] Do NOT show progress bar for Stories (leaf nodes)
   - [ ] Do NOT show progress bar for Bugs (leaf nodes)
   - [ ] Do NOT show progress bar for items with 0 children

3. **Description Field Format**:
   - [ ] Format: `"{statusBadge} {progressBar}"`
   - [ ] Example: `"$(sync) In Progress █████░░░░░ 50% (3/6)"`
   - [ ] Status badge appears first (if present)
   - [ ] Progress bar appears second (if item has children)
   - [ ] Space separator between badge and bar
   - [ ] Items without children show only status badge

4. **Hierarchy Access**:
   - [ ] Access existing hierarchy data structure (built during tree traversal)
   - [ ] Pass hierarchy to `calculateProgress()` for child counting
   - [ ] Do NOT rebuild hierarchy (use cached data)
   - [ ] Handle hierarchy not yet built (return without progress bar)

5. **Visual Verification**:
   - [ ] Package and install extension: `npm run package && code --install-extension cascade-0.1.0.vsix --force`
   - [ ] Reload window: Ctrl+Shift+P → "Developer: Reload Window"
   - [ ] Open Cascade TreeView
   - [ ] Verify Epics show progress bars reflecting Feature completion
   - [ ] Verify Features show progress bars reflecting Story/Bug completion
   - [ ] Verify Stories/Bugs do NOT show progress bars
   - [ ] Progress percentages match actual child completion counts

6. **Edge Cases**:
   - [ ] Items with all completed children show `"██████████ 100% (n/n)"`
   - [ ] Items with no completed children show `"░░░░░░░░░░ 0% (0/n)"`
   - [ ] Newly created items with no children show no progress bar
   - [ ] Description truncation handled gracefully (no overflow)

## Technical Approach

### Implementation Location

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Modify the `getTreeItem(element: TreeNode): vscode.TreeItem` method (around line 400-500 based on codebase structure).

### Import Statements

```typescript
import { renderProgressBar } from './progressRenderer';
```

(Note: `calculateProgress()` will be a private method in PlanningTreeDataProvider, so no import needed)

### getTreeItem() Modification

```typescript
getTreeItem(element: TreeNode): vscode.TreeItem {
  if (element.type === 'statusGroup') {
    // Existing status group logic
    // ...
  }

  if (element.type === 'item') {
    const item = element.item;
    const treeItem = new vscode.TreeItem(
      `${item.item} - ${item.title}`,
      this.hasChildren(item) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );

    // Set icon (existing code)
    treeItem.iconPath = getTreeItemIcon(item.status, item.type);

    // Build description: status badge + progress bar
    const parts: string[] = [];

    // Add status badge (existing S82 integration)
    const statusBadge = renderStatusBadge(item.status);
    parts.push(statusBadge);

    // Add progress bar (NEW: S90)
    if (this.hasChildren(item) && this.hierarchy) {
      const progress = this.calculateProgress(item, this.hierarchy);
      if (progress !== null) {
        const progressBar = renderProgressBar(progress);
        parts.push(progressBar);
      }
    }

    treeItem.description = parts.join(' ');

    // Set command for file opening (existing code)
    treeItem.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(item.filePath)]
    };

    return treeItem;
  }

  // Default fallback
  return new vscode.TreeItem('Unknown');
}
```

### Helper Method: hasChildren()

```typescript
/**
 * Determines if an item has children based on its type.
 *
 * @param item - Planning item
 * @returns true if item is a parent type (Epic, Feature, Project)
 */
private hasChildren(item: PlanningTreeItem): boolean {
  return item.type === 'epic' || item.type === 'feature' || item.type === 'project';
}
```

### Description Field Examples

**Epic with 3/5 Features completed:**
```
$(sync) In Progress █████░░░░░ 60% (3/5)
```

**Feature with all Stories completed:**
```
$(pass-filled) Completed ██████████ 100% (6/6)
```

**Story (leaf node, no progress bar):**
```
$(sync) In Progress
```

**Feature with no Stories yet:**
```
$(circle-outline) Not Started
```

## Testing Strategy

### Manual Testing

1. **Install Extension**:
   ```bash
   cd vscode-extension
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

2. **Reload Window**:
   - Press `Ctrl+Shift+P`
   - Run "Developer: Reload Window"

3. **Verify TreeView Display**:
   - Open Activity Bar → Cascade icon
   - Expand status groups
   - Check Epic items show progress bars
   - Check Feature items show progress bars
   - Check Story items do NOT show progress bars

4. **Verify Progress Accuracy**:
   - Expand Epic to see Features
   - Count completed Features manually
   - Verify Epic progress bar matches count
   - Repeat for Features and their Stories

### Automated Testing

Extend existing test suite to verify description format:

**File**: `vscode-extension/src/test/suite/treeItemRendering.test.ts` (new or extend existing)

```typescript
test('TreeItem description includes progress bar for parent items', () => {
  // Test setup: Create mock Epic with 3/5 Features completed
  // Call getTreeItem()
  // Assert: treeItem.description contains progress bar
  // Assert: Format matches "$(icon) Status ████ XX% (n/m)"
});

test('TreeItem description excludes progress bar for leaf items', () => {
  // Test setup: Create mock Story (leaf node)
  // Call getTreeItem()
  // Assert: treeItem.description contains only status badge
  // Assert: No progress bar present
});
```

## Dependencies

- **S88** (Progress Calculation Core) - provides `calculateProgress()` function
- **S89** (Progress Bar Rendering) - provides `renderProgressBar()` function
- **S82** (Badge Renderer Integration) - provides `renderStatusBadge()` function (already integrated)
- `HierarchyNode` structure (hierarchy.ts) - provides parent-child relationships
- `PlanningTreeProvider.getTreeItem()` - integration point

## Success Metrics

- All parent items (Epics, Features, Projects) display progress bars in TreeView
- Progress bars appear after status badges with correct spacing
- Leaf items (Stories, Bugs) do NOT show progress bars
- Progress percentages accurately reflect child completion counts
- Visual verification passes (manual testing in VSCode)
- No performance regression (TreeView still refreshes < 500ms with 100+ items)

## Notes

- This story focuses on visual integration, not caching (S91 handles performance)
- Progress bars update when TreeView refreshes (file watcher triggers)
- Description field truncation handled by VSCode automatically
- Progress bar position after badge ensures consistent layout
- Unicode rendering may vary by font, but this is acceptable
- If hierarchy not yet built, progress bar gracefully omitted (no errors)
