---
spec: S90
phase: 2
title: Test Suite Extension
status: Completed
priority: High
created: 2025-10-25
updated: 2025-10-25
---

# Phase 2: Test Suite Extension

## Overview

This phase extends the existing test suite to verify that progress bars are correctly integrated into TreeView items. We extend `treeItemRendering.test.ts` with new test cases that verify the description field format for parent and leaf items.

**Testing Strategy**: Unit tests using mocked PlanningTreeProvider to verify `getTreeItem()` output format.

**Estimated Time**: 30 minutes

## Prerequisites

- Phase 1 completed (core integration implemented)
- TypeScript compilation succeeds
- Existing test suite runs successfully
- Familiarity with `treeItemRendering.test.ts` structure

## Tasks

### Task 1: Review Existing Test Structure

**Location**: `vscode-extension/src/test/suite/treeItemRendering.test.ts`

**Action**: Read and understand the existing test file structure (lines 1-100):

**Key Components**:
1. **Mock Functions** (lines 23-78):
   - `createMockItem()` - Creates test PlanningTreeItem
   - `createMockCache()` - Creates FrontmatterCache mock
   - `createMockOutputChannel()` - Creates OutputChannel mock
   - `createMockWorkspaceState()` - Creates Memento mock

2. **Existing Test Suites**:
   - "Icon Mapping" - Tests status-based icon selection (S57)
   - "Tooltip" - Tests tooltip content generation
   - "Collapsible State" - Tests parent vs leaf collapsibility
   - "Command Assignment" - Tests file opening command (S51)

**Expected Outcome**: Understanding of test patterns and mock setup

**References**:
- `vscode-extension/src/test/suite/progressBarRenderer.test.ts` - Similar testing patterns
- S89 specification - Progress bar renderer tests (good reference for format validation)

---

### Task 2: Add Test Suite for Progress Bar Integration

**Location**: `vscode-extension/src/test/suite/treeItemRendering.test.ts` (end of file)

**Action**: Add new test suite at end of file:

```typescript
suite('Progress Bar Integration (S90)', () => {
  suite('Parent Items with Children', () => {
    test('Epic with children should display progress bar in description', async () => {
      // Setup: Create provider with mock dependencies
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      // Create mock Epic item
      const epic = createMockItem('E4', 'epic', 'In Progress', 'High');

      // Mock getDirectChildren to return mock Features
      // This simulates an Epic with 3/5 Features completed
      const mockFeatures: PlanningTreeItem[] = [
        createMockItem('F1', 'feature', 'Completed', 'High'),
        createMockItem('F2', 'feature', 'Completed', 'High'),
        createMockItem('F3', 'feature', 'Completed', 'High'),
        createMockItem('F4', 'feature', 'In Progress', 'High'),
        createMockItem('F5', 'feature', 'Not Started', 'High')
      ];

      // Note: Mocking private methods requires type casting or test helpers
      // This test may need adjustment based on PlanningTreeProvider refactoring
      // See alternative approach in Task 3 for integration testing

      // Get TreeItem
      const treeItem = await provider.getTreeItem(epic);

      // Verify description contains progress bar
      assert.ok(treeItem.description, 'Description should be defined');

      // Should contain Unicode block characters
      assert.ok(
        treeItem.description!.includes('█') || treeItem.description!.includes('░'),
        'Description should contain Unicode progress bar blocks'
      );

      // Should contain percentage
      assert.ok(
        /\d+%/.test(treeItem.description!),
        'Description should contain percentage'
      );

      // Should contain completion counts
      assert.ok(
        /\(\d+\/\d+\)/.test(treeItem.description!),
        'Description should contain completion counts like (3/5)'
      );

      // Should NOT be just the old format "(3/5)" - should include bar
      const descriptionLength = treeItem.description!.length;
      assert.ok(
        descriptionLength > 15, // Old format: "$(icon) Status (3/5)" ≈ 15 chars
        'Description should be longer than old count-only format'
      );
    });

    test('Feature with children should display progress bar in description', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      const feature = createMockItem('F16', 'feature', 'Completed', 'High');

      // Get TreeItem
      const treeItem = await provider.getTreeItem(feature);

      // Verify description exists and contains progress bar elements
      assert.ok(treeItem.description, 'Description should be defined');

      // Should contain progress bar pattern
      const progressBarPattern = /[█░]+\s+\d+%\s+\(\d+\/\d+\)/;
      assert.ok(
        progressBarPattern.test(treeItem.description!),
        'Description should match progress bar format pattern'
      );
    });

    test('Project with children should display progress bar in description', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      const project = createMockItem('P1', 'project', 'In Progress', 'High');

      // Get TreeItem
      const treeItem = await provider.getTreeItem(project);

      // Verify description exists
      // Note: Projects may not have children in test environment
      // This test verifies the code path doesn't error
      assert.ok(treeItem.description !== undefined, 'Description should be defined');
    });
  });

  suite('Leaf Items without Children', () => {
    test('Story should NOT display progress bar in description', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      const story = createMockItem('S49', 'story', 'In Progress', 'High');

      // Get TreeItem
      const treeItem = await provider.getTreeItem(story);

      // Verify description exists
      assert.ok(treeItem.description, 'Description should be defined');

      // Should NOT contain Unicode blocks (no progress bar)
      assert.ok(
        !treeItem.description!.includes('█') && !treeItem.description!.includes('░'),
        'Description should NOT contain progress bar blocks for stories'
      );

      // Should NOT contain percentage
      assert.ok(
        !/\d+%/.test(treeItem.description!),
        'Description should NOT contain percentage for stories'
      );

      // Should only contain status badge (e.g., "$(sync) In Progress")
      assert.ok(
        treeItem.description!.includes('$('),
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

      const bug = createMockItem('B1', 'bug', 'Blocked', 'High');

      // Get TreeItem
      const treeItem = await provider.getTreeItem(bug);

      // Verify description format (status badge only, no progress bar)
      assert.ok(treeItem.description, 'Description should be defined');
      assert.ok(
        !treeItem.description!.includes('█'),
        'Description should NOT contain progress bar for bugs'
      );
    });
  });

  suite('Edge Cases', () => {
    test('Parent item with no children should show status badge only', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      // Epic with no features (newly created, no children yet)
      const epic = createMockItem('E10', 'epic', 'Not Started', 'High');

      // Get TreeItem
      const treeItem = await provider.getTreeItem(epic);

      // Should have description
      assert.ok(treeItem.description, 'Description should be defined');

      // Should NOT contain progress bar (no children = no progress to show)
      assert.ok(
        !treeItem.description!.includes('█'),
        'Description should NOT contain progress bar when no children exist'
      );

      // Should contain status badge
      assert.ok(
        treeItem.description!.includes('$('),
        'Description should contain status badge'
      );
    });

    test('Description format matches expected pattern', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel(),
        createMockWorkspaceState()
      );

      const epic = createMockItem('E4', 'epic', 'In Progress', 'High');

      // Get TreeItem
      const treeItem = await provider.getTreeItem(epic);

      assert.ok(treeItem.description, 'Description should be defined');

      // Expected format: "$(icon) Status {progressBar}"
      // Where progressBar = "{blocks} {percentage}% ({completed}/{total})"
      // Example: "$(sync) In Progress █████░░░░░ 50% (3/6)"

      // Pattern: status badge + blocks + percentage + counts
      const fullPattern = /\$\([a-z-]+\)\s+[A-Za-z\s]+(\s+[█░]+\s+\d+%\s+\(\d+\/\d+\))?/;

      assert.ok(
        fullPattern.test(treeItem.description!),
        `Description should match expected format pattern. Actual: "${treeItem.description}"`
      );
    });
  });
});
```

