---
spec: S95
phase: 1
title: Core Renderer Implementation
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 1: Core Renderer Implementation

## Overview

Create the `specPhaseRenderer.ts` module with a pure rendering function that converts SpecProgress data into compact visual indicators. This phase focuses on the rendering logic itself, following the established pattern from `badgeRenderer.ts` and `progressRenderer.ts`.

The renderer generates strings like:
- `"📋 ○ Phase 0/3"` (not started)
- `"📋 ↻ Phase 2/3"` (in progress)
- `"📋 ✓ Phase 3/3"` (complete)
- `"⚠️ 📋 ✓ Phase 3/3"` (complete but out of sync)

## Prerequisites

- S93 (Spec Progress Reader) completed - provides SpecProgress interface
- Understanding of badgeRenderer.ts pattern (vscode-extension/src/treeview/badgeRenderer.ts)
- Understanding of progressRenderer.ts pattern (vscode-extension/src/treeview/progressRenderer.ts)

## Tasks

### Task 1: Create specPhaseRenderer.ts Module

**File**: `vscode-extension/src/treeview/specPhaseRenderer.ts`

Create the module file with proper JSDoc documentation:

```typescript
/**
 * Spec phase indicator renderer for VSCode TreeView items.
 *
 * Provides compact visual indicators showing spec presence, phase
 * progress, and sync status. Uses Unicode icons for clear visual
 * distinction without taking excessive space.
 *
 * **Format:** `"📋 {icon} Phase {completed}/{total}"`
 * **Example:** `"📋 ↻ Phase 2/3"` for spec in progress
 *
 * **Icons:**
 * - ✓ (U+2713) Checkmark - All phases complete
 * - ↻ (U+21BB) Refresh - Spec in progress
 * - ○ (U+25CB) Circle - No phases started
 * - ⚠️ (U+26A0) Warning - Out of sync
 *
 * @module specPhaseRenderer
 * @see S95 - Spec Phase Indicator Rendering specification
 */
```

**Expected Outcome**: Module file created with proper header documentation.

**File Reference**: Similar to vscode-extension/src/treeview/badgeRenderer.ts:1-22

---

### Task 2: Define Icon Constants

Add module-level constants for Unicode icons:

```typescript
import { SpecProgress } from './specProgressReader';

/**
 * Unicode icon for spec presence.
 * 📋 Clipboard - indicates story has associated spec.
 */
export const SPEC_ICON = '📋';

/**
 * Unicode icon for completed spec.
 * ✓ Checkmark - all phases complete.
 */
export const COMPLETE_ICON = '✓';  // U+2713

/**
 * Unicode icon for spec in progress.
 * ↻ Refresh/cycle - phases actively being worked on.
 */
export const IN_PROGRESS_ICON = '↻';  // U+21BB

/**
 * Unicode icon for spec not started.
 * ○ Empty circle - no phases completed yet.
 */
export const NOT_STARTED_ICON = '○';  // U+25CB

/**
 * Unicode icon for sync warning.
 * ⚠️ Warning sign - spec/story status mismatch.
 */
export const SYNC_WARNING_ICON = '⚠️';  // U+26A0
```

**Expected Outcome**: Five icon constants exported with Unicode values and JSDoc comments.

**File Reference**: Similar to vscode-extension/src/treeview/progressRenderer.ts:47-63 (PROGRESS_BAR_LENGTH, FILLED_BLOCK, EMPTY_BLOCK constants)

---

### Task 3: Implement renderSpecPhaseIndicator() Function

Create the main rendering function with complete JSDoc:

```typescript
/**
 * Renders a compact spec phase indicator for TreeView display.
 *
 * Converts SpecProgress data into a visual string showing spec
 * presence, completion status, and phase progress. Designed to
 * fit in TreeItem.description alongside status badges and progress bars.
 *
 * **Performance:** Pure function with O(1) operations. Safe for
 * high-frequency calls during TreeView rendering (100+ items).
 *
 * **Format:** `"📋 {icon} Phase {completed}/{total}"`
 *
 * **Icon Selection:**
 * - All complete (3/3) → ✓ Checkmark
 * - In progress (2/3) → ↻ Refresh
 * - Not started (0/3) → ○ Circle
 *
 * **Sync Warning:**
 * - Prefix with ⚠️ when spec/story status mismatched
 *
 * @param progress - Spec progress data from readSpecProgress()
 * @returns Formatted indicator string, or empty string if no spec
 *
 * @example
 * const progress: SpecProgress = {
 *   completedPhases: 2,
 *   totalPhases: 3,
 *   inSync: true
 * };
 * const indicator = renderSpecPhaseIndicator(progress);
 * // Returns: "📋 ↻ Phase 2/3"
 *
 * @example
 * // Out of sync example
 * const progress: SpecProgress = {
 *   completedPhases: 3,
 *   totalPhases: 3,
 *   inSync: false
 * };
 * const indicator = renderSpecPhaseIndicator(progress);
 * // Returns: "⚠️ 📋 ✓ Phase 3/3"
 */
export function renderSpecPhaseIndicator(progress: SpecProgress | null): string {
  // No spec present
  if (!progress) {
    return '';
  }

  // Determine icon based on completion state
  let icon: string;
  if (progress.completedPhases === progress.totalPhases) {
    icon = COMPLETE_ICON;
  } else if (progress.completedPhases > 0) {
    icon = IN_PROGRESS_ICON;
  } else {
    icon = NOT_STARTED_ICON;
  }

  // Add sync warning if out of sync
  const syncWarning = progress.inSync ? '' : `${SYNC_WARNING_ICON} `;

  // Format: "{syncWarning}📋 {icon} Phase {completed}/{total}"
  return `${syncWarning}${SPEC_ICON} ${icon} Phase ${progress.completedPhases}/${progress.totalPhases}`;
}
```

**Expected Outcome**:
- Function handles null progress (returns empty string)
- Function selects correct icon based on completion state
- Function adds sync warning prefix when inSync is false
- Format matches specification exactly

**File Reference**: Similar to vscode-extension/src/treeview/progressRenderer.ts:117-128 (renderProgressBar function)

**External Documentation**:
- Unicode Character Table: https://unicode-table.com/en/
- TypeScript Pure Functions: https://www.typescriptlang.org/docs/handbook/functions.html

---

### Task 4: Create Unit Test Suite

**File**: `vscode-extension/src/test/suite/specPhaseRenderer.test.ts`

Create comprehensive unit tests following the pattern from badgeRenderer.test.ts:

```typescript
import * as assert from 'assert';
import {
  renderSpecPhaseIndicator,
  SPEC_ICON,
  COMPLETE_ICON,
  IN_PROGRESS_ICON,
  NOT_STARTED_ICON,
  SYNC_WARNING_ICON
} from '../../treeview/specPhaseRenderer';
import { SpecProgress } from '../../treeview/specProgressReader';

suite('Spec Phase Renderer Test Suite', () => {
  suite('Module Structure', () => {
    test('renderSpecPhaseIndicator function should be exported', () => {
      assert.strictEqual(typeof renderSpecPhaseIndicator, 'function',
        'renderSpecPhaseIndicator should be a function');
    });

    test('Icon constants should be exported', () => {
      assert.strictEqual(typeof SPEC_ICON, 'string', 'SPEC_ICON should be exported');
      assert.strictEqual(typeof COMPLETE_ICON, 'string', 'COMPLETE_ICON should be exported');
      assert.strictEqual(typeof IN_PROGRESS_ICON, 'string', 'IN_PROGRESS_ICON should be exported');
      assert.strictEqual(typeof NOT_STARTED_ICON, 'string', 'NOT_STARTED_ICON should be exported');
      assert.strictEqual(typeof SYNC_WARNING_ICON, 'string', 'SYNC_WARNING_ICON should be exported');
    });
  });

  suite('Null Progress Handling', () => {
    test('null progress should return empty string', () => {
      const result = renderSpecPhaseIndicator(null);
      assert.strictEqual(result, '', 'Should return empty string for null progress');
    });
  });

  suite('Phase Progress Rendering', () => {
    test('Not started (0/3) should use empty circle icon', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 0,
        totalPhases: 3,
        currentPhase: 1,
        specStatus: 'Not Started',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ○ Phase 0/3',
        'Should show clipboard, empty circle, and phase count');
    });

    test('In progress (2/3) should use refresh icon', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 2,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'In Progress',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ↻ Phase 2/3',
        'Should show clipboard, refresh icon, and phase count');
    });

    test('Complete (3/3) should use checkmark icon', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 3,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'Completed',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ✓ Phase 3/3',
        'Should show clipboard, checkmark, and phase count');
    });

    test('Single phase in progress (1/1) should use checkmark icon', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 1,
        totalPhases: 1,
        currentPhase: 1,
        specStatus: 'Completed',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ✓ Phase 1/1',
        'Single completed phase should show checkmark');
    });
  });

  suite('Sync Warning', () => {
    test('Out of sync should add warning prefix', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 3,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'Completed',
        inSync: false
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '⚠️ 📋 ✓ Phase 3/3',
        'Should prefix with warning icon when out of sync');
    });

    test('In sync should not add warning prefix', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 2,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'In Progress',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.ok(!result.includes('⚠️'),
        'Should not include warning icon when in sync');
    });
  });

  suite('Edge Cases', () => {
    test('Zero total phases (0/0) should render as-is', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 0,
        totalPhases: 0,
        currentPhase: 1,
        specStatus: 'Not Started',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ○ Phase 0/0',
        'Should display 0/0 phases as-is');
    });

    test('Completed > total (malformed) should render actual values', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 5,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'Completed',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ✓ Phase 5/3',
        'Should display malformed values as-is for debugging');
    });
  });

  suite('Icon Verification', () => {
    test('Icon constants should match Unicode values', () => {
      assert.strictEqual(SPEC_ICON, '📋', 'SPEC_ICON should be clipboard emoji');
      assert.strictEqual(COMPLETE_ICON, '✓', 'COMPLETE_ICON should be checkmark');
      assert.strictEqual(IN_PROGRESS_ICON, '↻', 'IN_PROGRESS_ICON should be refresh symbol');
      assert.strictEqual(NOT_STARTED_ICON, '○', 'NOT_STARTED_ICON should be empty circle');
      assert.strictEqual(SYNC_WARNING_ICON, '⚠️', 'SYNC_WARNING_ICON should be warning emoji');
    });
  });

  suite('Performance', () => {
    test('Should handle 100+ calls efficiently', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 2,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'In Progress',
        inSync: true
      };

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        renderSpecPhaseIndicator(progress);
      }
      const duration = Date.now() - startTime;

      assert.ok(duration < 10,
        `100 calls should complete in < 10ms (took ${duration}ms)`);
    });
  });
});
```

