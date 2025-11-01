---
spec: S85
phase: 3
title: Testing
status: Completed
priority: High
created: 2025-10-24
updated: 2025-10-24
---

# Phase 3: Testing

## Overview

This phase adds comprehensive unit and integration tests for view mode state management. We'll test initialization behavior, getter/setter methods, validation logic, workspace state persistence, and edge cases. The test suite ensures S85 is production-ready and provides regression protection for future changes.

Tests follow existing patterns from `vscode-extension/src/test/suite/*.test.ts` (e.g., statusGrouping.test.ts, archiveUtils.test.ts).

## Prerequisites

- Phase 1 and Phase 2 completed (full implementation exists)
- Understanding of TypeScript unit testing with assert module
- Familiarity with VSCode testing patterns (mock helpers)
- Test runner configured (npm test)

## Tasks

### Task 1: Create Test File and Mock Helpers

**Location:** `vscode-extension/src/test/suite/viewMode.test.ts` (new file)

**Action:** Create test file with mock helper functions

**Code to Add:**

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { FrontmatterCache } from '../../cache';
import { ViewMode } from '../../types';

/**
 * Unit tests for View Mode State Management (S85).
 *
 * Tests cover:
 * - Phase 1: Type definitions, property, getter method
 * - Phase 2: Workspace state integration, setter method, validation
 * - Edge cases: Invalid values, persistence failures, concurrent updates
 */

/**
 * Creates a mock FrontmatterCache for testing.
 */
function createMockCache(): FrontmatterCache {
  return new FrontmatterCache(100);
}

/**
 * Creates a mock output channel for testing.
 */
function createMockOutputChannel(): vscode.OutputChannel {
  const logs: string[] = [];
  return {
    name: 'Test',
    append: (value: string) => logs.push(value),
    appendLine: (value: string) => logs.push(value + '\n'),
    clear: () => logs.splice(0, logs.length),
    show: () => {},
    hide: () => {},
    dispose: () => {},
    replace: () => {},
    // Expose logs for test assertions (non-standard property)
    _getLogs: () => logs
  } as any;
}

/**
 * Creates a mock workspace state (Memento) for testing.
 *
 * Supports get/update operations with in-memory storage.
 * Optionally simulates persistence failures for error testing.
 */
function createMockWorkspaceState(options?: {
  initialValues?: Map<string, any>;
  failUpdate?: boolean;
}): vscode.Memento {
  const storage = new Map<string, any>(options?.initialValues ?? []);
  const failUpdate = options?.failUpdate ?? false;

  return {
    keys: () => Array.from(storage.keys()),
    get: <T>(key: string, defaultValue?: T) => storage.get(key) ?? defaultValue,
    update: (key: string, value: any) => {
      if (failUpdate) {
        return Promise.reject(new Error('Simulated persistence failure'));
      }
      storage.set(key, value);
      return Promise.resolve();
    },
    // Expose storage for test assertions (non-standard property)
    _getStorage: () => storage
  } as any;
}

/**
 * Creates a PlanningTreeProvider instance for testing.
 *
 * @param workspaceState - Optional mock workspace state (defaults to empty)
 * @returns Tree provider instance with mocked dependencies
 */
