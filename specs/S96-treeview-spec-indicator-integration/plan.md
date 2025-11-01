---
spec: S96
title: TreeView Spec Indicator Integration
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-27
updated: 2025-10-27
---

# S96 - TreeView Spec Indicator Integration

## Overview

This specification completes the integration of spec phase indicators into the Cascade TreeView. Most functionality is already implemented (S93-S95 integration in PlanningTreeProvider.getTreeItem()). The remaining work is **tooltip enhancement** to show spec progress details when hovering over Story items.

## Implementation Status

### ✅ Already Implemented

The following functionality is complete and working in PlanningTreeProvider.ts:

1. **Interface Support** (`PlanningTreeItem.ts:48`)
   - `spec?: string` field exists on PlanningTreeItem interface
   - Properly documented with JSDoc

2. **Frontmatter Parsing** (`PlanningTreeProvider.ts:1404`)
   - `spec` field read from story frontmatter in loadAllPlanningItemsUncached()
   - Attached to PlanningTreeItem objects

3. **Spec Progress Cache** (`PlanningTreeProvider.ts:199-205, 933-976`)
   - `specProgressCache` Map with hit/miss tracking
   - `getSpecProgressCached()` method wraps readSpecProgress() with caching
   - Cache cleared on refresh() and selective invalidation supported

4. **Visual Indicator Rendering** (`PlanningTreeProvider.ts:881-900`)
   - getTreeItem() checks for story items with spec field
   - Calls getSpecProgressCached() to fetch progress
   - Calls renderSpecPhaseIndicator() to format indicator
   - Appends indicator to TreeItem.description
   - Format: `{statusBadge} {specIndicator}`

5. **Utility Integration**
   - readSpecProgress() imported from specProgressReader.ts (line 12)
   - renderSpecPhaseIndicator() imported from specPhaseRenderer.ts (line 13)
   - Both utilities fully implemented in S93/S95

### ❌ Not Implemented

The only missing functionality from S96 acceptance criteria:

**Tooltip Enhancement** (S96 AC #3)
- Add spec progress details to TreeItem.tooltip
- Show spec directory path
- Show individual phase status
- Add sync warning message if out of sync
- Example format provided in story file

## Implementation Strategy

Since most of S96 is complete, this spec focuses on the remaining tooltip enhancement work. The strategy is straightforward:

1. **Phase 1: Tooltip Enhancement**
   - Add conditional logic to buildTooltip() method
   - Create helper method to format spec progress section
   - Include spec directory, phase count, status, and sync warnings
   - Preserve existing tooltip structure for non-spec items

2. **Phase 2: Testing and Validation**
   - Manual testing with stories that have specs
   - Verify tooltip content accuracy
   - Test sync warning logic
   - Confirm performance impact is negligible

## Architecture Decisions

### Why Enhance buildTooltip() Instead of Creating New Method?

**Decision**: Enhance existing `buildTooltip()` method with conditional spec logic.

**Rationale**:
- Maintains single source of truth for tooltip generation
- Simpler code path (no branching between two methods)
- Easier to maintain consistent tooltip structure
- Avoids duplication of base tooltip fields

**Alternative Considered**: Create separate `buildTooltipWithSpec()` method (as suggested in S96 story)
- **Rejected**: Would require branching logic in getTreeItem() to decide which method to call
- Would duplicate base tooltip logic (item, status, priority, file path)
- More complex to maintain

### Tooltip Format

The tooltip will follow this structure:

```
{item} - {title}
Type: {type} | Status: {status} | Priority: {priority}
File: {relativePath}

[SPEC SECTION - Only if spec field present]
Spec Progress:
- Directory: {specDir}
- Phases: {completed}/{total} complete
- Status: {specStatus}

[SYNC WARNING - Only if out of sync]
⚠️ Spec and Story status out of sync
Run /sync to update story status
```

### Performance Considerations

Tooltip enhancement has minimal performance impact:
- buildTooltip() only called when hovering over items (not on every render)
- Spec progress already cached by getSpecProgressCached() during description rendering
- No additional file I/O (reuses cached SpecProgress object)
- String concatenation is O(1) operation
- Expected overhead: < 1ms per tooltip generation

## Key Integration Points

### Existing Methods to Modify

**PlanningTreeProvider.buildTooltip()** (`PlanningTreeProvider.ts:1549-1564`)
- Current implementation: Builds base tooltip with item metadata
- Enhancement: Add conditional spec progress section when SpecProgress exists
- Location: After file path line, before return statement

### Data Flow

```
getTreeItem(story) called
  ↓
getSpecProgressCached(story) → Returns SpecProgress (cached)
  ↓
renderSpecPhaseIndicator(progress) → Renders description indicator
  ↓
buildTooltip(story) → Enhances tooltip with spec progress
  ↓
  [NEW] Check if story has spec field
  [NEW] If yes, call getSpecProgressCached() again (cache hit!)
  [NEW] Format spec progress section
  [NEW] Append sync warning if out of sync
  ↓
Return TreeItem with enhanced tooltip
```

## Files Modified

1. **vscode-extension/src/treeview/PlanningTreeProvider.ts**
   - Enhance `buildTooltip()` method to include spec progress (if present)
   - No new methods needed
   - No imports needed (SpecProgress already imported)

## Success Criteria

- ✅ Stories with specs show enhanced tooltips with spec progress details
- ✅ Stories without specs show standard tooltips (no changes)
- ✅ Spec directory path displayed correctly (relative to workspace root)
- ✅ Phase counts accurate (match spec phase files)
- ✅ Sync warnings visible when spec/story diverge
- ✅ Tooltip formatting clean and readable
- ✅ Performance impact negligible (< 1ms overhead per tooltip)
- ✅ Cache reuse verified (no redundant spec reads)

## Risks and Mitigations

**Risk**: SpecProgress cache miss during tooltip generation (redundant file read)
- **Likelihood**: Low (getTreeItem() always calls getSpecProgressCached() before buildTooltip())
- **Impact**: Minor (< 10ms overhead per tooltip)
- **Mitigation**: None needed - cache architecture ensures hit rate > 99% for tooltips

**Risk**: Long spec directory paths overflow tooltip width
- **Likelihood**: Medium (deep nested specs)
- **Impact**: Minor (tooltip wrapping/truncation handled by VSCode)
- **Mitigation**: Use relative paths (more compact than absolute)

**Risk**: Sync warning logic confusion for users
- **Likelihood**: Low (clear warning message)
- **Impact**: Minor (users contact support)
- **Mitigation**: Include actionable instruction ("Run /sync to update")

## Notes

- This spec represents the final piece of F25 (Spec Phase Integration feature)
- Most implementation already completed in S93-S95 integration work
- Tooltip enhancement is low-risk, high-value addition
- Consider adding click handler to jump to spec directory in future iteration (not in scope)
- Test with various story/spec status combinations to ensure sync logic correct
