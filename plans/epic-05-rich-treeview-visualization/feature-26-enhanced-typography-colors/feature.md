---
item: F26
title: Enhanced Typography and Colors
type: feature
parent: E5
status: In Progress
priority: Medium
dependencies: []
estimate: S
created: 2025-10-23
updated: 2025-10-28
---

# F26 - Enhanced Typography and Colors

## Description

Enhance the TreeView's visual design with improved typography, color scheme, and text formatting. This feature adds type labels, hierarchical styling, and color-coded text to create a more information-dense and scannable interface.

Unlike the badge and progress bar features (F23, F24), this feature focuses on the base text rendering: labels, prefixes, font weights, and color differentiation for different information types.

## Objectives

- **Type Prefixes**: Add "Epic", "Feature", "Story", "Spec", "Bug" labels before item titles
- **Hierarchical Styling**: Different text styles for different tree levels (bold, italic, muted)
- **Color-Coded Labels**: Use VSCode theme colors to differentiate information types
- **Improved Readability**: Optimize spacing, casing, and punctuation for scannability
- **Theme Compatibility**: Ensure colors work in light and dark themes

## Reference Design

From the ChatGPT reference design:
- **Type Labels**: `Epic 5 - Rich TreeView`, `Feature 22 - Archive`, `Story 75 - Type System`
- **Muted Text**: Dependencies, dates, and metadata in gray/muted color
- **Bold Text**: Active/In Progress items use bold font weight
- **Hierarchical Colors**: Epics (bright), Features (medium), Stories (standard)
- **Status Integration**: Status badges colored, but labels remain theme-colored

Example rendering:
```
Epic 5 - Rich TreeView Visualization [In Progress] ████████░░ 80%
  Feature 22 - Archive Support [In Progress] ███░░░░░░░ 33%
    Story 75 - Type System Updates [Completed] ██████████ 100%
    Story 76 - Archive Detection [Not Started]
```

## Acceptance Criteria

1. **Type Labels**:
   - [ ] Epics show "Epic" prefix: `Epic 5 - Title`
   - [ ] Features show "Feature" prefix: `Feature 22 - Title`
   - [ ] Stories show "Story" prefix: `Story 75 - Title`
   - [ ] Bugs show "Bug" prefix: `Bug 1 - Title`
   - [ ] Specs show "Spec" prefix: `Spec S75 - Title`
   - [ ] Phases show "Phase" prefix: `Phase 1 - Title`

2. **Color Coding**:
   - [ ] Type labels use muted color (charts.gray or foreground dimmed)
   - [ ] Item titles use standard foreground color
   - [ ] Status badges use status-specific colors (from F23)
   - [ ] Progress bars use appropriate fill colors (from F24)
   - [ ] Metadata (dates, dependencies) use muted color

3. **Font Styling**:
   - [ ] In Progress items render in bold (if supported by TreeItem API)
   - [ ] Completed items render in standard weight with checkmark
   - [ ] Blocked items render in bold with warning color
   - [ ] Archived items render in muted/grayed color

4. **Label Format**:
   - [ ] Format: `Type # - Title`
   - [ ] Number formatting: Single digit (S5) or double digit (S75) without padding
   - [ ] Separator: Space-dash-space (` - `) for readability
   - [ ] Consistent casing: Proper case for types (not ALL CAPS)

5. **TreeItem.label Migration**:
   - [ ] Use TreeItemLabel object instead of plain string
   - [ ] Apply highlights to type prefix (if supported)
   - [ ] Apply highlights to status/priority (if supported)
   - [ ] Maintain backward compatibility with string-based rendering

6. **Theme Compatibility**:
   - [ ] All colors defined via VSCode theme color tokens
   - [ ] No hardcoded hex colors
   - [ ] Tested in Dark+ (default dark)
   - [ ] Tested in Light+ (default light)
   - [ ] Colors adapt to high contrast themes

## Technical Approach

### Type Label Rendering

