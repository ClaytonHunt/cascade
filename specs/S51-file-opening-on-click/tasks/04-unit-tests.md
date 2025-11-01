---
spec: S51
phase: 4
title: Unit Tests
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 4: Unit Tests

## Overview

Create comprehensive unit tests for the file opening functionality. Tests verify command registration, TreeItem configuration, and error handling using VSCode's testing framework with Mocha.

Tests follow the pattern established in `treeItemRendering.test.ts` (S50).

## Prerequisites

- Phase 1, 2, 3 completed (full implementation exists)
- VSCode testing framework configured (already done)
- Test runner available (Mocha + @vscode/test-electron)

## Tasks

### Task 1: Create Test File

**Location**: Create new file `vscode-extension/src/test/suite/fileOpening.test.ts`

Create file with initial imports and structure:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { PlanningTreeProvider } from '../../treeview/PlanningTreeProvider';
import { PlanningTreeItem } from '../../treeview/PlanningTreeItem';
import { FrontmatterCache } from '../../cache';
import { ItemType, Status, Priority } from '../../types';

/**
 * Unit tests for file opening functionality (S51).
 *
 * Tests cover:
 * - TreeItem command property assignment (Phase 3)
 * - Command structure validation
 * - Command arguments validation
 * - Error handling (manual testing only)
 *
 * Note: Command registration (Phase 2) cannot be unit tested without
 * extension activation. Verified via manual testing and output channel logging.
 *
 * Note: openPlanningFile function (Phase 1) cannot be unit tested because
 * it's not exported. Behavior verified via integration testing (manual clicks).
 */

// Helper functions and test suites follow...
```

**Why these imports?**
- `assert`: Node.js assertion library (used for test assertions)
- `vscode`: VSCode API (for TreeItem, Uri types)
- `PlanningTreeProvider`: Class under test
- `PlanningTreeItem`: Test data structure
- `FrontmatterCache`, `ItemType`, `Status`, `Priority`: Dependencies for creating test data

**Expected Outcome**: Test file created with proper structure and documentation

---

### Task 2: Create Test Helper Functions

**Location**: Same file, after imports and JSDoc

Add mock creation helpers (pattern from treeItemRendering.test.ts):

```typescript
/**
 * Creates a mock PlanningTreeItem for testing.
 */
function createMockItem(
  item: string,
  type: ItemType,
  status: Status = 'In Progress',
  priority: Priority = 'High',
  filePath: string = 'D:\\projects\\lineage\\plans\\test-item.md'
): PlanningTreeItem {
  return {
    item: item,
    title: 'Test Item Title',
    type: type,
    status: status,
    priority: priority,
    filePath: filePath
  };
}

/**
 * Creates a mock FrontmatterCache for testing.
 */
function createMockCache(): FrontmatterCache {
  // Return mock cache with minimal implementation
  // PlanningTreeProvider constructor requires cache, but helper methods don't use it
  return new FrontmatterCache(100);
}

/**
 * Creates a mock output channel for testing.
 */
