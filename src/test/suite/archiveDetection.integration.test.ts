import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { isItemArchived } from '../../treeview/archiveUtils';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';

/**
 * Integration tests for archive detection with real filesystem operations.
 *
 * These tests:
 * - Create real files in plans/archive/ directory
 * - Verify detection works with absolute paths
 * - Test cross-platform path resolution
 * - Clean up test files after execution
 */
suite('Archive Detection - Integration Tests', () => {
  // Test file paths
  const workspaceRoot = path.join(__dirname, '../../../../'); // Navigate to project root
  const plansDir = path.join(workspaceRoot, 'plans');
  const archiveDir = path.join(plansDir, 'archive');
  const testArchiveFile = path.join(archiveDir, 'test-integration-archived.md');
  const testActiveFile = path.join(plansDir, 'test-integration-active.md');

  // Cleanup helper
  function cleanupTestFiles() {
    if (fs.existsSync(testArchiveFile)) {
      fs.unlinkSync(testArchiveFile);
    }
    if (fs.existsSync(testActiveFile)) {
      fs.unlinkSync(testActiveFile);
    }
  }

  // Run cleanup before and after tests
  setup(() => {
    cleanupTestFiles();
  });

  teardown(() => {
    cleanupTestFiles();
  });

  test('detects real file in plans/archive/ directory', () => {
    // Ensure archive directory exists
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Create test file
    const frontmatter = `---
item: S999
title: Integration Test Archived Item
type: story
status: Ready
priority: Medium
created: 2025-10-23
updated: 2025-10-23
---

# S999 - Integration Test Archived Item
This file is used for integration testing archive detection.
`;
    fs.writeFileSync(testArchiveFile, frontmatter, 'utf8');

    // Create mock item with real absolute path
    const item: PlanningTreeItem = {
      item: 'S999',
      title: 'Integration Test Archived Item',
      type: 'story',
      status: 'Ready', // Not Archived status - testing path-based detection
      priority: 'Medium',
      filePath: testArchiveFile // Absolute path
    };

    // Test detection
    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Real file in archive/ should be detected as archived');

    // Cleanup happens in teardown()
  });

  test('does not detect real file outside archive directory', () => {
    // Create test file in plans/ root
    const frontmatter = `---
item: S998
title: Integration Test Active Item
type: story
status: Ready
priority: Medium
created: 2025-10-23
updated: 2025-10-23
---

# S998 - Integration Test Active Item
This file is used for integration testing archive detection.
`;
    fs.writeFileSync(testActiveFile, frontmatter, 'utf8');

    // Create mock item with real absolute path
    const item: PlanningTreeItem = {
      item: 'S998',
      title: 'Integration Test Active Item',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: testActiveFile // Absolute path NOT in archive/
    };

    // Test detection
    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'File outside archive/ should NOT be detected as archived');

    // Cleanup happens in teardown()
  });

  test('detects file in nested archive directory structure', () => {
    // Create nested directory: plans/archive/epic-04-test/feature-16-test/
    const nestedArchiveDir = path.join(archiveDir, 'epic-04-test', 'feature-16-test');
    if (!fs.existsSync(nestedArchiveDir)) {
      fs.mkdirSync(nestedArchiveDir, { recursive: true });
    }

    const nestedArchiveFile = path.join(nestedArchiveDir, 'story-nested.md');

    const frontmatter = `---
item: S997
title: Nested Archive Test
type: story
status: In Progress
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# S997 - Nested Archive Test
`;
    fs.writeFileSync(nestedArchiveFile, frontmatter, 'utf8');

    const item: PlanningTreeItem = {
      item: 'S997',
      title: 'Nested Archive Test',
      type: 'story',
      status: 'In Progress',
      priority: 'High',
      filePath: nestedArchiveFile
    };

    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'File in nested archive directory should be detected');

    // Cleanup
    fs.unlinkSync(nestedArchiveFile);
    fs.rmdirSync(nestedArchiveDir);
    fs.rmdirSync(path.join(archiveDir, 'epic-04-test'));
  });

  test('performance: handles 1000 items in < 10ms', () => {
    // Generate 1000 mock items (mix of archived and non-archived)
    const items: PlanningTreeItem[] = [];
    for (let i = 0; i < 1000; i++) {
      const isArchived = i % 3 === 0; // Every 3rd item archived
      items.push({
        item: `S${i}`,
        title: `Test Item ${i}`,
        type: 'story',
        status: isArchived ? 'Archived' : 'Ready',
        priority: 'Medium',
        filePath: isArchived
          ? `/plans/archive/epic-${Math.floor(i / 10)}/story-${i}.md`
          : `/plans/epic-${Math.floor(i / 10)}/story-${i}.md`
      });
    }

    // Benchmark execution
    const startTime = performance.now();

    let archivedCount = 0;
    for (const item of items) {
      if (isItemArchived(item)) {
        archivedCount++;
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / items.length;

    // Assertions
    // Every 3rd item is archived: i % 3 === 0 (items 0, 3, 6, ..., 999)
    // Count: 0 to 999 → 1000 items, divisible by 3: 0, 3, 6, ..., 999 → 334 items
    assert.strictEqual(archivedCount, 334, 'Should detect 334 archived items (every 3rd from 0-999)');
    assert.ok(totalTime < 10, `Total time ${totalTime.toFixed(2)}ms should be < 10ms`);
    assert.ok(avgTime < 0.01, `Average time ${avgTime.toFixed(4)}ms should be < 0.01ms per item`);

    console.log(`[Performance] Processed 1000 items in ${totalTime.toFixed(2)}ms (avg ${avgTime.toFixed(4)}ms per item)`);
  });

  test('performance: handles 100 items in < 1ms', () => {
    // Generate 100 mock items
    const items: PlanningTreeItem[] = [];
    for (let i = 0; i < 100; i++) {
      items.push({
        item: `S${i}`,
        title: `Test Item ${i}`,
        type: 'story',
        status: 'Ready',
        priority: 'Medium',
        filePath: `/plans/epic-05/story-${i}.md`
      });
    }

    const startTime = performance.now();
    items.forEach(item => isItemArchived(item));
    const totalTime = performance.now() - startTime;

    assert.ok(totalTime < 1, `Processing 100 items should take < 1ms (took ${totalTime.toFixed(2)}ms)`);

    console.log(`[Performance] Processed 100 items in ${totalTime.toFixed(2)}ms`);
  });

  test('cross-platform: handles Windows absolute paths', () => {
    const item: PlanningTreeItem = {
      item: 'S996',
      title: 'Windows Path Test',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: 'D:\\projects\\lineage\\plans\\archive\\epic.md'
    };

    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Windows absolute path should be detected');
  });

  test('cross-platform: handles Unix absolute paths', () => {
    const item: PlanningTreeItem = {
      item: 'S995',
      title: 'Unix Path Test',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: '/home/user/projects/plans/archive/epic.md'
    };

    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Unix absolute path should be detected');
  });

  test('cross-platform: handles mixed separators', () => {
    const item: PlanningTreeItem = {
      item: 'S994',
      title: 'Mixed Path Test',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: 'D:\\projects\\plans\\archive/epic-05/story.md' // Backslash then forward slash
    };

    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Mixed separators should be normalized and detected');
  });

  test('cross-platform: case-insensitive Archive directory', () => {
    const testCases = [
      'D:\\plans\\Archive\\epic.md',
      'D:\\plans\\ARCHIVE\\epic.md',
      '/plans/ArChIvE/epic.md',
      'C:\\PLANS\\archive\\epic.md'
    ];

    testCases.forEach(filePath => {
      const item: PlanningTreeItem = {
        item: 'S993',
        title: 'Case Test',
        type: 'story',
        status: 'Ready',
        priority: 'Medium',
        filePath: filePath
      };

      const result = isItemArchived(item);
      assert.strictEqual(result, true, `Path ${filePath} should be detected (case-insensitive)`);
    });
  });

  test('edge case: relative path with archive directory', () => {
    const item: PlanningTreeItem = {
      item: 'S992',
      title: 'Relative Path Test',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: './plans/archive/epic.md'
    };

    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Relative path should still detect /archive/');
  });

  test('edge case: path with trailing slash', () => {
    const item: PlanningTreeItem = {
      item: 'S991',
      title: 'Trailing Slash Test',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: '/plans/archive/' // Ends with slash, no filename
    };

    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Path ending with /archive/ should be detected');
  });

  test('edge case: empty filePath returns false', () => {
    const item: PlanningTreeItem = {
      item: 'S990',
      title: 'Empty Path Test',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: ''
    };

    const result = isItemArchived(item);

    assert.strictEqual(result, false, 'Empty path should return false');
  });

  test('edge case: path with special characters', () => {
    const item: PlanningTreeItem = {
      item: 'S989',
      title: 'Special Chars Test',
      type: 'story',
      status: 'Ready',
      priority: 'Medium',
      filePath: '/plans/archive/epic (old) [deprecated]/story #5.md'
    };

    const result = isItemArchived(item);

    assert.strictEqual(result, true, 'Path with special characters should still detect archive/');
  });
});
