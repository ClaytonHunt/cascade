---
spec: S61
phase: 1
title: Status Transition Validation
status: Completed
priority: High
created: 2025-10-16
updated: 2025-10-16
---

# Phase 1: Status Transition Validation

## Overview

This phase creates the status transition validation module with a state machine defining valid status changes. The module provides a single function `isValidTransition(from, to)` that will be used by the drag-and-drop controller to validate status changes before file updates.

This phase establishes the business rules for workflow transitions without any file I/O dependencies.

## Prerequisites

- Understanding of Status type definition (`vscode-extension/src/types.ts:14`)
- Familiarity with TypeScript Record types
- Access to frontmatter schema documentation (`docs/frontmatter-schema.md`)

## Tasks

### Task 1: Create statusTransitions.ts Module

**Objective:** Create a new module for status transition validation with proper TypeScript structure.

**File:** `vscode-extension/src/statusTransitions.ts`

**Implementation:**

```typescript
import { Status } from './types';

/**
 * Status transition state machine.
 *
 * Defines valid transitions between lifecycle states for planning items.
 * Each status maps to an array of allowed next statuses.
 *
 * ## Workflow Rules
 *
 * **Not Started → In Planning:**
 * - User starts planning/breaking down work item
 *
 * **In Planning → Ready:**
 * - Planning complete, item ready for implementation
 *
 * **In Planning → Not Started:**
 * - Rollback if planning abandoned
 *
 * **Ready → In Progress:**
 * - Implementation started
 *
 * **Ready → In Planning:**
 * - Needs more planning/clarification
 *
 * **In Progress → Completed:**
 * - Work finished and verified
 *
 * **In Progress → Blocked:**
 * - Cannot proceed due to blocker
 *
 * **In Progress → Ready:**
 * - Rollback if implementation paused
 *
 * **Blocked → Ready:**
 * - Blocker resolved, ready to resume
 *
 * **Blocked → In Progress:**
 * - Blocker resolved, actively working
 *
 * **Completed → In Progress:**
 * - Reopen for additional work or bug fix
 *
 * ## Invalid Transitions (Examples)
 *
 * - Not Started → In Progress (must plan first)
 * - Not Started → Completed (cannot skip workflow)
 * - Ready → Completed (must implement first)
 * - Completed → Ready (use Completed → In Progress)
 *
 * @see docs/frontmatter-schema.md for status definitions
 */
const validTransitions: Record<Status, Status[]> = {
  'Not Started': ['In Planning'],
  'In Planning': ['Ready', 'Not Started'],
  'Ready': ['In Progress', 'In Planning'],
  'In Progress': ['Completed', 'Blocked', 'Ready'],
  'Blocked': ['Ready', 'In Progress'],
  'Completed': ['In Progress']
};

/**
 * Validates if a status transition is allowed by workflow rules.
 *
 * Uses state machine to check if target status is in the list of valid
 * next statuses for the source status.
 *
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is valid, false otherwise
 *
 * @example
 * ```typescript
 * // Valid transitions
 * isValidTransition('Ready', 'In Progress');  // true
 * isValidTransition('In Progress', 'Completed');  // true
 *
 * // Invalid transitions
 * isValidTransition('Not Started', 'Completed');  // false
 * isValidTransition('Ready', 'Blocked');  // false
 * ```
 */
export function isValidTransition(from: Status, to: Status): boolean {
  // Get list of valid next statuses for source status
  const allowedNextStatuses = validTransitions[from];

  // Transition is valid if target status is in allowed list
  return allowedNextStatuses?.includes(to) ?? false;
}

/**
 * Gets list of valid next statuses for a given status.
 *
 * Useful for UI hints (e.g., which status groups accept drops).
 *
 * @param status - Current status
 * @returns Array of valid next statuses
 *
 * @example
 * ```typescript
 * getValidNextStatuses('Ready');
 * // Returns: ['In Progress', 'In Planning']
 * ```
 */
export function getValidNextStatuses(status: Status): Status[] {
  return validTransitions[status] ?? [];
}
```

**Validation:**
- File created at `vscode-extension/src/statusTransitions.ts`
- TypeScript compiles without errors
- Functions exported correctly
- State machine includes all 6 statuses

**References:**
- Status type: `vscode-extension/src/types.ts:14`
- Frontmatter schema: `docs/frontmatter-schema.md`

---

### Task 2: Add Comprehensive Unit Tests

**Objective:** Create unit tests verifying all valid and invalid transitions.

**File:** `vscode-extension/src/test/suite/statusTransitions.test.ts`

**Implementation:**

