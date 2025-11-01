---
spec: S82
phase: 2
title: Test Updates
status: Completed
priority: High
created: 2025-10-24
updated: 2025-10-24
---

# Phase 2: Test Updates

## Overview

Update automated tests in `treeItemRendering.test.ts` to verify badge rendering in TreeView item descriptions. This phase modifies existing test assertions to expect Codicon-formatted badge strings instead of plain-text status strings.

**Scope**: Single test file modification with targeted assertion updates

**Expected Outcome**: All TreeView tests pass with updated badge format expectations

## Prerequisites

- Phase 1 completed (badge integration in PlanningTreeProvider.ts)
- Badge renderer tests passing (S81)
- Understanding of VSCode extension testing framework
- Node.js test runner available (`npm test`)

## Tasks

### Task 1: Update Description Field Assertions

**Location**: `vscode-extension/src/test/suite/treeItemRendering.test.ts:65-200`

**Current State**: Tests expect plain-text status in `treeItem.description` field

**Analysis**:

The test file contains multiple test suites that verify `getTreeItem()` behavior:

1. **Icon Mapping Tests** (lines 67-150): Test icon assignment - NO CHANGES NEEDED
   - Icons use `ThemeIcon` (separate from description field)
   - Badge integration doesn't affect icon behavior

2. **Tooltip Tests** (lines 152-200): Test tooltip content - NO CHANGES NEEDED
   - Tooltips use structured format with metadata
   - Badge integration doesn't affect tooltip behavior

3. **Description Field Tests** (if present): Test description content - NEEDS UPDATES
   - Currently expect plain status strings (e.g., "In Progress")
   - Should expect badge strings (e.g., "$(sync) In Progress")

**Search Strategy**:

1. Search for description field assertions:
   ```bash
   # From vscode-extension directory
   grep -n "description" src/test/suite/treeItemRendering.test.ts
   ```

2. Identify test cases that assert on `treeItem.description`

3. Update assertions to expect Codicon badge format

**Implementation**:

For each test case that asserts on `treeItem.description`:

**Before** (Example - plain status):
```typescript
assert.strictEqual(treeItem.description, 'In Progress');
```

**After** (Example - badge status):
```typescript
assert.strictEqual(treeItem.description, '$(sync) In Progress');
```

**Badge Format Reference** (from S81):
```typescript
'Not Started'  → '$(circle-outline) Not Started'
'In Planning'  → '$(circle-filled) In Planning'
'Ready'        → '$(circle-filled) Ready'
'In Progress'  → '$(sync) In Progress'
'Blocked'      → '$(error) Blocked'
'Completed'    → '$(pass-filled) Completed'
'Archived'     → '$(archive) Archived'
```

**Expected Changes**:
- Replace plain status strings with Codicon badge format
- Preserve progress indicator format (e.g., `(3/5)` suffix for epics/features)
- Update test comments if they reference plain status format

**Validation**:
- Run tests: `npm test`
- All description field tests should pass
- No tests should fail due to badge format mismatch

**References**:
- Badge renderer mapping: `vscode-extension/src/treeview/badgeRenderer.ts:30-38`
- Test suite structure: `vscode-extension/src/test/suite/treeItemRendering.test.ts:1-300`

---

### Task 2: Add Badge Format Tests (If Missing)

**Location**: `vscode-extension/src/test/suite/treeItemRendering.test.ts:200+` (append new suite)

**Current State**: May not have explicit tests for description field format

**Analysis**:

If the existing test suite doesn't have dedicated description field tests, add a new test suite to verify badge rendering.

**Implementation**:

Add new test suite after existing suites (around line 200):

```typescript
  suite('Description Field Badge Rendering (S82)', () => {
    test('should render badge for story with status only', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S1', 'story', 'In Progress');
      const treeItem = await provider.getTreeItem(item);

      // Should render badge without progress indicator
      assert.strictEqual(treeItem.description, '$(sync) In Progress');
    });

    test('should render badge for epic without children', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('E1', 'epic', 'Ready');
      const treeItem = await provider.getTreeItem(item);

      // Should render badge without progress (no children)
      assert.strictEqual(treeItem.description, '$(circle-filled) Ready');
    });

    test('should render badge for epic with progress indicator', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('E2', 'epic', 'In Progress');

      // Mock calculateProgress to return progress data
      // Note: This requires provider setup with actual children or mock implementation
      // Simplified test assumes provider.calculateProgress() returns progress object

      const treeItem = await provider.getTreeItem(item);

      // Should render badge WITH progress indicator (format: "$(icon) Status (X/Y)")
      // Actual progress values depend on calculateProgress() implementation
      assert.ok(treeItem.description.startsWith('$(sync) In Progress'),
        'Description should start with badge');

      // If progress indicator present, verify format
      if (treeItem.description.includes('(')) {
        assert.match(treeItem.description, /\$\(.+\) .+ \(\d+\/\d+\)/,
          'Description should match badge + progress format');
      }
    });

    test('should render archive badge for archived items', async () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
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
        createMockOutputChannel()
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
```