**Expected Outcome**:
- All tests pass
- 100% code coverage
- Performance test validates O(1) operations

**File Reference**: vscode-extension/src/test/suite/badgeRenderer.test.ts (structure and patterns)

**VSCode Testing Documentation**: https://code.visualstudio.com/api/working-with-extensions/testing-extension

---

### Task 5: Verify Module Exports

Ensure the module exports are correct and accessible:

1. Check that specPhaseRenderer.ts exports:
   - `renderSpecPhaseIndicator` function
   - All icon constants (SPEC_ICON, COMPLETE_ICON, etc.)

2. Verify imports work correctly:
   ```typescript
   import { renderSpecPhaseIndicator } from './treeview/specPhaseRenderer';
   ```

3. Run TypeScript compiler to check for type errors:
   ```bash
   cd vscode-extension && npm run compile
   ```

**Expected Outcome**:
- No TypeScript compilation errors
- All exports accessible from other modules
- Type checking passes

**Command**:
```bash
cd vscode-extension && npm run compile
```

---

### Task 6: Run Unit Tests

Execute the test suite to verify implementation:

```bash
cd vscode-extension && npm test -- --grep "Spec Phase Renderer"
```

**Expected Outcome**:
- All tests pass (100% success rate)
- No failures or errors
- Performance test confirms < 10ms for 100 calls

**Troubleshooting**:
- If tests fail, check icon constants match Unicode values exactly
- Verify SpecProgress import path is correct
- Check format string spacing matches specification

---

## Completion Criteria

**Phase 1 Complete When**:
- ✅ specPhaseRenderer.ts file created with full JSDoc documentation
- ✅ All 5 icon constants defined and exported
- ✅ renderSpecPhaseIndicator() function implemented
- ✅ Unit test suite created (specPhaseRenderer.test.ts)
- ✅ All unit tests pass (100% success rate)
- ✅ TypeScript compilation succeeds (no errors)
- ✅ Performance test validates O(1) operations (< 10ms for 100 calls)
- ✅ Code coverage 100% (all branches tested)

## Next Phase

**Phase 2**: TreeView Integration (tasks/02-treeview-integration.md)

Integrate the renderer with PlanningTreeProvider to display spec indicators in the TreeView. This involves:
- Updating getTreeItem() method to call renderer
- Adding visual validation
- Performance testing with real TreeView

**Dependency**: Phase 1 must be completed and all tests passing before starting Phase 2.