```typescript
import * as assert from 'assert';
import { isValidTransition, getValidNextStatuses } from '../../statusTransitions';
import { Status } from '../../types';

suite('Status Transitions', () => {
  suite('isValidTransition()', () => {
    // Test valid transitions from "Not Started"
    test('Not Started → In Planning (valid)', () => {
      assert.strictEqual(isValidTransition('Not Started', 'In Planning'), true);
    });

    test('Not Started → Ready (invalid)', () => {
      assert.strictEqual(isValidTransition('Not Started', 'Ready'), false);
    });

    test('Not Started → In Progress (invalid)', () => {
      assert.strictEqual(isValidTransition('Not Started', 'In Progress'), false);
    });

    test('Not Started → Completed (invalid)', () => {
      assert.strictEqual(isValidTransition('Not Started', 'Completed'), false);
    });

    test('Not Started → Blocked (invalid)', () => {
      assert.strictEqual(isValidTransition('Not Started', 'Blocked'), false);
    });

    // Test valid transitions from "In Planning"
    test('In Planning → Ready (valid)', () => {
      assert.strictEqual(isValidTransition('In Planning', 'Ready'), true);
    });

    test('In Planning → Not Started (valid)', () => {
      assert.strictEqual(isValidTransition('In Planning', 'Not Started'), true);
    });

    test('In Planning → In Progress (invalid)', () => {
      assert.strictEqual(isValidTransition('In Planning', 'In Progress'), false);
    });

    test('In Planning → Completed (invalid)', () => {
      assert.strictEqual(isValidTransition('In Planning', 'Completed'), false);
    });

    // Test valid transitions from "Ready"
    test('Ready → In Progress (valid)', () => {
      assert.strictEqual(isValidTransition('Ready', 'In Progress'), true);
    });

    test('Ready → In Planning (valid)', () => {
      assert.strictEqual(isValidTransition('Ready', 'In Planning'), true);
    });

    test('Ready → Completed (invalid)', () => {
      assert.strictEqual(isValidTransition('Ready', 'Completed'), false);
    });

    test('Ready → Blocked (invalid)', () => {
      assert.strictEqual(isValidTransition('Ready', 'Blocked'), false);
    });

    // Test valid transitions from "In Progress"
    test('In Progress → Completed (valid)', () => {
      assert.strictEqual(isValidTransition('In Progress', 'Completed'), true);
    });

    test('In Progress → Blocked (valid)', () => {
      assert.strictEqual(isValidTransition('In Progress', 'Blocked'), true);
    });

    test('In Progress → Ready (valid)', () => {
      assert.strictEqual(isValidTransition('In Progress', 'Ready'), true);
    });

    test('In Progress → Not Started (invalid)', () => {
      assert.strictEqual(isValidTransition('In Progress', 'Not Started'), false);
    });

    test('In Progress → In Planning (invalid)', () => {
      assert.strictEqual(isValidTransition('In Progress', 'In Planning'), false);
    });

    // Test valid transitions from "Blocked"
    test('Blocked → Ready (valid)', () => {
      assert.strictEqual(isValidTransition('Blocked', 'Ready'), true);
    });

    test('Blocked → In Progress (valid)', () => {
      assert.strictEqual(isValidTransition('Blocked', 'In Progress'), true);
    });

    test('Blocked → Completed (invalid)', () => {
      assert.strictEqual(isValidTransition('Blocked', 'Completed'), false);
    });

    test('Blocked → Not Started (invalid)', () => {
      assert.strictEqual(isValidTransition('Blocked', 'Not Started'), false);
    });

    // Test valid transitions from "Completed"
    test('Completed → In Progress (valid)', () => {
      assert.strictEqual(isValidTransition('Completed', 'In Progress'), true);
    });

    test('Completed → Ready (invalid)', () => {
      assert.strictEqual(isValidTransition('Completed', 'Ready'), false);
    });

    test('Completed → Not Started (invalid)', () => {
      assert.strictEqual(isValidTransition('Completed', 'Not Started'), false);
    });

    test('Completed → Blocked (invalid)', () => {
      assert.strictEqual(isValidTransition('Completed', 'Blocked'), false);
    });

    // Test same-status transitions (should be valid - no-op update)
    test('Not Started → Not Started (valid same-status)', () => {
      assert.strictEqual(isValidTransition('Not Started', 'Not Started'), false);
    });

    test('In Progress → In Progress (valid same-status)', () => {
      assert.strictEqual(isValidTransition('In Progress', 'In Progress'), false);
    });

    test('Completed → Completed (valid same-status)', () => {
      assert.strictEqual(isValidTransition('Completed', 'Completed'), false);
    });
  });

  suite('getValidNextStatuses()', () => {
    test('Not Started has 1 valid next status', () => {
      const nextStatuses = getValidNextStatuses('Not Started');
      assert.strictEqual(nextStatuses.length, 1);
      assert.deepStrictEqual(nextStatuses, ['In Planning']);
    });

    test('In Planning has 2 valid next statuses', () => {
      const nextStatuses = getValidNextStatuses('In Planning');
      assert.strictEqual(nextStatuses.length, 2);
      assert.ok(nextStatuses.includes('Ready'));
      assert.ok(nextStatuses.includes('Not Started'));
    });

    test('Ready has 2 valid next statuses', () => {
      const nextStatuses = getValidNextStatuses('Ready');
      assert.strictEqual(nextStatuses.length, 2);
      assert.ok(nextStatuses.includes('In Progress'));
      assert.ok(nextStatuses.includes('In Planning'));
    });

    test('In Progress has 3 valid next statuses', () => {
      const nextStatuses = getValidNextStatuses('In Progress');
      assert.strictEqual(nextStatuses.length, 3);
      assert.ok(nextStatuses.includes('Completed'));
      assert.ok(nextStatuses.includes('Blocked'));
      assert.ok(nextStatuses.includes('Ready'));
    });

    test('Blocked has 2 valid next statuses', () => {
      const nextStatuses = getValidNextStatuses('Blocked');
      assert.strictEqual(nextStatuses.length, 2);
      assert.ok(nextStatuses.includes('Ready'));
      assert.ok(nextStatuses.includes('In Progress'));
    });

    test('Completed has 1 valid next status', () => {
      const nextStatuses = getValidNextStatuses('Completed');
      assert.strictEqual(nextStatuses.length, 1);
      assert.deepStrictEqual(nextStatuses, ['In Progress']);
    });
  });
});
```

