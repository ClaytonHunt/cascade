---
spec: S99
phase: 2
title: Unit Testing
status: Completed
priority: High
created: 2025-10-28
updated: 2025-10-28
---

# Phase 2: Unit Testing

## Overview

Create comprehensive unit test suite for labelFormatter module using Mocha framework and Node's assert module. Tests verify all ItemType mappings, edge case handling, and format consistency.

**Deliverable:** Passing test suite with 100% function coverage for getTypeLabel() and formatItemLabel().

## Prerequisites

- Phase 1 complete (labelFormatter.ts module created)
- Module compiles without TypeScript errors
- Test framework dependencies installed (`npm install` run)

## Tasks

### Task 1: Create Test File

**Action:** Create new test file following existing test suite pattern.

**Location:** `vscode-extension/src/test/suite/labelFormatter.test.ts`

**Initial Structure:**
```typescript
import * as assert from 'assert';
import { formatItemLabel, getTypeLabel } from '../../treeview/labelFormatter';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { ItemType } from '../../types';

suite('Label Formatter Test Suite', () => {
	suite('Module Structure', () => {
		// Module export tests
	});

	suite('Type Label Mapping', () => {
		// getTypeLabel() tests
	});

	suite('Label Formatting', () => {
		// formatItemLabel() tests
	});

	suite('Edge Cases', () => {
		// Edge case tests
	});
});
```

**Reference Pattern:** badgeRenderer.test.ts:1-20 (imports and suite structure)

**Documentation:**
- Mocha test framework: https://mochajs.org/
- Node.js assert module: https://nodejs.org/api/assert.html

---

### Task 2: Test Module Exports

**Action:** Verify both functions are exported and callable.

**Test Code:**
```typescript
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
```

**Reference:** badgeRenderer.test.ts:6-20 (module export tests)

**What This Tests:**
- Functions are exported from module
- Functions return correct types
- Basic functionality works

---

### Task 3: Test Type Label Mappings (All ItemTypes)

**Action:** Write individual tests for each ItemType value (7 total).

**Test Code:**
```typescript
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
```

**Reference:** badgeRenderer.test.ts:22-50 (status mapping tests)

**Coverage:** Tests all 7 ItemType values defined in types.ts:9

---

### Task 4: Test Label Formatting (Standard Cases)

**Action:** Test formatItemLabel() with various item types and verify format.

**Test Code:**
```typescript
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
```

**What This Tests:**
- Full label format for all 7 item types
- Correct separator (space-dash-space)
- Type label prefix generation
- Item number preservation

---

### Task 5: Test Edge Cases

**Action:** Test edge case handling (unknown type, missing title, undefined number).

**Test Code:**
```typescript
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
			'Story S75',
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
			'Story Unknown',
			'Should use "Unknown" when both fields are missing'
		);
	});
});
```

**What This Tests:**
- Unknown type fallback (capitalize)
- Missing title fallback (use item number)
- Undefined item number fallback (use "Unknown")
- Combined edge case (both missing)

---

### Task 6: Test Format Consistency

**Action:** Verify format consistency across different inputs.

**Test Code:**
```typescript
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
```

**What This Tests:**
- Consistent separator usage across all types
- Item number format preservation (no zero-padding)
- Format consistency across different inputs

---

### Task 7: Run Test Suite

**Action:** Execute test suite and verify all tests pass.

**Command:**
```bash
cd vscode-extension
npm test
```

**Expected Output:**
```
Label Formatter Test Suite
  Module Structure
    ✓ getTypeLabel function should be exported
    ✓ formatItemLabel function should be exported
    ✓ getTypeLabel should return a string
    ✓ formatItemLabel should return a string

  Type Label Mapping
    ✓ project type should return "Project"
    ✓ epic type should return "Epic"
    ✓ feature type should return "Feature"
    ✓ story type should return "Story"
    ✓ bug type should return "Bug"
    ✓ spec type should return "Spec"
    ✓ phase type should return "Phase"

  Label Formatting
    ✓ should format story label correctly
    ✓ should format epic label correctly
    ✓ should format feature label correctly
    ✓ should format bug label correctly
    ✓ should format spec label correctly
    ✓ should format phase label correctly
    ✓ should format project label correctly

  Edge Cases
    ✓ should handle unknown item type gracefully
    ✓ should handle missing title (use item number)
    ✓ should handle undefined item number (use "Unknown")
    ✓ should handle both missing title AND undefined number

  Format Consistency
    ✓ should use consistent separator " - " (space-dash-space)
    ✓ should not zero-pad item numbers

  23 passing (XXms)
```

**Total Tests:** 23 tests covering:
- 4 module structure tests
- 7 type mapping tests
- 7 label formatting tests
- 4 edge case tests
- 2 format consistency tests

**Troubleshooting:**
- If tests fail, check test file imports are correct
- Verify labelFormatter.ts compiled successfully
- Run `npm run compile` before `npm test`
- Check for typos in expected vs actual strings

---

### Task 8: Verify Coverage (Optional)

**Action:** Check test coverage to ensure 100% function coverage.

**Command (if coverage tool available):**
```bash
npm run test:coverage
```

**Expected Coverage:**
- `getTypeLabel()` - 100% coverage (all branches tested)
- `formatItemLabel()` - 100% coverage (all branches tested)
- `capitalize()` - 100% coverage (tested via getTypeLabel edge case)

**Manual Coverage Verification:**
- All 7 ItemType values tested ✓
- Unknown type fallback tested ✓
- Missing title fallback tested ✓
- Undefined number fallback tested ✓
- Combined edge case tested ✓

---

## Completion Criteria

✅ **Test File Created:**
- `vscode-extension/src/test/suite/labelFormatter.test.ts` exists
- File size ~250-300 lines including all tests

✅ **Test Suite Complete:**
- 4 module structure tests
- 7 type mapping tests (all ItemType values)
- 7 label formatting tests (all ItemType values)
- 4 edge case tests
- 2 format consistency tests
- **Total: 23 tests**

✅ **All Tests Passing:**
- `npm test` runs without errors
- All 23 tests show ✓ (passing)
- No test failures or timeouts

✅ **Coverage Achieved:**
- 100% function coverage for getTypeLabel()
- 100% function coverage for formatItemLabel()
- All edge cases covered

✅ **Code Quality:**
- Test code follows existing patterns (badgeRenderer.test.ts)
- Descriptive test names
- Clear assertion messages
- No ESLint warnings

✅ **Documentation:**
- Test file has descriptive suite names
- Each test has clear purpose
- Edge cases documented in test names

## Phase Complete

Phase 2 is complete when:
1. All 23 tests pass with `npm test`
2. Test file follows existing patterns
3. 100% function coverage achieved
4. No TypeScript or ESLint errors

## Story Complete

After Phase 2 completion, S99 is **Ready for Integration**.

**Deliverables:**
- ✅ `vscode-extension/src/treeview/labelFormatter.ts` - Utility module
- ✅ `vscode-extension/src/test/suite/labelFormatter.test.ts` - Test suite
- ✅ All tests passing
- ✅ TypeScript compilation successful

**Next Stories:**
- **S100**: Integrate labelFormatter into PlanningTreeProvider.getTreeItem()
- **S101**: Migrate all TreeItem label formatting to use formatItemLabel()
- **S102**: Add color-coded type labels using getTypeLabel()

**Update Story Status:**
Mark S99 as "Completed" in `plans/epic-05-rich-treeview-visualization/feature-26-enhanced-typography-colors/story-99-type-label-formatter.md`
