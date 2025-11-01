import * as assert from 'assert';
import { isItemArchived } from '../../treeview/archiveUtils';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { Status } from '../../types';

/**
 * Test suite for archive detection utility.
 *
 * Covers:
 * - Frontmatter status-based detection
 * - File path location-based detection
 * - Cross-platform path handling
 * - Edge cases and false positive prevention
 */
suite('Archive Detection Utility', () => {
  // Helper function to create mock PlanningTreeItem
  function createMockItem(status: Status, filePath: string): PlanningTreeItem {
    return {
      item: 'S999',
      title: 'Test Item',
      type: 'story',
      status: status,
      priority: 'Medium',
      filePath: filePath
    };
  }

  // ========================================
  // Frontmatter Status Detection Tests
  // ========================================

  test('returns true when status is Archived', () => {
    const item = createMockItem('Archived', '/plans/epic-05/feature.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Item with status: Archived should be detected');
  });

  test('returns true when status is Archived (regardless of path)', () => {
    const item = createMockItem('Archived', '/plans/active/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Status: Archived should work in any directory');
  });

  test('returns false when status is not Archived', () => {
    const item = createMockItem('Ready', '/plans/epic-05/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'Non-archived status should return false');
  });

  test('returns false when status is Completed (not Archived)', () => {
    const item = createMockItem('Completed', '/plans/epic-05/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'Completed is not the same as Archived');
  });

  // ========================================
  // File Path Location Detection Tests
  // ========================================

  test('returns true when path contains /archive/ directory', () => {
    const item = createMockItem('Ready', '/plans/archive/epic.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Path with /archive/ should be detected');
  });

  test('returns true for nested archive paths', () => {
    const item = createMockItem('In Progress', '/plans/archive/epic-04/feature-16/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Nested paths in archive/ should be detected');
  });

  test('returns true for archive directory with different casing', () => {
    const item = createMockItem('Ready', '/plans/Archive/epic.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Archive detection should be case-insensitive');
  });

  test('returns true for ARCHIVE (all caps)', () => {
    const item = createMockItem('Ready', '/plans/ARCHIVE/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Should handle uppercase ARCHIVE');
  });

  test('returns true for Windows path with archive directory', () => {
    const item = createMockItem('Ready', 'D:\\projects\\plans\\archive\\epic.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Should handle Windows backslash separators');
  });

  test('returns true for Windows path with mixed separators', () => {
    const item = createMockItem('Ready', 'D:\\projects\\plans\\archive/epic.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Should normalize mixed separators');
  });

  // ========================================
  // Edge Cases and False Positive Prevention
  // ========================================

  test('returns false for archive-old directory', () => {
    const item = createMockItem('Ready', '/plans/archive-old/epic.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'archive-old is not the same as archive');
  });

  test('returns false for archived-items directory', () => {
    const item = createMockItem('Ready', '/plans/archived-items/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'archived-items is not the same as archive');
  });

  test('returns false when archive appears in filename', () => {
    const item = createMockItem('Ready', '/plans/epic-05/archive-story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'archive in filename should not trigger detection');
  });

  test('returns false when archive is substring of directory name', () => {
    const item = createMockItem('Ready', '/plans/old-archive-backup/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'Substring match should not trigger detection');
  });

  test('returns false for non-archive path with Completed status', () => {
    const item = createMockItem('Completed', '/plans/epic-05/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'Completed in non-archive path is not archived');
  });

  // ========================================
  // OR Logic Verification
  // ========================================

  test('returns true when both status and path indicate archived', () => {
    const item = createMockItem('Archived', '/plans/archive/epic.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Both conditions true should return true');
  });

  test('returns true when status is Archived but path is not', () => {
    const item = createMockItem('Archived', '/plans/epic-05/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Status alone is sufficient');
  });

  test('returns true when path is archive but status is not', () => {
    const item = createMockItem('In Progress', '/plans/archive/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Path alone is sufficient');
  });

  test('returns false only when both conditions are false', () => {
    const item = createMockItem('Ready', '/plans/epic-05/story.md');
    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'Neither condition met should return false');
  });
});