function createTestProvider(
  workspaceState?: vscode.Memento
): PlanningTreeProvider {
  return new PlanningTreeProvider(
    '/test/workspace',
    createMockCache(),
    createMockOutputChannel(),
    workspaceState ?? createMockWorkspaceState()
  );
}
```

**Rationale:**
- Mock helpers isolate tests from external dependencies
- Follows existing pattern from statusGrouping.test.ts
- `_getLogs()` and `_getStorage()` enable test assertions
- Configurable mock workspace state supports multiple test scenarios

**Validation:**
- TypeScript accepts mock function signatures
- Mock helpers compile without errors

**File Reference:** vscode-extension/src/test/suite/statusGrouping.test.ts:21-51 (reference pattern)

---

### Task 2: Unit Tests - Initialization

**Location:** `vscode-extension/src/test/suite/viewMode.test.ts`

**Action:** Add test suite for constructor initialization behavior

**Code to Add:**

```typescript
suite('View Mode State Management - Initialization', () => {
  test('Defaults to hierarchy when no workspace state exists', () => {
    // Arrange: Empty workspace state (first run)
    const workspaceState = createMockWorkspaceState();
    const provider = createTestProvider(workspaceState);

    // Act: Get view mode
    const mode = provider.getViewMode();

    // Assert: Defaults to 'hierarchy'
    assert.strictEqual(mode, 'hierarchy');
  });

  test('Loads saved view mode from workspace state', () => {
    // Arrange: Workspace state with saved 'status' mode
    const initialValues = new Map([['cascade.viewMode', 'status' as ViewMode]]);
    const workspaceState = createMockWorkspaceState({ initialValues });
    const provider = createTestProvider(workspaceState);

    // Act: Get view mode
    const mode = provider.getViewMode();

    // Assert: Loads saved value
    assert.strictEqual(mode, 'status');
  });

  test('Resets invalid stored value to hierarchy', () => {
    // Arrange: Workspace state with invalid value
    const initialValues = new Map([['cascade.viewMode', 'invalid-mode']]);
    const workspaceState = createMockWorkspaceState({ initialValues });
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      '/test/workspace',
      createMockCache(),
      outputChannel,
      workspaceState
    );

    // Act: Get view mode
    const mode = provider.getViewMode();

    // Assert: Resets to 'hierarchy'
    assert.strictEqual(mode, 'hierarchy');

    // Assert: Logs warning
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(logs.includes('Invalid stored value'));
  });

  test('Persists corrected value after resetting invalid value', async () => {
    // Arrange: Workspace state with invalid value
    const initialValues = new Map([['cascade.viewMode', 'invalid-mode']]);
    const workspaceState = createMockWorkspaceState({ initialValues });
    new PlanningTreeProvider(
      '/test/workspace',
      createMockCache(),
      createMockOutputChannel(),
      workspaceState
    );

    // Act: Check workspace state after construction
    const storage = (workspaceState as any)._getStorage() as Map<string, any>;

    // Assert: Invalid value replaced with 'hierarchy'
    assert.strictEqual(storage.get('cascade.viewMode'), 'hierarchy');
  });
});
```

**Rationale:**
- Tests all initialization paths (first run, saved state, invalid state)
- Verifies defensive validation behavior
- Confirms automatic correction of corrupted state
- Checks logging for debugging visibility

**Validation:**
- All tests pass
- Coverage includes happy path and error cases

---

### Task 3: Unit Tests - Getter and Setter Methods

**Location:** `vscode-extension/src/test/suite/viewMode.test.ts`

**Action:** Add test suite for getViewMode() and setViewMode() methods

**Code to Add:**

```typescript
suite('View Mode State Management - Getter/Setter', () => {
  test('getViewMode returns current mode', () => {
    // Arrange: Provider with status mode
    const initialValues = new Map([['cascade.viewMode', 'status' as ViewMode]]);
    const workspaceState = createMockWorkspaceState({ initialValues });
    const provider = createTestProvider(workspaceState);

    // Act & Assert: Getter returns correct value
    assert.strictEqual(provider.getViewMode(), 'status');
  });

  test('setViewMode updates internal state', async () => {
    // Arrange: Provider with hierarchy mode
    const provider = createTestProvider();

    // Act: Change mode to status
    await provider.setViewMode('status');

    // Assert: Internal state updated
    assert.strictEqual(provider.getViewMode(), 'status');
  });

  test('setViewMode persists to workspace state', async () => {
    // Arrange: Provider with empty workspace state
    const workspaceState = createMockWorkspaceState();
    const provider = new PlanningTreeProvider(
      '/test/workspace',
      createMockCache(),
      createMockOutputChannel(),
      workspaceState
    );

    // Act: Change mode to status
    await provider.setViewMode('status');

    // Assert: Workspace state updated
    const storage = (workspaceState as any)._getStorage() as Map<string, any>;
    assert.strictEqual(storage.get('cascade.viewMode'), 'status');
  });

  test('setViewMode ignores invalid mode values', async () => {
    // Arrange: Provider with hierarchy mode
    const provider = createTestProvider();

    // Act: Try to set invalid mode
    await provider.setViewMode('invalid-mode' as any);

    // Assert: Mode unchanged
    assert.strictEqual(provider.getViewMode(), 'hierarchy');
  });

  test('setViewMode skips update when mode unchanged', async () => {
    // Arrange: Provider with hierarchy mode
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      '/test/workspace',
      createMockCache(),
      outputChannel,
      createMockWorkspaceState()
    );

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Set mode to same value
    await provider.setViewMode('hierarchy');

    // Assert: Logs indicate no change
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(logs.includes('already set to'));
    assert.ok(!logs.includes('Switched'));
  });

  test('setViewMode logs state transition', async () => {
    // Arrange: Provider with hierarchy mode
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      '/test/workspace',
      createMockCache(),
      outputChannel,
      createMockWorkspaceState()
    );

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Change mode to status
    await provider.setViewMode('status');

    // Assert: Logs show transition
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(logs.includes('hierarchy → status'));
  });
});
```

**Rationale:**
- Tests getter returns correct value
- Tests setter updates state and persists
- Tests validation rejects invalid values
- Tests optimization skips unnecessary updates
- Tests logging for debugging

**Validation:**
- All tests pass
- Coverage includes validation and optimization paths

---

### Task 4: Integration Tests - Persistence

**Location:** `vscode-extension/src/test/suite/viewMode.test.ts`

**Action:** Add integration test suite for workspace state persistence across TreeView recreation

**Code to Add:**

```typescript
suite('View Mode State Management - Persistence', () => {
  test('View mode persists across TreeView recreation', async () => {
    // Arrange: Create workspace state (simulates VSCode session storage)
    const workspaceState = createMockWorkspaceState();

    // Act: Create first provider and change mode
    const provider1 = new PlanningTreeProvider(
      '/test/workspace',
      createMockCache(),
      createMockOutputChannel(),
      workspaceState
    );
    await provider1.setViewMode('status');

    // Simulate extension reload - create new provider with same workspace state
    const provider2 = new PlanningTreeProvider(
      '/test/workspace',
      createMockCache(),
      createMockOutputChannel(),
      workspaceState
    );

    // Assert: Second provider loads saved mode
    assert.strictEqual(provider2.getViewMode(), 'status');
  });

  test('Handles persistence failure gracefully', async () => {
    // Arrange: Workspace state that fails on update
    const workspaceState = createMockWorkspaceState({ failUpdate: true });
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      '/test/workspace',
      createMockCache(),
      outputChannel,
      workspaceState
    );

    // Act: Try to change mode (persistence will fail)
    await provider.setViewMode('status');

    // Assert: Internal state still updated (graceful degradation)
    assert.strictEqual(provider.getViewMode(), 'status');

    // Assert: Logs error but doesn't throw
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(logs.includes('Failed to persist'));
  });
});
```

**Rationale:**
- Integration test verifies persistence across provider recreations
- Tests graceful degradation when persistence fails
- Simulates real-world VSCode session lifecycle

**Validation:**
- Integration tests pass
- Persistence failure doesn't crash extension

---

### Task 5: Edge Case Tests

**Location:** `vscode-extension/src/test/suite/viewMode.test.ts`

**Action:** Add test suite for edge cases and boundary conditions

**Code to Add:**

```typescript
suite('View Mode State Management - Edge Cases', () => {
  test('Multiple setViewMode calls in sequence', async () => {
    // Arrange: Provider with hierarchy mode
    const provider = createTestProvider();

    // Act: Multiple rapid mode changes
    await provider.setViewMode('status');
    await provider.setViewMode('hierarchy');
    await provider.setViewMode('status');

    // Assert: Final state is correct
    assert.strictEqual(provider.getViewMode(), 'status');
  });

  test('Type safety - ViewMode type enforced', () => {
    // Arrange: Provider with hierarchy mode
    const provider = createTestProvider();

    // Act & Assert: TypeScript should prevent invalid values at compile time
    // This test verifies that the ViewMode type is correctly used
    const mode: ViewMode = provider.getViewMode();
    assert.ok(mode === 'status' || mode === 'hierarchy');
  });

  test('Concurrent setViewMode calls resolve correctly', async () => {
    // Arrange: Provider with hierarchy mode
    const workspaceState = createMockWorkspaceState();
    const provider = new PlanningTreeProvider(
      '/test/workspace',
      createMockCache(),
      createMockOutputChannel(),
      workspaceState
    );

    // Act: Concurrent calls (Promise.all)
    await Promise.all([
      provider.setViewMode('status'),
      provider.setViewMode('hierarchy'),
      provider.setViewMode('status')
    ]);

    // Assert: One of the modes is set (last one to complete wins)
    const finalMode = provider.getViewMode();
    assert.ok(finalMode === 'status' || finalMode === 'hierarchy');

    // Assert: Workspace state is consistent
    const storage = (workspaceState as any)._getStorage() as Map<string, any>;
    assert.strictEqual(storage.get('cascade.viewMode'), finalMode);
  });
});
```

**Rationale:**
- Tests sequential mode changes (common user pattern)
- Tests concurrent updates (race condition edge case)
- Verifies type safety at runtime
- Ensures state consistency under stress

**Validation:**
- Edge case tests pass
- No race conditions or state corruption

---

### Task 6: Run Full Test Suite

**Location:** Command line (vscode-extension/ directory)

**Action:** Run full test suite and verify all tests pass

**Commands:**

```bash
# Compile TypeScript
npm run compile

