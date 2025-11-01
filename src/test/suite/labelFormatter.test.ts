import * as assert from 'assert';
import { formatItemLabel, getTypeLabel } from '../../treeview/labelFormatter';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { ItemType } from '../../types';

suite('Label Formatter Test Suite', () => {
	suite('Module Structure', () => {
		test('getTypeLabel function should be exported', () => {
			assert.strictEqual(
				typeof getTypeLabel,
				'function',
				'getTypeLabel should be a function'
			);
		});

		test('formatItemLabel function should be exported', () => {
			assert.strictEqual(
				typeof formatItemLabel,
				'function',
				'formatItemLabel should be a function'
			);
		});

		test('getTypeLabel should return a string', () => {
			const result = getTypeLabel('story');
			assert.strictEqual(
				typeof result,
				'string',
				'getTypeLabel should return a string'
			);
			assert.ok(
				result.length > 0,
				'getTypeLabel should return a non-empty string'
			);
		});

		test('formatItemLabel should return a string', () => {
			const testItem: PlanningTreeItem = {
				item: 'S1',
				title: 'Test',
				type: 'story',
				status: 'Ready',
				priority: 'High',
				filePath: '/test.md'
			};

			const result = formatItemLabel(testItem);
			assert.strictEqual(
				typeof result,
				'string',
				'formatItemLabel should return a string'
			);
			assert.ok(
				result.length > 0,
				'formatItemLabel should return a non-empty string'
			);
		});
	});

	suite('Type Label Mapping', () => {
		test('project type should return "Project"', () => {
			const result = getTypeLabel('project');
			assert.strictEqual(
				result,
				'Project',
				'Should return correct label for project type'
			);
		});

		test('epic type should return "Epic"', () => {
			const result = getTypeLabel('epic');
			assert.strictEqual(
				result,
				'Epic',
				'Should return correct label for epic type'
			);
		});

		test('feature type should return "Feature"', () => {
			const result = getTypeLabel('feature');
			assert.strictEqual(
				result,
				'Feature',
				'Should return correct label for feature type'
			);
		});

		test('story type should return "Story"', () => {
			const result = getTypeLabel('story');
			assert.strictEqual(
				result,
				'Story',
				'Should return correct label for story type'
			);
		});

		test('bug type should return "Bug"', () => {
			const result = getTypeLabel('bug');
			assert.strictEqual(
				result,
				'Bug',
				'Should return correct label for bug type'
			);
		});

		test('spec type should return "Spec"', () => {
			const result = getTypeLabel('spec');
			assert.strictEqual(
				result,
				'Spec',
				'Should return correct label for spec type'
			);
		});

		test('phase type should return "Phase"', () => {
			const result = getTypeLabel('phase');
			assert.strictEqual(
				result,
				'Phase',
				'Should return correct label for phase type'
			);
		});
	});

	suite('Label Formatting', () => {
		test('should format story label correctly', () => {
			const item: PlanningTreeItem = {
				item: 'S75',
				title: 'Archive Detection',
				type: 'story',
				status: 'Ready',
				priority: 'High',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Story S75 - Archive Detection',
				'Should format story label correctly'
			);
		});

		test('should format epic label correctly', () => {
			const item: PlanningTreeItem = {
				item: 'E5',
				title: 'Rich TreeView Visualization',
				type: 'epic',
				status: 'In Progress',
				priority: 'High',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Epic E5 - Rich TreeView Visualization',
				'Should format epic label correctly'
			);
		});

		test('should format feature label correctly', () => {
			const item: PlanningTreeItem = {
				item: 'F26',
				title: 'Enhanced Typography Colors',
				type: 'feature',
				status: 'Not Started',
				priority: 'Medium',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Feature F26 - Enhanced Typography Colors',
				'Should format feature label correctly'
			);
		});

		test('should format bug label correctly', () => {
			const item: PlanningTreeItem = {
				item: 'B2',
				title: 'TreeView Refresh Error',
				type: 'bug',
				status: 'Blocked',
				priority: 'High',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Bug B2 - TreeView Refresh Error',
				'Should format bug label correctly'
			);
		});

		test('should format spec label correctly', () => {
			const item: PlanningTreeItem = {
				item: 'S95',
				title: 'Spec Phase Indicator Rendering',
				type: 'spec',
				status: 'Completed',
				priority: 'Low',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Spec S95 - Spec Phase Indicator Rendering',
				'Should format spec label correctly'
			);
		});

		test('should format phase label correctly', () => {
			const item: PlanningTreeItem = {
				item: 'P1',
				title: 'Implementation Phase 1',
				type: 'phase',
				status: 'In Progress',
				priority: 'High',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Phase P1 - Implementation Phase 1',
				'Should format phase label correctly'
			);
		});

		test('should format project label correctly', () => {
			const item: PlanningTreeItem = {
				item: 'P1',
				title: 'Core Game Systems',
				type: 'project',
				status: 'In Planning',
				priority: 'High',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Project P1 - Core Game Systems',
				'Should format project label correctly'
			);
		});
	});

	suite('Edge Cases', () => {
		test('should handle unknown item type gracefully', () => {
			// Force unknown type by casting
			const unknownType = 'custom' as ItemType;
			const result = getTypeLabel(unknownType);

			assert.strictEqual(
				result,
				'Custom',
				'Should capitalize unknown type as fallback'
			);
		});

		test('should handle missing title (use item number)', () => {
			const item: PlanningTreeItem = {
				item: 'S75',
				title: '', // Empty title
				type: 'story',
				status: 'Ready',
				priority: 'High',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Story S75 - S75',
				'Should use item number when title is empty'
			);
		});

		test('should handle undefined item number (use "Unknown")', () => {
			const item: PlanningTreeItem = {
				item: undefined as any, // Force undefined
				title: 'Archive Detection',
				type: 'story',
				status: 'Ready',
				priority: 'High',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Story Unknown - Archive Detection',
				'Should use "Unknown" when item number is undefined'
			);
		});

		test('should handle both missing title AND undefined number', () => {
			const item: PlanningTreeItem = {
				item: undefined as any,
				title: '',
				type: 'story',
				status: 'Ready',
				priority: 'High',
				filePath: '/test.md'
			};

			const result = formatItemLabel(item);
			assert.strictEqual(
				result,
				'Story Unknown - Unknown',
				'Should use "Unknown" when both fields are missing'
			);
		});
	});

	suite('Format Consistency', () => {
		test('should use consistent separator " - " (space-dash-space)', () => {
			const items: PlanningTreeItem[] = [
				{
					item: 'S1',
					title: 'Test One',
					type: 'story',
					status: 'Ready',
					priority: 'High',
					filePath: '/test.md'
				},
				{
					item: 'E2',
					title: 'Test Two',
					type: 'epic',
					status: 'Ready',
					priority: 'High',
					filePath: '/test.md'
				},
				{
					item: 'F3',
					title: 'Test Three',
					type: 'feature',
					status: 'Ready',
					priority: 'High',
					filePath: '/test.md'
				}
			];

			items.forEach(item => {
				const result = formatItemLabel(item);
				assert.ok(
					result.includes(' - '),
					`Label "${result}" should contain space-dash-space separator`
				);
			});
		});

		test('should not zero-pad item numbers', () => {
			const items: PlanningTreeItem[] = [
				{ item: 'S5', title: 'Test', type: 'story', status: 'Ready', priority: 'High', filePath: '/test.md' },
				{ item: 'E05', title: 'Test', type: 'epic', status: 'Ready', priority: 'High', filePath: '/test.md' },
				{ item: 'F100', title: 'Test', type: 'feature', status: 'Ready', priority: 'High', filePath: '/test.md' }
			];

			// S5 should stay as "S5" (not "S05")
			const result1 = formatItemLabel(items[0]);
			assert.ok(
				result1.includes('S5'),
				'Should preserve original item number format (S5, not S05)'
			);

			// E05 should stay as "E05" (preserve what frontmatter has)
			const result2 = formatItemLabel(items[1]);
			assert.ok(
				result2.includes('E05'),
				'Should preserve original item number format from frontmatter'
			);

			// F100 should stay as "F100"
			const result3 = formatItemLabel(items[2]);
			assert.ok(
				result3.includes('F100'),
				'Should preserve multi-digit item numbers'
			);
		});
	});
});
