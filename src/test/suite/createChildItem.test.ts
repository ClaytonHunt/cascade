/**
 * Unit tests for S64 Create Child Item helper functions
 *
 * Tests the core utility functions:
 * - generateNextItemNumber(): Item number generation algorithm
 * - slugify(): Title to filesystem-safe name conversion
 * - generateChildItemTemplate(): Markdown template generation
 */

import * as assert from 'assert';

// Import functions under test from extension module
import { generateNextItemNumber, slugify, generateChildItemTemplate } from '../../extension';

// Import types
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { Frontmatter } from '../../types';

suite('S64 Create Child Item - Helper Functions', () => {
  suite('generateNextItemNumber()', () => {
    test('should return F1 when no features exist', () => {
      const allItems: PlanningTreeItem[] = [];
      const result = generateNextItemNumber('feature', allItems);
      assert.strictEqual(result, 'F1', 'First feature should be F1');
    });

    test('should return S1 when no stories exist', () => {
      const allItems: PlanningTreeItem[] = [];
      const result = generateNextItemNumber('story', allItems);
      assert.strictEqual(result, 'S1', 'First story should be S1');
    });

    test('should increment from existing feature numbers', () => {
      const allItems: PlanningTreeItem[] = [
        { item: 'F18', title: 'Feature 18', type: 'feature', status: 'Ready', priority: 'Medium', filePath: '/path/f18' },
        { item: 'F19', title: 'Feature 19', type: 'feature', status: 'Ready', priority: 'Medium', filePath: '/path/f19' },
      ];
      const result = generateNextItemNumber('feature', allItems);
      assert.strictEqual(result, 'F20', 'Next feature after F19 should be F20');
    });

    test('should increment from existing story numbers', () => {
      const allItems: PlanningTreeItem[] = [
        { item: 'S63', title: 'Story 63', type: 'story', status: 'Ready', priority: 'Medium', filePath: '/path/s63' },
        { item: 'S64', title: 'Story 64', type: 'story', status: 'Ready', priority: 'Medium', filePath: '/path/s64' },
      ];
      const result = generateNextItemNumber('story', allItems);
      assert.strictEqual(result, 'S65', 'Next story after S64 should be S65');
    });

    test('should ignore other types when counting', () => {
      const allItems: PlanningTreeItem[] = [
        { item: 'E1', title: 'Epic 1', type: 'epic', status: 'Ready', priority: 'Medium', filePath: '/path/e1' },
        { item: 'F18', title: 'Feature 18', type: 'feature', status: 'Ready', priority: 'Medium', filePath: '/path/f18' },
        { item: 'S63', title: 'Story 63', type: 'story', status: 'Ready', priority: 'Medium', filePath: '/path/s63' },
        { item: 'B5', title: 'Bug 5', type: 'bug', status: 'Ready', priority: 'Medium', filePath: '/path/b5' },
      ];
      const result = generateNextItemNumber('feature', allItems);
      assert.strictEqual(result, 'F19', 'Should only count features, not epics/stories/bugs');
    });

    test('should handle non-sequential numbers correctly', () => {
      const allItems: PlanningTreeItem[] = [
        { item: 'F10', title: 'Feature 10', type: 'feature', status: 'Ready', priority: 'Medium', filePath: '/path/f10' },
        { item: 'F25', title: 'Feature 25', type: 'feature', status: 'Ready', priority: 'Medium', filePath: '/path/f25' },
        { item: 'F15', title: 'Feature 15', type: 'feature', status: 'Ready', priority: 'Medium', filePath: '/path/f15' },
      ];
      const result = generateNextItemNumber('feature', allItems);
      assert.strictEqual(result, 'F26', 'Should find max (25) and increment to 26');
    });

    test('should ignore invalid item numbers', () => {
      const allItems: PlanningTreeItem[] = [
        { item: 'F18', title: 'Feature 18', type: 'feature', status: 'Ready', priority: 'Medium', filePath: '/path/f18' },
        { item: 'INVALID', title: 'Invalid', type: 'feature', status: 'Ready', priority: 'Medium', filePath: '/path/invalid' },
      ];
      const result = generateNextItemNumber('feature', allItems);
      assert.strictEqual(result, 'F19', 'Should ignore invalid item numbers');
    });
  });

  suite('slugify()', () => {
    test('should convert simple title to lowercase', () => {
      const result = slugify('User Authentication');
      assert.strictEqual(result, 'user-authentication', 'Should lowercase and hyphenate');
    });

    test('should replace special characters with hyphens', () => {
      const result = slugify('Drag & Drop Status');
      assert.strictEqual(result, 'drag-drop-status', 'Should replace & with hyphen');
    });

    test('should handle multiple spaces', () => {
      const result = slugify('A  B  C');
      assert.strictEqual(result, 'a-b-c', 'Should collapse multiple spaces to single hyphen');
    });

    test('should remove leading and trailing spaces', () => {
      const result = slugify('  Test  ');
      assert.strictEqual(result, 'test', 'Should trim leading/trailing spaces');
    });

    test('should preserve numbers', () => {
      const result = slugify('API v2 Integration');
      assert.strictEqual(result, 'api-v2-integration', 'Should preserve numbers');
    });

    test('should handle exclamation marks', () => {
      const result = slugify('Important Feature!');
      assert.strictEqual(result, 'important-feature', 'Should remove exclamation marks');
    });

    test('should handle mixed special characters', () => {
      const result = slugify('Test: Feature #1 (Beta)');
      assert.strictEqual(result, 'test-feature-1-beta', 'Should handle multiple special chars');
    });

    test('should remove leading/trailing hyphens', () => {
      const result = slugify('---Test---');
      assert.strictEqual(result, 'test', 'Should trim hyphens from edges');
    });
  });

  suite('generateChildItemTemplate()', () => {
    test('should generate valid frontmatter for feature', () => {
      const frontmatter: Frontmatter = {
        item: 'F20',
        title: 'User Authentication',
        type: 'feature',
        status: 'Not Started',
        priority: 'Medium',
        dependencies: [],
        created: '2025-10-17',
        updated: '2025-10-17'
      };

      const result = generateChildItemTemplate(frontmatter, 'feature');

      // Should contain YAML frontmatter delimiters
      assert.ok(result.startsWith('---'), 'Should start with frontmatter delimiter');
      assert.ok(result.includes('---\n\n#'), 'Should have closing delimiter before heading');

      // Should contain all frontmatter fields
      assert.ok(result.includes('item: F20'), 'Should include item number');
      assert.ok(result.includes('title: User Authentication'), 'Should include title');
      assert.ok(result.includes('type: feature'), 'Should include type');
      assert.ok(result.includes('status: Not Started'), 'Should include status');
      assert.ok(result.includes('priority: Medium'), 'Should include priority');

      // Should contain markdown heading
      assert.ok(result.includes('# F20 - User Authentication'), 'Should include heading with item and title');

      // Should contain standard sections
      assert.ok(result.includes('## Description'), 'Should include Description section');
      assert.ok(result.includes('## Acceptance Criteria'), 'Should include Acceptance Criteria section');

      // Features should have Child Items section
      assert.ok(result.includes('## Child Items'), 'Features should include Child Items section');
      assert.ok(result.includes('/plan #F20'), 'Should reference /plan command');
    });

    test('should generate valid frontmatter for story', () => {
      const frontmatter: Frontmatter = {
        item: 'S65',
        title: 'Test Story',
        type: 'story',
        status: 'Not Started',
        priority: 'Medium',
        dependencies: [],
        created: '2025-10-17',
        updated: '2025-10-17'
      };

      const result = generateChildItemTemplate(frontmatter, 'story');

      // Should contain frontmatter
      assert.ok(result.includes('item: S65'), 'Should include item number');
      assert.ok(result.includes('type: story'), 'Should include type');

      // Should contain heading
      assert.ok(result.includes('# S65 - Test Story'), 'Should include heading');

      // Stories should NOT have Child Items section
      assert.ok(!result.includes('## Child Items'), 'Stories should NOT include Child Items section');
    });

    test('should format dependencies array correctly', () => {
      const frontmatter: Frontmatter = {
        item: 'F20',
        title: 'Test',
        type: 'feature',
        status: 'Not Started',
        priority: 'High',
        dependencies: ['F18', 'F19'],
        created: '2025-10-17',
        updated: '2025-10-17'
      };

      const result = generateChildItemTemplate(frontmatter, 'feature');

      // Should contain dependencies array in YAML format
      assert.ok(result.includes('dependencies:'), 'Should include dependencies field');
      assert.ok(result.includes('- F18') || result.includes('dependencies:\n  - F18'), 'Should list dependency F18');
      assert.ok(result.includes('- F19') || result.includes('dependencies:\n  - F19'), 'Should list dependency F19');
    });
  });
});