# Run tests
npm test
```

**Expected Output:**

```
View Mode State Management - Initialization
  ✓ Defaults to hierarchy when no workspace state exists
  ✓ Loads saved view mode from workspace state
  ✓ Resets invalid stored value to hierarchy
  ✓ Persists corrected value after resetting invalid value

View Mode State Management - Getter/Setter
  ✓ getViewMode returns current mode
  ✓ setViewMode updates internal state
  ✓ setViewMode persists to workspace state
  ✓ setViewMode ignores invalid mode values
  ✓ setViewMode skips update when mode unchanged
  ✓ setViewMode logs state transition

View Mode State Management - Persistence
  ✓ View mode persists across TreeView recreation
  ✓ Handles persistence failure gracefully

View Mode State Management - Edge Cases
  ✓ Multiple setViewMode calls in sequence
  ✓ Type safety - ViewMode type enforced
  ✓ Concurrent setViewMode calls resolve correctly

15 passing (XXXms)
```

**Validation:**
- All 15 tests pass
- No compilation errors
- Test execution time reasonable (< 5s)

**Troubleshooting:**

If tests fail:
1. Check TypeScript compilation errors first (`npm run compile`)
2. Review test output for assertion failures
3. Add `console.log()` statements in tests for debugging
4. Verify mock helpers match implementation signatures
5. Check workspace state mock implements all required methods

---

### Task 7: Update Test Documentation

**Location:** `vscode-extension/src/test/suite/viewMode.test.ts`

**Action:** Add comprehensive file-level JSDoc comment at top of test file

**Code to Add:**

```typescript
/**
 * Unit and Integration Tests for View Mode State Management (S85).
 *
 * ## Test Coverage
 *
 * **Initialization:**
 * - Default to 'hierarchy' on first run
 * - Load saved mode from workspace state
 * - Validate and reset invalid stored values
 * - Persist corrected values
 *
 * **Getter/Setter:**
 * - getViewMode() returns current mode
 * - setViewMode() updates state and persists
 * - Validation rejects invalid modes
 * - Optimization skips no-change updates
 * - Logging for debugging
 *
 * **Persistence:**
 * - State persists across TreeView recreation
 * - Graceful degradation on persistence failures
 *
 * **Edge Cases:**
 * - Sequential mode changes
 * - Concurrent updates (race conditions)
 * - Type safety validation
 *
 * ## Running Tests
 *
 * ```bash
 * npm run compile  # Compile TypeScript
 * npm test         # Run all tests
 * ```
 *
 * ## Related Stories
 * - S85: View Mode State Management (this spec)
 * - S86: Hierarchy Display Logic (consumes getViewMode)
 * - S87: Toggle Command (calls setViewMode)
 */
