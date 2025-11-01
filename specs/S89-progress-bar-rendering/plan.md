---
spec: S89
title: Progress Bar Rendering
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-25
updated: 2025-10-25
---

# S89 - Progress Bar Rendering Implementation Specification

## Overview

This specification details the implementation of the visual progress bar rendering function that converts `ProgressInfo` data into Unicode bar strings with filled/empty blocks, percentage, and count display.

The renderer creates iconic progress bar visualizations like `"█████░░░░░ 50% (3/6)"` using Unicode box-drawing characters that work in monospace fonts and VSCode TreeView descriptions.

## Implementation Strategy

The implementation follows the established pattern from S81 (Badge Renderer) to ensure consistency and maintainability:

1. **Create standalone utility module** (`progressRenderer.ts`) - Similar to `badgeRenderer.ts`, this provides a focused, reusable module with a single responsibility
2. **Export pure function** (`renderProgressBar()`) - Simple, testable function with no side effects
3. **Export constants** for Unicode characters - Enables reusability and testing
4. **Comprehensive test coverage** - Follow the same thorough testing pattern from `badgeRenderer.test.ts`

## Architecture Decisions

### Module Location
`vscode-extension/src/treeview/progressRenderer.ts`

**Rationale:**
- Co-located with `badgeRenderer.ts` (similar responsibility)
- Part of TreeView rendering utilities
- Clear separation of concerns from business logic

### Type Dependencies
The renderer will use the existing `ProgressInfo` interface from `PlanningTreeProvider.ts` (lines 18-30). This interface is already well-defined with all required fields:
- `completed: number` - Completed children count
- `total: number` - Total children count
- `percentage: number` - Completion percentage (0-100, rounded)
- `display: string` - Formatted display string (not used by this renderer)

**Note:** `ProgressInfo` is NOT exported from `PlanningTreeProvider.ts`, so the renderer will need to either:
1. Import the interface by exporting it from `PlanningTreeProvider.ts`, OR
2. Duplicate the interface in `progressRenderer.ts` for testing

The implementation will use Option 1 (export from provider) for type consistency.

### Unicode Character Selection
- **Filled block:** `█` (U+2588 Full Block) - Solid, high-visibility character
- **Empty block:** `░` (U+2591 Light Shade) - Clear visual distinction from filled
- **Bar length:** 10 characters - Balances detail with space efficiency

These characters render correctly in VSCode's TreeView with monospace fonts and provide clear visual feedback.

### Bar Scaling Algorithm
Uses `Math.round()` for filled segment calculation to handle percentage rounding:
```
filledCount = Math.round((percentage / 100) * 10)
emptyCount = 10 - filledCount
```

This ensures:
- 33% (1/3) renders as 3 filled blocks (rounds down from 3.3)
- 67% (2/3) renders as 7 filled blocks (rounds up from 6.7)
- Consistent rounding behavior across all percentages

## Key Integration Points

### PlanningTreeProvider Integration (Future - S90)
The renderer will be consumed by `PlanningTreeProvider.getTreeItem()` (lines 763-773):
```typescript
const progress = await this.calculateProgress(element);
if (progress) {
  const progressBar = renderProgressBar(progress);
  treeItem.description = `${statusBadge} ${progressBar}`;
}
```

### Testing Infrastructure
- Uses existing VSCode test suite (`vscode-extension/src/test/suite/`)
- Follows patterns from `badgeRenderer.test.ts` (comprehensive coverage)
- Test harness in `progressCalculation.test.ts` can be referenced for `ProgressInfo` mock data

## Risk Assessment

### Low Risk Implementation
- **Simple string manipulation** - No complex logic or external dependencies
- **Well-defined input/output** - `ProgressInfo` interface already exists and is tested
- **Proven pattern** - Directly follows `badgeRenderer.ts` architecture (S81)
- **Comprehensive testing** - Same test structure as badge renderer ensures quality

