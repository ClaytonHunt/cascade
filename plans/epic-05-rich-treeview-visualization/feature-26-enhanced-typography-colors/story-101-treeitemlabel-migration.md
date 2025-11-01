---
item: S101
title: TreeItemLabel API Migration
type: story
parent: F26
status: Completed
priority: Medium
dependencies: [S100]
estimate: M
spec: specs/S101-treeitemlabel-api-migration
created: 2025-10-28
updated: 2025-10-28
---

# S101 - TreeItemLabel API Migration

## Description

Migrate from plain string labels to VSCode's `TreeItemLabel` API to enable rich text formatting and highlighting in TreeView items. This provides a foundation for future color coding and text styling enhancements.

`TreeItemLabel` allows highlighting specific text ranges within labels, enabling visual differentiation between type prefix, item number, and title.

**Note**: This story focuses on API migration and infrastructure. Color coding will be addressed in a separate story (S102).

## Acceptance Criteria

1. **TreeItemLabel Usage**:
   - [ ] Replace plain string labels with `TreeItemLabel` objects
   - [ ] Apply to all planning items (not status groups)
   - [ ] Maintain exact same visual output (no visual changes yet)

2. **Label Structure**:
   - [ ] Create `TreeItemLabel` with label string
   - [ ] Prepare highlight ranges (empty array initially)
   - [ ] Structure: `new vscode.TreeItemLabel(labelText, [])`

3. **Type Prefix Highlighting** (foundation for S102):
   - [ ] Calculate type prefix range: `[0, typeLabel.length]`
   - [ ] Store range in TreeItemLabel highlights array
   - [ ] Example: "Story" in "Story 75 - Title" highlighted as range [0, 5]

4. **Backward Compatibility**:
   - [ ] Status groups continue using plain string labels
   - [ ] All existing functionality preserved
   - [ ] No visual changes (highlighting ranges prepared but not styled yet)

5. **API Compatibility**:
   - [ ] Verify VSCode engine version supports TreeItemLabel (1.76+)
   - [ ] Update package.json engine requirement if needed
   - [ ] Graceful fallback if API unavailable (use plain string)

6. **Testing**:
   - [ ] All TreeView items render correctly
   - [ ] No errors or warnings in output channel
   - [ ] Labels display identically to pre-migration format

## Technical Approach

**File to Modify**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Implementation**:

```typescript
async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
  // Handle status group nodes (unchanged - use plain string)
  if (element.type === 'status-group') {
    // ... status group logic unchanged
    return treeItem;
  }

  // Format label using labelFormatter (S99, S100)
  const labelText = formatItemLabel(element);

  // Calculate type prefix range for future highlighting (S102)
  const typeLabel = getTypeLabel(element.type);
  const highlightRanges: [number, number][] = [
    [0, typeLabel.length]  // Highlight "Story" in "Story 75 - Title"
  ];

  // Create TreeItemLabel instead of plain string
  const label = new vscode.TreeItemLabel(labelText, highlightRanges);

  // Determine collapsible state
  const collapsibleState = this.getCollapsibleState(element);

  // Create TreeItem with TreeItemLabel
  const treeItem = new vscode.TreeItem(label, collapsibleState);

  // ... rest of getTreeItem logic unchanged
}
```

**VSCode Version Check** (package.json):
```json
{
  "engines": {
    "vscode": "^1.76.0"
  }
}
```

TreeItemLabel was added in VSCode 1.76 (March 2023).

## Analysis Summary

**Current VSCode API**:
- TreeItemLabel available since VSCode 1.76 (March 2023)
- Allows text highlighting within labels
- No styling API yet (highlighting uses default VS Code selection color)
- Future VSCode versions may add color customization

**Files Modified**:
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` (getTreeItem method)
- `vscode-extension/package.json` (engine version if needed)

**Integration Points**:
- Label formatter (S99, S100) provides label text
- TreeItemLabel constructor: `(label: string, highlights: [number, number][])`
- Highlights array: empty initially, populated in S102 for color coding

**Risks**:
- TreeItemLabel API is relatively new (2 years old)
- Limited customization options (no color control yet)
- Highlighting uses default selection color (may not match design intent)

## Implementation Notes

- Check current VSCode engine version in package.json
- Consider feature flag if VSCode < 1.76 needs support
- Highlighting currently uses default selection color (blue-ish)
- Future VSCode API may add `TreeItemLabel.color` property
- This story is preparatory - visual changes come in S102
- May need to defer color coding if TreeItemLabel doesn't support it

## Alternative Approach (If TreeItemLabel Insufficient)

If TreeItemLabel doesn't provide adequate color control:
- Use icon + description field for color coding
- Use markdown in tooltips for rich formatting
- Wait for future VSCode API enhancements
- Consider using description field with emoji/symbols for visual differentiation
