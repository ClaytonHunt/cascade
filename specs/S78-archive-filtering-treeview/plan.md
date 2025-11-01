---
spec: S78
title: Archive Filtering in TreeView
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-23
updated: 2025-10-23
---

# Implementation Specification: S78 - Archive Filtering in TreeView

## Overview

This specification defines the implementation strategy for filtering archived items from the Cascade TreeView based on the `showArchivedItems` flag. When the flag is OFF (default), archived items are filtered out before building status groups. When ON, all items (including archived) are displayed, with archived items appearing in a dedicated "Archived" status group.

## Work Item Reference

- **Story**: S78 - Archive Filtering in TreeView
- **Feature**: F22 - Archive Support
- **Epic**: E5 - Rich TreeView Visualization
- **Story File**: `plans/epic-05-rich-treeview-visualization/feature-22-archive-support/story-78-archive-filtering-treeview.md`

## Dependencies

All dependencies are completed:
- ✅ **S75**: Type System Updates for Archived Status (adds 'Archived' to Status type)
- ✅ **S76**: Archive Directory Detection Logic (provides `isItemArchived()` function)
- ✅ **S77**: Toggle Command and UI Integration (provides `showArchivedItems` flag and toggle)

## Implementation Strategy

### Core Approach

The implementation uses a **late filtering strategy** in `getStatusGroups()` and `getItemsForStatus()` rather than early filtering in `loadAllPlanningItems()`. This approach provides several advantages:

1. **Flexibility**: Allows different filtering per status group (critical for "Archived" group)
2. **Clarity**: Filtering logic lives alongside status group construction
3. **Performance**: Single filter pass per refresh (not per status expansion)
4. **Maintainability**: Clear separation between data loading and filtering concerns

### Key Design Decisions

#### 1. Status Group Construction (getStatusGroups)

**Modified Logic**:
- Add 'Archived' to status array ONLY when `showArchivedItems` is `true`
- For "Archived" status group: Include ALL archived items (detected via `isItemArchived()`)
- For other status groups: Filter by status AND exclude archived items (unless toggle is ON)
- Empty status groups still shown (even with 0 count) for consistency

**Why this approach**:
- Archived status group is conditional (appears/disappears with toggle)
- Non-archived status groups never show archived items (even when toggle is ON)
- Archived items with `status: Ready` appear in "Archived" group, not "Ready" group

#### 2. Item Filtering (getItemsForStatus)

**Special Handling for "Archived" Status**:
- When status is 'Archived': Return ALL items where `isItemArchived()` is true
- This includes items in `plans/archive/` directory regardless of frontmatter status
- This includes items with `status: Archived` regardless of directory location

**Standard Status Filtering**:
- Filter by exact status match (existing behavior)
- Exclude archived items unless `showArchivedItems` is true
- Uses `isItemArchived()` from S76 for detection

#### 3. Performance Optimization

**Single Load, Multiple Filters**:
- Load all items once via `loadAllPlanningItems()` (uses items cache)
- Apply filtering during status group construction
- No redundant file system scans
- Performance target: < 10ms filter operation with 100+ items

**Cache Integration**:
- Filtering happens AFTER items cache lookup (cache hit still applies)
- No separate filter cache needed (filtering is O(n) with n=items, very fast)
- Hierarchy cache remains valid (built from filtered items per status)

### Architecture Integration Points

#### Modified Files

**vscode-extension/src/treeview/PlanningTreeProvider.ts**:
- `getStatusGroups()`: Status array modification + filtering logic
- `getItemsForStatus()`: Special "Archived" status handling + archive filtering

#### Import Requirements

```typescript
import { isItemArchived } from './archiveUtils';
```

Already imported in PlanningTreeProvider.ts (added by S76).

#### State Access

The `showArchivedItems` flag is already defined:
- Location: `PlanningTreeProvider.ts:207`
- Type: `private showArchivedItems: boolean = false`
- Modified by: `toggleArchivedItems()` method (S77)

### Edge Cases and Handling

1. **Items in archive directory with non-Archived status**:
   - Example: `plans/archive/story.md` with `status: Ready`
   - Result: Appears in "Archived" group (directory overrides status)

2. **Items with Archived status outside archive directory**:
   - Example: `plans/epic-05/story.md` with `status: Archived`
   - Result: Appears in "Archived" group (status triggers archived detection)

3. **Empty Archived status group**:
   - When no archived items exist and toggle is ON
   - Result: "Archived (0)" group is shown (consistent with other status groups)

4. **Toggle state transitions**:
   - OFF → ON: Archived group appears, counts update
   - ON → OFF: Archived group disappears, items removed from tree
   - Triggers full refresh via `toggleArchivedItems()` → `refresh()`

### Hierarchy Preservation

