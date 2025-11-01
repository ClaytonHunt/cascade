import * as assert from 'assert';
import { isItemArchived } from '../../treeview/archiveUtils';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';

/**
 * Unit tests for Archive Detection (S76, S78, S80).
 *
 * Tests cover:
 * - Archive detection by frontmatter status
 * - Archive detection by directory path
 * - Path normalization (Windows/Unix separators)
 * - Case-insensitive matching
 */

suite('Archive Detection (S76, S78, S80)', () => {

  suite('isItemArchived() - Status Detection', () => {
    test('should detect item with status: Archived', () => {
      const item: PlanningTreeItem = {
        item: 'S1',
        title: 'Test Story',
        type: 'story',
        status: 'Archived',
        priority: 'Medium',
        filePath: '/plans/epic-01/story-01.md'
      };

      assert.strictEqual(isItemArchived(item), true, 'Item with status: Archived should be detected as archived');
    });

    test('should not detect item with non-archived status', () => {
      const item: PlanningTreeItem = {
        item: 'S2',
        title: 'Active Story',
        type: 'story',
        status: 'In Progress',
        priority: 'High',
        filePath: '/plans/epic-01/story-02.md'
      };

      assert.strictEqual(isItemArchived(item), false, 'Item with status: In Progress should not be detected as archived');
    });
  });

  suite('isItemArchived() - Directory Detection', () => {
    test('should detect item in /archive/ directory', () => {
      const item: PlanningTreeItem = {
        item: 'S43',
        title: 'File Type Detection',
        type: 'story',
        status: 'Not Started',
        priority: 'High',
        filePath: '/plans/archive/epic-03-vscode-planning-extension-archived-20251013/feature-12-plans-visualization/story-43-file-type-detection.md'
      };

      assert.strictEqual(isItemArchived(item), true, 'Item in /archive/ directory should be detected as archived');
    });

    test('should detect item in /archive/ with Windows path separators', () => {
      const item: PlanningTreeItem = {
        item: 'S43',
        title: 'File Type Detection',
        type: 'story',
        status: 'Ready',
        priority: 'High',
        filePath: 'D:\\projects\\plans\\archive\\epic-03\\story-43.md'
      };

      assert.strictEqual(isItemArchived(item), true, 'Item in archive directory with Windows separators should be detected as archived');
    });

    test('should detect item with mixed path separators', () => {
      const item: PlanningTreeItem = {
        item: 'S44',
        title: 'Mixed Separators',
        type: 'story',
        status: 'In Progress',
        priority: 'Medium',
        filePath: 'D:/projects\\plans/archive\\epic-03/story-44.md'
      };

      assert.strictEqual(isItemArchived(item), true, 'Item with mixed path separators in archive directory should be detected as archived');
    });

    test('should detect item with case-insensitive archive directory', () => {
      const item: PlanningTreeItem = {
        item: 'S45',
        title: 'Case Test',
        type: 'story',
        status: 'Ready',
        priority: 'Low',
        filePath: '/plans/Archive/epic-03/story-45.md'
      };

      assert.strictEqual(isItemArchived(item), true, 'Archive directory detection should be case-insensitive');
    });

    test('should not detect false positive: archive-old directory', () => {
      const item: PlanningTreeItem = {
        item: 'S46',
        title: 'False Positive Test 1',
        type: 'story',
        status: 'Ready',
        priority: 'Medium',
        filePath: '/plans/archive-old/epic-03/story-46.md'
      };

      assert.strictEqual(isItemArchived(item), false, 'Item in archive-old directory should NOT be detected as archived');
    });

    test('should not detect false positive: archived-items directory', () => {
      const item: PlanningTreeItem = {
        item: 'S47',
        title: 'False Positive Test 2',
        type: 'story',
        status: 'Ready',
        priority: 'Medium',
        filePath: '/plans/archived-items/epic-03/story-47.md'
      };

      assert.strictEqual(isItemArchived(item), false, 'Item in archived-items directory should NOT be detected as archived');
    });

    test('should not detect false positive: archive in filename', () => {
      const item: PlanningTreeItem = {
        item: 'S48',
        title: 'Archive Filename Test',
        type: 'story',
        status: 'Ready',
        priority: 'Medium',
        filePath: '/plans/epic-05/archive-story.md'
      };

      assert.strictEqual(isItemArchived(item), false, 'Item with archive in filename should NOT be detected as archived');
    });

    test('should not detect active item in normal directory', () => {
      const item: PlanningTreeItem = {
        item: 'S49',
        title: 'Active Story',
        type: 'story',
        status: 'In Progress',
        priority: 'High',
        filePath: '/plans/epic-04/feature-16/story-49.md'
      };

      assert.strictEqual(isItemArchived(item), false, 'Active item in normal directory should not be detected as archived');
    });
  });

  suite('isItemArchived() - Combined Conditions', () => {
    test('should detect item with both conditions met', () => {
      const item: PlanningTreeItem = {
        item: 'E3',
        title: 'Archived Epic',
        type: 'epic',
        status: 'Archived',
        priority: 'Low',
        filePath: '/plans/archive/epic-03-vscode-planning-extension-archived-20251013/epic.md'
      };

      assert.strictEqual(isItemArchived(item), true, 'Item with both status:Archived AND archive directory should be detected as archived');
    });

    test('should detect item with status:Archived even if not in archive directory', () => {
      const item: PlanningTreeItem = {
        item: 'S50',
        title: 'Archived by Status',
        type: 'story',
        status: 'Archived',
        priority: 'Low',
        filePath: '/plans/epic-05/story-50.md'
      };

      assert.strictEqual(isItemArchived(item), true, 'Item with status:Archived in normal directory should be detected as archived');
    });

    test('should detect item in archive directory even with non-archived status', () => {
      const item: PlanningTreeItem = {
        item: 'S51',
        title: 'Archived by Directory',
        type: 'story',
        status: 'Ready',
        priority: 'Medium',
        filePath: '/plans/archive/epic-03/story-51.md'
      };

      assert.strictEqual(isItemArchived(item), true, 'Item in archive directory with non-archived status should be detected as archived');
    });
  });

  suite('isItemArchived() - Real-world Cases', () => {
    test('should handle S43 (from bug report)', () => {
      // This is the exact case from the bug report:
      // S43 is in plans/archive/ with status: Not Started
      const item: PlanningTreeItem = {
        item: 'S43',
        title: 'File Type Detection',
        type: 'story',
        status: 'Not Started',
        priority: 'High',
        filePath: 'D:\\projects\\lineage\\plans\\archive\\epic-03-vscode-planning-extension-archived-20251013\\feature-12-plans-visualization\\story-43-file-type-detection.md'
      };

      assert.strictEqual(isItemArchived(item), true, 'S43 should be detected as archived (bug report case)');
    });
  });
});
