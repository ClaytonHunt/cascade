---
spec: S42
phase: 2
title: Unit Tests
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 2: Unit Tests

## Overview

Create comprehensive unit tests for the status icon mapping module. Tests validate that each status value maps to the correct decoration properties (badge, tooltip, color) and that unknown statuses are handled gracefully.

## Prerequisites

- Phase 1 completed (`statusIcons.ts` implemented)
- Understanding of Mocha test framework (used by extension)
- Familiarity with VSCode test utilities

## Tasks

### Task 1: Create Test File

**Action**: Create test file in extension test suite

**File Path**: `vscode-extension/src/test/suite/statusIcons.test.ts`

**Code Sample**:
```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { getDecorationForStatus } from '../../statusIcons';
import { Status } from '../../types';

suite('Status Icons Test Suite', () => {
  // Tests will go here
});
```

**Expected Outcome**:
- Test file created in correct location
- Imports resolve correctly
- Test suite structure established

**Reference**: Existing test pattern in `decorationProvider.test.ts:1`

---

### Task 2: Test "Not Started" Status

**Action**: Verify decoration for "Not Started" status

**Code Sample**:
```typescript
test('getDecorationForStatus - Not Started', () => {
  const status: Status = 'Not Started';
  const decoration = getDecorationForStatus(status);

  // Verify decoration properties
  assert.strictEqual(decoration.badge, '○', 'Badge should be hollow circle');
  assert.strictEqual(decoration.tooltip, 'Not Started', 'Tooltip should match status');
  assert.strictEqual(decoration.color, undefined, 'Color should be undefined (default)');
});
```

**Expected Outcome**:
- Test passes with correct badge: `○`
- Tooltip matches status string
- Color is undefined (uses default)

**Validation**: Run `npm test` - test should pass

---

### Task 3: Test "In Planning" Status

**Action**: Verify decoration for "In Planning" status

**Code Sample**:
```typescript
test('getDecorationForStatus - In Planning', () => {
  const status: Status = 'In Planning';
  const decoration = getDecorationForStatus(status);

  assert.strictEqual(decoration.badge, '✎', 'Badge should be pencil');
  assert.strictEqual(decoration.tooltip, 'In Planning', 'Tooltip should match status');
  assert.ok(decoration.color instanceof vscode.ThemeColor, 'Color should be ThemeColor');
  assert.strictEqual((decoration.color as vscode.ThemeColor).id, 'charts.blue', 'Color should be info blue');
});
```

**Expected Outcome**:
- Badge is pencil symbol
- Color is ThemeColor with 'charts.blue' ID

**Validation**: Run `npm test` - test should pass

---

### Task 4: Test "Ready" Status

**Action**: Verify decoration for "Ready" status

**Code Sample**:
```typescript
test('getDecorationForStatus - Ready', () => {
  const status: Status = 'Ready';
  const decoration = getDecorationForStatus(status);

  assert.strictEqual(decoration.badge, '✓', 'Badge should be checkmark');
  assert.strictEqual(decoration.tooltip, 'Ready', 'Tooltip should match status');
  assert.ok(decoration.color instanceof vscode.ThemeColor, 'Color should be ThemeColor');
  assert.strictEqual((decoration.color as vscode.ThemeColor).id, 'charts.green', 'Color should be success green');
});
```

**Expected Outcome**:
- Badge is checkmark
- Color is success green

---

### Task 5: Test "In Progress" Status

**Action**: Verify decoration for "In Progress" status

**Code Sample**:
```typescript
test('getDecorationForStatus - In Progress', () => {
  const status: Status = 'In Progress';
  const decoration = getDecorationForStatus(status);

  assert.strictEqual(decoration.badge, '↻', 'Badge should be circular arrows');
  assert.strictEqual(decoration.tooltip, 'In Progress', 'Tooltip should match status');
  assert.ok(decoration.color instanceof vscode.ThemeColor, 'Color should be ThemeColor');
  assert.strictEqual((decoration.color as vscode.ThemeColor).id, 'charts.yellow', 'Color should be warning yellow');
});
```

**Expected Outcome**:
- Badge is circular arrows (in progress symbol)
- Color is warning yellow

---

### Task 6: Test "Blocked" Status

**Action**: Verify decoration for "Blocked" status

**Code Sample**:
```typescript
test('getDecorationForStatus - Blocked', () => {
  const status: Status = 'Blocked';
  const decoration = getDecorationForStatus(status);

  assert.strictEqual(decoration.badge, '⊘', 'Badge should be prohibition sign');
  assert.strictEqual(decoration.tooltip, 'Blocked', 'Tooltip should match status');
  assert.ok(decoration.color instanceof vscode.ThemeColor, 'Color should be ThemeColor');
  assert.strictEqual((decoration.color as vscode.ThemeColor).id, 'charts.red', 'Color should be error red');
});
```

