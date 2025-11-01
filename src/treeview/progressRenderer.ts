/**
 * Progress bar renderer utility for VSCode TreeView items.
 *
 * Provides Unicode-based progress bar generation for displaying
 * completion status of parent items (Epics, Features, Projects).
 *
 * The renderer uses Unicode box-drawing characters (filled/empty blocks)
 * to create visual progress bars that work in monospace fonts and
 * VSCode TreeView descriptions.
 *
 * **Format:** `"{filled}{empty} {percentage}% ({completed}/{total})"`
 * **Example:** `"█████░░░░░ 50% (3/6)"` for 50% completion
 *
 * **Bar Characteristics:**
 * - Fixed length: 10 characters
 * - Filled segment: U+2588 Full Block (█)
 * - Empty segment: U+2591 Light Shade (░)
 * - Scaling: Math.round((percentage / 100) * 10)
 *
 * Usage:
 * ```typescript
 * import { renderProgressBar } from './progressRenderer';
 * import { ProgressInfo } from './PlanningTreeProvider';
 *
 * const progress: ProgressInfo = {
 *   completed: 3,
 *   total: 6,
 *   percentage: 50,
 *   display: '(3/6)'
 * };
 *
 * const bar = renderProgressBar(progress);
 * // Returns: "█████░░░░░ 50% (3/6)"
 *
 * treeItem.description = `${statusBadge} ${bar}`;
 * // TreeItem displays: "$(sync) In Progress █████░░░░░ 50% (3/6)"
 * ```
 *
 * @module progressRenderer
 * @see S89 - Progress Bar Rendering specification
 * @see PlanningTreeProvider.ts - Consumer of this module (S90)
 * @see badgeRenderer.ts - Similar rendering utility pattern
 */

import { ProgressInfo } from './PlanningTreeProvider';

/**
 * Length of the progress bar in characters.
 * Fixed at 10 for balance between detail and space efficiency.
 */
export const PROGRESS_BAR_LENGTH = 10;

/**
 * Unicode character for filled progress segments.
 * U+2588 Full Block - solid black square.
 */
export const FILLED_BLOCK = '█';  // U+2588

/**
 * Unicode character for empty progress segments.
 * U+2591 Light Shade - dotted pattern for clear distinction.
 */
export const EMPTY_BLOCK = '░';  // U+2591

/**
 * Renders a visual progress bar using Unicode block characters.
 *
 * Converts progress statistics into a fixed-length Unicode bar string
 * with filled/empty segments, percentage, and completion counts.
 *
 * **Performance:** Pure function with O(1) string operations. Safe for
 * high-frequency calls during TreeView rendering (100+ items).
 *
 * **Bar Format:** `"{filled}{empty} {percentage}% ({completed}/{total})"`
 *
 * **Scaling Algorithm:**
 * - `filledCount = Math.round((percentage / 100) * PROGRESS_BAR_LENGTH)`
 * - `emptyCount = PROGRESS_BAR_LENGTH - filledCount`
 *
 * This ensures consistent rounding:
 * - 33% (1/3) → 3 filled blocks (rounds down from 3.3)
 * - 67% (2/3) → 7 filled blocks (rounds up from 6.7)
 *
 * **Examples:**
 * - 0%: `"░░░░░░░░░░ 0% (0/5)"`
 * - 10%: `"█░░░░░░░░░ 10% (1/10)"`
 * - 50%: `"█████░░░░░ 50% (3/6)"`
 * - 100%: `"██████████ 100% (5/5)"`
 *
 * @param progress - Progress information from calculateProgress()
 * @returns Formatted progress bar string with Unicode blocks
 *
 * @example
 * const progress: ProgressInfo = {
 *   completed: 3,
 *   total: 6,
 *   percentage: 50,
 *   display: '(3/6)'
 * };
 * const bar = renderProgressBar(progress);
 * // Returns: "█████░░░░░ 50% (3/6)"
 *
 * @example
 * const progress: ProgressInfo = {
 *   completed: 1,
 *   total: 3,
 *   percentage: 33,
 *   display: '(1/3)'
 * };
 * const bar = renderProgressBar(progress);
 * // Returns: "███░░░░░░░ 33% (1/3)" (rounding: 3.3 → 3)
 *
 * @see https://unicode-table.com/en/2588/ - U+2588 Full Block
 * @see https://unicode-table.com/en/2591/ - U+2591 Light Shade
 * @see calculateProgress() in PlanningTreeProvider.ts - Progress data source
 */
export function renderProgressBar(progress: ProgressInfo): string {
  // Calculate number of filled and empty blocks based on percentage
  const filledCount = Math.round((progress.percentage / 100) * PROGRESS_BAR_LENGTH);
  const emptyCount = PROGRESS_BAR_LENGTH - filledCount;

  // Generate filled and empty segments
  const filled = FILLED_BLOCK.repeat(filledCount);
  const empty = EMPTY_BLOCK.repeat(emptyCount);

  // Format: "{blocks} {percentage}% ({completed}/{total})"
  return `${filled}${empty} ${progress.percentage}% (${progress.completed}/${progress.total})`;
}
