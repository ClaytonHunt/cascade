---
spec: S76
phase: 1
title: Core Archive Detection Utility
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 1: Core Archive Detection Utility

## Overview

This phase creates the standalone `isItemArchived()` utility function with comprehensive unit tests. The function implements dual-mode archive detection: checking both frontmatter status and file path location.

By the end of this phase, you'll have a fully tested, type-safe utility function ready for integration into the TreeView filtering system.

## Prerequisites

- S75 completed (Archived status type added to types.ts)
- TypeScript compilation working (`npm run compile`)
- Test framework set up (`npm test` runs successfully)
- Understanding of PlanningTreeItem interface structure

## Tasks

### Task 1: Create archiveUtils.ts File

**File to Create:** `vscode-extension/src/treeview/archiveUtils.ts`

**Instructions:**
1. Create new file in the treeview directory
2. Add file header comment explaining purpose
3. Import required types
4. Leave file structure ready for function implementation

**Code to Add:**
```typescript
/**
 * Archive detection utilities for Cascade TreeView.
 *
 * Provides functions to identify archived planning items based on:
 * - Frontmatter status field ('Archived')
 * - File path location (plans/archive/ directory)
 *
 * This enables flexible archival workflows where users can either:
 * 1. Set status: Archived in frontmatter, OR
 * 2. Move file to plans/archive/ directory
 */

import { PlanningTreeItem } from './PlanningTreeItem';

// Function implementation will be added in Task 2
```

**Expected Outcome:**
- File exists at correct path
- TypeScript compilation succeeds
- Import statement resolves correctly
- No linting errors

**Reference:**
- PlanningTreeItem interface: `vscode-extension/src/treeview/PlanningTreeItem.ts:22`

---

### Task 2: Implement isItemArchived() Function

**File to Modify:** `vscode-extension/src/treeview/archiveUtils.ts`

**Instructions:**
1. Add TSDoc comment explaining function behavior
2. Implement function with OR logic (status OR path)
3. Use path normalization for cross-platform support
4. Return boolean indicating archive status

**Code to Add:**
```typescript
/**
 * Checks if a planning item is archived.
 *
 * An item is archived if ANY of these conditions are true:
 * 1. Frontmatter status is 'Archived', OR
 * 2. File path contains '/archive/' directory
 *
 * Path detection is case-insensitive and handles both Windows (\) and Unix (/) separators.
 *
 * @param item - Planning tree item to check
 * @returns True if item is archived (either by status or location), false otherwise
 *
 * @example
 * // Archived by status
 * isItemArchived({ status: 'Archived', filePath: '/plans/epic.md', ... }) // → true
 *
 * @example
 * // Archived by location
 * isItemArchived({ status: 'Ready', filePath: '/plans/archive/epic.md', ... }) // → true
 *
 * @example
 * // Not archived
 * isItemArchived({ status: 'Ready', filePath: '/plans/epic.md', ... }) // → false
 */
export function isItemArchived(item: PlanningTreeItem): boolean {
  // Check 1: Frontmatter status is 'Archived'
  if (item.status === 'Archived') {
    return true;
  }

  // Check 2: File path contains archive directory
  // Normalize path: lowercase + forward slashes for cross-platform compatibility
  const normalizedPath = item.filePath.toLowerCase().replace(/\\/g, '/');

  // Check for '/archive/' in path (exact match with separators)
  // This prevents false positives like '/archive-old/' or 'archived-items/'
  if (normalizedPath.includes('/archive/')) {
    return true;
  }

  // Check for path ending with '/archive' (item directly in archive root)
  // Example: 'D:/projects/plans/archive' (no trailing slash)
  if (normalizedPath.endsWith('/archive')) {
    return true;
  }

  // Not archived
  return false;
}
```

**Expected Outcome:**
- Function compiles without TypeScript errors
- Function accepts PlanningTreeItem parameter
- Function returns boolean
- IntelliSense shows TSDoc comment in VS Code
- No runtime errors when called

**Validation:**
Run TypeScript compiler to check for errors:
```bash
cd vscode-extension
npm run compile
```

**Reference:**
- Status type definition: `vscode-extension/src/types.ts:14`
- PlanningTreeItem interface: `vscode-extension/src/treeview/PlanningTreeItem.ts:22`

---

### Task 3: Create Unit Test File

**File to Create:** `vscode-extension/src/test/suite/archiveDetection.test.ts`

**Instructions:**
1. Create new test file following existing test patterns
2. Import assert and the isItemArchived function
3. Set up test suite structure
4. Prepare for test cases (added in Task 4)

**Code to Add:**
```typescript
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

  // Test cases will be added in Task 4
});
```

