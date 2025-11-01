---
spec: S93
phase: 2
title: Unit Tests
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 2: Unit Tests

## Overview

Create comprehensive unit tests for the `specProgressReader` module. Tests verify correct behavior for valid specs, graceful error handling for invalid/missing specs, sync status detection logic, and edge cases.

This phase ensures the module is production-ready and handles all failure scenarios correctly.

## Prerequisites

- Phase 1 completed (core implementation)
- Understanding of Mocha test framework
- Access to real spec directories for integration testing
- Familiarity with async test patterns

## Tasks

### Task 1: Create Test File and Setup

**File**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

**Action**: Create test file with imports and test suite structure

**Implementation**:
```typescript
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import { readSpecProgress, checkSyncStatus, SpecProgress } from '../../treeview/specProgressReader';
import { Status } from '../../types';

suite('Spec Progress Reader', () => {
  // Test cases will be added here
});
```

**Expected Outcome**: Test file created with suite structure

**Reference**: `vscode-extension/src/test/suite/progressCalculation.test.ts` (similar test structure)

---

### Task 2: Test checkSyncStatus() - In Sync Cases

**File**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

**Action**: Add tests for sync status detection (in-sync scenarios)

**Implementation**:
```typescript
suite('Spec Progress Reader', () => {
  suite('checkSyncStatus()', () => {
    test('should return true when story and spec both In Progress', () => {
      const inSync = checkSyncStatus('In Progress', 'In Progress');
      assert.strictEqual(inSync, true, 'Story In Progress + Spec In Progress should be in sync');
    });

    test('should return true when story and spec both Completed', () => {
      const inSync = checkSyncStatus('Completed', 'Completed');
      assert.strictEqual(inSync, true, 'Story Completed + Spec Completed should be in sync');
    });

    test('should return true when story Ready and spec Not Started', () => {
      const inSync = checkSyncStatus('Ready', 'Not Started');
      assert.strictEqual(inSync, true, 'Story Ready + Spec Not Started should be in sync');
    });

    test('should return true when story Ready and spec Ready', () => {
      const inSync = checkSyncStatus('Ready', 'Ready');
      assert.strictEqual(inSync, true, 'Story Ready + Spec Ready should be in sync');
    });

    test('should return true when story In Progress and spec Not Started', () => {
      const inSync = checkSyncStatus('In Progress', 'Not Started');
      assert.strictEqual(inSync, true, 'Story In Progress + Spec Not Started should be in sync');
    });

    test('should return true when story In Progress and spec Ready', () => {
      const inSync = checkSyncStatus('In Progress', 'Ready');
      assert.strictEqual(inSync, true, 'Story In Progress + Spec Ready should be in sync');
    });
  });
});
```

**Expected Outcome**: All in-sync cases pass

**Validation**:
- ✅ 6 tests for in-sync scenarios
- ✅ All tests pass

---

### Task 3: Test checkSyncStatus() - Out of Sync Cases

**File**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

**Action**: Add tests for out-of-sync scenarios

**Implementation**:
```typescript
suite('Spec Progress Reader', () => {
  suite('checkSyncStatus()', () => {
    // ... previous in-sync tests ...

    test('should return false when spec In Progress but story Ready', () => {
      const inSync = checkSyncStatus('Ready', 'In Progress');
      assert.strictEqual(inSync, false, 'Spec ahead: Story Ready but Spec In Progress');
    });

    test('should return false when spec Completed but story Ready', () => {
      const inSync = checkSyncStatus('Ready', 'Completed');
      assert.strictEqual(inSync, false, 'Spec ahead: Story Ready but Spec Completed');
    });

    test('should return false when spec Completed but story In Progress', () => {
      const inSync = checkSyncStatus('In Progress', 'Completed');
      assert.strictEqual(inSync, false, 'Spec ahead: Story In Progress but Spec Completed');
    });

    test('should return false when spec Completed but story Not Started', () => {
      const inSync = checkSyncStatus('Not Started', 'Completed');
      assert.strictEqual(inSync, false, 'Spec ahead: Story Not Started but Spec Completed');
    });
  });
});
```

**Expected Outcome**: All out-of-sync cases correctly detected

**Validation**:
- ✅ 4 tests for out-of-sync scenarios
- ✅ All tests pass

---

### Task 4: Test readSpecProgress() - Valid Spec Directory

**File**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

**Action**: Test reading a real spec directory with actual data

