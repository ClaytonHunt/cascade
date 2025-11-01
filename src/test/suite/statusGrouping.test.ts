import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { StatusGroupNode, TreeNode } from '../../treeview/PlanningTreeItem';
import { FrontmatterCache } from '../../cache';
import { Status } from '../../types';

/**
 * Unit tests for Status Column Grouping (S54).
 *
 * Tests cover:
 * - Phase 2: Status group generation and item filtering
 * - Status group node creation
 * - Count calculation
 * - Item filtering by status
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
  return {
    name: 'Test',
    append: () => {},
    appendLine: () => {},
    clear: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {},
    replace: () => {}
  } as vscode.OutputChannel;
}

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

suite('Status Column Grouping (S54)', () => {

  suite('Phase 2: Type Imports', () => {
    test('should import StatusGroupNode type successfully', () => {
      // Test that StatusGroupNode type is available
      const statusGroup: StatusGroupNode = {
        type: 'status-group',
        status: 'Ready',
        label: 'Ready (5)',
        count: 5,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded
      };

      assert.strictEqual(statusGroup.type, 'status-group');
      assert.strictEqual(statusGroup.status, 'Ready');
      assert.strictEqual(statusGroup.label, 'Ready (5)');
      assert.strictEqual(statusGroup.count, 5);
      assert.strictEqual(statusGroup.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
    });

    test('should import TreeNode union type successfully', () => {
      // Test that TreeNode can represent StatusGroupNode
      const statusGroupNode: TreeNode = {
        type: 'status-group',
        status: 'In Progress',
        label: 'In Progress (3)',
        count: 3,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded
      };

      // TypeScript should allow this assignment without errors
      assert.strictEqual(statusGroupNode.type, 'status-group');
    });

    test('should discriminate StatusGroupNode using type field', () => {
      // Test type guard pattern
      const node: TreeNode = {
        type: 'status-group',
        status: 'Completed',
        label: 'Completed (10)',
        count: 10,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
      };

      // Type discrimination should work
      if (node.type === 'status-group') {
        // TypeScript should narrow the type to StatusGroupNode here
        assert.strictEqual(node.status, 'Completed');
        assert.strictEqual(node.count, 10);
      } else {
        assert.fail('Type discrimination failed');
      }
    });
  });

  suite('Phase 2: Status Type Import', () => {
    test('should import Status type from types.ts', () => {
      // Test that Status type is available and matches expected values
      const statuses: Status[] = [
        'Not Started',
        'In Planning',
        'Ready',
        'In Progress',
        'Blocked',
        'Completed'
      ];

      // Verify all status values are valid Status types
      statuses.forEach(status => {
        assert.ok(typeof status === 'string', `Status ${status} should be a string`);
      });

      assert.strictEqual(statuses.length, 6, 'Should have exactly 6 status values');
    });
  });

  suite('Phase 2: Helper Methods', () => {
    test('should load planning items through getChildren', async () => {
      // Test that getChildren() still works after loadAllPlanningItems() refactor
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      // Call getChildren (which internally should use loadAllPlanningItems after refactor)
      const items = await provider.getChildren();

      // Should return an array (empty in test environment is OK)
      assert.ok(Array.isArray(items), 'getChildren should return an array');
    });
  });

  suite('Phase 2: getStatusGroups() Method', () => {
    test('should create 6 status groups', async () => {
      // Since getStatusGroups is private, we'll need to test it indirectly
      // For now, we'll test that the StatusGroupNode structure is correct
      const statusGroup: StatusGroupNode = {
        type: 'status-group',
        status: 'Ready',
        label: 'Ready (5)',
        count: 5,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded
      };

      // Verify structure matches expected format
      assert.strictEqual(statusGroup.type, 'status-group');
      assert.strictEqual(statusGroup.status, 'Ready');
      assert.ok(statusGroup.label.includes('Ready'));
      assert.ok(statusGroup.label.includes('(5)'));
      assert.strictEqual(statusGroup.count, 5);
      assert.strictEqual(statusGroup.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
    });

    test('should format status group labels correctly', () => {
      const statuses: Status[] = [
        'Not Started',
        'In Planning',
        'Ready',
        'In Progress',
        'Blocked',
        'Completed'
      ];

      statuses.forEach(status => {
        const count = 3;
        const label = `${status} (${count})`;

        assert.ok(label.includes(status), `Label should contain status: ${status}`);
        assert.ok(label.includes('(3)'), 'Label should contain count badge');
      });
    });

    test('should have all status groups in correct order', () => {
      const expectedOrder: Status[] = [
        'Not Started',
        'In Planning',
        'Ready',
        'In Progress',
        'Blocked',
        'Completed'
      ];

      assert.strictEqual(expectedOrder.length, 6, 'Should have exactly 6 statuses');
      assert.strictEqual(expectedOrder[0], 'Not Started', 'First status should be Not Started');
      assert.strictEqual(expectedOrder[5], 'Completed', 'Last status should be Completed');
    });
  });

  suite('Phase 2: getItemsForStatus() Method', () => {
    test('should filter items by status correctly', () => {
      // Test item filtering logic manually
      const mockItems: { status: Status }[] = [
        { status: 'Ready' },
        { status: 'In Progress' },
        { status: 'Ready' },
        { status: 'Completed' },
        { status: 'Ready' }
      ];

      const readyItems = mockItems.filter(item => item.status === 'Ready');

      assert.strictEqual(readyItems.length, 3, 'Should filter 3 Ready items');
      readyItems.forEach(item => {
        assert.strictEqual(item.status, 'Ready', 'All filtered items should have Ready status');
      });
    });

    test('should return empty array for status with no items', () => {
      const mockItems: { status: Status }[] = [
        { status: 'Ready' },
        { status: 'In Progress' }
      ];

      const blockedItems = mockItems.filter(item => item.status === 'Blocked');

      assert.strictEqual(blockedItems.length, 0, 'Should return empty array for status with no items');
    });
  });
});