function createMockOutputChannel(): vscode.OutputChannel {
  // Return mock output channel with minimal implementation
  return {
    name: 'Test',
    append: () => {},
    appendLine: () => {},
    clear: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {},
    replace: () => {}
  } as vscode.OutputChannel;
}
```

**Why these helpers?**
- **createMockItem**: Provides test data with sensible defaults
  - Reduces test boilerplate (don't need to specify every field)
  - Allows overriding specific fields (e.g., filePath for path tests)
  - Same pattern as S50 tests (consistency)
- **createMockCache**: Required for PlanningTreeProvider constructor
  - Not used in getTreeItem (doesn't call cache methods)
  - Minimal implementation sufficient (no behavior needed)
- **createMockOutputChannel**: Required for PlanningTreeProvider constructor
  - No-op implementation (tests don't check logging)
  - Satisfies TypeScript type requirements

**Expected Outcome**: Helper functions ready for use in test cases

---

### Task 3: Create Command Property Test Suite

**Location**: Same file, after helper functions

Add test suite for command property:

```typescript
suite('File Opening (S51)', () => {

  suite('Command Property Assignment', () => {
    test('should assign command property to TreeItem', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.command, 'TreeItem should have command property');
    });

    test('should use correct command ID', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = provider.getTreeItem(item);

      assert.strictEqual(
        treeItem.command?.command,
        'cascade.openFile',
        'Command ID should be "cascade.openFile"'
      );
    });

    test('should set command title', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = provider.getTreeItem(item);

      assert.strictEqual(
        treeItem.command?.title,
        'Open File',
        'Command title should be "Open File"'
      );
    });

    test('should pass filePath as command argument', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const testPath = 'D:\\projects\\lineage\\plans\\epic-04\\story-51.md';
      const item = createMockItem('S51', 'story', 'Ready', 'High', testPath);
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.command?.arguments, 'Command should have arguments');
      assert.strictEqual(
        treeItem.command?.arguments.length,
        1,
        'Command should have exactly one argument'
      );
      assert.strictEqual(
        treeItem.command?.arguments[0],
        testPath,
        'Command argument should be the file path'
      );
    });
  });

  // Next task: Add item type coverage tests
});
```

**Test Coverage**:
1. **Command property exists**: Verifies treeItem.command is assigned
2. **Command ID correct**: Verifies command matches registered command
3. **Command title set**: Verifies descriptive title provided
4. **Arguments passed correctly**: Verifies filePath argument structure

**Assertion Strategy**:
- Use `assert.ok()` for existence checks (truthy)
- Use `assert.strictEqual()` for value comparisons (strict equality)
- Optional chaining (`command?.property`) prevents TypeScript errors
- Descriptive failure messages (third parameter to assertions)

**Expected Outcome**: Command property tests pass

---

### Task 4: Add Item Type Coverage Tests

**Location**: Same file, after Command Property Assignment suite

Add test suite to verify command works for all item types:

```typescript
  suite('Command Assignment for All Item Types', () => {
    test('should assign command to project items', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('P1', 'project');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to epic items', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('E4', 'epic');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to feature items', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('F16', 'feature');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to story items', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to bug items', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('B1', 'bug');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to spec items', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S27', 'spec');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });

    test('should assign command to phase items', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('P1', 'phase');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.command);
      assert.strictEqual(treeItem.command?.command, 'cascade.openFile');
    });
  });
});
```

**Why test all types?**
- Acceptance criteria requires click works for all types (S51 AC)
- Ensures getTreeItem doesn't have conditional logic that skips command
- Regression prevention (future changes might break specific types)
- Comprehensive coverage (standard testing practice)

**Expected Outcome**: Command assigned to all 7 item types

---

### Task 5: Add Existing Properties Preservation Tests

**Location**: Same file, after Item Type Coverage suite

Add test suite to verify S50 properties still work:

```typescript
suite('File Opening (S51)', () => {
  // ... (previous test suites) ...

  suite('Existing Properties Preservation', () => {
    test('should preserve icon property', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
      assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'check');
    });

    test('should preserve tooltip property', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = provider.getTreeItem(item);

      assert.ok(typeof treeItem.tooltip === 'string');
      assert.ok((treeItem.tooltip as string).length > 0);
    });

    test('should preserve description property', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S51', 'story', 'Ready');
      const treeItem = provider.getTreeItem(item);

      assert.strictEqual(treeItem.description, 'Ready');
    });

    test('should preserve contextValue property', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = provider.getTreeItem(item);

      assert.strictEqual(treeItem.contextValue, 'story');
    });

    test('should preserve resourceUri property', () => {
      const provider = new PlanningTreeProvider(
        'D:\\test',
        createMockCache(),
        createMockOutputChannel()
      );
      const item = createMockItem('S51', 'story');
      const treeItem = provider.getTreeItem(item);

      assert.ok(treeItem.resourceUri);
    });
  });
});
```

**Why test preservation?**
- Ensures S51 changes don't break S50 functionality
- Regression testing (standard practice when modifying existing code)
- Documents that all properties work together (integration)

**Expected Outcome**: All existing properties still work correctly

---

### Task 6: Run Tests

**Location**: Terminal in `vscode-extension/` directory

Run the test suite:

```bash
npm test
```

**Expected Output**:
```
> cascade@0.1.0 test
> node ./dist/test/runTest.js

