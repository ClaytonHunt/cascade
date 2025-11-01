---
item: S89
title: Progress Bar Rendering
type: story
parent: F24
status: Completed
priority: High
dependencies: [S88]
estimate: S
created: 2025-10-25
updated: 2025-10-25
spec: specs/S89-progress-bar-rendering/
---

# S89 - Progress Bar Rendering

## Description

Implement the visual progress bar rendering function that converts `ProgressInfo` data into Unicode bar strings with filled/empty blocks, percentage, and count display. This creates the iconic progress bar visualization: `"█████░░░░░ 50% (3/6)"`.

The renderer uses Unicode box-drawing characters to create visual bars that work in monospace fonts and VSCode TreeView descriptions. Bars are fixed-length (10 characters) for consistent alignment across all items.

## Acceptance Criteria

1. **renderProgressBar() Function**:
   - [ ] Create new function: `renderProgressBar(progress: ProgressInfo): string`
   - [ ] Return format: `"{filled}{empty} {percentage}% ({completed}/{total})"`
   - [ ] Example: `"█████░░░░░ 50% (3/6)"` for 50% completion
   - [ ] Handle null input by returning empty string

2. **Unicode Character Usage**:
   - [ ] Use `█` (U+2588 Full Block) for filled segments
   - [ ] Use `░` (U+2591 Light Shade) for empty segments
   - [ ] Characters render correctly in VSCode TreeView (monospace font)
   - [ ] Bar length fixed at 10 characters total

3. **Bar Scaling**:
   - [ ] 0% completion: `"░░░░░░░░░░ 0% (0/5)"`
   - [ ] 10% completion: `"█░░░░░░░░░ 10% (1/10)"`
   - [ ] 30% completion: `"███░░░░░░░ 30% (3/10)"`
   - [ ] 50% completion: `"█████░░░░░ 50% (5/10)"`
   - [ ] 75% completion: `"███████░░░ 75% (3/4)"`
   - [ ] 100% completion: `"██████████ 100% (5/5)"`

4. **Rounding Behavior**:
   - [ ] 33% (1/3) rounds to 3 filled blocks: `"███░░░░░░░ 33% (1/3)"`
   - [ ] 67% (2/3) rounds to 7 filled blocks: `"███████░░░ 67% (2/3)"`
   - [ ] Filled count = `Math.round((percentage / 100) * 10)`
   - [ ] Empty count = `10 - filledCount`

5. **Testing**:
   - [ ] Create test file: `vscode-extension/src/test/suite/progressBarRenderer.test.ts`
   - [ ] Test all percentage ranges (0%, 10%, 50%, 100%)
   - [ ] Test rounding edge cases (33%, 67%)
   - [ ] Test format correctness (spacing, unicode, counts)
   - [ ] All tests pass without errors

## Technical Approach

### Implementation Location

**New File**: `vscode-extension/src/treeview/progressRenderer.ts`

Create a standalone utility module similar to `badgeRenderer.ts` for separation of concerns.

### renderProgressBar() Implementation

```typescript
/**
 * Renders a visual progress bar using Unicode block characters.
 *
 * Format: "{filled}{empty} {percentage}% ({completed}/{total})"
 * Example: "█████░░░░░ 50% (3/6)"
 *
 * @param progress - Progress information from calculateProgress()
 * @returns Formatted progress bar string
 */
export function renderProgressBar(progress: ProgressInfo): string {
  const BAR_LENGTH = 10;
  const FILLED_CHAR = '█';  // U+2588 Full Block
  const EMPTY_CHAR = '░';   // U+2591 Light Shade

  const filledCount = Math.round((progress.percentage / 100) * BAR_LENGTH);
  const emptyCount = BAR_LENGTH - filledCount;

  const filled = FILLED_CHAR.repeat(filledCount);
  const empty = EMPTY_CHAR.repeat(emptyCount);

  return `${filled}${empty} ${progress.percentage}% (${progress.completed}/${progress.total})`;
}
```

### Unicode Character Constants

Export constants for reuse and testability:

```typescript
export const PROGRESS_BAR_LENGTH = 10;
export const FILLED_BLOCK = '█';  // U+2588
export const EMPTY_BLOCK = '░';   // U+2591
```

### Module Structure

```typescript
// vscode-extension/src/treeview/progressRenderer.ts

/**
 * Progress bar rendering utilities for VSCode TreeView.
 *
 * Provides Unicode-based progress bar generation for displaying
 * completion status of parent items (Epics, Features, Projects).
 */

import { ProgressInfo } from './PlanningTreeProvider';

export const PROGRESS_BAR_LENGTH = 10;
export const FILLED_BLOCK = '█';
export const EMPTY_BLOCK = '░';

export function renderProgressBar(progress: ProgressInfo): string {
  // Implementation as above
}
```

## Testing Strategy

Create comprehensive test suite to validate rendering correctness:

**File**: `vscode-extension/src/test/suite/progressBarRenderer.test.ts`

```typescript
import * as assert from 'assert';
import { renderProgressBar } from '../../treeview/progressRenderer';
import { ProgressInfo } from '../../treeview/PlanningTreeProvider';

suite('Progress Bar Renderer Tests', () => {
  test('Render 0% progress', () => {
    const progress: ProgressInfo = {
      completed: 0,
      total: 5,
      percentage: 0,
      display: '(0/5)'
    };
    const bar = renderProgressBar(progress);
    assert.strictEqual(bar, '░░░░░░░░░░ 0% (0/5)');
  });

  test('Render 50% progress', () => {
    const progress: ProgressInfo = {
      completed: 5,
      total: 10,
      percentage: 50,
      display: '(5/10)'
    };
    const bar = renderProgressBar(progress);
    assert.strictEqual(bar, '█████░░░░░ 50% (5/10)');
  });

  test('Render 100% progress', () => {
    const progress: ProgressInfo = {
      completed: 5,
      total: 5,
      percentage: 100,
      display: '(5/5)'
    };
    const bar = renderProgressBar(progress);
    assert.strictEqual(bar, '██████████ 100% (5/5)');
  });

  test('Render 33% progress (rounding)', () => {
    const progress: ProgressInfo = {
      completed: 1,
      total: 3,
      percentage: 33,
      display: '(1/3)'
    };
    const bar = renderProgressBar(progress);
    assert.strictEqual(bar, '███░░░░░░░ 33% (1/3)');
  });

  test('Render 67% progress (rounding)', () => {
    const progress: ProgressInfo = {
      completed: 2,
      total: 3,
      percentage: 67,
      display: '(2/3)'
    };
    const bar = renderProgressBar(progress);
    assert.strictEqual(bar, '███████░░░ 67% (2/3)');
  });
});
```

## Dependencies

- **S88** (Progress Calculation Core) - provides `ProgressInfo` data structure
- `ProgressInfo` interface (PlanningTreeProvider.ts) - input data type

## Success Metrics

- `renderProgressBar()` generates correct Unicode bar strings
- All test cases pass (0%, 50%, 100%, rounding edge cases)
- Progress bars render visually in VSCode TreeView (manual verification)
- Bar length consistently 10 characters across all percentages
- Performance < 1ms per call (simple string operations)

## Notes

- This story focuses solely on rendering the progress bar string
- Integration with TreeItem.description is handled in S90
- Unicode characters may render differently in different fonts (acceptable)
- Bar length of 10 chosen for balance between detail and space efficiency
- Similar architecture to `badgeRenderer.ts` (S81) for consistency
- Progress bar will appear after status badge in TreeItem description: `"$(sync) In Progress █████░░░░░ 50% (3/6)"`