Archived items maintain their hierarchical relationships within the "Archived" status group:
- Epics can be expanded to show child features
- Features can be expanded to show child stories/bugs
- Hierarchy built using existing `buildHierarchy()` logic (no changes needed)

### Testing Strategy

#### Unit Testing Approach

Tests will be created in VSCode extension test suite:
- Mock data generation for archived/non-archived items
- Verify filtering logic with various showArchivedItems states
- Validate status group counts and ordering

#### Manual Testing Workflow

1. **Setup**: Create test data in `plans/archive/` directory
2. **Default State**: Verify archived items hidden, no "Archived" group
3. **Toggle ON**: Verify archived items visible in "Archived" group
4. **Toggle OFF**: Verify return to filtered state
5. **Performance**: Measure filter time with 100+ items

## Implementation Phases

### Phase 1: Status Group Array Modification
**Goal**: Add conditional "Archived" status to status group array

**Tasks**:
- Modify `getStatusGroups()` to conditionally include 'Archived' status
- Add output channel logging for archive filtering
- Verify status group order (Archived appears last)

**Validation**:
- TreeView shows 7 status groups when toggle is ON
- TreeView shows 6 status groups when toggle is OFF
- Archived group appears after Completed group

### Phase 2: Archive Filtering Logic
**Goal**: Implement filtering to exclude archived items from non-Archived status groups

**Tasks**:
- Add archive filtering in `getStatusGroups()` loop
- Implement special handling for "Archived" status
- Add filtering in `getItemsForStatus()` method
- Add performance timing logs

**Validation**:
- Archived items excluded from standard status groups (toggle OFF)
- Archived items appear in "Archived" group (toggle ON)
- Filter operation completes in < 10ms with 100+ items
- Hierarchy preserved within Archived group

### Phase 3: Edge Case Handling and Polish
**Goal**: Handle edge cases, optimize performance, add comprehensive logging

**Tasks**:
- Handle empty Archived status group case
- Verify directory-based detection overrides status
- Add detailed output channel logging
- Performance optimization (minimize redundant isItemArchived calls)
- Code cleanup and documentation updates

**Validation**:
- All acceptance criteria from S78 met
- Edge cases handled gracefully
- Performance targets achieved
- Output channel logs provide clear debugging info

## Risk Assessment

### Low Risk Areas
- Status type already includes 'Archived' (S75)
- `isItemArchived()` function tested and working (S76)
- `showArchivedItems` flag and toggle implemented (S77)
- Items cache architecture supports filtering

### Medium Risk Areas
- **Performance with large item counts**: Filtering is O(n), but isItemArchived() called per item
  - Mitigation: Performance profiling, potential result caching if needed
- **Status group count changes**: Toggle changes group count (6 ↔ 7)
  - Mitigation: VSCode TreeView handles dynamic group lists natively

### No Known Blockers
- All dependencies completed
- No breaking changes to existing APIs
- No database or file format changes required

## Completion Criteria

### Functional Requirements
- ✅ Archived items hidden when `showArchivedItems = false`
- ✅ Archived items visible when `showArchivedItems = true`
- ✅ "Archived" status group appears only when toggle is ON
- ✅ Archived status group shows accurate item count
- ✅ Archived status group appears last (after "Completed")
- ✅ Items in `plans/archive/` appear in Archived group regardless of status
- ✅ Items with `status: Archived` appear in Archived group regardless of directory

### Performance Requirements
- ✅ Filter operation < 10ms with 100+ items
- ✅ TreeView refresh < 500ms total (existing target maintained)
- ✅ No degradation in cache hit rate

### Code Quality Requirements
- ✅ TypeScript type safety maintained
- ✅ Comprehensive output channel logging
- ✅ Clear code comments explaining filtering logic
- ✅ No duplicate filtering logic

## Next Steps

After completing this specification:
1. Run `/build specs/S78-archive-filtering-treeview/plan.md` to begin implementation
2. Follow TDD approach with RED-GREEN-REFACTOR cycle
3. Test with performance measurement using test data generation script
4. Mark S78 as "Completed" after all phases pass

## References

### Codebase Files
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` (primary modification target)
- `vscode-extension/src/treeview/archiveUtils.ts` (filtering function)
- `vscode-extension/src/types.ts` (Status type definition)

### Related Stories
- S75 - Type System Updates for Archived Status
- S76 - Archive Directory Detection Logic
- S77 - Toggle Command and UI Integration
- S79 - Persistence for Archive Toggle State (next story)
- S80 - Visual Design for Archived Items (future story)

### Documentation
- Story file: `plans/epic-05-rich-treeview-visualization/feature-22-archive-support/story-78-archive-filtering-treeview.md`
- CLAUDE.md: Performance testing section
- Frontmatter schema: `docs/frontmatter-schema.md`
