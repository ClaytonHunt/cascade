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

import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { FrontmatterCache } from '../../cache';
import { ViewMode } from '../../types';

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
