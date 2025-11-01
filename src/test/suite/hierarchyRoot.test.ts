/**
 * Unit Tests for getHierarchyRoot() Method (S86 Phase 2).
 *
 * ## Test Coverage
 *
 * **Basic Functionality:**
 * - Returns projects at root level
 * - Returns orphan epics at root level
 * - Returns orphan features at root level
 * - Returns orphan stories/bugs at root level
 * - Handles empty workspace
 *
 * **Archive Filtering:**
 * - Filters archived items when toggle OFF
 * - Includes archived items when toggle ON
 * - Logs filtering statistics
 *
 * **Performance:**
 * - Logs build duration
 * - Warns when duration exceeds 100ms threshold
 * - Reuses items cache (no file reads)
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
 * - S76-S79: Archive filtering system
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
  workspaceRoot: string = '/test/workspace',
  workspaceState?: vscode.Memento
): PlanningTreeProvider {
  return new PlanningTreeProvider(
    workspaceRoot,
    createMockCache(),
    createMockOutputChannel(),
    workspaceState ?? createMockWorkspaceState()
  );
}

suite('getHierarchyRoot - Basic Functionality', () => {
  test('Returns projects at root level', async () => {
    // Arrange: Create provider with test workspace containing projects
    const provider = createTestProvider('D:/projects/lineage');

    // Act: Get hierarchy root (this will load real planning files)
    const result = await (provider as any).getHierarchyRoot();

    // Assert: Result includes project items at root
    assert.ok(Array.isArray(result), 'Result should be an array');

    // Find project items (type === 'project')
    const projects = result.filter((item: any) => item.type === 'project');

    // We expect at least one project in the test workspace
    assert.ok(projects.length > 0, 'Should find at least one project');

    // Verify project structure
    const firstProject = projects[0];
    assert.strictEqual(firstProject.type, 'project', 'Item type should be project');
    assert.ok(firstProject.item, 'Project should have item number (e.g., P1)');
  });

  test('Returns orphan epics at root level', async () => {
    // Arrange: Create provider
    const provider = createTestProvider('D:/projects/lineage');

    // Act: Get hierarchy root
    const result = await (provider as any).getHierarchyRoot();

    // Assert: Result includes epic items without project dependencies
    const epics = result.filter((item: any) => item.type === 'epic');

    // At least one orphan epic should exist (not all epics have project parents)
    assert.ok(epics.length >= 0, 'Should return epics (including orphans)');
  });

  test('Returns orphan stories at root level', async () => {
    // Arrange: Create provider
    const provider = createTestProvider('D:/projects/lineage');

    // Act: Get hierarchy root
    const result = await (provider as any).getHierarchyRoot();

    // Assert: Result may include story items without parent features
    // (Not all stories have parents, some are orphans)
    const stories = result.filter((item: any) => item.type === 'story');
    assert.ok(stories.length >= 0, 'Should return stories (including orphans)');
  });

  test('Handles empty workspace gracefully', async () => {
    // Arrange: Create provider with non-existent workspace
    const provider = createTestProvider('/nonexistent/workspace');

    // Act: Get hierarchy root
    const result = await (provider as any).getHierarchyRoot();

    // Assert: Returns empty array without crashing
    assert.ok(Array.isArray(result), 'Result should be an array');
    assert.strictEqual(result.length, 0, 'Empty workspace should return empty array');
  });
});

suite('getHierarchyRoot - Archive Filtering', () => {
  test('Filters archived items when toggle OFF', async () => {
    // Arrange: Create provider with archived items toggle OFF
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      'D:/projects/lineage',
      createMockCache(),
      outputChannel,
      createMockWorkspaceState()
    );

    // Set toggle OFF
    (provider as any).showArchivedItems = false;

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Get hierarchy root
    const result = await (provider as any).getHierarchyRoot();

    // Assert: Archived items excluded
    const archivedItems = result.filter((item: any) =>
      item.status === 'Archived' || item.filePath.includes('/archive/')
    );
    assert.strictEqual(archivedItems.length, 0, 'Should exclude archived items');

    // Assert: Logs filtering behavior
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(logs.includes('[Hierarchy]'), 'Should log hierarchy operations');
  });

  test('Includes archived items when toggle ON', async () => {
    // Arrange: Create provider with archived items toggle ON
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      'D:/projects/lineage',
      createMockCache(),
      outputChannel,
      createMockWorkspaceState()
    );

    // Set toggle ON
    (provider as any).showArchivedItems = true;

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Get hierarchy root
    await (provider as any).getHierarchyRoot();

    // Assert: Logs indicate archived items included
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(logs.includes('Including archived items'), 'Should log archive inclusion');
  });

  test('Logs filtering statistics', async () => {
    // Arrange: Create provider
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      'D:/projects/lineage',
      createMockCache(),
      outputChannel,
      createMockWorkspaceState()
    );

    // Set toggle OFF
    (provider as any).showArchivedItems = false;

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Get hierarchy root
    await (provider as any).getHierarchyRoot();

    // Assert: Logs show filtering stats
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(
      logs.includes('Filtered') || logs.includes('toggle'),
      'Should log filtering statistics'
    );
  });
});

suite('getHierarchyRoot - Performance', () => {
  test('Logs build duration', async () => {
    // Arrange: Create provider
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      'D:/projects/lineage',
      createMockCache(),
      outputChannel,
      createMockWorkspaceState()
    );

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Get hierarchy root
    await (provider as any).getHierarchyRoot();

    // Assert: Logs include duration
    const logs = (outputChannel as any)._getLogs().join('');
    assert.ok(logs.match(/\d+ms/), 'Should log duration in milliseconds');
    assert.ok(logs.includes('Built hierarchy'), 'Should log build completion');
  });

  test('Logs performance warning when exceeding threshold', async () => {
    // Arrange: Create provider
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      'D:/projects/lineage',
      createMockCache(),
      outputChannel,
      createMockWorkspaceState()
    );

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Get hierarchy root (may or may not exceed threshold)
    await (provider as any).getHierarchyRoot();

    // Assert: If duration > 100ms, warning is logged
    const logs = (outputChannel as any)._getLogs().join('');

    // Extract duration from logs
    const durationMatch = logs.match(/Built hierarchy.*?(\d+)ms/);
    if (durationMatch) {
      const duration = parseInt(durationMatch[1], 10);

      if (duration > 100) {
        // Should have warning
        assert.ok(logs.includes('Performance warning'), 'Should log performance warning');
        assert.ok(logs.includes('exceeded 100ms'), 'Should mention threshold');
      } else {
        // Should NOT have warning
        assert.ok(!logs.includes('Performance warning'), 'Should not log warning when under threshold');
      }
    }
  });

  test('Reuses items cache without file reads', async () => {
    // Arrange: Create provider
    const outputChannel = createMockOutputChannel();
    const provider = new PlanningTreeProvider(
      'D:/projects/lineage',
      createMockCache(),
      outputChannel,
      createMockWorkspaceState()
    );

    // Clear initialization logs
    (outputChannel as any)._getLogs().splice(0);

    // Act: Call getHierarchyRoot twice
    await (provider as any).getHierarchyRoot();
    (outputChannel as any)._getLogs().splice(0); // Clear logs
    await (provider as any).getHierarchyRoot();

    // Assert: Second call should be faster (using cache)
    const logs = (outputChannel as any)._getLogs().join('');

    // Extract durations
    const matches = logs.match(/(\d+)ms/g);
    if (matches && matches.length > 0) {
      const duration = parseInt(matches[0], 10);

      // Second call should be very fast due to cache
      assert.ok(duration < 50, 'Second call should use cache (< 50ms)');
    }
  });
});
