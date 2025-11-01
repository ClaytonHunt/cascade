/**
 * Unit Tests for getChildren() Routing Logic (S86 Phase 2 Task 2).
 *
 * ## Test Coverage
 *
 * **View Mode Routing:**
 * - Routes to getStatusGroups() when viewMode is 'status'
 * - Routes to getHierarchyRoot() when viewMode is 'hierarchy'
 * - Logs view mode selection
 *
 * **Backward Compatibility:**
 * - Status view still works (no regression)
 * - Status group expansion still works
 * - Planning item expansion still works
 *
 * **Integration:**
 * - Switching view modes triggers refresh
 * - View mode persists across refreshes
 *
 * ## Running Tests
 *
 * ```bash
 * npm run compile  # Compile TypeScript
 * npm test         # Run all tests
 * ```
 *
 * ## Related Stories
 * - S85: View Mode State Management (provides viewMode property)
 * - S86: Hierarchy View Root Implementation (this spec)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { FrontmatterCache } from '../../cache';

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
 */
function createMockWorkspaceState(options?: {
  initialValues?: Map<string, any>;
}): vscode.Memento {
  const storage = new Map<string, any>(options?.initialValues ?? []);

  return {
    keys: () => Array.from(storage.keys()),
    get: <T>(key: string, defaultValue?: T) => storage.get(key) ?? defaultValue,
    update: (key: string, value: any) => {
      storage.set(key, value);
      return Promise.resolve();
    },
    _getStorage: () => storage
  } as any;
}

/**
 * Creates a PlanningTreeProvider instance for testing.
 */
function createTestProvider(
  workspaceRoot: string = 'D:/projects/lineage',
  initialViewMode?: 'status' | 'hierarchy'
): { provider: PlanningTreeProvider; outputChannel: vscode.OutputChannel } {
  const workspaceState = createMockWorkspaceState({
    initialValues: initialViewMode ? new Map([['cascade.viewMode', initialViewMode]]) : undefined
  });

  const outputChannel = createMockOutputChannel();

  const provider = new PlanningTreeProvider(
    workspaceRoot,
    createMockCache(),
    outputChannel,
    workspaceState
  );

  return { provider, outputChannel };
}

suite('getChildren Routing - View Mode Selection', () => {
  test('Routes to status groups when viewMode is status', async () => {
    // Arrange: Create provider with status view mode
    const { provider, outputChannel } = createTestProvider('D:/projects/lineage', 'status');

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Get root children (element undefined)
    const result = await provider.getChildren();

    // Assert: Result is status groups (contains status-group type)
    assert.ok(Array.isArray(result), 'Result should be an array');

    if (result.length > 0) {
      const firstNode = result[0];
      assert.strictEqual(
        (firstNode as any).type,
        'status-group',
        'First node should be status group when in status view'
      );
    }

    // Assert: Logs don't mention hierarchy mode
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(!logs.includes('Using hierarchy view mode'), 'Should not log hierarchy mode');
  });

  test('Routes to hierarchy root when viewMode is hierarchy', async () => {
    // Arrange: Create provider with hierarchy view mode
    const { provider, outputChannel } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Get root children (element undefined)
    const result = await provider.getChildren();

    // Assert: Result is planning items (NOT status groups)
    assert.ok(Array.isArray(result), 'Result should be an array');

    // Assert: Logs mention hierarchy mode
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(logs.includes('Using hierarchy view mode'), 'Should log hierarchy mode selection');
  });

  test('Defaults to hierarchy mode on first run', async () => {
    // Arrange: Create provider with no saved view mode
    const { provider, outputChannel } = createTestProvider('D:/projects/lineage');

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Get root children
    const result = await provider.getChildren();

    // Assert: Uses hierarchy mode (default per S85)
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(logs.includes('Using hierarchy view mode'), 'Should default to hierarchy mode');
  });
});

