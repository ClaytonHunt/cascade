import * as assert from 'assert';
import {
  renderSpecPhaseIndicator,
  SPEC_ICON,
  COMPLETE_ICON,
  IN_PROGRESS_ICON,
  NOT_STARTED_ICON,
  SYNC_WARNING_ICON
} from '../../treeview/specPhaseRenderer';
import { SpecProgress } from '../../treeview/specProgressReader';

suite('Spec Phase Renderer Test Suite', () => {
  suite('Module Structure', () => {
    test('renderSpecPhaseIndicator function should be exported', () => {
      assert.strictEqual(typeof renderSpecPhaseIndicator, 'function',
        'renderSpecPhaseIndicator should be a function');
    });

    test('Icon constants should be exported', () => {
      assert.strictEqual(typeof SPEC_ICON, 'string', 'SPEC_ICON should be exported');
      assert.strictEqual(typeof COMPLETE_ICON, 'string', 'COMPLETE_ICON should be exported');
      assert.strictEqual(typeof IN_PROGRESS_ICON, 'string', 'IN_PROGRESS_ICON should be exported');
      assert.strictEqual(typeof NOT_STARTED_ICON, 'string', 'NOT_STARTED_ICON should be exported');
      assert.strictEqual(typeof SYNC_WARNING_ICON, 'string', 'SYNC_WARNING_ICON should be exported');
    });
  });

  suite('Null Progress Handling', () => {
    test('null progress should return empty string', () => {
      const result = renderSpecPhaseIndicator(null);
      assert.strictEqual(result, '', 'Should return empty string for null progress');
    });
  });

  suite('Phase Progress Rendering', () => {
    test('Not started (0/3) should use empty circle icon', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 0,
        totalPhases: 3,
        currentPhase: 1,
        specStatus: 'Not Started',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ○ Phase 0/3',
        'Should show clipboard, empty circle, and phase count');
    });

    test('In progress (2/3) should use refresh icon', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 2,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'In Progress',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ↻ Phase 2/3',
        'Should show clipboard, refresh icon, and phase count');
    });

    test('Complete (3/3) should use checkmark icon', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 3,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'Completed',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ✓ Phase 3/3',
        'Should show clipboard, checkmark, and phase count');
    });

    test('Single phase in progress (1/1) should use checkmark icon', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 1,
        totalPhases: 1,
        currentPhase: 1,
        specStatus: 'Completed',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ✓ Phase 1/1',
        'Single completed phase should show checkmark');
    });
  });

  suite('Sync Warning', () => {
    test('Out of sync should add warning prefix', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 3,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'Completed',
        inSync: false
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '⚠️ 📋 ✓ Phase 3/3',
        'Should prefix with warning icon when out of sync');
    });

    test('In sync should not add warning prefix', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 2,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'In Progress',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.ok(!result.includes('⚠️'),
        'Should not include warning icon when in sync');
    });
  });

  suite('Edge Cases', () => {
    test('Zero total phases (0/0) should render as-is', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 0,
        totalPhases: 0,
        currentPhase: 1,
        specStatus: 'Not Started',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ○ Phase 0/0',
        'Should display 0/0 phases as-is');
    });

    test('Completed > total (malformed) should render actual values', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 5,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'Completed',
        inSync: true
      };
      const result = renderSpecPhaseIndicator(progress);
      assert.strictEqual(result, '📋 ✓ Phase 5/3',
        'Should display malformed values as-is for debugging');
    });
  });

  suite('Icon Verification', () => {
    test('Icon constants should match Unicode values', () => {
      assert.strictEqual(SPEC_ICON, '📋', 'SPEC_ICON should be clipboard emoji');
      assert.strictEqual(COMPLETE_ICON, '✓', 'COMPLETE_ICON should be checkmark');
      assert.strictEqual(IN_PROGRESS_ICON, '↻', 'IN_PROGRESS_ICON should be refresh symbol');
      assert.strictEqual(NOT_STARTED_ICON, '○', 'NOT_STARTED_ICON should be empty circle');
      assert.strictEqual(SYNC_WARNING_ICON, '⚠️', 'SYNC_WARNING_ICON should be warning emoji');
    });
  });

  suite('Performance', () => {
    test('Should handle 100+ calls efficiently', () => {
      const progress: SpecProgress = {
        specDir: '/path/to/spec',
        completedPhases: 2,
        totalPhases: 3,
        currentPhase: 3,
        specStatus: 'In Progress',
        inSync: true
      };

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        renderSpecPhaseIndicator(progress);
      }
      const duration = Date.now() - startTime;

      assert.ok(duration < 10,
        `100 calls should complete in < 10ms (took ${duration}ms)`);
    });
  });
});