**Validation:**
- All tests pass when run with VSCode test runner
- 36 test cases covering all transition combinations
- Same-status transitions tested (should return false - not valid transition)
- `getValidNextStatuses()` verified for all statuses

**Testing:**
Run tests with: `npm test` or via VSCode Test Explorer

**References:**
- Test suite pattern: `vscode-extension/src/test/suite/statusIcons.test.ts`
- Assert API: [Node.js assert](https://nodejs.org/api/assert.html)

---

### Task 3: Document Transition Rules

**Objective:** Add comprehensive documentation explaining workflow philosophy.

**File:** Update `statusTransitions.ts` with additional documentation

**Add to top of file:**

```typescript
/**
 * Status Transition Validation Module
 *
 * Implements a state machine for planning item workflow transitions.
 * Used by drag-and-drop controller (S60/S61) to validate status changes.
 *
 * ## Workflow Philosophy
 *
 * The status lifecycle follows a structured planning and execution flow:
 *
 * 1. **Not Started** - Initial state for new work items
 * 2. **In Planning** - Active planning/specification phase
 * 3. **Ready** - Planned and ready for implementation
 * 4. **In Progress** - Actively being implemented
 * 5. **Completed** - Finished and verified
 * 6. **Blocked** - Cannot proceed (waiting on dependency/decision)
 *
 * The state machine enforces logical progression through these phases while
 * allowing necessary rollbacks (e.g., Ready → In Planning for clarification).
 *
 * ## Design Principles
 *
 * - **No Skipping Phases**: Cannot jump from "Not Started" to "In Progress"
 * - **Rollback Support**: Can return to previous states when needed
 * - **Blocker Flexibility**: Can enter "Blocked" from "In Progress" only
 * - **Reopen Support**: Can reopen "Completed" items to "In Progress"
 *
 * ## Integration
 *
 * Used by:
 * - S61: Drag-and-drop status updates
 * - Future: Bulk status update tools
 * - Future: CLI status management
 *
 * @module statusTransitions
 * @see vscode-extension/src/treeview/PlanningDragAndDropController.ts
 */
```

**Validation:**
- Documentation is clear and comprehensive
- Examples illustrate valid and invalid transitions
- Workflow philosophy is explained
- Module docstring added

---

## Completion Criteria

- [ ] `statusTransitions.ts` created with state machine
- [ ] `isValidTransition()` function implemented
- [ ] `getValidNextStatuses()` helper function implemented
- [ ] Unit test file created with 36+ test cases
- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] Module documentation complete
- [ ] State machine covers all 6 statuses
- [ ] Same-status transitions handled (return false)

## Next Phase

Proceed to **Phase 2: File Update Function** to implement frontmatter file updates using the validation logic from Phase 1.
