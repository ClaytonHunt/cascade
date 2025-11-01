---
spec: S56
title: Progress Indicators
type: spec
status: Completed
priority: Medium
phases: 3
created: 2025-10-14
updated: 2025-10-14
---

# S56 - Progress Indicators

## Overview

This specification implements progress indicators for Epic and Feature items in the Cascade TreeView. Progress is calculated by counting completed children and displayed in the TreeItem description field. This provides at-a-glance pipeline visibility for kanban-style project management.

**Key Value**: Users can instantly see Epic and Feature completion percentages without expanding nodes or opening files.

## Implementation Strategy

The implementation leverages the existing hierarchical structure from S55 (HierarchyNode and cached hierarchy) to efficiently calculate progress without additional file system reads. Progress calculation happens during TreeItem rendering in `getTreeItem()`, using cached hierarchy data.

### Architecture Decisions

1. **Progress Calculation Location**: Performed in `getTreeItem()` method
   - **Why**: TreeItem rendering is the natural place to add display-related data
   - **Alternative Rejected**: Pre-calculating during hierarchy build would waste computation for collapsed nodes
   - **Trade-off**: Slight overhead per visible item vs memory overhead for all items

2. **Caching Strategy**: Cache progress per item, invalidate with hierarchy cache
   - **Why**: Progress depends on hierarchy structure which is already cached per status
   - **Alternative Rejected**: No caching would mean recalculating on every tree interaction
   - **Trade-off**: Additional memory (Map with ~50-100 entries) vs repeated calculations

3. **Display Format**: Use count format "(3/5)" in TreeItem description
   - **Why**: More informative than percentage alone, shows both progress and scope
   - **Alternative Rejected**: Percentage-only "(60%)" hides total count information
   - **Trade-off**: Slightly longer text vs better information density

4. **Children Definition**: Direct children only (Epic → Features, Feature → Stories/Bugs)
   - **Why**: Simple, predictable, aligns with INVEST hierarchy principles
   - **Alternative Rejected**: Recursive calculation (Epic → all descendants) would be confusing
   - **Trade-off**: Single-level visibility vs complexity and performance

### Key Integration Points

1. **HierarchyNode Structure** (S55) - vscode-extension/src/treeview/HierarchyNode.ts:20
   - Already provides `children` array for each node
   - Progress calculation iterates children to count completed items
   - No changes needed to hierarchy structure

2. **PlanningTreeProvider.getTreeItem()** - vscode-extension/src/treeview/PlanningTreeProvider.ts:89
   - Currently sets `treeItem.description = element.status`
   - Will be extended to include progress: `description = "${status} ${progressDisplay}"`
   - Minimal change to existing code

3. **Hierarchy Cache** - vscode-extension/src/treeview/PlanningTreeProvider.ts:50
   - Already caches `HierarchyNode[]` per status
   - Progress cache shares same lifecycle (cleared on refresh)
   - Consistent cache invalidation strategy

4. **PlanningTreeProvider.getChildrenForItem()** - vscode-extension/src/treeview/PlanningTreeProvider.ts:730
   - Already provides efficient child lookup via cached hierarchy
   - Progress calculation reuses this lookup mechanism
   - No changes needed to child retrieval

### Risk Assessment

**Low Risk**:
- Builds on proven hierarchy structure from S55
- No changes to data model or file parsing
- Additive change to TreeItem rendering only
- Well-defined test coverage path

**Potential Issues**:
1. **Performance**: Calculating progress for 50+ visible items
   - **Mitigation**: Progress cache prevents recalculation
   - **Validation**: Manual testing with large projects (>100 items)

2. **Cache Coherency**: Progress cache could become stale
   - **Mitigation**: Clear progress cache whenever hierarchy cache clears
   - **Validation**: Test status changes trigger correct refresh

3. **Description Field Length**: Long status + progress text might truncate
   - **Mitigation**: VSCode handles truncation automatically with ellipsis
   - **Validation**: Visual testing with various window widths

## Phase Overview

### Phase 1: Progress Calculation Core (vscode-extension/src/treeview/PlanningTreeProvider.ts)
- Add progress cache Map to PlanningTreeProvider
- Implement `calculateProgress()` method with direct children counting
- Implement `getDirectChildren()` helper method using hierarchy
- Add cache invalidation to `refresh()` method
- **Duration**: ~1 hour
- **Validation**: Unit tests for progress calculation logic

### Phase 2: TreeItem Integration (vscode-extension/src/treeview/PlanningTreeProvider.ts)
- Modify `getTreeItem()` to call `calculateProgress()` for epics/features
- Format description field: `"${status} ${progressDisplay}"`
- Handle null progress (no children) gracefully
- **Duration**: ~30 minutes
- **Validation**: Manual visual testing in TreeView

### Phase 3: Testing and Validation (vscode-extension/src/test/suite/)
- Create `progressCalculation.test.ts` with comprehensive test cases
- Test edge cases: 0 children, all completed, none completed, mixed
- Test cache invalidation correctness
- Test description formatting
- Manual testing: status change updates, large hierarchy performance
- **Duration**: ~1 hour
- **Validation**: All tests pass, visual verification complete

## Codebase Analysis Summary

### Files to Modify
1. **vscode-extension/src/treeview/PlanningTreeProvider.ts** (775 lines)
   - Add progress cache field (~1 line)
   - Add `calculateProgress()` method (~25 lines)
   - Add `getDirectChildren()` method (~15 lines)
   - Modify `refresh()` for cache clearing (~1 line)
   - Modify `getTreeItem()` for progress display (~8 lines)
   - **Total Addition**: ~50 lines

### Files to Create
1. **vscode-extension/src/test/suite/progressCalculation.test.ts**
   - New test file for progress calculation logic
   - **Total Addition**: ~250 lines

### External Dependencies
- **VSCode API**:
  - `vscode.TreeItem` - Already in use for TreeView rendering
  - No new VSCode APIs required

- **Node.js APIs**:
  - None required (pure in-memory calculation)

### Godot APIs Used
- None (VSCode extension only)

## Expected Outcomes

### User-Facing Changes
1. **TreeView Display**: Epic and Feature items show completion progress
   - Example: "In Progress (3/5)" instead of just "In Progress"
   - Immediate visibility into pipeline progress without expanding nodes

2. **Dynamic Updates**: Progress updates when child status changes
   - Refresh triggered by file system watcher (existing mechanism)
   - No manual refresh needed for accurate progress

### Technical Artifacts
1. **Progress Cache**: New Map structure for O(1) progress lookup
2. **Progress Calculation**: Pure function taking HierarchyNode, returning ProgressInfo
3. **Test Suite**: Comprehensive test coverage for progress logic
4. **Performance**: No measurable latency for projects with <200 items

### Success Metrics
- All acceptance criteria met (10 checkboxes in S56)
- All unit tests pass (>95% coverage for new code)
- Manual testing confirms: readable display, correct updates, no lag
- Code review: clean separation of concerns, clear documentation