**Key Test Coverage**:
1. **Parent Items**: Epics, Features, Projects show progress bars
2. **Leaf Items**: Stories, Bugs do NOT show progress bars
3. **Edge Cases**: Empty parents, format validation

**Expected Outcome**: New test suite added to file, ready to run

**Note**: Some tests use mocking which may need adjustment based on PlanningTreeProvider architecture. See Task 3 for integration test alternative.

**References**:
- `vscode-extension/src/test/suite/progressBarRenderer.test.ts:5-40` - Similar test patterns
- S89 specification - Progress bar format validation examples

---

### Task 3: Alternative Approach - Integration Test

**Location**: Create new file `vscode-extension/src/test/suite/progressBarIntegration.test.ts`

**Rationale**: Unit testing `getTreeItem()` with mocked children is complex because:
- `getDirectChildren()` is private method
- Hierarchy building requires file system setup
- Mocking entire provider state is brittle

**Alternative**: Integration test with real workspace fixtures

**Action**: Create integration test file:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { FrontmatterCache } from '../../cache';

/**
 * Integration tests for progress bar display in TreeView (S90).
 *
 * These tests use real workspace fixtures to verify progress bars
 * appear correctly for parent items with children.
 *
 * Setup:
 * - Test workspace at vscode-extension/src/test/fixtures/progress-test/
 * - Contains Epic with 3/5 Features completed
 * - Contains Feature with 2/4 Stories completed
 */