Running tests...

  File Opening (S51)
    Command Property Assignment
      ✓ should assign command property to TreeItem
      ✓ should use correct command ID
      ✓ should set command title
      ✓ should pass filePath as command argument
    Command Assignment for All Item Types
      ✓ should assign command to project items
      ✓ should assign command to epic items
      ✓ should assign command to feature items
      ✓ should assign command to story items
      ✓ should assign command to bug items
      ✓ should assign command to spec items
      ✓ should assign command to phase items
    Existing Properties Preservation
      ✓ should preserve icon property
      ✓ should preserve tooltip property
      ✓ should preserve description property
      ✓ should preserve contextValue property
      ✓ should preserve resourceUri property

  16 passing
```

**If tests fail**, check:
1. Phase 3 implementation (command property assignment in getTreeItem)
2. Command ID spelling ('cascade.openFile')
3. Arguments array structure ([element.filePath])
4. Test file syntax (TypeScript compilation)

**Common test failures**:
- `Expected undefined to be truthy` → Command property not assigned
- `Expected 'undefined' to equal 'cascade.openFile'` → Wrong command ID or not set
- `Expected 0 to equal 1` → Arguments array empty or missing

**Expected Outcome**: All 16 tests pass

---

### Task 7: Add Test to Test Suite Index

**Location**: `vscode-extension/src/test/suite/index.ts`

Verify the test file is discovered by the test runner. The existing index.ts uses glob pattern to find tests, so no changes needed. But verify pattern:

```typescript
// Current pattern in index.ts
const testsRoot = path.resolve(__dirname, '.');
const files: string[] = await glob('**/*.test.js', { cwd: testsRoot });
```

This pattern automatically discovers `fileOpening.test.js` (compiled from our .ts file).

**Verification**:
- Test file name: `fileOpening.test.ts` ✅ (matches pattern)
- Location: `test/suite/` directory ✅ (correct location)
- Compilation: `.ts` → `.js` via `npm run compile` ✅ (automatic)

**Expected Outcome**: Test automatically discovered, no changes needed

## Completion Criteria

- ✅ Test file created: `vscode-extension/src/test/suite/fileOpening.test.ts`
- ✅ Helper functions implemented (createMockItem, createMockCache, createMockOutputChannel)
- ✅ Command property tests implemented (4 tests)
- ✅ Item type coverage tests implemented (7 tests)
- ✅ Properties preservation tests implemented (5 tests)
- ✅ All tests pass (16/16)
- ✅ Test file follows existing patterns (treeItemRendering.test.ts)
- ✅ JSDoc documentation included
- ✅ TypeScript compiles without errors
- ✅ No ESLint warnings (if configured)

## Testing

Run full test suite:

```bash
cd vscode-extension
npm test
```

Expected: All tests pass, including new S51 tests and existing tests (S50, etc.).

## Manual Testing

After unit tests pass, perform manual testing from Phase 3:

1. Package and install extension
2. Click items in TreeView
3. Verify files open in editor
4. Test error handling (delete file, then click)
5. Verify all item types work
6. Check output channel for logging

See Phase 3 completion criteria for full manual test checklist.

## Troubleshooting

### Tests fail with "Command not found"
- **Cause**: Command not registered or wrong ID
- **Fix**: Verify Phase 2 implementation (command registration)
- **Check**: Look for 'cascade.openFile' in extension.ts

### Tests fail with "Cannot read property 'command' of undefined"
- **Cause**: getTreeItem returns undefined or command not assigned
- **Fix**: Verify Phase 3 implementation (command property assignment)
- **Check**: Look for `treeItem.command = { ... }` in PlanningTreeProvider.ts

### Tests pass but clicking doesn't work
- **Cause**: Extension not reloaded or command handler broken
- **Fix**: Reload VSCode window after installing extension
- **Check**: Output channel should show "Available commands: ... cascade.openFile"

### Files don't open when clicked
- **Cause**: openPlanningFile function broken or wrong file path
- **Fix**: Check Phase 1 implementation (helper function)
- **Check**: Output channel should show error if file opening fails

## Next Steps

All phases complete!

**Final steps before closing story**:
1. ✅ All unit tests pass
2. ✅ All manual tests pass (Phase 3 checklist)
3. ✅ Update S51 status to "Ready" → "In Progress" → "Completed"
4. ✅ Commit changes with descriptive message
5. ✅ Optional: Create demo video/screenshots for documentation

**Story S51 complete!** Users can now click planning items in TreeView to open files in editor.
