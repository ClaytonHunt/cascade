---
spec: S76
phase: 2
title: Integration Testing and Performance Validation
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 2: Integration Testing and Performance Validation

## Overview

This phase validates the `isItemArchived()` utility function in real-world scenarios with actual planning files, filesystem operations, and performance benchmarking. We'll create test files in the archive directory, verify cross-platform behavior, and ensure the function meets performance targets.

By the end of this phase, you'll have confidence that the utility works correctly with VSCode's file system, handles edge cases gracefully, and performs efficiently with large item sets.

## Prerequisites

- Phase 1 completed (`isItemArchived()` function implemented and unit tested)
- All Phase 1 tests passing (`npm test`)
- TypeScript compilation succeeding (`npm run compile`)
- Write access to `plans/` directory for test file creation

## Tasks

### Task 1: Create Integration Test File Structure

**File to Create:** `vscode-extension/src/test/suite/archiveDetection.integration.test.ts`

**Instructions:**
1. Create new integration test file (separate from unit tests)
2. Import required modules (fs, path, etc.)
3. Set up test file cleanup utilities
4. Prepare for file-based testing

**Code to Add:**
```typescript
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

  // Test cases will be added in subsequent tasks
});
```

**Expected Outcome:**
- Integration test file created
- Test suite structure set up
- Cleanup helpers defined
- Imports resolve successfully

**Validation:**
Run test suite to verify structure:
```bash
cd vscode-extension
npm test -- --grep "Integration Tests"
```

---

### Task 2: Create Real Archive Directory Test Files

**File to Modify:** `vscode-extension/src/test/suite/archiveDetection.integration.test.ts`

**Instructions:**
1. Add test case that creates a real file in archive directory
2. Verify isItemArchived() detects it correctly
3. Test with absolute path (VSCode standard)
4. Clean up after test

**Code to Add** (inside the suite block):
```typescript
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
```

**Expected Outcome:**
- Test files created in correct directories
- Absolute paths used (matching VSCode behavior)
- Detection works with real filesystem paths
- Cleanup removes test files after execution

**Validation:**
```bash
npm test -- --grep "detects real file"
```

---

### Task 3: Test Nested Archive Paths

**File to Modify:** `vscode-extension/src/test/suite/archiveDetection.integration.test.ts`

**Instructions:**
1. Create nested directory structure in archive/
2. Create file deep in archive hierarchy
3. Verify detection works with nested paths
4. Clean up nested directories

**Code to Add** (inside the suite block):
```typescript
  test('detects file in nested archive directory structure', () => {
    // Create nested directory: plans/archive/epic-04/feature-16/
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
```

**Expected Outcome:**
- Nested directories created successfully
- File in deep hierarchy detected
- Cleanup removes nested structure
- No leftover directories after test

---

### Task 4: Performance Benchmark with Large Item Sets

**File to Modify:** `vscode-extension/src/test/suite/archiveDetection.integration.test.ts`

**Instructions:**
1. Generate 1000 mock PlanningTreeItem objects
2. Benchmark isItemArchived() execution time
3. Verify average time < 0.01ms per item
4. Verify total time < 10ms for 1000 items

**Code to Add** (inside the suite block):
```typescript
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
    assert.strictEqual(archivedCount, Math.floor(1000 / 3), 'Should detect ~333 archived items');
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
```

**Expected Outcome:**
- Performance benchmarks pass
- 1000 items processed in < 10ms
- 100 items processed in < 1ms
- Console shows actual timing results
- No performance regressions

**Validation:**
```bash
npm test -- --grep "performance"
```

---

### Task 5: Cross-Platform Path Testing

**File to Modify:** `vscode-extension/src/test/suite/archiveDetection.integration.test.ts`

**Instructions:**
1. Test Windows-style paths with backslashes
2. Test Unix-style paths with forward slashes
3. Test mixed separator paths
4. Verify normalization works correctly

**Code to Add** (inside the suite block):
```typescript
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
```

**Expected Outcome:**
- Windows paths normalized and detected
- Unix paths work correctly
- Mixed separators handled gracefully
- Case-insensitive matching verified
- All cross-platform tests pass

---

### Task 6: Edge Case Validation

**File to Modify:** `vscode-extension/src/test/suite/archiveDetection.integration.test.ts`

**Instructions:**
1. Test symbolic link handling (if applicable)
2. Test relative paths
3. Test empty/invalid paths
4. Test paths with special characters

**Code to Add** (inside the suite block):
```typescript
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
```

**Expected Outcome:**
- Relative paths handled correctly
- Trailing slashes don't cause issues
- Empty paths return false (no crashes)
- Special characters in filenames work
- All edge case tests pass

---

### Task 7: Run Complete Integration Test Suite

**Instructions:**
1. Run all integration tests
2. Verify cleanup happens correctly
3. Check no leftover test files
4. Review performance logs

**Validation Commands:**
```bash
cd vscode-extension

# Run integration tests specifically
npm test -- --grep "Integration Tests"

# Run all archive detection tests (unit + integration)
npm test -- --grep "Archive Detection"

# Check for leftover test files
ls plans/ | grep "test-integration"  # Should return empty

# Full test suite
npm test
```

**Expected Outcome:**
- All integration tests pass
- No test files left in plans/ directory
- Performance logs show timing under targets
- No regressions in other test suites

**Test Summary Output:**
```
Archive Detection - Integration Tests
  ✓ detects real file in plans/archive/ directory
  ✓ does not detect real file outside archive directory
  ✓ detects file in nested archive directory structure
  ✓ performance: handles 1000 items in < 10ms
  ✓ performance: handles 100 items in < 1ms
  ✓ cross-platform: handles Windows absolute paths
  ✓ cross-platform: handles Unix absolute paths
  ✓ cross-platform: handles mixed separators
  ✓ cross-platform: case-insensitive Archive directory
  ✓ edge case: relative path with archive directory
  ✓ edge case: path with trailing slash
  ✓ edge case: empty filePath returns false
  ✓ edge case: path with special characters

  13 passing
```

---

## Completion Criteria

Before proceeding to Phase 3, verify:

### Integration Tests
- ✅ Integration test file created
- ✅ Real file creation/deletion tests pass
- ✅ Nested archive directory tests pass
- ✅ Test cleanup working correctly
- ✅ No leftover test files in plans/

### Performance Benchmarks
- ✅ 1000 items processed in < 10ms
- ✅ 100 items processed in < 1ms
- ✅ Average time per item < 0.01ms
- ✅ Performance logs show actual timings

### Cross-Platform Support
- ✅ Windows paths tested and passing
- ✅ Unix paths tested and passing
- ✅ Mixed separators handled correctly
- ✅ Case-insensitive matching verified

### Edge Cases
- ✅ Relative paths handled
- ✅ Trailing slashes handled
- ✅ Empty paths handled gracefully
- ✅ Special characters in paths work
- ✅ All edge case tests passing

### Overall Quality
- ✅ All integration tests passing (13+ tests)
- ✅ All unit tests still passing (20+ tests)
- ✅ TypeScript compilation succeeds
- ✅ No test failures or errors

## Next Phase

Proceed to **Phase 3: Documentation and Export** (`03-documentation-export.md`)

This phase will complete the TSDoc documentation, export the function from the module index, and prepare the utility for consumption by S78 (Archive Filtering) and S80 (Visual Design).
