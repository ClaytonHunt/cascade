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

    // Test same-status transitions (should be invalid - not a valid transition)
    test('Not Started → Not Started (invalid same-status)', () => {
      assert.strictEqual(isValidTransition('Not Started', 'Not Started'), false);
    });

    test('In Progress → In Progress (invalid same-status)', () => {
      assert.strictEqual(isValidTransition('In Progress', 'In Progress'), false);
    });

    test('Completed → Completed (invalid same-status)', () => {
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
