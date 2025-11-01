import * as assert from 'assert';
import { renderProgressBar, PROGRESS_BAR_LENGTH, FILLED_BLOCK, EMPTY_BLOCK } from '../../treeview/progressRenderer';
import { ProgressInfo } from '../../treeview/PlanningTreeProvider';

suite('Progress Bar Renderer Test Suite', () => {
  suite('Module Structure', () => {
    test('renderProgressBar function should be exported', () => {
      assert.strictEqual(typeof renderProgressBar, 'function',
        'renderProgressBar should be a function');
    });

    test('Constants should be exported', () => {
      assert.strictEqual(typeof PROGRESS_BAR_LENGTH, 'number',
        'PROGRESS_BAR_LENGTH should be a number');
      assert.strictEqual(PROGRESS_BAR_LENGTH, 10,
        'PROGRESS_BAR_LENGTH should be 10');
      assert.strictEqual(typeof FILLED_BLOCK, 'string',
        'FILLED_BLOCK should be a string');
      assert.strictEqual(FILLED_BLOCK, '█',
        'FILLED_BLOCK should be U+2588');
      assert.strictEqual(typeof EMPTY_BLOCK, 'string',
        'EMPTY_BLOCK should be a string');
      assert.strictEqual(EMPTY_BLOCK, '░',
        'EMPTY_BLOCK should be U+2591');
    });

    test('renderProgressBar should return a string', () => {
      const progress: ProgressInfo = {
        completed: 5,
        total: 10,
        percentage: 50,
        display: '(5/10)'
      };
      const result = renderProgressBar(progress);

      assert.ok(result, 'renderProgressBar should return a truthy value');
      assert.strictEqual(typeof result, 'string', 'renderProgressBar should return a string');
      assert.ok(result.length > 0, 'renderProgressBar should return a non-empty string');
    });
  });

  suite('Progress Bar Rendering', () => {
    test('Render 0% progress', () => {
      const progress: ProgressInfo = {
        completed: 0,
        total: 5,
        percentage: 0,
        display: '(0/5)'
      };
      const bar = renderProgressBar(progress);
      assert.strictEqual(bar, '░░░░░░░░░░ 0% (0/5)',
        'Should render 0% as all empty blocks');
    });

    test('Render 10% progress', () => {
      const progress: ProgressInfo = {
        completed: 1,
        total: 10,
        percentage: 10,
        display: '(1/10)'
      };
      const bar = renderProgressBar(progress);
      assert.strictEqual(bar, '█░░░░░░░░░ 10% (1/10)',
        'Should render 10% as 1 filled block');
    });

    test('Render 30% progress', () => {
      const progress: ProgressInfo = {
        completed: 3,
        total: 10,
        percentage: 30,
        display: '(3/10)'
      };
      const bar = renderProgressBar(progress);
      assert.strictEqual(bar, '███░░░░░░░ 30% (3/10)',
        'Should render 30% as 3 filled blocks');
    });

    test('Render 50% progress', () => {
      const progress: ProgressInfo = {
        completed: 5,
        total: 10,
        percentage: 50,
        display: '(5/10)'
      };
      const bar = renderProgressBar(progress);
      assert.strictEqual(bar, '█████░░░░░ 50% (5/10)',
        'Should render 50% as 5 filled blocks');
    });

    test('Render 75% progress', () => {
      const progress: ProgressInfo = {
        completed: 3,
        total: 4,
        percentage: 75,
        display: '(3/4)'
      };
      const bar = renderProgressBar(progress);
      assert.strictEqual(bar, '████████░░ 75% (3/4)',
        'Should render 75% as 8 filled blocks (7.5 rounds to 8)');
    });

    test('Render 100% progress', () => {
      const progress: ProgressInfo = {
        completed: 5,
        total: 5,
        percentage: 100,
        display: '(5/5)'
      };
      const bar = renderProgressBar(progress);
      assert.strictEqual(bar, '██████████ 100% (5/5)',
        'Should render 100% as all filled blocks');
    });
  });

  suite('Rounding Behavior', () => {
    test('Render 33% progress (rounding down)', () => {
      const progress: ProgressInfo = {
        completed: 1,
        total: 3,
        percentage: 33,
        display: '(1/3)'
      };
      const bar = renderProgressBar(progress);
      assert.strictEqual(bar, '███░░░░░░░ 33% (1/3)',
        'Should render 33% as 3 filled blocks (3.3 rounds to 3)');

      // Verify exactly 3 filled blocks
      const filledCount = (bar.match(/█/g) || []).length;
      assert.strictEqual(filledCount, 3, 'Should have exactly 3 filled blocks');
    });

    test('Render 67% progress (rounding up)', () => {
      const progress: ProgressInfo = {
        completed: 2,
        total: 3,
        percentage: 67,
        display: '(2/3)'
      };
      const bar = renderProgressBar(progress);
      assert.strictEqual(bar, '███████░░░ 67% (2/3)',
        'Should render 67% as 7 filled blocks (6.7 rounds to 7)');

      // Verify exactly 7 filled blocks
      const filledCount = (bar.match(/█/g) || []).length;
      assert.strictEqual(filledCount, 7, 'Should have exactly 7 filled blocks');
    });

    test('Render 25% progress (exact quarter)', () => {
      const progress: ProgressInfo = {
        completed: 1,
        total: 4,
        percentage: 25,
        display: '(1/4)'
      };
      const bar = renderProgressBar(progress);

      // 25% * 10 = 2.5, rounds to 2 or 3
      const filledCount = (bar.match(/█/g) || []).length;
      assert.ok(filledCount === 2 || filledCount === 3,
        'Should have 2 or 3 filled blocks for 25%');
    });
  });

  suite('Format Validation', () => {
    test('Bar should be exactly 10 characters long', () => {
      const testCases = [0, 10, 25, 50, 75, 100];

      testCases.forEach(percentage => {
        const progress: ProgressInfo = {
          completed: percentage / 10,
          total: 10,
          percentage: percentage,
          display: `(${percentage / 10}/10)`
        };
        const bar = renderProgressBar(progress);

        // Extract just the bar portion (before the space)
        const barPortion = bar.split(' ')[0];
        assert.strictEqual(barPortion.length, 10,
          `Bar portion should be 10 characters at ${percentage}%`);
      });
    });

    test('Bar should contain correct Unicode characters', () => {
      const progress: ProgressInfo = {
        completed: 5,
        total: 10,
        percentage: 50,
        display: '(5/10)'
      };
      const bar = renderProgressBar(progress);

      // Should only contain filled blocks, empty blocks, digits, spaces, %, (, ), /
      const validPattern = /^[█░ 0-9%()\/]+$/;
      assert.ok(validPattern.test(bar),
        'Bar should only contain valid characters');
    });

    test('Bar should include percentage and counts', () => {
      const progress: ProgressInfo = {
        completed: 3,
        total: 6,
        percentage: 50,
        display: '(3/6)'
      };
      const bar = renderProgressBar(progress);

      assert.ok(bar.includes('50%'), 'Bar should include percentage');
      assert.ok(bar.includes('(3/6)'), 'Bar should include completion counts');
    });

    test('Bar format matches expected pattern', () => {
      const progress: ProgressInfo = {
        completed: 7,
        total: 10,
        percentage: 70,
        display: '(7/10)'
      };
      const bar = renderProgressBar(progress);

      // Expected format: "{blocks} {percentage}% ({completed}/{total})"
      const pattern = /^[█░]{10} \d+% \(\d+\/\d+\)$/;
      assert.ok(pattern.test(bar),
        `Bar should match expected format pattern: "${bar}"`);
    });
  });

  suite('Pure Function Behavior', () => {
    test('Function is deterministic', () => {
      const progress: ProgressInfo = {
        completed: 5,
        total: 10,
        percentage: 50,
        display: '(5/10)'
      };

      // Call function multiple times with same input
      const bar1 = renderProgressBar(progress);
      const bar2 = renderProgressBar(progress);
      const bar3 = renderProgressBar(progress);

      // Should return identical results
      assert.strictEqual(bar1, bar2,
        'Function should return same result for same input (call 1 vs 2)');
      assert.strictEqual(bar2, bar3,
        'Function should return same result for same input (call 2 vs 3)');
    });

    test('Function has no side effects', () => {
      const progress: ProgressInfo = {
        completed: 3,
        total: 6,
        percentage: 50,
        display: '(3/6)'
      };

      // Save original values
      const originalCompleted = progress.completed;
      const originalTotal = progress.total;
      const originalPercentage = progress.percentage;

      // Call function
      const bar = renderProgressBar(progress);

      // Verify input is not mutated
      assert.strictEqual(progress.completed, originalCompleted,
        'Function should not mutate completed count');
      assert.strictEqual(progress.total, originalTotal,
        'Function should not mutate total count');
      assert.strictEqual(progress.percentage, originalPercentage,
        'Function should not mutate percentage');

      // Verify output is correct
      assert.strictEqual(bar, '█████░░░░░ 50% (3/6)',
        'Function should return correct bar');
    });
  });

  suite('Performance Benchmarks', () => {
    /**
     * Performance Benchmark Results (S89 Acceptance Criteria)
     *
     * Target Performance:
     * - Single call: < 1ms
     * - 1000 calls: < 10ms
     * - Pure function (O(1) string operations)
     *
     * Expected Performance:
     * - Single call: ~0.001-0.01ms (string operations only)
     * - 1000 calls: ~1-5ms (minimal overhead)
     * - Similar to badgeRenderer performance characteristics
     *
     * Performance Characteristics:
     * - O(1) arithmetic operations (percentage to block count)
     * - O(N) string repeat (N = 10, constant)
     * - No external dependencies
     * - JIT-friendly (small, hot function)
     * - GC-friendly (short-lived strings)
     */

    test('Single progress bar generation < 1ms', () => {
      const progress: ProgressInfo = {
        completed: 5,
        total: 10,
        percentage: 50,
        display: '(5/10)'
      };

      // Measure single call performance
      const startTime = performance.now();
      const bar = renderProgressBar(progress);
      const endTime = performance.now();

      const durationMs = endTime - startTime;

      // Verify bar is correct (not just fast)
      assert.strictEqual(bar, '█████░░░░░ 50% (5/10)',
        'Bar should be correct');

      // Performance assertion
      assert.ok(durationMs < 1,
        `Progress bar generation should be < 1ms (actual: ${durationMs.toFixed(3)}ms)`);
    });

    test('1000 progress bar generations < 10ms', () => {
      const testData: ProgressInfo[] = [
        { completed: 0, total: 10, percentage: 0, display: '(0/10)' },
        { completed: 3, total: 10, percentage: 30, display: '(3/10)' },
        { completed: 5, total: 10, percentage: 50, display: '(5/10)' },
        { completed: 7, total: 10, percentage: 70, display: '(7/10)' },
        { completed: 10, total: 10, percentage: 100, display: '(10/10)' }
      ];

      // Measure 1000 calls
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        // Cycle through test data (realistic distribution)
        const progress = testData[i % testData.length];
        const bar = renderProgressBar(progress);

        // Compiler optimization prevention
        if (bar.length === 0) {
          throw new Error('Unexpected empty bar');
        }
      }

      const endTime = performance.now();
      const durationMs = endTime - startTime;

      // Performance assertion
      assert.ok(durationMs < 10,
        `1000 progress bar generations should be < 10ms (actual: ${durationMs.toFixed(3)}ms)`);

      // Log performance for manual review
      console.log(`[Performance] 1000 progress bar generations: ${durationMs.toFixed(3)}ms`);
      console.log(`[Performance] Average per call: ${(durationMs / 1000).toFixed(6)}ms`);
    });

    test('10000 progress bar generations < 100ms (stress test)', () => {
      const progress: ProgressInfo = {
        completed: 5,
        total: 10,
        percentage: 50,
        display: '(5/10)'
      };

      // Measure 10,000 calls (stress test scenario)
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        const bar = renderProgressBar(progress);

        // Compiler optimization prevention
        if (bar.length === 0) {
          throw new Error('Unexpected empty bar');
        }
      }

      const endTime = performance.now();
      const durationMs = endTime - startTime;

      // Stress test assertion
      assert.ok(durationMs < 100,
        `10,000 progress bar generations should be < 100ms (actual: ${durationMs.toFixed(3)}ms)`);

      // Log performance
      console.log(`[Performance] 10,000 progress bar generations: ${durationMs.toFixed(3)}ms`);
      console.log(`[Performance] Average per call: ${(durationMs / 10000).toFixed(6)}ms`);
    });
  });
});
