/**
 * Spec phase indicator renderer for VSCode TreeView items.
 *
 * Provides compact visual indicators showing spec presence, phase
 * progress, and sync status. Uses Unicode icons for clear visual
 * distinction without taking excessive space.
 *
 * **Format:** `"📋 {icon} Phase {completed}/{total}"`
 * **Example:** `"📋 ↻ Phase 2/3"` for spec in progress
 *
 * **Icons:**
 * - ✓ (U+2713) Checkmark - All phases complete
 * - ↻ (U+21BB) Refresh - Spec in progress
 * - ○ (U+25CB) Circle - No phases started
 * - ⚠️ (U+26A0) Warning - Out of sync
 *
 * @module specPhaseRenderer
 * @see S95 - Spec Phase Indicator Rendering specification
 */

import { SpecProgress } from './specProgressReader';

/**
 * Unicode icon for spec presence.
 * 📋 Clipboard - indicates story has associated spec.
 */
export const SPEC_ICON = '📋';

/**
 * Unicode icon for completed spec.
 * ✓ Checkmark - all phases complete.
 */
export const COMPLETE_ICON = '✓';  // U+2713

/**
 * Unicode icon for spec in progress.
 * ↻ Refresh/cycle - phases actively being worked on.
 */
export const IN_PROGRESS_ICON = '↻';  // U+21BB

/**
 * Unicode icon for spec not started.
 * ○ Empty circle - no phases completed yet.
 */
export const NOT_STARTED_ICON = '○';  // U+25CB

/**
 * Unicode icon for sync warning.
 * ⚠️ Warning sign - spec/story status mismatch.
 */
export const SYNC_WARNING_ICON = '⚠️';  // U+26A0

/**
 * Selects the appropriate status icon based on phase completion state.
 *
 * @param completedPhases - Number of phases completed
 * @param totalPhases - Total number of phases
 * @returns Icon string (COMPLETE_ICON, IN_PROGRESS_ICON, or NOT_STARTED_ICON)
 *
 * @internal
 */
function selectStatusIcon(completedPhases: number, totalPhases: number): string {
  if (completedPhases >= totalPhases && totalPhases > 0) {
    // All phases complete (or malformed data where completed > total)
    return COMPLETE_ICON;
  } else if (completedPhases > 0) {
    // Some phases complete but not all
    return IN_PROGRESS_ICON;
  } else {
    // No phases completed (or 0/0 edge case)
    return NOT_STARTED_ICON;
  }
}

/**
 * Renders a compact spec phase indicator for TreeView display.
 *
 * Converts SpecProgress data into a visual string showing spec
 * presence, completion status, and phase progress. Designed to
 * fit in TreeItem.description alongside status badges and progress bars.
 *
 * **Performance:** Pure function with O(1) operations. Safe for
 * high-frequency calls during TreeView rendering (100+ items).
 *
 * **Format:** `"📋 {icon} Phase {completed}/{total}"`
 *
 * **Icon Selection:**
 * - All complete (3/3) → ✓ Checkmark
 * - In progress (2/3) → ↻ Refresh
 * - Not started (0/3) → ○ Circle
 *
 * **Sync Warning:**
 * - Prefix with ⚠️ when spec/story status mismatched
 *
 * @param progress - Spec progress data from readSpecProgress()
 * @returns Formatted indicator string, or empty string if no spec
 *
 * @example
 * const progress: SpecProgress = {
 *   completedPhases: 2,
 *   totalPhases: 3,
 *   inSync: true
 * };
 * const indicator = renderSpecPhaseIndicator(progress);
 * // Returns: "📋 ↻ Phase 2/3"
 *
 * @example
 * // Out of sync example
 * const progress: SpecProgress = {
 *   completedPhases: 3,
 *   totalPhases: 3,
 *   inSync: false
 * };
 * const indicator = renderSpecPhaseIndicator(progress);
 * // Returns: "⚠️ 📋 ✓ Phase 3/3"
 */
export function renderSpecPhaseIndicator(progress: SpecProgress | null): string {
  // No spec present
  if (!progress) {
    return '';
  }

  // Select status icon based on completion state
  const icon = selectStatusIcon(progress.completedPhases, progress.totalPhases);

  // Add sync warning if out of sync
  const syncWarning = progress.inSync ? '' : `${SYNC_WARNING_ICON} `;

  // Format: "{syncWarning}📋 {icon} Phase {completed}/{total}"
  return `${syncWarning}${SPEC_ICON} ${icon} Phase ${progress.completedPhases}/${progress.totalPhases}`;
}