```

**Rationale:**
- Documents test coverage for future developers
- Provides quick reference for running tests
- Links to related stories for context

**Validation:**
- JSDoc comment appears at top of file
- Formatting is clear and readable

---

## Completion Criteria

- ✅ Test file created (viewMode.test.ts)
- ✅ Mock helpers implemented (cache, output channel, workspace state)
- ✅ Initialization tests written and passing (4 tests)
- ✅ Getter/setter tests written and passing (6 tests)
- ✅ Persistence integration tests written and passing (2 tests)
- ✅ Edge case tests written and passing (3 tests)
- ✅ Full test suite runs successfully (15 tests total)
- ✅ Test documentation added
- ✅ No compilation errors
- ✅ All tests pass consistently

## Final Verification

**Manual Testing (End-to-End):**

1. **Package and Install Extension:**
   ```bash
   cd vscode-extension
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

2. **Reload VSCode:**
   - Ctrl+Shift+P → "Developer: Reload Window"

3. **Verify Default Initialization:**
   - Open output channel → Cascade
   - Check log: `[ViewMode] Initialized to: hierarchy`

4. **Test State Change (via Developer Console):**
   - Ctrl+Shift+P → "Developer: Toggle Developer Tools"
   - Console: `vscode.extensions.getExtension('cascade').exports.treeProvider.setViewMode('status')`
   - Check logs:
     - `[ViewMode] Persisted to workspace state: status`
     - `[ViewMode] Switched: hierarchy → status`

5. **Verify Persistence:**
   - Reload VSCode window
   - Open output channel → Cascade
   - Check log: `[ViewMode] Initialized to: status`

6. **Test Invalid Input:**
   - Console: `vscode.extensions.getExtension('cascade').exports.treeProvider.setViewMode('invalid')`
   - Check log: `[ViewMode] ⚠️  Invalid mode: invalid, ignoring setViewMode() call`

**Expected Results:**
- ✅ All automated tests pass (15/15)
- ✅ Manual testing confirms expected behavior
- ✅ Output channel logs are comprehensive and helpful
- ✅ No errors in VSCode Developer Console
- ✅ State persists across reloads

## Story Completion

Once Phase 3 is complete:
1. Update S85 frontmatter status from "Ready" to "Completed"
2. Verify S86 and S87 are unblocked (no dependencies remaining)
3. Report completion to user with test results summary

**Next Stories in F28:**
- **S86**: Hierarchy Display Logic (implement mode-specific getChildren logic)
- **S87**: Toggle Command and Toolbar Button (UI for mode switching)