**Expected Outcome**:
- Badge is prohibition symbol
- Color is error red

---

### Task 7: Test "Completed" Status

**Action**: Verify decoration for "Completed" status

**Code Sample**:
```typescript
test('getDecorationForStatus - Completed', () => {
  const status: Status = 'Completed';
  const decoration = getDecorationForStatus(status);

  assert.strictEqual(decoration.badge, '✔', 'Badge should be heavy checkmark');
  assert.strictEqual(decoration.tooltip, 'Completed', 'Tooltip should match status');
  assert.ok(decoration.color instanceof vscode.ThemeColor, 'Color should be ThemeColor');
  assert.strictEqual((decoration.color as vscode.ThemeColor).id, 'charts.green', 'Color should be success green');
});
```

**Expected Outcome**:
- Badge is heavy checkmark
- Color is success green (same as Ready)

---

### Task 8: Test Unknown Status (Edge Case)

**Action**: Verify graceful handling of invalid status values

**Code Sample**:
```typescript
test('getDecorationForStatus - Unknown Status', () => {
  // Type assertion to test unknown status handling
  const unknownStatus = 'InvalidStatus' as Status;
  const decoration = getDecorationForStatus(unknownStatus);

  // Should return default decoration with '?' badge
  assert.strictEqual(decoration.badge, '?', 'Badge should be question mark for unknown status');
  assert.strictEqual(decoration.tooltip, 'InvalidStatus', 'Tooltip should show actual status value');
  assert.ok(decoration.color instanceof vscode.ThemeColor, 'Color should be ThemeColor');
  assert.strictEqual((decoration.color as vscode.ThemeColor).id, 'charts.red', 'Color should be error red for unknown');
});
```

**Expected Outcome**:
- Unknown status doesn't crash
- Returns '?' badge as fallback
- Tooltip shows actual invalid value (helpful for debugging)
- Color is error red to indicate problem

**Validation**: This tests the nullish coalescing operator (`??`) from Phase 1, Task 6

---

### Task 9: Run Full Test Suite

**Action**: Execute all tests and verify results

**Command**:
```bash
cd vscode-extension
npm test
```

**Expected Outcome**:
- All 7 tests pass (6 status values + 1 unknown edge case)
- No compilation errors
- No runtime errors
- Test output shows green checkmarks

**Sample Output**:
```
Status Icons Test Suite
  ✓ getDecorationForStatus - Not Started
  ✓ getDecorationForStatus - In Planning
  ✓ getDecorationForStatus - Ready
  ✓ getDecorationForStatus - In Progress
  ✓ getDecorationForStatus - Blocked
  ✓ getDecorationForStatus - Completed
  ✓ getDecorationForStatus - Unknown Status

7 passing (15ms)
```

---

## Completion Criteria

- ✅ Test file created at `vscode-extension/src/test/suite/statusIcons.test.ts`
- ✅ Test suite imports statusIcons module correctly
- ✅ Test for "Not Started" status passes
- ✅ Test for "In Planning" status passes
- ✅ Test for "Ready" status passes
- ✅ Test for "In Progress" status passes
- ✅ Test for "Blocked" status passes
- ✅ Test for "Completed" status passes
- ✅ Test for unknown status edge case passes
- ✅ All 7 tests pass when running `npm test`
- ✅ No test failures or errors
- ✅ Test coverage includes badge, tooltip, and color validation

## Verification Steps

1. **Run Tests**:
   ```bash
   cd vscode-extension
   npm test
   ```
   Expected: 7 passing tests

2. **Check Test Output**:
   - Verify all status values tested
   - Verify unknown status edge case tested
   - No skipped or pending tests

3. **Code Coverage** (optional):
   ```bash
   npm run test -- --coverage
   ```
   Expected: 100% coverage of `statusIcons.ts`

## Edge Cases Covered

1. **All valid status values**: Tested individually (6 tests)
2. **Unknown status**: Tested with invalid value (1 test)
3. **ThemeColor instantiation**: Verified color objects created correctly
4. **Tooltip content**: Verified tooltip matches status string
5. **Default color handling**: Verified undefined color for "Not Started"

## Next Phase

Proceed to **Phase 3: Documentation and Integration Preparation** (`tasks/03-documentation-integration.md`) to finalize the module and prepare for S44 integration.
