---
spec: S80
title: Visual Design for Archived Items
type: spec
status: Completed
priority: Low
phases: 1
created: 2025-10-24
updated: 2025-10-24
---

# Implementation Specification: S80 - Visual Design for Archived Items

## Overview

This specification defines the implementation strategy for applying visual styling to archived items in the Cascade TreeView. Archived items should appear muted/grayed to distinguish them from active work, making it easy for users to focus on active tasks even when archived items are visible.

## Work Item Reference

- **Story**: S80 - Visual Design for Archived Items
- **Feature**: F22 - Archive Support
- **Epic**: E5 - Rich TreeView Visualization
- **Story File**: `plans/epic-05-rich-treeview-visualization/feature-22-archive-support/story-80-visual-design-archived.md`

## Dependencies

All dependencies are completed:
- ✅ **S75**: Type System for Archived Status (provides 'Archived' icon and color mapping)
- ✅ **S76**: Archive Directory Detection Logic (provides `isItemArchived()` function)
- ✅ **S78**: Archive Filtering in TreeView (provides "Archived" status group)

## Implementation Strategy

### Core Approach

The implementation leverages **existing S75 infrastructure** for icon styling. Icons for archived items are already implemented in `statusIcons.ts` with:
- **Icon**: `archive` (codicon box icon)
- **Color**: `charts.gray` (muted gray color)

The primary enhancement is **tooltip modification** to add `[ARCHIVED]` indicator for accessibility and clarity.

### Key Design Decisions

#### 1. Icon Styling (Already Complete via S75)

**Current Implementation**:
```typescript
// In statusIcons.ts (S75)
const iconMap: { [key: string]: string } = {
  'Archived': 'archive'  // Archive/box icon
};

const colorMap: { [key: string]: string | undefined } = {
  'Archived': 'charts.gray'  // Muted gray color
};
```

**Why No Changes Needed**:
- ✅ Icon is semantically appropriate (archive box)
- ✅ Color is muted (charts.gray) for de-emphasis
- ✅ Consistent with other status icons
- ✅ Theme-aware (adapts to light/dark themes)

#### 2. Tooltip Enhancement (New Implementation)

**Chosen Approach**: Add `[ARCHIVED]` tag to tooltip text

**Rationale**:
- **Accessibility**: Doesn't rely solely on color (screen readers, high-contrast themes)
- **Clarity**: Explicit textual indication of archived status
- **Simplicity**: Single function modification, no API complexity
- **Non-intrusive**: Doesn't clutter the main TreeView display

**Alternative Rejected**: Label styling via FileDecoration
- ❌ Requires FileDecorationProvider implementation (heavyweight)
- ❌ Adds complexity for minimal visual benefit
- ❌ Icon color already provides sufficient visual distinction

#### 3. Status Group Styling (Already Complete via S78)

**Current Implementation**:
```typescript
// In PlanningTreeProvider.getTreeItem() for status groups
treeItem.iconPath = new vscode.ThemeIcon('folder');  // Folder icon
treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;  // Collapsed by default
```

**Why No Changes Needed**:
- ✅ Folder icon consistent with other status groups
- ✅ Collapsed by default to reduce visual clutter
- ✅ Label includes count badge: "Archived (23)"

### Architecture Integration Points

#### Modified Files

**vscode-extension/src/treeview/PlanningTreeProvider.ts**:
- Method: `buildTooltip()` (lines 1069-1081)
- Change: Add `[ARCHIVED]` tag to tooltip for archived items
- Detection: Use `isItemArchived()` from archiveUtils

#### No Breaking Changes

