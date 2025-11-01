---
spec: S86
title: Hierarchy View Root Implementation
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-24
updated: 2025-10-25
---

# S86 - Hierarchy View Root Implementation

## Work Item Reference

**Story**: S86 - Hierarchy View Root Implementation
**File**: `plans/epic-05-rich-treeview-visualization/feature-28-treeview-display-mode-toggle/story-86-hierarchy-view-root-implementation.md`

## Implementation Strategy

This specification implements hierarchy view root logic that displays planning items in a **Project → Epic → Feature → Story** tree structure (instead of status-grouped view). The implementation modifies `getChildren()` to check view mode and delegates to a new `getHierarchyRoot()` method when in 'hierarchy' mode.

### Key Design Decisions

1. **Reuse Existing buildHierarchy()**
   - The existing `buildHierarchy()` method already handles Epic → Feature → Story relationships
   - **HOWEVER**: It does NOT currently handle Projects (they fall through to orphans)
   - We need to extend `buildHierarchy()` to support Projects before using it in hierarchy view

2. **Three-Phase Approach**
   - **Phase 1**: Extend buildHierarchy() to support Project nodes
   - **Phase 2**: Implement getHierarchyRoot() and modify getChildren()
   - **Phase 3**: Add comprehensive testing

3. **Archive Filtering Integration**
   - Reuse existing `isItemArchived()` utility
   - Filter archived items before building hierarchy if toggle is OFF
   - No changes to archive detection logic needed

4. **Performance Characteristics**
   - Uses existing items cache (no additional file reads)
   - Single hierarchy build per refresh (not per expansion)
   - Target: < 100ms root level load with 100+ items

## Architecture Overview

### Current State (Status View)

```
getChildren(undefined)
  ↓
getStatusGroups()
  ↓
Returns: [Status Group Nodes]
  ↓
User expands status group
  ↓
getChildren(statusGroupNode)
  ↓
getHierarchyForStatus(status)
  ↓
Returns: [Epic, Feature, Story nodes filtered by status]
```

### New State (Hierarchy View)

```
getChildren(undefined)
  ↓
Check viewMode
  ├─ 'status' → getStatusGroups() (existing)
  └─ 'hierarchy' → getHierarchyRoot() (NEW)
      ↓
  loadAllPlanningItems() (cached)
      ↓
  Filter archived items (if toggle OFF)
      ↓
  buildHierarchy(filteredItems) (EXTENDED to support Projects)
      ↓
  Returns: [Project nodes + orphan Epics/Features/Stories]
```

### Hierarchy Structure

The hierarchy view will show:

```
TreeView Root
├─ P1 - Lineage RPG Game Systems
│  ├─ E1 - Character Movement System
│  │  └─ F1 - Movement Foundation
│  │     ├─ S1 - Basic Movement
│  │     └─ S2 - Collision Detection
│  └─ E2 - Testing System
│     └─ F2 - Test Framework
├─ E3 - Orphan Epic (no parent project)
│  └─ F3 - Feature under orphan epic
└─ S99 - Orphan Story (no parent feature)
```

## Key Integration Points

### Modified Files

1. **`vscode-extension/src/treeview/HierarchyNode.ts`**
   - Extend `ItemPathParts` interface to include `projectDir: string | null`
   - Update documentation to reflect P→E→F→S hierarchy

2. **`vscode-extension/src/treeview/PlanningTreeProvider.ts`**
   - Extend `buildHierarchy()` to handle Project nodes (line 1360-1487)
   - Add `parseItemPath()` logic to detect project directories
   - Modify `getChildren()` to route based on viewMode (line 815-848)
   - Add new `getHierarchyRoot()` method
   - Extend `getChildrenForItem()` to support 'project' type (line 841)

### Existing Code Reused

- `loadAllPlanningItems()` - Items cache (tier 2 caching)
- `isItemArchived()` - Archive detection
- `buildHierarchy()` - Hierarchy building (EXTENDED, not replaced)
- `sortHierarchyNodes()` - Sorting logic
- `compareItemNumbers()` - Item number comparison

### Dependencies

- **S85 (Completed)**: Provides `viewMode` property and state management
- Existing archive filtering system (S76-S79)
- Existing items cache (S58)

## Risk Assessment

### Low Risk

✅ **Archive filtering integration** - Well-defined utility function
✅ **ViewMode state management** - Already implemented in S85
✅ **Items caching** - Existing, tested infrastructure

### Medium Risk

⚠️ **buildHierarchy() extension** - Need to preserve existing Epic→Feature→Story logic while adding Projects
⚠️ **parseItemPath() modification** - Must detect project directories without breaking existing epic/feature detection

### Mitigation Strategies

1. **Incremental Testing**: Test each phase independently
2. **Preserve Existing Behavior**: Ensure status view continues working
3. **Logging**: Add comprehensive output channel logs for debugging
4. **Type Safety**: Leverage TypeScript for compile-time validation

## Phase Overview

### Phase 1: Extend buildHierarchy() for Projects (FOUNDATION)
**File**: `tasks/01-extend-hierarchy-for-projects.md`

- Extend `ItemPathParts` interface to include `projectDir`
- Modify `parseItemPath()` to detect project directories
- Extend `buildHierarchy()` to handle Project nodes
- Update `getChildrenForItem()` to support 'project' type
- Add comprehensive logging

### Phase 2: Implement getHierarchyRoot() and Routing (INTEGRATION)
**File**: `tasks/02-implement-hierarchy-root.md`

- Add `getHierarchyRoot()` method
- Modify `getChildren()` to route based on viewMode
- Integrate archive filtering
- Add performance logging

### Phase 3: Testing and Validation (VERIFICATION)
**File**: `tasks/03-testing-validation.md`

- Unit tests for getHierarchyRoot()
- Integration tests for view mode switching
- Archive filtering tests
- Performance verification with 100+ items
- Manual testing with VSCode extension

## Codebase Analysis Summary

### Files Modified
- `vscode-extension/src/treeview/HierarchyNode.ts` - Interface extension
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` - Core logic

### Files Created
- `vscode-extension/src/test/suite/hierarchyView.test.ts` - Test suite

### External Dependencies
- VSCode TreeView API (existing)
- TypeScript type system
- Existing test framework

### Godot APIs Used
None (VSCode extension only)

## Completion Criteria

- ✅ Projects appear at root level in hierarchy view
- ✅ Epics appear under parent Projects
- ✅ Orphan Epics/Features/Stories appear at root level
- ✅ Archive filtering works in hierarchy view
- ✅ View mode switching toggles between status and hierarchy
- ✅ Performance: Root load < 100ms with 100+ items
- ✅ All tests passing
- ✅ No regression in status view functionality

## Next Steps

After specification approval, run:

```bash
/build specs/S86-hierarchy-view-root-implementation/plan.md
```

This will execute the TDD implementation using the RED-GREEN-REFACTOR cycle.
