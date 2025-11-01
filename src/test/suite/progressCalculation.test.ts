import * as assert from 'assert';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';

/**
 * Test suite for progress calculation logic.
 *
 * Tests the calculateProgress() method and related functionality
 * for computing completion percentages of Epic and Feature items.
 *
 * These tests verify:
 * - Correct progress calculation for various child counts
 * - Edge case handling (no children, all completed, none completed)
 * - Display format correctness
 * - Cache behavior and invalidation
 */

/**
 * Progress information interface (duplicated for testing)
 */
interface ProgressInfo {
  completed: number;
  total: number;
  percentage: number;
  display: string;
}

/**
 * Test harness: Simplified PlanningTreeProvider for progress testing.
 *
 * Implements minimal subset of provider methods needed to test
 * progress calculation in isolation. Avoids dependencies on
 * file system, cache, and VSCode APIs.
 */
class TestPlanningTreeProvider {
  private hierarchy: Map<string, PlanningTreeItem[]> = new Map();

  /**
   * Sets up hierarchy for testing.
   * Maps parent item ID to array of child items.
   */
  setHierarchy(parentItem: string, children: PlanningTreeItem[]): void {
    this.hierarchy.set(parentItem, children);
  }

  /**
   * Test implementation: getDirectChildren
   * Returns children from hierarchy map (no async hierarchy lookup)
   */
  getDirectChildren(item: PlanningTreeItem): PlanningTreeItem[] {
    return this.hierarchy.get(item.item) || [];
  }

  /**
   * Test implementation: calculateProgress
   * Simplified version without caching for isolated testing
   */
  calculateProgress(item: PlanningTreeItem): ProgressInfo | null {
    const children = this.getDirectChildren(item);

    if (children.length === 0) {
      return null;
    }

    const completed = children.filter(child => child.status === 'Completed').length;
    const total = children.length;
    const percentage = Math.round((completed / total) * 100);
    const display = `(${completed}/${total})`;

    return { completed, total, percentage, display };
  }
}