- Tooltip change is additive (doesn't remove existing information)
- Icon styling already implemented (S75)
- Status group styling already implemented (S78)
- No changes to public API or data structures

### Error Handling Strategy

**No Error Handling Needed**:
- `isItemArchived()` is pure function (no I/O, always succeeds)
- String concatenation cannot fail
- No external dependencies or async operations

### Testing Strategy

**Manual Testing Scenarios**:

1. **Icon Color Test**:
   - Create archived item (status: Archived or in plans/archive/)
   - Toggle archived items ON
   - Verify icon is gray archive box (not bright color)

2. **Tooltip Test**:
   - Hover over archived item
   - Verify tooltip shows `[ARCHIVED]` tag
   - Verify tooltip is readable and not cluttered

3. **Comparison Test**:
   - Place active and archived items side-by-side
   - Compare visual appearance
   - Verify archived items are clearly distinguishable but not jarring

4. **Accessibility Test**:
   - Use high-contrast theme
   - Verify archived items still visible and distinguishable
   - Verify tooltip provides clear textual indication

### Performance Characteristics

**Tooltip Generation**:
- Additional operation: 1 function call + 1 string concatenation
- Time: < 0.01ms (negligible)
- No impact on TreeView rendering performance

### VSCode API Reference

**ThemeIcon**:
- [VSCode API Reference](https://code.visualstudio.com/api/references/vscode-api#ThemeIcon)
- [Codicon Gallery](https://microsoft.github.io/vscode-codicons/dist/codicon.html)

**ThemeColor**:
- [Theme Color Reference](https://code.visualstudio.com/api/references/theme-color)

**TreeItem**:
- [TreeItem API](https://code.visualstudio.com/api/references/vscode-api#TreeItem)

## Implementation Phases

### Phase 1: Tooltip Enhancement for Archived Items
**Goal**: Add `[ARCHIVED]` tag to tooltips for improved accessibility

**Tasks**:
- Modify `buildTooltip()` to detect archived items
- Add `[ARCHIVED]` tag to tooltip text for archived items
- Test tooltip rendering in various scenarios
- Verify accessibility improvements

**Validation**:
- TypeScript compilation succeeds
- Tooltip displays `[ARCHIVED]` for archived items
- Tooltip does not show tag for non-archived items
- High-contrast theme test passes

## Risk Assessment

### Low Risk Areas
- Icon styling already implemented and tested (S75)
- Archive detection already implemented and tested (S76)
- Minimal code changes (single function modification)
- No breaking changes to existing functionality

### No Known Blockers
- All dependencies completed (S75, S76, S78)
- No external dependencies required
- No VSCode API limitations
- No performance concerns

## Completion Criteria

### Functional Requirements
- ✅ Archived items use gray archive icon (via S75)
- ✅ Icon color is muted (charts.gray)
- ✅ Tooltip shows `[ARCHIVED]` tag for archived items
- ✅ Archived status group uses folder icon (via S78)
- ✅ Status group collapsed by default (via S78)

### Accessibility Requirements
- ✅ Visual styling doesn't rely solely on color (icon + text)
- ✅ Tooltip provides explicit textual indication
- ✅ High-contrast theme compatibility maintained
- ✅ Readability preserved for all themes

### Code Quality Requirements
- ✅ TypeScript type safety maintained
- ✅ Clean code with no duplication
- ✅ Clear comments explaining purpose
- ✅ No breaking changes to existing API

## Next Steps

After completing this specification:
1. Run `/build specs/S80-visual-design-archived/plan.md` to begin implementation
2. Follow manual testing guide for validation
3. Mark S80 as "Completed" after testing passes

## References

### Codebase Files
- `vscode-extension/src/statusIcons.ts` (S75 implementation - no changes needed)
- `vscode-extension/src/treeview/archiveUtils.ts` (S76 implementation - used for detection)
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` (primary modification target)

### Related Stories
- S75 - Type System for Archived Status (icon and color mapping)
- S76 - Archive Directory Detection Logic (isItemArchived function)
- S78 - Archive Filtering in TreeView (status group implementation)
- S77 - Toggle Command and UI Integration (toggle mechanism)
- S79 - Persist Toggle State Across Sessions (state persistence)

### External Documentation
- [VSCode TreeItem API](https://code.visualstudio.com/api/references/vscode-api#TreeItem)
- [VSCode ThemeIcon API](https://code.visualstudio.com/api/references/vscode-api#ThemeIcon)
- [Codicon Gallery](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
- [VSCode Theme Colors](https://code.visualstudio.com/api/references/theme-color)

### Documentation
- Story file: `plans/epic-05-rich-treeview-visualization/feature-22-archive-support/story-80-visual-design-archived.md`
- CLAUDE.md: VSCode extension testing section