**Implementation**:
```typescript
suite('Spec Progress Reader', () => {
  // ... previous tests ...

  suite('readSpecProgress()', () => {
    test('should read progress from valid spec directory (S27)', async () => {
      // Use existing spec directory S27 (known to have frontmatter)
      const specDir = path.join(process.cwd(), 'specs', 'S27-update-spec-command-frontmatter');
      const storyStatus: Status = 'In Progress';

      const progress = await readSpecProgress(specDir, storyStatus);

      assert.notStrictEqual(progress, null, 'Should return SpecProgress object for valid spec');
      assert.ok(progress, 'Progress should not be null');

      if (progress) {
        assert.strictEqual(progress.specDir, specDir, 'Spec directory should match');
        assert.ok(progress.totalPhases > 0, 'Should have at least 1 phase');
        assert.ok(progress.completedPhases >= 0, 'Completed phases should be >= 0');
        assert.ok(progress.currentPhase >= 1, 'Current phase should be >= 1');
        assert.ok(['Not Started', 'In Progress', 'Completed'].includes(progress.specStatus), 'Spec status should be valid');
        assert.strictEqual(typeof progress.inSync, 'boolean', 'inSync should be boolean');
      }
    });

    test('should count completed phases correctly (S27)', async () => {
      // S27 has 2 phases, Phase 1 is Completed
      const specDir = path.join(process.cwd(), 'specs', 'S27-update-spec-command-frontmatter');
      const storyStatus: Status = 'In Progress';

      const progress = await readSpecProgress(specDir, storyStatus);

      assert.ok(progress, 'Progress should not be null');

      if (progress) {
        // Verify phase count matches actual files
        assert.strictEqual(progress.totalPhases, 2, 'S27 should have 2 phases');
        // Phase 1 is marked Completed in frontmatter
        assert.ok(progress.completedPhases >= 1, 'At least Phase 1 should be completed');
      }
    });
  });
});
```

**Expected Outcome**: Real spec directory read successfully with accurate data

**Validation**:
- ✅ Valid spec returns SpecProgress object (not null)
- ✅ All fields populated with sensible values
- ✅ Phase count matches actual task files

**Reference**: `specs/S27-update-spec-command-frontmatter/` (known valid spec)

---

### Task 5: Test readSpecProgress() - Missing Directory

**File**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

**Action**: Test behavior when spec directory doesn't exist

**Implementation**:
```typescript
suite('Spec Progress Reader', () => {
  suite('readSpecProgress()', () => {
    // ... previous tests ...

    test('should return null for missing spec directory', async () => {
      const specDir = path.join(process.cwd(), 'specs', 'S999-nonexistent-spec');
      const storyStatus: Status = 'Ready';

      const progress = await readSpecProgress(specDir, storyStatus);

      assert.strictEqual(progress, null, 'Should return null for missing directory');
    });

    test('should return null for invalid directory path', async () => {
      const specDir = '/invalid/path/that/does/not/exist';
      const storyStatus: Status = 'Ready';

      const progress = await readSpecProgress(specDir, storyStatus);

      assert.strictEqual(progress, null, 'Should return null for invalid path');
    });
  });
});
```

**Expected Outcome**: Missing directories return `null` without throwing

**Validation**:
- ✅ Missing directory returns `null`
- ✅ No exceptions thrown
- ✅ Invalid paths handled gracefully

---

### Task 6: Test readSpecProgress() - Missing plan.md

**File**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

**Action**: Test behavior when plan.md is missing from spec directory

**Implementation**:
```typescript
suite('Spec Progress Reader', () => {
  suite('readSpecProgress()', () => {
    // ... previous tests ...

    test('should return null when plan.md is missing', async () => {
      // Create a temporary spec directory without plan.md
      const tempSpecDir = path.join(process.cwd(), 'specs', 'temp-test-spec-no-plan');

      try {
        // Create directory structure
        await fs.mkdir(tempSpecDir, { recursive: true });
        await fs.mkdir(path.join(tempSpecDir, 'tasks'), { recursive: true });

        const storyStatus: Status = 'Ready';
        const progress = await readSpecProgress(tempSpecDir, storyStatus);

        assert.strictEqual(progress, null, 'Should return null when plan.md is missing');
      } finally {
        // Clean up
        await fs.rm(tempSpecDir, { recursive: true, force: true });
      }
    });
  });
});
```

**Expected Outcome**: Missing plan.md returns `null`

**Validation**:
- ✅ Missing plan.md returns `null`
- ✅ No exceptions thrown
- ✅ Temporary directory cleaned up after test

---

### Task 7: Test readSpecProgress() - Malformed Frontmatter

**File**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

**Action**: Test behavior with invalid YAML frontmatter