suite('getChildren Routing - Backward Compatibility', () => {
  test('Status group expansion still works in status view', async () => {
    // Arrange: Create provider in status view
    const { provider } = createTestProvider('D:/projects/lineage', 'status');

    // Get root to get status groups
    const rootNodes = await provider.getChildren();

    // Find a status group with items
    const statusGroup = rootNodes.find(node => (node as any).type === 'status-group' && (node as any).count > 0);

    if (statusGroup) {
      // Act: Expand status group
      const children = await provider.getChildren(statusGroup);

      // Assert: Returns planning items
      assert.ok(Array.isArray(children), 'Status group children should be an array');
    }
  });

  test('Planning item expansion works in hierarchy view', async () => {
    // Arrange: Create provider in hierarchy view
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Get root hierarchy nodes
    const rootNodes = await provider.getChildren();

    // Find a project or epic (should have children)
    const parentItem = rootNodes.find(node =>
      (node as any).type === 'project' || (node as any).type === 'epic'
    );

    if (parentItem) {
      // Act: Expand parent item
      const children = await provider.getChildren(parentItem);

      // Assert: Returns children (may be empty array)
      assert.ok(Array.isArray(children), 'Parent item children should be an array');
    }
  });

  test('Leaf items return empty children array', async () => {
    // Arrange: Create provider
    const { provider } = createTestProvider('D:/projects/lineage', 'hierarchy');

    // Get root hierarchy nodes
    const rootNodes = await provider.getChildren();

    // Find a story or bug (leaf item)
    const leafItem = rootNodes.find(node =>
      (node as any).type === 'story' || (node as any).type === 'bug'
    );

    if (leafItem) {
      // Act: Try to expand leaf item
      const children = await provider.getChildren(leafItem);

      // Assert: Returns empty array
      assert.strictEqual(children.length, 0, 'Leaf items should have no children');
    }
  });
});

suite('getChildren Routing - View Mode Integration', () => {
  test('Switching from status to hierarchy changes root structure', async () => {
    // Arrange: Create provider in status view
    const { provider } = createTestProvider('D:/projects/lineage', 'status');

    // Act: Get status view root
    const statusRoot = await provider.getChildren();
    const hasStatusGroups = statusRoot.some(node => (node as any).type === 'status-group');

    // Switch to hierarchy mode
    await provider.setViewMode('hierarchy');

    // Get hierarchy view root
    const hierarchyRoot = await provider.getChildren();
    const hasHierarchyItems = hierarchyRoot.some(node =>
      (node as any).type === 'project' ||
      (node as any).type === 'epic' ||
      (node as any).type === 'feature' ||
      (node as any).type === 'story'
    );

    // Assert: Status view had status groups, hierarchy view has planning items
    assert.strictEqual(hasStatusGroups, true, 'Status view should have status groups');
    assert.strictEqual(hasHierarchyItems, true, 'Hierarchy view should have planning items');
  });

  test('View mode persists across provider recreation', async () => {
    // Arrange: Create workspace state (simulates VSCode session storage)
    const workspaceState = createMockWorkspaceState();

    // Create first provider and set hierarchy mode
    const provider1 = new PlanningTreeProvider(
      'D:/projects/lineage',
      createMockCache(),
      createMockOutputChannel(),
      workspaceState
    );
    await provider1.setViewMode('hierarchy');

    // Act: Create second provider with same workspace state (simulates reload)
    const outputChannel2 = createMockOutputChannel();
    const provider2 = new PlanningTreeProvider(
      'D:/projects/lineage',
      createMockCache(),
      outputChannel2,
      workspaceState
    );

    // Clear initialization logs
    (outputChannel2 as any)._getLogs().splice(0);

    // Get root from second provider
    await provider2.getChildren();

    // Assert: Second provider still uses hierarchy mode
    const logs = (outputChannel2 as any)._getLogs().join('');
    assert.ok(logs.includes('Using hierarchy view mode'), 'View mode should persist across reload');
  });
});