```typescript
function formatItemLabel(item: PlanningTreeItem): string {
  const typeLabel = getTypeLabel(item.type); // "Epic", "Feature", etc.
  const number = item.item; // "E5", "F22", "S75"
  const title = item.title;

  return `${typeLabel} ${number} - ${title}`;
}

function getTypeLabel(type: ItemType): string {
  const labels = {
    'project': 'Project',
    'epic': 'Epic',
    'feature': 'Feature',
    'story': 'Story',
    'bug': 'Bug',
    'spec': 'Spec',
    'phase': 'Phase'
  };
  return labels[type] || type;
}
```

### TreeItemLabel Usage

```typescript
getTreeItem(element: TreeNode): vscode.TreeItem {
  const treeItem = new vscode.TreeItem(element.item.title);

  // Use TreeItemLabel for rich formatting
  const label = new vscode.TreeItemLabel(
    formatItemLabel(element.item),
    [
      // Highlight type prefix (e.g., "Story")
      [0, element.item.type.length]
    ]
  );

  treeItem.label = label;
  // ... rest of TreeItem setup
}
```

### Color Application

Colors applied via VSCode theme tokens:
- **Type prefix**: `descriptionForeground` (muted)
- **Title**: `foreground` (standard)
- **Status badge**: Status-specific color (from F23)
- **Progress text**: `charts.blue` for in-progress, `charts.green` for complete
- **Metadata**: `descriptionForeground` (muted)

## Architecture Impact

### Files to Modify

1. **Update**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
   - Modify `getTreeItem()` to use TreeItemLabel
   - Apply type label formatting
   - Add color coding logic

2. **Create utility file**: `vscode-extension/src/treeview/labelFormatter.ts`
   - Export `formatItemLabel(item): string`
   - Export `getTypeLabel(type): string`
   - Export label formatting utilities

3. **Update tests**: `vscode-extension/src/test/suite/treeItemRendering.test.ts`
   - Test type label formatting
   - Test label format consistency
   - Test color token usage

### Performance Considerations

- Label formatting is simple string concatenation (O(1))
- TreeItemLabel creation is lightweight
- No additional file reads or async operations
- Color tokens resolved by VSCode (no computation)

## Success Metrics

- All items display with type prefix (Epic, Feature, Story, etc.)
- Label format is consistent across all item types
- Colors enhance readability without overwhelming the display
- No performance degradation (< 500ms refresh with 100+ items)
- User can identify item type at a glance from prefix alone

## Dependencies

- VSCode TreeItemLabel API (added in VSCode 1.76)
- Existing TreeItem rendering infrastructure
- VSCode theme color token system

## Notes

- TreeItemLabel is relatively new API; check VSCode version compatibility
- Some TreeItem styling options may be limited by VSCode API
- Font weight (bold) may not be supported; use color/icons instead
- This feature is largely cosmetic but significantly improves scannability
- Consider adding user setting to toggle type prefixes (some users may prefer compact view)
- Type labels increase label length; may need to truncate long titles

## Child Items

**Story Breakdown** (Created 2025-10-28):

- **S99**: Type Label Formatter Utility [Not Started] - Priority: High, Est: XS
  - Create labelFormatter.ts with formatItemLabel() and getTypeLabel()
  - Pure utility module for label formatting logic
  - Foundation for all subsequent stories

- **S100**: TreeItem Label Integration [Not Started] - Priority: High, Est: S
  - Integrate label formatter into PlanningTreeProvider.getTreeItem()
  - Update label format to "Type # - Title"
  - Preserve existing badges and progress bars
  - Dependencies: S99

- **S101**: TreeItemLabel API Migration [Not Started] - Priority: Medium, Est: M
  - Migrate from plain strings to VSCode TreeItemLabel API
  - Enable text highlighting capabilities
  - Foundation for color coding (S102)
  - Dependencies: S100

- **S102**: Color Coding and Theme Integration [Not Started] - Priority: Low, Est: M
  - **INVESTIGATIVE**: Research VSCode API color capabilities
  - Implement color coding if API supports it
  - Deferred if API limitations prevent implementation
  - Dependencies: S101

**Implementation Order**:
1. S99 (XS) - Core formatter utility
2. S100 (S) - Basic label integration
3. S101 (M) - TreeItemLabel API migration
4. S102 (M) - Color coding (conditional/investigative)

**Estimated Total**: S-M feature (assuming S102 deferred or simplified)