**Implementation**:
```typescript
suite('Spec Progress Reader', () => {
  suite('readSpecProgress()', () => {
    // ... previous tests ...

    test('should return null for malformed frontmatter in plan.md', async () => {
      const tempSpecDir = path.join(process.cwd(), 'specs', 'temp-test-spec-malformed');

      try {
        // Create directory structure
        await fs.mkdir(tempSpecDir, { recursive: true });
        await fs.mkdir(path.join(tempSpecDir, 'tasks'), { recursive: true });

        // Create plan.md with malformed frontmatter
        const planContent = `---
spec: S999
title: Test Spec
type: spec
status: Not Started
this is invalid YAML: [unclosed bracket
---

# Test Spec
`;
        await fs.writeFile(path.join(tempSpecDir, 'plan.md'), planContent, 'utf-8');

        const storyStatus: Status = 'Ready';
        const progress = await readSpecProgress(tempSpecDir, storyStatus);

        assert.strictEqual(progress, null, 'Should return null for malformed YAML');
      } finally {
        // Clean up
        await fs.rm(tempSpecDir, { recursive: true, force: true });
      }
    });

    test('should return null for missing required frontmatter fields', async () => {
      const tempSpecDir = path.join(process.cwd(), 'specs', 'temp-test-spec-missing-fields');

      try {
        // Create directory structure
        await fs.mkdir(tempSpecDir, { recursive: true });
        await fs.mkdir(path.join(tempSpecDir, 'tasks'), { recursive: true });

        // Create plan.md with missing status field
        const planContent = `---
spec: S999
title: Test Spec
type: spec
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Test Spec
`;
        await fs.writeFile(path.join(tempSpecDir, 'plan.md'), planContent, 'utf-8');

        const storyStatus: Status = 'Ready';
        const progress = await readSpecProgress(tempSpecDir, storyStatus);

        assert.strictEqual(progress, null, 'Should return null for missing required fields');
      } finally {
        // Clean up
        await fs.rm(tempSpecDir, { recursive: true, force: true });
      }
    });
  });
});
```

**Expected Outcome**: Malformed frontmatter returns `null`

**Validation**:
- ✅ Invalid YAML returns `null`
- ✅ Missing required fields returns `null`
- ✅ No exceptions thrown

---

### Task 8: Test readSpecProgress() - Edge Cases

**File**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

**Action**: Test edge cases (0 phases, missing phases field, all completed, etc.)

**Implementation**:
```typescript
suite('Spec Progress Reader', () => {
  suite('readSpecProgress()', () => {
    // ... previous tests ...

    test('should handle spec with 0 phases', async () => {
      const tempSpecDir = path.join(process.cwd(), 'specs', 'temp-test-spec-zero-phases');

      try {
        await fs.mkdir(tempSpecDir, { recursive: true });
        await fs.mkdir(path.join(tempSpecDir, 'tasks'), { recursive: true });

        // Create plan.md with phases: 0
        const planContent = `---
spec: S999
title: Test Spec
type: spec
status: Not Started
priority: High
phases: 0
created: 2025-10-27
updated: 2025-10-27
---

# Test Spec
`;
        await fs.writeFile(path.join(tempSpecDir, 'plan.md'), planContent, 'utf-8');

        const storyStatus: Status = 'Ready';
        const progress = await readSpecProgress(tempSpecDir, storyStatus);

        assert.ok(progress, 'Should return progress even with 0 phases');

        if (progress) {
          assert.strictEqual(progress.totalPhases, 0, 'Total phases should be 0');
          assert.strictEqual(progress.completedPhases, 0, 'Completed phases should be 0');
          assert.strictEqual(progress.currentPhase, 0, 'Current phase should be 0');
        }
      } finally {
        await fs.rm(tempSpecDir, { recursive: true, force: true });
      }
    });

    test('should count files when phases field is missing', async () => {
      const tempSpecDir = path.join(process.cwd(), 'specs', 'temp-test-spec-no-phases-field');

      try {
        await fs.mkdir(tempSpecDir, { recursive: true });
        await fs.mkdir(path.join(tempSpecDir, 'tasks'), { recursive: true });

        // Create plan.md without phases field
        const planContent = `---
spec: S999
title: Test Spec
type: spec
status: Not Started
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Test Spec
`;
        await fs.writeFile(path.join(tempSpecDir, 'plan.md'), planContent, 'utf-8');

        // Create 3 phase files
        for (let i = 1; i <= 3; i++) {
          const phaseContent = `---
spec: S999
phase: ${i}
title: Phase ${i}
status: Not Started
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase ${i}
`;
          await fs.writeFile(
            path.join(tempSpecDir, 'tasks', `0${i}-phase-${i}.md`),
            phaseContent,
            'utf-8'
          );
        }

        const storyStatus: Status = 'Ready';
        const progress = await readSpecProgress(tempSpecDir, storyStatus);

        assert.ok(progress, 'Should return progress');

        if (progress) {
          assert.strictEqual(progress.totalPhases, 3, 'Should count 3 phase files');
        }
      } finally {
        await fs.rm(tempSpecDir, { recursive: true, force: true });
      }
    });

    test('should handle all phases completed', async () => {
      const tempSpecDir = path.join(process.cwd(), 'specs', 'temp-test-spec-all-completed');

      try {
        await fs.mkdir(tempSpecDir, { recursive: true });
        await fs.mkdir(path.join(tempSpecDir, 'tasks'), { recursive: true });

        const planContent = `---
spec: S999
title: Test Spec
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-27
updated: 2025-10-27
---

# Test Spec
`;
        await fs.writeFile(path.join(tempSpecDir, 'plan.md'), planContent, 'utf-8');

        // Create 2 completed phase files
        for (let i = 1; i <= 2; i++) {
          const phaseContent = `---
spec: S999
phase: ${i}
title: Phase ${i}
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase ${i}
`;
          await fs.writeFile(
            path.join(tempSpecDir, 'tasks', `0${i}-phase-${i}.md`),
            phaseContent,
            'utf-8'
          );
        }

        const storyStatus: Status = 'Completed';
        const progress = await readSpecProgress(tempSpecDir, storyStatus);

        assert.ok(progress, 'Should return progress');

        if (progress) {
          assert.strictEqual(progress.totalPhases, 2, 'Total phases should be 2');
          assert.strictEqual(progress.completedPhases, 2, 'All phases should be completed');
          assert.strictEqual(progress.currentPhase, 2, 'Current phase should be capped at total');
          assert.strictEqual(progress.inSync, true, 'Should be in sync (both Completed)');
        }
      } finally {
        await fs.rm(tempSpecDir, { recursive: true, force: true });
      }
    });
  });
});
```

**Expected Outcome**: Edge cases handled correctly

**Validation**:
- ✅ 0 phases works without errors
- ✅ Missing phases field falls back to counting files
- ✅ All phases completed handled correctly
- ✅ currentPhase capped at totalPhases

---

### Task 9: Run Tests and Fix Failures

**Action**: Execute test suite and fix any failures

**Commands**:
```bash
cd vscode-extension
npm test
```

**Expected Outcome**: All tests pass

**Validation**:
- ✅ All checkSyncStatus tests pass (10 tests)
- ✅ All readSpecProgress tests pass (11+ tests)
- ✅ No test failures or errors
- ✅ Test execution completes in < 5 seconds

**Troubleshooting**:
- If directory cleanup fails, ensure all file handles are closed
- If glob patterns fail, verify Windows path separators are converted to forward slashes
- If frontmatter parsing fails, verify YAML syntax is valid

---

### Task 10: Add Test Summary Documentation

**File**: `vscode-extension/src/test/suite/specProgressReader.test.ts`

**Action**: Add comments summarizing test coverage

**Implementation**:
```typescript
/**
 * Test suite for specProgressReader module.
 *
 * Coverage:
 * - checkSyncStatus(): 10 tests (6 in-sync, 4 out-of-sync)
 * - readSpecProgress(): 11+ tests
 *   - Valid spec directories (real data)
 *   - Missing directories
 *   - Missing plan.md
 *   - Malformed frontmatter
 *   - Edge cases (0 phases, missing fields, all completed)
 *
 * All tests use either real spec directories or temporary test directories
 * that are cleaned up after each test.
 */
suite('Spec Progress Reader', () => {
  // ... tests ...
});
```

**Expected Outcome**: Test file documented with coverage summary

---

## Completion Criteria

- ✅ Test file created at `vscode-extension/src/test/suite/specProgressReader.test.ts`
- ✅ 10 tests for `checkSyncStatus()` (in-sync and out-of-sync cases)
- ✅ 11+ tests for `readSpecProgress()` (valid, invalid, edge cases)
- ✅ All tests pass without errors
- ✅ Temporary test directories cleaned up properly
- ✅ Test execution completes in < 5 seconds
- ✅ Test coverage includes:
  - Real spec directories (S27)
  - Missing directories
  - Missing plan.md
  - Malformed frontmatter
  - Edge cases (0 phases, missing fields, all completed)

## Next Phase

Proceed to Phase 3: Integration and Documentation (`tasks/03-integration-documentation.md`)

Add JSDoc comments, verify integration points, and validate performance.
