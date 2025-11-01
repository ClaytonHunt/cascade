---
spec: S89
phase: 1
title: Core Implementation
status: Completed
priority: High
created: 2025-10-25
updated: 2025-10-25
---

# Phase 1: Core Implementation

## Overview

Create the `progressRenderer.ts` module with the `renderProgressBar()` function, Unicode character constants, and proper TypeScript type exports. This phase establishes the core rendering logic following the proven pattern from `badgeRenderer.ts`.

## Prerequisites

- S88 (Progress Calculation Core) completed ✅
- `ProgressInfo` interface exists in `PlanningTreeProvider.ts` (lines 18-30)
- `badgeRenderer.ts` module exists as reference pattern

## Tasks

### Task 1: Export ProgressInfo Interface

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

Make the `ProgressInfo` interface accessible to the renderer module.

**Action:**
Add `export` keyword to the interface declaration (line 18):

```typescript
/**
 * Progress information for a parent item (Epic or Feature).
 *
 * Captures completion statistics and formatted display string
 * for showing progress in TreeView.
 */
export interface ProgressInfo {
  /** Number of completed children */
  completed: number;

  /** Total number of children */
  total: number;

  /** Completion percentage (0-100, rounded) */
  percentage: number;

  /** Formatted display string for TreeItem description */
  display: string;  // e.g., "(3/5)" or "(60%)"
}
```

**Expected Outcome:**
- `ProgressInfo` can be imported from `PlanningTreeProvider.ts`
- No TypeScript compilation errors
- Existing code using `ProgressInfo` continues to work

**Validation:**
```bash
cd vscode-extension
npm run compile
```
Should complete without errors.

---

### Task 2: Create progressRenderer.ts Module

**File:** `vscode-extension/src/treeview/progressRenderer.ts` (NEW)

Create the new module file with module-level JSDoc comment.

**Action:**
Create file with header documentation:

```typescript
/**
 * Progress bar renderer utility for VSCode TreeView items.
 *
 * Provides Unicode-based progress bar generation for displaying
 * completion status of parent items (Epics, Features, Projects).
 *
 * The renderer uses Unicode box-drawing characters (filled/empty blocks)
 * to create visual progress bars that work in monospace fonts and
 * VSCode TreeView descriptions.
 *
 * **Format:** `"{filled}{empty} {percentage}% ({completed}/{total})"`
 * **Example:** `"█████░░░░░ 50% (3/6)"` for 50% completion
 *
 * **Bar Characteristics:**
 * - Fixed length: 10 characters
 * - Filled segment: U+2588 Full Block (█)
 * - Empty segment: U+2591 Light Shade (░)
 * - Scaling: Math.round((percentage / 100) * 10)
 *
 * Usage:
 * ```typescript
 * import { renderProgressBar } from './progressRenderer';
 * import { ProgressInfo } from './PlanningTreeProvider';
 *
 * const progress: ProgressInfo = {
 *   completed: 3,
 *   total: 6,
 *   percentage: 50,
 *   display: '(3/6)'
 * };
 *
 * const bar = renderProgressBar(progress);
 * // Returns: "█████░░░░░ 50% (3/6)"
 *
 * treeItem.description = `${statusBadge} ${bar}`;
 * // TreeItem displays: "$(sync) In Progress █████░░░░░ 50% (3/6)"
 * ```
 *
 * @module progressRenderer
 * @see S89 - Progress Bar Rendering specification
 * @see PlanningTreeProvider.ts - Consumer of this module (S90)
 * @see badgeRenderer.ts - Similar rendering utility pattern
 */

import { ProgressInfo } from './PlanningTreeProvider';
```

**Expected Outcome:**
- New file created with comprehensive module documentation
- Import statement added for `ProgressInfo`
- No compilation errors

**Reference:**
- Module pattern: `vscode-extension/src/treeview/badgeRenderer.ts:1-23`

---

### Task 3: Add Unicode Character Constants

**File:** `vscode-extension/src/treeview/progressRenderer.ts`

Export constants for the Unicode characters and bar length.

**Action:**
Add constant declarations after imports:

```typescript
/**
 * Length of the progress bar in characters.
 * Fixed at 10 for balance between detail and space efficiency.
 */
export const PROGRESS_BAR_LENGTH = 10;

/**
 * Unicode character for filled progress segments.
 * U+2588 Full Block - solid black square.
 */
export const FILLED_BLOCK = '█';  // U+2588

/**
 * Unicode character for empty progress segments.
 * U+2591 Light Shade - dotted pattern for clear distinction.
 */
export const EMPTY_BLOCK = '░';  // U+2591
```

**Expected Outcome:**
- Three exported constants available for use
- JSDoc comments explain purpose and Unicode values
- Constants can be imported by tests and other modules

**Validation:**
Constants should be exportable and testable:
```typescript
import { PROGRESS_BAR_LENGTH, FILLED_BLOCK, EMPTY_BLOCK } from './progressRenderer';
```

**Reference:**
- Similar pattern: `vscode-extension/src/treeview/badgeRenderer.ts:30-38` (STATUS_BADGES constant)

---

### Task 4: Implement renderProgressBar() Function

**File:** `vscode-extension/src/treeview/progressRenderer.ts`

Create the core rendering function with comprehensive JSDoc.

**Action:**
Add function implementation:

```typescript
/**
 * Renders a visual progress bar using Unicode block characters.
 *
 * Converts progress statistics into a fixed-length Unicode bar string
 * with filled/empty segments, percentage, and completion counts.
 *
 * **Performance:** Pure function with O(1) string operations. Safe for
 * high-frequency calls during TreeView rendering (100+ items).
 *
 * **Bar Format:** `"{filled}{empty} {percentage}% ({completed}/{total})"`
 *
 * **Scaling Algorithm:**
 * - `filledCount = Math.round((percentage / 100) * PROGRESS_BAR_LENGTH)`
 * - `emptyCount = PROGRESS_BAR_LENGTH - filledCount`
 *
 * This ensures consistent rounding:
 * - 33% (1/3) → 3 filled blocks (rounds down from 3.3)
 * - 67% (2/3) → 7 filled blocks (rounds up from 6.7)
 *
 * **Examples:**
 * - 0%: `"░░░░░░░░░░ 0% (0/5)"`
 * - 10%: `"█░░░░░░░░░ 10% (1/10)"`
 * - 50%: `"█████░░░░░ 50% (3/6)"`
 * - 100%: `"██████████ 100% (5/5)"`
 *
 * @param progress - Progress information from calculateProgress()
 * @returns Formatted progress bar string with Unicode blocks
 *
 * @example
 * const progress: ProgressInfo = {
 *   completed: 3,
 *   total: 6,
 *   percentage: 50,
 *   display: '(3/6)'
 * };
 * const bar = renderProgressBar(progress);
 * // Returns: "█████░░░░░ 50% (3/6)"
 *
 * @example
 * const progress: ProgressInfo = {
 *   completed: 1,
 *   total: 3,
 *   percentage: 33,
 *   display: '(1/3)'
 * };
 * const bar = renderProgressBar(progress);
 * // Returns: "███░░░░░░░ 33% (1/3)" (rounding: 3.3 → 3)
 *
 * @see https://unicode-table.com/en/2588/ - U+2588 Full Block
 * @see https://unicode-table.com/en/2591/ - U+2591 Light Shade
 * @see calculateProgress() in PlanningTreeProvider.ts - Progress data source
 */
export function renderProgressBar(progress: ProgressInfo): string {
  // Calculate number of filled and empty blocks based on percentage
  const filledCount = Math.round((progress.percentage / 100) * PROGRESS_BAR_LENGTH);
  const emptyCount = PROGRESS_BAR_LENGTH - filledCount;

  // Generate filled and empty segments
  const filled = FILLED_BLOCK.repeat(filledCount);
  const empty = EMPTY_BLOCK.repeat(emptyCount);

  // Format: "{blocks} {percentage}% ({completed}/{total})"
  return `${filled}${empty} ${progress.percentage}% (${progress.completed}/${progress.total})`;
}
```

**Expected Outcome:**
- `renderProgressBar()` function exported and callable
- Comprehensive JSDoc with examples and algorithm explanation
- Function returns correctly formatted strings

**Algorithm Details:**
1. **Calculate filled count:** `Math.round((percentage / 100) * 10)`
   - 0% → 0 filled blocks
   - 50% → 5 filled blocks
   - 33% → 3 filled blocks (3.3 rounds to 3)
   - 67% → 7 filled blocks (6.7 rounds to 7)
2. **Calculate empty count:** `10 - filledCount`
3. **Generate segments:** `String.repeat()` for both filled and empty
4. **Format output:** Template literal with spaces and parentheses

**Validation:**
Test manually in Node.js REPL:
```javascript
const progress = { completed: 3, total: 6, percentage: 50, display: '(3/6)' };
renderProgressBar(progress);
// Expected: "█████░░░░░ 50% (3/6)"
```

**Reference:**
- Function pattern: `vscode-extension/src/treeview/badgeRenderer.ts:76-78` (renderStatusBadge)
- JSDoc examples: `vscode-extension/src/treeview/badgeRenderer.ts:41-75`

---

### Task 5: Compile and Verify Module

**File:** `vscode-extension/`

Compile TypeScript and verify no errors.

**Action:**
Run TypeScript compilation:

```bash
cd vscode-extension
npm run compile
```

**Expected Outcome:**
- Compilation succeeds with 0 errors
- No type errors for `ProgressInfo` import
- Module exports are valid
- Generated JavaScript in `out/treeview/progressRenderer.js`

**Troubleshooting:**
- If `ProgressInfo` import fails → Verify Task 1 exported the interface
- If Unicode characters cause errors → Ensure UTF-8 encoding in `progressRenderer.ts`
- If `String.repeat()` errors → Check TypeScript lib targets (ES2015+ required)

---

## Completion Criteria

- ✅ `ProgressInfo` interface exported from `PlanningTreeProvider.ts`
- ✅ `progressRenderer.ts` file created with module documentation
- ✅ Constants exported: `PROGRESS_BAR_LENGTH`, `FILLED_BLOCK`, `EMPTY_BLOCK`
- ✅ `renderProgressBar()` function implemented with JSDoc
- ✅ TypeScript compilation passes (0 errors)
- ✅ Module structure matches `badgeRenderer.ts` pattern
- ✅ All exports are correctly typed

**Manual Verification:**
You can test the function directly in the TypeScript playground or Node.js:
```typescript
import { renderProgressBar } from './treeview/progressRenderer';
import { ProgressInfo } from './treeview/PlanningTreeProvider';

// Test 50%
const test1: ProgressInfo = {
  completed: 3,
  total: 6,
  percentage: 50,
  display: '(3/6)'
};
console.log(renderProgressBar(test1));
// Expected: "█████░░░░░ 50% (3/6)"

// Test 33% (rounding)
const test2: ProgressInfo = {
  completed: 1,
  total: 3,
  percentage: 33,
  display: '(1/3)'
};
console.log(renderProgressBar(test2));
// Expected: "███░░░░░░░ 33% (1/3)"
```

## Next Phase

Proceed to **Phase 2: Test Suite** to create comprehensive test coverage for the renderer.