**Test Coverage**:
- Story/Bug with badge only (no progress)
- Epic/Feature with badge only (no children)
- Epic/Feature with badge + progress (has children)
- Archived items with archive badge (overrides status field)
- All status values render correct badges

**Validation**:
- Run tests: `npm test`
- New test suite should pass
- Verify coverage includes all badge scenarios

**References**:
- Badge renderer tests: `vscode-extension/src/test/suite/badgeRenderer.test.ts:22-56` (reference for expected values)
- Archive detection tests: `vscode-extension/src/test/suite/archiveDetection.test.ts:1-100` (reference for archived item setup)

**Note**: If existing tests already cover these scenarios, skip adding new tests and only update assertions in Task 1.

---

## Completion Criteria

### Test Execution
- [ ] All tests pass: `npm test`
- [ ] No test failures related to description field format
- [ ] No test warnings or deprecation notices

### Test Coverage
- [ ] Description field assertions updated to expect badges
- [ ] Badge-only format tested (stories/bugs)
- [ ] Badge + progress format tested (epics/features with children)
- [ ] Archive badge override tested (archived items)
- [ ] All status values covered in tests

### Code Quality
- [ ] Test code follows existing patterns
- [ ] Test descriptions are clear and accurate
- [ ] No hardcoded values (use badge renderer constants where possible)
- [ ] Comments updated to reflect badge rendering

### Integration Verification
- [ ] Tests verify integration with Phase 1 changes
- [ ] No conflicts with existing test suites
- [ ] Test suite structure maintained

---

## Next Phase

Once all completion criteria are met:

1. **Run Full Test Suite**:
   ```bash
   cd vscode-extension
   npm test
   ```

2. **Verify All Tests Pass**:
   - Check test output for failures
   - Verify TreeView tests pass
   - Verify badge renderer tests pass (S81)
   - Verify archive detection tests pass (S80)

3. **Create Final Commit** (if not already committed):
   ```bash
   git add vscode-extension/src/treeview/PlanningTreeProvider.ts
   git add vscode-extension/src/test/suite/treeItemRendering.test.ts
   git commit -m "feat(treeview): integrate badge renderer into TreeView (S82)

   - Add badge rendering to PlanningTreeProvider.getTreeItem()
   - Update description field to use Codicon badges
   - Support archived item badge override
   - Update tests to verify badge format
   - All tests passing

   ✅ S82 - TreeView Badge Integration COMPLETE"
   ```

4. **Update Story Status**:
   - Mark S82 as "Completed" in `plans/epic-05-.../story-82-treeview-badge-integration.md`
   - Update timestamp field

5. **Performance Validation**:
   - Package extension: `npm run package`
   - Install locally: `code --install-extension cascade-0.1.0.vsix --force`
   - Reload window and verify TreeView refresh < 500ms with 100+ items
   - Check output channel for timing logs

6. **Visual Verification** (Final):
   - Open Cascade TreeView
   - Verify all items display badges correctly
   - Test in both Dark+ and Light+ themes
   - Verify no visual regressions

---

## Troubleshooting

### Issue: Tests Fail with "Expected X but got Y"

**Symptom**: Test assertions fail expecting plain status but getting badge format

**Solution**:
- Verify Task 1 completed (all assertions updated)
- Check badge format matches S81 spec exactly
- Compare expected vs. actual strings in test output

### Issue: Archive Badge Test Fails

**Symptom**: Archived item test expects archive badge but gets original status badge

**Solution**:
- Verify Phase 1 Task 2 completed (effective status determination)
- Check `isItemArchived()` logic in test mock item
- Ensure test item has `filePath` in archive directory or `status: Archived`

### Issue: Progress Indicator Format Broken

**Symptom**: Epic/Feature tests fail due to incorrect progress format

**Solution**:
- Verify Phase 1 Task 3 preserved progress calculation
- Check format matches: `$(icon) Status (X/Y)`
- Ensure space between badge and progress indicator

### Issue: Test Suite Doesn't Run

**Symptom**: `npm test` fails to execute or hangs

**Solution**:
- Verify Node.js version compatible (18.x recommended)
- Check `package.json` test script configuration
- Run `npm install` to ensure test dependencies installed
- Check for TypeScript compilation errors: `npm run compile`

---

## Code References

- **Test File**: `vscode-extension/src/test/suite/treeItemRendering.test.ts` (modification target)
- **Badge Renderer Tests**: `vscode-extension/src/test/suite/badgeRenderer.test.ts:22-56` (reference for expected badges)
- **Archive Detection Tests**: `vscode-extension/src/test/suite/archiveDetection.test.ts` (reference for archived item setup)
- **Badge Format Mapping**: `vscode-extension/src/treeview/badgeRenderer.ts:30-38` (source of truth for badge strings)
- **VSCode Test API**: https://code.visualstudio.com/api/working-with-extensions/testing-extension (test framework docs)
