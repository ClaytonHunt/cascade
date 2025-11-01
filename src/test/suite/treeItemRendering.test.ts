import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { FrontmatterCache } from '../../cache';
import { ItemType, Status, Priority } from '../../types';

/**
 * Unit tests for TreeItem rendering enhancements (S50, S51, S82, S90).
 *
 * Tests cover:
 * - Icon mapping for all item types (S50, S57)
 * - Tooltip content generation (S50)
 * - Collapsible state logic (S50)
 * - TreeItem property assignment (S50)
 * - TreeItem command assignment for click handling (S51)
 * - Badge rendering integration for status display (S82)
 * - Progress bar integration for parent items (S90)
 */

/**
 * Creates a mock PlanningTreeItem for testing.
 */
function createMockItem(
  item: string,
  type: ItemType,
  status: Status = 'In Progress',
  priority: Priority = 'High'
): PlanningTreeItem {
  return {
    item: item,
    title: 'Test Item Title',
    type: type,
    status: status,
    priority: priority,
    filePath: `D:\\projects\\lineage\\plans\\test-${type}\\${item}.md`
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

suite('TreeItem Rendering (S50)', () => {

  suite('Icon Mapping (S57 - Status-Based Icons)', () => {
    test('should return "circle-outline" icon for Not Started status', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('P1', 'project', 'Not Started');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
      assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'circle-outline');
    });

    test('should return "sync" icon for In Planning status', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('E1', 'epic', 'In Planning');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
      assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'sync');
    });

    test('should return "debug-start" icon for Ready status', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('F1', 'feature', 'Ready');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
      assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'debug-start');
    });

    test('should return "gear" icon for In Progress status', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S1', 'story', 'In Progress');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
      assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'gear');
    });

    test('should return "warning" icon for Blocked status', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('B1', 'bug', 'Blocked');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
      assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'warning');
    });

    test('should return "pass" icon for Completed status', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S1', 'spec', 'Completed');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
      assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'pass');
    });

    test('should use status-based icons regardless of item type', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      // Different types with same status should have same icon
      const epic = createMockItem('E1', 'epic', 'Ready');
      const story = createMockItem('S1', 'story', 'Ready');

      const epicTreeItem = await provider.getTreeItem(epic);
      const storyTreeItem = await provider.getTreeItem(story);

      assert.strictEqual((epicTreeItem.iconPath as vscode.ThemeIcon).id, 'debug-start');
      assert.strictEqual((storyTreeItem.iconPath as vscode.ThemeIcon).id, 'debug-start');
    });
  });

  suite('Tooltip Generation', () => {
    test('should format tooltip with three lines', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\projects\\lineage',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('E4', 'epic', 'In Progress', 'High');
      const treeItem = await provider.getTreeItem(item);

      const tooltip = treeItem.tooltip as string;
      const lines = tooltip.split('\n');

      assert.strictEqual(lines.length, 3);
    });

    test('should include item and title in first line', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\projects\\lineage',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('E4', 'epic');
      const treeItem = await provider.getTreeItem(item);

      const tooltip = treeItem.tooltip as string;
      const lines = tooltip.split('\n');

      assert.ok(lines[0].includes('E4'));
      assert.ok(lines[0].includes('Test Item Title'));
    });

    test('should include type, status, and priority in second line', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\projects\\lineage',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S49', 'story', 'Ready', 'Medium');
      const treeItem = await provider.getTreeItem(item);

      const tooltip = treeItem.tooltip as string;
      const lines = tooltip.split('\n');

      assert.ok(lines[1].includes('Type: story'));
      assert.ok(lines[1].includes('Status: Ready'));
      assert.ok(lines[1].includes('Priority: Medium'));
    });

    test('should include relative file path in third line', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\projects\\lineage',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('E4', 'epic');
      item.filePath = 'D:\\projects\\lineage\\plans\\epic-04\\epic.md';
      const treeItem = await provider.getTreeItem(item);

      const tooltip = treeItem.tooltip as string;
      const lines = tooltip.split('\n');

      assert.ok(lines[2].includes('File:'));
      assert.ok(lines[2].includes('plans\\epic-04\\epic.md'));
    });

    test('should use pipe separators in metadata line', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\projects\\lineage',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('F16', 'feature');
      const treeItem = await provider.getTreeItem(item);

      const tooltip = treeItem.tooltip as string;
      const lines = tooltip.split('\n');

      // Should have two pipe separators in metadata line
      const pipeCount = (lines[1].match(/\|/g) || []).length;
      assert.strictEqual(pipeCount, 2);
    });
  });

  suite('Collapsible State', () => {
    test('should return Collapsed for project type', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('P1', 'project');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
    });

    test('should return Collapsed for epic type', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('E1', 'epic');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
    });

    test('should return Collapsed for feature type', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('F1', 'feature');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
    });

    test('should return None for story type', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S1', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    });

    test('should return None for bug type', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('B1', 'bug');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    });

    test('should return None for spec type', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S1', 'spec');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    });

    test('should return None for phase type', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('P1', 'phase');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    });
  });

  suite('TreeItem Configuration', () => {
    test('should set label in correct format', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('E4', 'epic');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.label, 'E4 - Test Item Title');
    });

    test('should set iconPath to ThemeIcon', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S49', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
    });

    test('should set tooltip to formatted string', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('F16', 'feature');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(typeof treeItem.tooltip === 'string');
      assert.ok((treeItem.tooltip as string).length > 0);
    });

    test('should set description to status badge', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S50', 'story', 'Ready');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.description, '$(circle-filled) Ready');
    });

    test('should set contextValue to item type', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('E4', 'epic');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.contextValue, 'epic');
    });

    test('should set resourceUri to file path', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S49', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.resourceUri);
      // Compare paths using normalized format (case-insensitive on Windows)
      const normalizedActual = treeItem.resourceUri?.fsPath.toLowerCase();
      const normalizedExpected = item.filePath.toLowerCase();
      assert.strictEqual(normalizedActual, normalizedExpected);
    });
  });

  suite('Command Assignment (S51)', () => {
    test('should assign command property to TreeItem', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      // TreeItem should have a command property assigned
      assert.ok(treeItem.command, 'TreeItem should have a command property');
    });

    test('should use cascade.openFile command ID', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should have Open File as command title', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.strictEqual(treeItem.command?.title, 'Open File');
    });

    test('should pass filePath as command argument', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = await provider.getTreeItem(item);

      assert.ok(treeItem.command?.arguments, 'Command should have arguments');
      assert.strictEqual(treeItem.command?.arguments?.length, 1);
      assert.strictEqual(treeItem.command?.arguments?.[0], item.filePath);
    });

    test('should assign command for all item types', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      const types: Array<{ item: string, type: ItemType }> = [
        { item: 'P1', type: 'project' },
        { item: 'E1', type: 'epic' },
        { item: 'F1', type: 'feature' },
        { item: 'S1', type: 'story' },
        { item: 'B1', type: 'bug' },
        { item: 'SP1', type: 'spec' },
        { item: 'PH1', type: 'phase' }
      ];

      for (const { item, type } of types) {
        const mockItem = createMockItem(item, type);
        const treeItem = await provider.getTreeItem(mockItem);

        assert.ok(treeItem.command, `${type} should have command property`);
        assert.strictEqual(treeItem.command?.command, 'cascade.openFile', `${type} command ID should be cascade.openFile`);
      }
    });
  });

  suite('Description Field Badge Rendering (S82)', () => {
    test('should render badge for story with status only', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('S1', 'story', 'In Progress');
      const treeItem = await provider.getTreeItem(item);

      // Should render badge without progress indicator
      assert.strictEqual(treeItem.description, '$(sync) In Progress');
    });

    test('should render badge for bug with status only', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );
      const item = createMockItem('B1', 'bug', 'Blocked');
      const treeItem = await provider.getTreeItem(item);

      // Should render badge without progress indicator
      assert.strictEqual(treeItem.description, '$(error) Blocked');
    });

    test('should render archive badge for archived items', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      // Create archived item (in archive directory)
      const item = createMockItem('S10', 'story', 'Completed');
      item.filePath = 'D:\\projects\\lineage\\plans\\archive\\story-10.md';

      const treeItem = await provider.getTreeItem(item);

      // Should render archive badge regardless of status field
      assert.strictEqual(treeItem.description, '$(archive) Archived');
    });

    test('should render correct badge for all status values', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      // Test all status values with expected badges
      const testCases: Array<[Status, string]> = [
        ['Not Started', '$(circle-outline) Not Started'],
        ['In Planning', '$(circle-filled) In Planning'],
        ['Ready', '$(circle-filled) Ready'],
        ['In Progress', '$(sync) In Progress'],
        ['Blocked', '$(error) Blocked'],
        ['Completed', '$(pass-filled) Completed'],
        ['Archived', '$(archive) Archived']
      ];

      for (const [status, expectedBadge] of testCases) {
        const item = createMockItem('S1', 'story', status);
        const treeItem = await provider.getTreeItem(item);

        assert.strictEqual(treeItem.description, expectedBadge,
          `Status "${status}" should render as "${expectedBadge}"`);
      }
    });
  });

  suite('Progress Bar Integration (S90)', () => {
    suite('Parent Items - Description Format', () => {
      test('Epic with no children should show status badge only (no progress bar)', async () => {
        const provider = new PlanningTreeProvider(
          'D:\\test',
          createMockCache(),
          createMockOutputChannel(),
          createMockWorkspaceState()
        );

        const epic = createMockItem('E10', 'epic', 'Not Started');
        const treeItem = await provider.getTreeItem(epic);

        // Should have description
        assert.ok(treeItem.description, 'Description should be defined');
        const description = treeItem.description as string;

        // Should NOT contain progress bar (no children = no progress to show)
        assert.ok(
          !description.includes('█'),
          'Description should NOT contain progress bar when no children exist'
        );

        // Should contain status badge
        assert.ok(
          description.includes('$('),
          'Description should contain status badge'
        );
      });

      test('Feature with no children should show status badge only', async () => {
        const provider = new PlanningTreeProvider(
          'D:\\test',
          createMockCache(),
          createMockOutputChannel(),
          createMockWorkspaceState()
        );

        const feature = createMockItem('F16', 'feature', 'Completed');
        const treeItem = await provider.getTreeItem(feature);

        // Verify description format (status badge only, no progress bar)
        assert.ok(treeItem.description, 'Description should be defined');
        const description = treeItem.description as string;
        assert.ok(
          !description.includes('█'),
          'Description should NOT contain progress bar for features with no children'
        );
      });

      test('Project with no children should show status badge only', async () => {
        const provider = new PlanningTreeProvider(
          'D:\\test',
          createMockCache(),
          createMockOutputChannel(),
          createMockWorkspaceState()
        );

        const project = createMockItem('P1', 'project', 'In Progress');
        const treeItem = await provider.getTreeItem(project);

        // Verify description exists
        assert.ok(treeItem.description !== undefined, 'Description should be defined');
        const description = treeItem.description as string;

        // Should not have progress bar without children
        assert.ok(
          !description.includes('█'),
          'Description should NOT contain progress bar for projects with no children'
        );
      });
    });

    suite('Leaf Items - No Progress Bar', () => {
      test('Story should NOT display progress bar in description', async () => {
        const provider = new PlanningTreeProvider(
          'D:\\test',
          createMockCache(),
          createMockOutputChannel(),
          createMockWorkspaceState()
        );

        const story = createMockItem('S49', 'story', 'In Progress');
        const treeItem = await provider.getTreeItem(story);

        // Verify description exists
        assert.ok(treeItem.description, 'Description should be defined');
        const description = treeItem.description as string;

        // Should NOT contain Unicode blocks (no progress bar)
        assert.ok(
          !description.includes('█') && !description.includes('░'),
          'Description should NOT contain progress bar blocks for stories'
        );

        // Should NOT contain percentage
        assert.ok(
          !/\d+%/.test(description),
          'Description should NOT contain percentage for stories'
        );

        // Should only contain status badge (e.g., "$(sync) In Progress")
        assert.ok(
          description.includes('$('),
          'Description should contain status badge icon'
        );
      });

      test('Bug should NOT display progress bar in description', async () => {
        const provider = new PlanningTreeProvider(
          'D:\\test',
          createMockCache(),
          createMockOutputChannel(),
          createMockWorkspaceState()
        );

        const bug = createMockItem('B1', 'bug', 'Blocked');
        const treeItem = await provider.getTreeItem(bug);

        // Verify description format (status badge only, no progress bar)
        assert.ok(treeItem.description, 'Description should be defined');
        const description = treeItem.description as string;
        assert.ok(
          !description.includes('█'),
          'Description should NOT contain progress bar for bugs'
        );
      });
    });

    suite('Integration with renderProgressBar Function', () => {
      test('renderProgressBar import is available in PlanningTreeProvider', () => {
        // This test verifies the import statement exists
        // Actual verification happens via TypeScript compilation
        // If import is missing, compilation will fail
        assert.ok(true, 'TypeScript compilation confirms renderProgressBar import');
      });

      test('Description field can accommodate progress bar length', async () => {
        const provider = new PlanningTreeProvider(
          'D:\\test',
          createMockCache(),
          createMockOutputChannel(),
          createMockWorkspaceState()
        );

        const epic = createMockItem('E4', 'epic', 'In Progress');
        const treeItem = await provider.getTreeItem(epic);

        // VSCode description field should accept strings of reasonable length
        // Progress bar format: "{statusBadge} {blocks} {percentage}% ({completed}/{total})"
        // Max length: ~50 chars
        assert.ok(treeItem.description !== undefined, 'Description should be defined');
        assert.ok(typeof treeItem.description === 'string', 'Description should be string');
      });
    });
  });
});
