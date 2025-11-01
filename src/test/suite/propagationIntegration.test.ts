import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { HierarchyNode } from '../../treeview/HierarchyNode';
import { FrontmatterCache } from '../../cache';

/**
 * Creates a mock workspace state (Memento) for testing.
 */
function createMockWorkspaceState(): vscode.Memento {
  const storage = new Map<string, any>();
  return {
    keys: () => Array.from(storage.keys()),
    get: <T>(key: string, defaultValue?: T) => storage.get(key) ?? defaultValue,
    update: (key: string, value: any) => {
      storage.set(key, value);
      return Promise.resolve();
    }
  };
}

suite('Propagation Integration Tests', () => {
  let cache: FrontmatterCache;
  let outputChannel: vscode.OutputChannel;
  let workspaceState: vscode.Memento;

  setup(() => {
    cache = new FrontmatterCache(100);
    outputChannel = vscode.window.createOutputChannel('Test');
    workspaceState = createMockWorkspaceState();
  });

  teardown(() => {
    cache.clear();
    outputChannel.dispose();
  });

  test('PlanningTreeProvider has propagation engine', () => {
    // Create provider
    const provider = new PlanningTreeProvider('D:/test/workspace', cache, outputChannel, workspaceState);

    // Access private field via type assertion for testing
    const engine = (provider as any).propagationEngine;

    // Verify engine exists
    assert.ok(engine, 'Propagation engine should be instantiated');
    assert.strictEqual(typeof engine, 'object', 'Propagation engine should be an object');
  });

  test('StatusPropagationEngine has propagateStatuses method', () => {
    // Create provider
    const provider = new PlanningTreeProvider('D:/test/workspace', cache, outputChannel, workspaceState);

    // Access private engine
    const engine = (provider as any).propagationEngine;

    // Verify propagateStatuses method exists
    assert.strictEqual(typeof engine.propagateStatuses, 'function', 'propagateStatuses should be a function');
  });

  test('propagateStatuses method can be called with items and hierarchy', async () => {
    // Create provider
    const provider = new PlanningTreeProvider('D:/test/workspace', cache, outputChannel, workspaceState);

    // Create mock items and hierarchy
    const items: PlanningTreeItem[] = [];
    const hierarchy: HierarchyNode[] = [];

    // Access private engine
    const engine = (provider as any).propagationEngine;

    // Call propagateStatuses - should not throw
    await assert.doesNotReject(
      async () => await engine.propagateStatuses(items, hierarchy),
      'propagateStatuses should not throw with empty data'
    );
  });

  test('PlanningTreeProvider.refresh() is async', () => {
    // Create provider
    const provider = new PlanningTreeProvider('D:/test/workspace', cache, outputChannel, workspaceState);

    // Call refresh() and verify it returns a Promise
    const result = (provider as any).refresh();

    assert.ok(result instanceof Promise, 'refresh() should return a Promise');
  });

  test('Integration: Complete all stories → Feature becomes completed', () => {
    // Setup: Create hierarchy with feature and 3 completed stories
    const story1: PlanningTreeItem = {
      item: 'S1', title: 'Story 1', type: 'story', status: 'Completed',
      priority: 'High', filePath: '/test/s1.md'
    };
    const story2: PlanningTreeItem = {
      item: 'S2', title: 'Story 2', type: 'story', status: 'Completed',
      priority: 'High', filePath: '/test/s2.md'
    };
    const story3: PlanningTreeItem = {
      item: 'S3', title: 'Story 3', type: 'story', status: 'Completed',
      priority: 'High', filePath: '/test/s3.md'
    };

    const feature: PlanningTreeItem = {
      item: 'F1', title: 'Feature 1', type: 'feature', status: 'In Progress',
      priority: 'High', filePath: '/test/f1.md'
    };

    const storyNodes: HierarchyNode[] = [
      { item: story1, children: [], parent: null },
      { item: story2, children: [], parent: null },
      { item: story3, children: [], parent: null }
    ];

    const featureNode: HierarchyNode = {
      item: feature,
      children: storyNodes,
      parent: null
    };

    // Update parent references
    storyNodes.forEach(n => n.parent = featureNode);

    // Create provider and access private engine
    const provider = new PlanningTreeProvider('D:/test/workspace', cache, outputChannel, workspaceState);
    const engine = (provider as any).propagationEngine;

    // Test: Call determineParentStatus to verify logic
    const newStatus = (engine as any).determineParentStatus(featureNode);

    assert.strictEqual(newStatus, 'Completed', 'Feature should become Completed when all stories completed');
  });

  test('Integration: Start one story → Feature becomes in progress', () => {
    // Setup: Create feature with one in-progress story and one not started
    const story1: PlanningTreeItem = {
      item: 'S1', title: 'Story 1', type: 'story', status: 'In Progress',
      priority: 'High', filePath: '/test/s1.md'
    };
    const story2: PlanningTreeItem = {
      item: 'S2', title: 'Story 2', type: 'story', status: 'Not Started',
      priority: 'High', filePath: '/test/s2.md'
    };

    const feature: PlanningTreeItem = {
      item: 'F1', title: 'Feature 1', type: 'feature', status: 'Not Started',
      priority: 'High', filePath: '/test/f1.md'
    };

    const featureNode: HierarchyNode = {
      item: feature,
      children: [
        { item: story1, children: [], parent: null },
        { item: story2, children: [], parent: null }
      ],
      parent: null
    };

    // Create provider and access private engine
    const provider = new PlanningTreeProvider('D:/test/workspace', cache, outputChannel, workspaceState);
    const engine = (provider as any).propagationEngine;

    // Test: Call determineParentStatus to verify logic
    const newStatus = (engine as any).determineParentStatus(featureNode);

    assert.strictEqual(newStatus, 'In Progress', 'Feature should become In Progress when any child in progress');
  });
});
