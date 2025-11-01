---
item: S88
title: Progress Calculation Core
type: story
parent: F24
status: Completed
priority: High
dependencies: []
estimate: S
created: 2025-10-25
updated: 2025-10-25
spec: specs/S88-progress-calculation-core/
---

# S88 - Progress Calculation Core

## Description

Implement the core progress calculation logic that computes completion percentages for parent items (Epics, Features, Projects) based on their children's status. This story creates the foundation for progress bar visualization by providing accurate completion statistics.

Progress is calculated by counting completed children against total children:
- **Epics**: Progress = completed Features / total Features
- **Features**: Progress = completed Stories & Bugs / total Stories & Bugs
- **Projects**: Progress = completed Epics / total Epics
- **Specs**: Progress = completed Phases / total Phases (reuse existing S56 logic)

The calculation returns a `ProgressInfo` object containing completed count, total count, percentage, and display string.

## Acceptance Criteria

1. **ProgressInfo Interface**:
   - [ ] Extend existing `ProgressInfo` interface in PlanningTreeProvider.ts (lines 18-30)
   - [ ] Include fields: `completed: number`, `total: number`, `percentage: number`, `display: string`
   - [ ] TypeScript strict mode passes (no type errors)

2. **calculateProgress() Function**:
   - [ ] Implement `calculateProgress(item: PlanningTreeItem, hierarchy: HierarchyNode[]): ProgressInfo | null`
   - [ ] Return `null` for items with zero children (leaf nodes)
   - [ ] Count only children with `status === 'Completed'` as completed
   - [ ] Calculate percentage as: `Math.round((completed / total) * 100)`
   - [ ] Generate display string: `"(completed/total)"` (e.g., `"(3/5)"`)

3. **Hierarchy Traversal**:
   - [ ] Find children by filtering hierarchy where `child.parent === item.item`
   - [ ] Support Epic → Features, Feature → Stories/Bugs, Project → Epics
   - [ ] Handle orphan items (items with no parent) correctly
   - [ ] Count all child types (Stories + Bugs for Features)

4. **Edge Cases**:
   - [ ] Items with 0 children return `null` (not `ProgressInfo`)
   - [ ] Items with 1 child calculate correctly (e.g., 1/1 = 100%)
   - [ ] Items with all completed children return 100%
   - [ ] Items with no completed children return 0%
   - [ ] Rounding works correctly (1/3 = 33%, 2/3 = 67%)

5. **Testing**:
   - [ ] All existing tests in `progressCalculation.test.ts` pass
   - [ ] Test 3 of 5 completed → 60% (lines 75-104)
   - [ ] Test 2 of 3 completed → 67% (lines 106-133)
   - [ ] Test mixed children (stories + bugs) (lines 135-163)
   - [ ] Test all edge cases (lines 166-345)
   - [ ] No new test failures introduced

## Technical Approach

### Implementation Location

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

The `ProgressInfo` interface already exists (lines 18-30). Add the `calculateProgress()` method to the `PlanningTreeDataProvider` class.

### calculateProgress() Implementation

```typescript
/**
 * Calculates progress information for a parent item.
 *
 * @param item - Parent item (Epic, Feature, Project)
 * @param hierarchy - Full hierarchy tree
 * @returns ProgressInfo with completion stats, or null if no children
 */
private calculateProgress(item: PlanningTreeItem, hierarchy: HierarchyNode[]): ProgressInfo | null {
  // Find children in hierarchy
  const children = hierarchy.filter(node => {
    return node.parent && node.parent.item.item === item.item;
  });

  if (children.length === 0) {
    return null;
  }

  // Count completed children
  const completed = children.filter(child =>
    child.item.status === 'Completed'
  ).length;

  const total = children.length;
  const percentage = Math.round((completed / total) * 100);
  const display = `(${completed}/${total})`;

  return { completed, total, percentage, display };
}
```

### Integration with Hierarchy

The method uses the existing `HierarchyNode` structure built by the TreeDataProvider:
- Hierarchy already constructed during `getChildren()` calls
- Parent-child relationships tracked in `HierarchyNode.parent` field
- Status values available in `HierarchyNode.item.status`

### Display String Format

Format: `"(completed/total)"` (e.g., `"(3/5)"`)

This matches the existing test expectations (lines 103, 132, 162, etc. in progressCalculation.test.ts).

## Dependencies

- `HierarchyNode` interface (HierarchyNode.ts) - provides parent-child relationships
- `PlanningTreeItem` interface (PlanningTreeItem.ts) - contains item data and status
- `ProgressInfo` interface (PlanningTreeProvider.ts:18-30) - already defined
- Test suite (progressCalculation.test.ts) - validates correctness

## Success Metrics

- All 13 existing tests in `progressCalculation.test.ts` pass
- `calculateProgress()` handles edge cases correctly (0 children, 100%, 0%, rounding)
- Progress calculation is O(N) where N = number of children (efficient)
- No type errors in TypeScript strict mode

## Notes

- This story focuses solely on calculation logic, not rendering or display
- Progress bar rendering (Unicode blocks) is handled in S89
- TreeItem integration (showing progress in TreeView) is handled in S90
- Caching for performance is handled in S91
- The existing test suite provides comprehensive coverage of all scenarios
- Test harness in progressCalculation.test.ts can be reused for validation