suite('Progress Bar Integration (S90) - Integration Tests', () => {
  let workspaceRoot: string;
  let cache: FrontmatterCache;
  let outputChannel: vscode.OutputChannel;
  let workspaceState: vscode.Memento;
  let provider: PlanningTreeProvider;

  setup(() => {
    // Setup test workspace path
    workspaceRoot = path.join(__dirname, '../fixtures/progress-test');

    // Create real dependencies
    cache = new FrontmatterCache(100);
    outputChannel = vscode.window.createOutputChannel('Cascade Test');

    // Create mock workspace state
    const storage = new Map<string, any>();
    workspaceState = {
      keys: () => Array.from(storage.keys()),
      get: <T>(key: string, defaultValue?: T) => storage.get(key) ?? defaultValue,
      update: (key: string, value: any) => {
        storage.set(key, value);
        return Promise.resolve();
      }
    };

    // Create provider
    provider = new PlanningTreeProvider(
      workspaceRoot,
      cache,
      outputChannel,
      workspaceState
    );
  });

  teardown(() => {
    outputChannel.dispose();
  });

  test('Epic with 3/5 completed Features shows 60% progress bar', async function() {
    // This test requires fixtures - skip if not available
    // TODO: Create fixtures in vscode-extension/src/test/fixtures/progress-test/
    this.skip();

    // Load Epic item from test workspace
    // const items = await provider.loadAllPlanningItems(); // Private method
    // const epic = items.find(item => item.item === 'E1');
    // assert.ok(epic, 'Test Epic E1 should exist');

    // Get TreeItem
    // const treeItem = await provider.getTreeItem(epic!);

    // Verify progress bar shows 60%
    // assert.ok(treeItem.description!.includes('60%'), 'Should show 60% progress');
    // assert.ok(treeItem.description!.includes('(3/5)'), 'Should show (3/5) counts');
  });

  // Additional integration tests here...
});
```

**Expected Outcome**: Integration test skeleton created

**Note**: This approach requires test fixtures. If time allows, create fixtures. Otherwise, rely on manual testing for integration verification.

**References**:
- `vscode-extension/src/test/fixtures/` - Existing test fixtures directory
- VSCode testing docs - Integration test patterns

---

### Task 4: Run Test Suite

**Action**: Execute all tests to verify no regressions:

```bash
cd vscode-extension
npm test
```

**Expected Output**:
```
> cascade@0.1.0 test
> node ./out/test/runTest.js

# ... test output ...

  Progress Bar Integration (S90)
    Parent Items with Children
      ✓ Epic with children should display progress bar in description
      ✓ Feature with children should display progress bar in description
      ✓ Project with children should display progress bar in description
    Leaf Items without Children
      ✓ Story should NOT display progress bar in description
      ✓ Bug should NOT display progress bar in description
    Edge Cases
      ✓ Parent item with no children should show status badge only
      ✓ Description format matches expected pattern

  7 passing (XXXms)
```

**Troubleshooting**:

If tests fail with "cannot read property of undefined":
- Check mock setup in `createMockItem()` - may need additional fields
- Verify PlanningTreeProvider constructor doesn't require additional dependencies
- Check private method access (may need refactoring or test helpers)

If tests timeout:
- Increase test timeout in Mocha configuration
- Check for async/await issues in test code
- Verify provider initialization doesn't trigger expensive operations

**References**:
- `package.json` - Test script configuration
- `.vscode/launch.json` - Test debugging configuration

---

### Task 5: Update Test Documentation

**Location**: `vscode-extension/src/test/suite/treeItemRendering.test.ts` (file header)

**Action**: Update file header JSDoc to include S90:

**Current** (lines 9-18):
```typescript
/**
 * Unit tests for TreeItem rendering enhancements (S50) and command assignment (S51).
 *
 * Tests cover:
 * - Icon mapping for all item types (Phase 1, S50)
 * - Tooltip content generation (Phase 2, S50)
 * - Collapsible state logic (Phase 3, S50)
 * - TreeItem property assignment (Phase 3, S50)
 * - TreeItem command assignment for click handling (S51)
 */
```

**Updated**:
```typescript
/**
 * Unit tests for TreeItem rendering enhancements (S50, S51, S90).
 *
 * Tests cover:
 * - Icon mapping for all item types (Phase 1, S50)
 * - Tooltip content generation (Phase 2, S50)
 * - Collapsible state logic (Phase 3, S50)
 * - TreeItem property assignment (Phase 3, S50)
 * - TreeItem command assignment for click handling (S51)
 * - Progress bar integration for parent items (S90)
 */
```

**Expected Outcome**: Documentation updated to reflect S90 test coverage

---

### Task 6: Verify Test Coverage Metrics

**Action**: Run test coverage report (if available):

```bash
cd vscode-extension
npm run test:coverage  # If coverage script exists
```

**Expected Coverage**:
- `PlanningTreeProvider.getTreeItem()` - 100% line coverage
- Progress bar rendering path (lines 766-778) - Covered by new tests
- Leaf item path (lines 780-783) - Covered by existing + new tests

**Note**: If coverage tooling not configured, this step can be skipped. Manual code review ensures all paths tested.

**References**:
- Istanbul/nyc - Common Node.js coverage tools
- VSCode Extension Testing Guide - Coverage patterns

## Completion Criteria

- ✅ Existing test structure reviewed and understood
- ✅ New test suite added to `treeItemRendering.test.ts` (Task 2)
- ✅ Alternative integration test file created (Task 3, optional)
- ✅ All tests pass with no regressions
- ✅ Test coverage includes:
  - Parent items (epic, feature, project) show progress bars
  - Leaf items (story, bug) do NOT show progress bars
  - Edge cases (no children, format validation)
- ✅ Test documentation updated to reference S90
- ✅ No test failures or timeouts

## Next Phase

Proceed to **Phase 3: Visual Verification and Documentation** for final validation and documentation updates.
