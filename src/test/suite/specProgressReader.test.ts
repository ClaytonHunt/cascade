import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import { readSpecProgress, checkSyncStatus, SpecProgress } from '../../treeview/specProgressReader';
import { Status } from '../../types';

/**
 * Test suite for specProgressReader module.
 *
 * Coverage Summary:
 * - checkSyncStatus(): 10 tests (6 in-sync, 4 out-of-sync)
 * - readSpecProgress(): 2 tests (valid spec directories)
 *
 * checkSyncStatus() Tests:
 * - In-sync: Story/Spec status combinations that are synchronized
 * - Out-of-sync: Spec ahead of story status (needs sync)
 *
 * readSpecProgress() Tests:
 * - Valid spec directory: Reads S93 spec with proper frontmatter
 * - Phase counting: Verifies completed phase detection
 *
 * Future expansion (Phase 3 tasks):
 * - Missing directories (error handling)
 * - Missing plan.md (error handling)
 * - Malformed frontmatter (error handling)
 * - Edge cases (0 phases, missing fields, all completed)
 *
 * All tests use either real spec directories (S93) or temporary test directories
 * that are cleaned up after each test.
 */
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

  suite('readSpecProgress()', () => {
    test('should read progress from valid spec directory (S93)', async () => {
      // Use current spec directory S93 (known to have proper frontmatter)
      // Navigate up from vscode-extension directory to project root
      const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
      const specDir = path.join(projectRoot, 'specs', 'S93-spec-progress-reader-utility');
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

    test('should count completed phases correctly (S93)', async () => {
      // S93 has 3 phases, Phase 1 is Completed, Phase 2 In Progress
      const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
      const specDir = path.join(projectRoot, 'specs', 'S93-spec-progress-reader-utility');
      const storyStatus: Status = 'In Progress';

      const progress = await readSpecProgress(specDir, storyStatus);

      assert.ok(progress, 'Progress should not be null');

      if (progress) {
        // Verify phase count matches plan.md frontmatter
        assert.strictEqual(progress.totalPhases, 3, 'S93 should have 3 phases');
        // Phase 1 is marked Completed in frontmatter
        assert.ok(progress.completedPhases >= 1, 'At least Phase 1 should be completed');
        // Current phase should be 2 or 3 (depending on test execution time)
        assert.ok(progress.currentPhase >= 2, 'Current phase should be at least 2');
      }
    });
  });
});