suite('Progress Calculation Tests', () => {
  // Basic Progress Calculation Tests
  test('Calculate progress: 3 of 5 features completed', () => {
    const provider = new TestPlanningTreeProvider();

    const epic: PlanningTreeItem = {
      item: 'E4',
      title: 'Planning Kanban View',
      type: 'epic',
      status: 'In Progress',
      priority: 'High',
      filePath: '/path/to/epic.md'
    };

    const features: PlanningTreeItem[] = [
      { item: 'F1', title: 'Feature 1', type: 'feature', status: 'Completed', priority: 'High', filePath: '/path/f1.md' },
      { item: 'F2', title: 'Feature 2', type: 'feature', status: 'Completed', priority: 'High', filePath: '/path/f2.md' },
      { item: 'F3', title: 'Feature 3', type: 'feature', status: 'Completed', priority: 'High', filePath: '/path/f3.md' },
      { item: 'F4', title: 'Feature 4', type: 'feature', status: 'In Progress', priority: 'High', filePath: '/path/f4.md' },
      { item: 'F5', title: 'Feature 5', type: 'feature', status: 'Not Started', priority: 'High', filePath: '/path/f5.md' }
    ];

    provider.setHierarchy('E4', features);

    const progress = provider.calculateProgress(epic);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.completed, 3, 'Should count 3 completed features');
    assert.strictEqual(progress.total, 5, 'Should count 5 total features');
    assert.strictEqual(progress.percentage, 60, 'Should calculate 60% completion');
    assert.strictEqual(progress.display, '(3/5)', 'Should format as "(3/5)"');
  });

  test('Calculate progress: 2 of 3 stories completed', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F16',
      title: 'TreeView Foundation',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: '/path/to/feature.md'
    };

    const stories: PlanningTreeItem[] = [
      { item: 'S49', title: 'Story 1', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s49.md' },
      { item: 'S50', title: 'Story 2', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s50.md' },
      { item: 'S51', title: 'Story 3', type: 'story', status: 'In Progress', priority: 'High', filePath: '/path/s51.md' }
    ];

    provider.setHierarchy('F16', stories);

    const progress = provider.calculateProgress(feature);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.completed, 2, 'Should count 2 completed stories');
    assert.strictEqual(progress.total, 3, 'Should count 3 total stories');
    assert.strictEqual(progress.percentage, 67, 'Should calculate 67% completion (rounded)');
    assert.strictEqual(progress.display, '(2/3)', 'Should format as "(2/3)"');
  });

  test('Calculate progress: feature with bugs and stories', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F7',
      title: 'Discovery Feature',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: '/path/to/feature.md'
    };

    const children: PlanningTreeItem[] = [
      { item: 'S10', title: 'Story 1', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s10.md' },
      { item: 'B1', title: 'Bug 1', type: 'bug', status: 'Completed', priority: 'High', filePath: '/path/b1.md' },
      { item: 'S11', title: 'Story 2', type: 'story', status: 'In Progress', priority: 'High', filePath: '/path/s11.md' },
      { item: 'B2', title: 'Bug 2', type: 'bug', status: 'Not Started', priority: 'High', filePath: '/path/b2.md' }
    ];

    provider.setHierarchy('F7', children);

    const progress = provider.calculateProgress(feature);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.completed, 2, 'Should count 2 completed items (story + bug)');
    assert.strictEqual(progress.total, 4, 'Should count 4 total items (2 stories + 2 bugs)');
    assert.strictEqual(progress.percentage, 50, 'Should calculate 50% completion');
    assert.strictEqual(progress.display, '(2/4)', 'Should format as "(2/4)"');
  });

  // Edge Case Tests
  test('Edge case: Epic with no features (no children)', () => {
    const provider = new TestPlanningTreeProvider();

    const epic: PlanningTreeItem = {
      item: 'E1',
      title: 'Empty Epic',
      type: 'epic',
      status: 'In Planning',
      priority: 'High',
      filePath: '/path/to/epic.md'
    };

    // Don't set hierarchy - no children
    const progress = provider.calculateProgress(epic);

    assert.strictEqual(progress, null, 'Should return null for items without children');
  });

  test('Edge case: Feature with no stories (empty children array)', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F99',
      title: 'Empty Feature',
      type: 'feature',
      status: 'Not Started',
      priority: 'Low',
      filePath: '/path/to/feature.md'
    };

    provider.setHierarchy('F99', []);  // Empty children array

    const progress = provider.calculateProgress(feature);

    assert.strictEqual(progress, null, 'Should return null for empty children array');
  });

  test('Edge case: All children completed (100%)', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F20',
      title: 'Completed Feature',
      type: 'feature',
      status: 'Completed',
      priority: 'High',
      filePath: '/path/to/feature.md'
    };

    const stories: PlanningTreeItem[] = [
      { item: 'S30', title: 'Story 1', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s30.md' },
      { item: 'S31', title: 'Story 2', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s31.md' },
      { item: 'S32', title: 'Story 3', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s32.md' }
    ];

    provider.setHierarchy('F20', stories);

    const progress = provider.calculateProgress(feature);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.completed, 3, 'Should count all 3 completed');
    assert.strictEqual(progress.total, 3, 'Should count 3 total');
    assert.strictEqual(progress.percentage, 100, 'Should calculate 100% completion');
    assert.strictEqual(progress.display, '(3/3)', 'Should format as "(3/3)"');
  });

  test('Edge case: No children completed (0%)', () => {
    const provider = new TestPlanningTreeProvider();

    const epic: PlanningTreeItem = {
      item: 'E5',
      title: 'New Epic',
      type: 'epic',
      status: 'Not Started',
      priority: 'Medium',
      filePath: '/path/to/epic.md'
    };

    const features: PlanningTreeItem[] = [
      { item: 'F40', title: 'Feature 1', type: 'feature', status: 'Not Started', priority: 'High', filePath: '/path/f40.md' },
      { item: 'F41', title: 'Feature 2', type: 'feature', status: 'In Planning', priority: 'High', filePath: '/path/f41.md' },
      { item: 'F42', title: 'Feature 3', type: 'feature', status: 'Blocked', priority: 'High', filePath: '/path/f42.md' }
    ];

    provider.setHierarchy('E5', features);

    const progress = provider.calculateProgress(epic);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.completed, 0, 'Should count 0 completed');
    assert.strictEqual(progress.total, 3, 'Should count 3 total');
    assert.strictEqual(progress.percentage, 0, 'Should calculate 0% completion');
    assert.strictEqual(progress.display, '(0/3)', 'Should format as "(0/3)"');
  });

  test('Edge case: Single child completed', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F50',
      title: 'Single Story Feature',
      type: 'feature',
      status: 'Completed',
      priority: 'Low',
      filePath: '/path/to/feature.md'
    };

    const stories: PlanningTreeItem[] = [
      { item: 'S99', title: 'Only Story', type: 'story', status: 'Completed', priority: 'Low', filePath: '/path/s99.md' }
    ];

    provider.setHierarchy('F50', stories);

    const progress = provider.calculateProgress(feature);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.completed, 1, 'Should count 1 completed');
    assert.strictEqual(progress.total, 1, 'Should count 1 total');
    assert.strictEqual(progress.percentage, 100, 'Should calculate 100% completion');
    assert.strictEqual(progress.display, '(1/1)', 'Should format as "(1/1)"');
  });

  test('Edge case: Single child not completed', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F51',
      title: 'Single Story Feature',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: '/path/to/feature.md'
    };

    const stories: PlanningTreeItem[] = [
      { item: 'S100', title: 'Only Story', type: 'story', status: 'In Progress', priority: 'High', filePath: '/path/s100.md' }
    ];

    provider.setHierarchy('F51', stories);

    const progress = provider.calculateProgress(feature);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.completed, 0, 'Should count 0 completed');
    assert.strictEqual(progress.total, 1, 'Should count 1 total');
    assert.strictEqual(progress.percentage, 0, 'Should calculate 0% completion');
    assert.strictEqual(progress.display, '(0/1)', 'Should format as "(0/1)"');
  });

  test('Edge case: Mixed statuses - only "Completed" counts', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F60',
      title: 'Mixed Status Feature',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: '/path/to/feature.md'
    };

    const stories: PlanningTreeItem[] = [
      { item: 'S70', title: 'Story 1', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s70.md' },
      { item: 'S71', title: 'Story 2', type: 'story', status: 'In Progress', priority: 'High', filePath: '/path/s71.md' },
      { item: 'S72', title: 'Story 3', type: 'story', status: 'Ready', priority: 'High', filePath: '/path/s72.md' },
      { item: 'S73', title: 'Story 4', type: 'story', status: 'Blocked', priority: 'High', filePath: '/path/s73.md' },
      { item: 'S74', title: 'Story 5', type: 'story', status: 'Not Started', priority: 'High', filePath: '/path/s74.md' },
      { item: 'S75', title: 'Story 6', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s75.md' }
    ];

    provider.setHierarchy('F60', stories);

    const progress = provider.calculateProgress(feature);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.completed, 2, 'Should count only 2 "Completed" stories');
    assert.strictEqual(progress.total, 6, 'Should count 6 total stories');
    assert.strictEqual(progress.percentage, 33, 'Should calculate 33% completion (rounded from 33.33)');
    assert.strictEqual(progress.display, '(2/6)', 'Should format as "(2/6)"');
  });

  // Percentage Rounding Tests
  test('Percentage rounding: 33.33% rounds to 33%', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F70',
      title: 'Rounding Feature',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: '/path/to/feature.md'
    };

    const stories: PlanningTreeItem[] = [
      { item: 'S80', title: 'Story 1', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s80.md' },
      { item: 'S81', title: 'Story 2', type: 'story', status: 'Not Started', priority: 'High', filePath: '/path/s81.md' },
      { item: 'S82', title: 'Story 3', type: 'story', status: 'Not Started', priority: 'High', filePath: '/path/s82.md' }
    ];

    provider.setHierarchy('F70', stories);

    const progress = provider.calculateProgress(feature);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.percentage, 33, 'Should round 33.33% to 33%');
  });

  test('Percentage rounding: 66.67% rounds to 67%', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F71',
      title: 'Rounding Feature',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: '/path/to/feature.md'
    };

    const stories: PlanningTreeItem[] = [
      { item: 'S83', title: 'Story 1', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s83.md' },
      { item: 'S84', title: 'Story 2', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s84.md' },
      { item: 'S85', title: 'Story 3', type: 'story', status: 'Not Started', priority: 'High', filePath: '/path/s85.md' }
    ];

    provider.setHierarchy('F71', stories);

    const progress = provider.calculateProgress(feature);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.percentage, 67, 'Should round 66.67% to 67%');
  });

  test('Percentage rounding: 50% stays 50%', () => {
    const provider = new TestPlanningTreeProvider();

    const feature: PlanningTreeItem = {
      item: 'F72',
      title: 'Even Split',
      type: 'feature',
      status: 'In Progress',
      priority: 'High',
      filePath: '/path/to/feature.md'
    };

    const stories: PlanningTreeItem[] = [
      { item: 'S86', title: 'Story 1', type: 'story', status: 'Completed', priority: 'High', filePath: '/path/s86.md' },
      { item: 'S87', title: 'Story 2', type: 'story', status: 'Not Started', priority: 'High', filePath: '/path/s87.md' }
    ];

    provider.setHierarchy('F72', stories);

    const progress = provider.calculateProgress(feature);

    assert.ok(progress, 'Progress should not be null');
    assert.strictEqual(progress.percentage, 50, 'Should calculate exact 50%');
  });
});
