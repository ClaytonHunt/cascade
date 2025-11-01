import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { FrontmatterCache } from '../../cache';
import { ItemType, Status, Priority } from '../../types';

/**
 * Unit tests for file opening functionality (S51).
 *
 * Tests cover:
 * - TreeItem command property assignment (Phase 3)
 * - Command structure validation
 * - Command arguments validation
 * - Error handling (manual testing only)
 *
 * Note: Command registration (Phase 2) cannot be unit tested without
 * extension activation. Verified via manual testing and output channel logging.
 *
 * Note: openPlanningFile function (Phase 1) cannot be unit tested because
 * it's not exported. Behavior verified via integration testing (manual clicks).
 */

/**
 * Creates a mock PlanningTreeItem for testing.
 */
function createMockItem(
  item: string,
  type: ItemType,
  status: Status = 'In Progress',
  priority: Priority = 'High',
  filePath: string = 'D:\\projects\\lineage\\plans\\test-item.md'
): PlanningTreeItem {
  return {
    item: item,
    title: 'Test Item Title',
    type: type,
    status: status,
    priority: priority,
    filePath: filePath
  };
}

/**
 * Creates a mock FrontmatterCache for testing.
 */
function createMockCache(): FrontmatterCache {
  // Return mock cache with minimal implementation
  // PlanningTreeProvider constructor requires cache, but helper methods don't use it
  return new FrontmatterCache(100);
}

/**
 * Creates a mock output channel for testing.
 */
function createMockOutputChannel(): vscode.OutputChannel {
  // Return mock output channel with minimal implementation
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

/**
 * Creates a mock PlanningTreeProvider for testing.
 */
function createMockProvider(): PlanningTreeProvider {
  return new PlanningTreeProvider(
    'D:\\test',
    createMockCache(),
    createMockOutputChannel(),
    createMockWorkspaceState()
  );
}

suite('File Opening (S51)', () => {

  suite('Command Property Assignment', () => {
    test('should assign command property to TreeItem', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command, 'TreeItem should have command property');
    });

    test('should use correct command ID', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(
        treeItem.command?.command,
        'cascade.openFile',
        'Command ID should be "cascade.openFile"'
      );
    });

    test('should set command title', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(
        treeItem.command?.title,
        'Open File',
        'Command title should be "Open File"'
      );
    });

    test('should pass filePath as command argument', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const testPath = 'D:\\projects\\lineage\\plans\\epic-04\\story-51.md';
      const item = createMockItem('S51', 'story', 'Ready', 'High', testPath);
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command?.arguments, 'Command should have arguments');
      assert.strictEqual(
        treeItem.command?.arguments.length,
        1,
        'Command should have exactly one argument'
      );
      assert.strictEqual(
        treeItem.command?.arguments[0],
        testPath,
        'Command argument should be the file path'
      );
    });
  });

  suite('Command Assignment for All Item Types', () => {
    test('should assign command to project items', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('P1', 'project');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to epic items', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('E4', 'epic');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to feature items', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('F16', 'feature');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to story items', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to bug items', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('B1', 'bug');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to spec items', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S27', 'spec');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to phase items', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('P1', 'phase');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });
  });

  suite('Existing Properties Preservation', () => {
    test('should preserve icon property (status-based, S57)', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      // Item with 'In Progress' status should get gear icon (S57)
      const item = createMockItem('S51', 'story', 'In Progress');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
      assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'gear');
    });

    test('should preserve tooltip property', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(typeof treeItem.tooltip === 'string');
      assert.ok((treeItem.tooltip as string).length > 0);
    });

    test('should preserve description property with badge rendering', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story', 'Ready');
      const treeItem = await provider.getTreeItem(item);

      // Description now includes badge rendering (S82)
      assert.strictEqual(treeItem.description, '$(circle-filled) Ready');
    });

    test('should preserve contextValue property', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.contextValue, 'story');
    });

    test('should preserve resourceUri property', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.resourceUri);
    });
  });
});