**Expected Outcome:**
- Test file created in correct directory
- Imports resolve successfully
- TypeScript compilation succeeds
- Test runner recognizes new test suite (run `npm test` to verify)
- Helper function available for creating test items

**Reference:**
- Existing test pattern: `vscode-extension/src/test/suite/parserArchived.test.ts`
- Test suite structure: `vscode-extension/src/test/suite/statusIcons.test.ts`

---

### Task 4: Add Status-Based Detection Tests

**File to Modify:** `vscode-extension/src/test/suite/archiveDetection.test.ts`

**Instructions:**
1. Add test cases inside the suite block
2. Test frontmatter status detection
3. Verify OR logic behavior
4. Test non-archived items return false

**Code to Add** (inside the suite block):
```typescript
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
```

**Expected Outcome:**
- All 4 tests pass when running `npm test`
- Test output shows "Archive Detection Utility" suite
- Each test case has descriptive name
- Assertions use clear error messages

**Validation Command:**
```bash
cd vscode-extension
npm test -- --grep "Archive Detection"
```

---

### Task 5: Add Path-Based Detection Tests

**File to Modify:** `vscode-extension/src/test/suite/archiveDetection.test.ts`

**Instructions:**
1. Add path-based detection test cases
2. Test various archive path formats
3. Verify case-insensitivity
4. Test nested archive paths

**Code to Add** (inside the suite block, after Task 4 tests):
```typescript
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
```

**Expected Outcome:**
- All 6 additional tests pass
- Path normalization works correctly
- Case-insensitive matching verified
- Windows path handling confirmed

---

### Task 6: Add False Positive Prevention Tests

**File to Modify:** `vscode-extension/src/test/suite/archiveDetection.test.ts`

**Instructions:**
1. Add edge case tests to prevent false positives
2. Test directories with "archive" in name but not exact match
3. Test files with "archive" in filename
4. Verify exact match requirement

**Code to Add** (inside the suite block, after Task 5 tests):
```typescript
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
```

**Expected Outcome:**
- All 5 edge case tests pass
- False positives prevented
- Exact match logic verified
- Filename vs directory name handling confirmed

---

### Task 7: Add OR Logic Verification Tests

**File to Modify:** `vscode-extension/src/test/suite/archiveDetection.test.ts`

**Instructions:**
1. Add tests verifying OR logic behavior
2. Test both conditions true simultaneously
3. Test either condition true (both combinations)
4. Verify precedence doesn't matter

**Code to Add** (inside the suite block, after Task 6 tests):
```typescript
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
```

**Expected Outcome:**
- All 4 OR logic tests pass
- Either condition triggers archived detection
- Both conditions together still work
- Only returns false when neither condition met

---

### Task 8: Run Full Test Suite

**Instructions:**
1. Navigate to vscode-extension directory
2. Run complete test suite
3. Verify all archive detection tests pass
4. Check for any regressions in existing tests

**Validation Commands:**
```bash
cd vscode-extension

# Run all tests
npm test

# Run only archive detection tests
npm test -- --grep "Archive Detection"

# Verify compilation
npm run compile
```

**Expected Outcome:**
- All archive detection tests pass (20+ test cases)
- No existing tests broken
- TypeScript compilation succeeds
- Test output shows clear suite structure:
  ```
  Archive Detection Utility
    ✓ returns true when status is Archived
    ✓ returns true when path contains /archive/ directory
    ... (18+ more tests)
  ```

**Success Criteria:**
- ✅ All tests passing
- ✅ 0 TypeScript compilation errors
- ✅ 0 test failures
- ✅ Test coverage includes all edge cases

---

## Completion Criteria

Before proceeding to Phase 2, verify:

### Code Quality
- ✅ `archiveUtils.ts` created with isItemArchived() function
- ✅ TSDoc comments complete with usage examples
- ✅ Function signature type-safe (PlanningTreeItem → boolean)
- ✅ Path normalization handles Windows and Unix separators
- ✅ OR logic correctly implemented (status OR path)

### Test Coverage
- ✅ Test file created: `archiveDetection.test.ts`
- ✅ 20+ test cases covering all scenarios
- ✅ Status-based detection tested (4 tests)
- ✅ Path-based detection tested (6 tests)
- ✅ False positive prevention tested (5 tests)
- ✅ OR logic verified (4 tests)
- ✅ All tests passing

### Compilation and Build
- ✅ TypeScript compilation succeeds (`npm run compile`)
- ✅ No linting errors or warnings
- ✅ Test suite runs successfully (`npm test`)
- ✅ No regressions in existing tests

## Next Phase

Proceed to **Phase 2: Integration Testing** (`02-integration-testing.md`)

This phase will test the utility with real planning files, verify performance benchmarks, and ensure cross-platform compatibility in a production-like environment.
