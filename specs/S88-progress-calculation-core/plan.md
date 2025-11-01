---
spec: S88
title: Progress Calculation Core
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-25
updated: 2025-10-25
---

# S88 - Progress Calculation Core

## Implementation Strategy

This specification implements the core progress calculation logic for computing completion percentages of parent items (Epics, Features, Projects) based on their children's status. The implementation is straightforward and focused, requiring only method implementation without structural changes to the codebase.

### Overview

The `calculateProgress()` method already exists in skeleton form in `PlanningTreeProvider.ts` (lines 1872-1912). The implementation follows existing patterns:

1. **Reuse existing hierarchy structure**: The `HierarchyNode` structure and `getDirectChildren()` method provide the foundation
2. **Follow existing test suite**: Comprehensive test coverage exists in `progressCalculation.test.ts` with 13 test cases
3. **Minimal surface area**: Only implementing a single method in a single file

### Architecture Decisions

**Why modify calculateProgress() instead of creating new?**
- Method signature already correct (lines 1872-1912)
- Integration points already established in `getTreeItem()` (lines 766-783)
- Progress cache already initialized (line 174)
- Test suite expects this exact method

**Why use getDirectChildren() helper?**
- Abstracts hierarchy traversal complexity
- Handles both status-grouped and hierarchy view modes
- Already accounts for archived items filtering (lines 1931-1949)
- Maintains consistency with rest of provider

**Why simple display format "(3/5)"?**
- Matches existing test expectations (13 tests verify this format)
- Compact for TreeView descriptions
- Clear and unambiguous

### Key Integration Points

1. **Called from getTreeItem()** (PlanningTreeProvider.ts:768)
   - Invoked during TreeItem rendering for Epic/Feature items
   - Result displayed in TreeItem description field
   - Only called for parent items (Epic, Feature)

2. **Uses hierarchy structure** (HierarchyNode.ts)
   - Relies on `HierarchyNode` parent-child relationships
   - Traverses via `getDirectChildren()` helper method

3. **Cached for performance** (PlanningTreeProvider.ts:174)
   - Progress cache map already exists
   - Cache invalidated on refresh() (line 671)
   - O(1) lookups after initial calculation

4. **Validated by tests** (progressCalculation.test.ts)
   - 13 comprehensive test cases
   - Covers edge cases: 0 children, 100%, 0%, rounding
   - Test harness provides isolated testing environment

### Risk Assessment

**Low Risk Implementation:**
- Single method in single file
- No changes to data structures or interfaces
- Test suite provides immediate validation
- No breaking changes to existing functionality

**Potential Issues:**
- None identified - straightforward implementation

### Codebase Analysis Summary

**Files to modify:** 1
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` (lines 1872-1912)

**New files to create:** 0

**External dependencies:**
- None (uses existing `HierarchyNode`, `PlanningTreeItem`, `ProgressInfo`)

**Related files (read-only):**
- `vscode-extension/src/treeview/HierarchyNode.ts` (interface definitions)
- `vscode-extension/src/treeview/PlanningTreeItem.ts` (interface definitions)
- `vscode-extension/src/test/suite/progressCalculation.test.ts` (validation)

## Phase Overview

### Phase 1: Implement calculateProgress() Method
Implement the core calculation logic using existing hierarchy structure and test harness validation.

### Phase 2: Test Validation
Run test suite to verify correctness across all scenarios and edge cases.

## Implementation Notes

### Existing Test Coverage

The test suite (`progressCalculation.test.ts`) provides comprehensive validation:

**Basic scenarios (3 tests):**
- 3 of 5 features completed (60%)
- 2 of 3 stories completed (67%)
- Mixed children (stories + bugs)

**Edge cases (6 tests):**
- No children (returns null)
- Empty children array (returns null)
- All completed (100%)
- None completed (0%)
- Single child completed (100%)
- Single child not completed (0%)

**Special cases (4 tests):**
- Mixed statuses (only "Completed" counts)
- Rounding: 33.33% → 33%
- Rounding: 66.67% → 67%
- Exact: 50% → 50%

### Performance Characteristics

**Cache behavior:**
- First call: O(N) where N = number of children
- Subsequent calls: O(1) cache hit
- Cache invalidated on refresh()

**Expected performance:**
- Typical feature with 5-10 stories: < 1ms
- Large feature with 50 stories: < 5ms
- Cache hit: < 0.1ms

### Display Format Examples

```
(0/5)   - 0% complete
(1/3)   - 33% complete
(2/3)   - 67% complete
(3/5)   - 60% complete
(5/5)   - 100% complete
```

## Success Criteria

- All 13 tests in `progressCalculation.test.ts` pass
- TypeScript compilation succeeds (no type errors)
- Progress displayed correctly in TreeView for Epic/Feature items
- Performance targets met (< 5ms for typical calculations)