### Potential Risks (Minimal)
1. **Unicode rendering variations** - Different fonts may render blocks slightly differently
   - **Mitigation:** Accepted limitation, Unicode blocks work well in VSCode monospace fonts
2. **Bar length scaling edge cases** - Rounding behavior at percentage boundaries
   - **Mitigation:** Comprehensive test coverage (0%, 10%, 33%, 50%, 67%, 75%, 100%)

## Phase Overview

### Phase 1: Core Implementation
**File:** `tasks/01-core-implementation.md`

Create the `progressRenderer.ts` module with:
- `renderProgressBar()` function implementation
- Unicode character constants
- Export `ProgressInfo` from `PlanningTreeProvider.ts`
- JSDoc documentation
- Module structure following `badgeRenderer.ts` pattern

**Deliverable:** Working `progressRenderer.ts` module that generates correct progress bar strings

### Phase 2: Test Suite
**File:** `tasks/02-test-suite.md`

Create comprehensive test suite with:
- Module structure tests (exports, imports)
- Progress bar rendering tests (all percentage ranges)
- Rounding edge case tests (33%, 67%)
- Format validation tests (Unicode characters, spacing, counts)
- Pure function behavior tests (deterministic, no side effects)
- Performance benchmarks (single call < 1ms, 1000 calls < 10ms)

**Deliverable:** Complete test suite passing all acceptance criteria

## Completion Criteria

1. ✅ `progressRenderer.ts` created with `renderProgressBar()` function
2. ✅ Unicode constants exported (FILLED_BLOCK, EMPTY_BLOCK, PROGRESS_BAR_LENGTH)
3. ✅ `ProgressInfo` interface exported from `PlanningTreeProvider.ts`
4. ✅ All test cases passing in `progressBarRenderer.test.ts`:
   - 0% progress: `"░░░░░░░░░░ 0% (0/5)"`
   - 50% progress: `"█████░░░░░ 50% (5/10)"`
   - 100% progress: `"██████████ 100% (5/5)"`
   - 33% progress: `"███░░░░░░░ 33% (1/3)"` (rounding test)
   - 67% progress: `"███████░░░ 67% (2/3)"` (rounding test)
5. ✅ JSDoc documentation complete
6. ✅ Module follows `badgeRenderer.ts` pattern (pure function, minimal exports)
7. ✅ Performance < 1ms per call (simple string operations)

## Success Metrics

- **Correctness:** All test cases pass (0%, 10%, 50%, 100%, rounding edge cases)
- **Performance:** < 1ms per call (O(1) string operations)
- **Code Quality:** Follows established patterns from `badgeRenderer.ts`
- **Test Coverage:** Comprehensive suite matching `badgeRenderer.test.ts` structure
- **Visual Rendering:** Progress bars render correctly in VSCode TreeView (manual verification during S90)

## Dependencies

- **S88** (Progress Calculation Core) - ✅ Completed
  - Provides `ProgressInfo` interface definition
  - Provides test data patterns in `progressCalculation.test.ts`
- **VSCode API** - `vscode.TreeItem.description` field (used in future S90)
- **TypeScript** - Strict mode type checking

## Next Steps After Completion

Once this specification is implemented:
1. **S90** (TreeItem Integration) will consume `renderProgressBar()` to display progress in TreeView
2. **S91** (Progress Cache Layer) will optimize performance for large hierarchies
3. **S92** (Progress Update Propagation) will handle real-time cache invalidation

## Notes

- This is a pure utility function with no state or side effects
- Similar to `badgeRenderer.ts`, this module has a single, focused responsibility
- The renderer does NOT handle integration with TreeView - that's S90's responsibility
- Progress bar will appear after status badge in TreeItem description: `"$(sync) In Progress █████░░░░░ 50% (3/6)"`
- Unicode characters may render slightly differently in different fonts (acceptable variation)
- Bar length of 10 chosen to balance visual detail with space efficiency in TreeView
