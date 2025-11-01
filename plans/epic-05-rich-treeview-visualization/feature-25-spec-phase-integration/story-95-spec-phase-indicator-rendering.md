---
item: S95
title: Spec Phase Indicator Rendering
type: story
parent: F25
status: Completed
priority: High
dependencies: [S93, S94]
estimate: S
spec: specs/S95-spec-phase-indicator-rendering
created: 2025-10-26
updated: 2025-10-27
---

# S95 - Spec Phase Indicator Rendering

## Description

Create a rendering utility that formats SpecProgress data into compact visual indicators for TreeView display. The renderer generates strings like "📋 ✓ Phase 3/3" or "📋 ↻ Phase 2/3" that show spec presence, completion status, and phase progress.

This follows the same pattern as `badgeRenderer.ts` and `progressRenderer.ts`, providing a pure rendering function that takes progress data and returns formatted strings.

## Acceptance Criteria

1. **Rendering Function**:
   - [ ] Function `renderSpecPhaseIndicator(progress: SpecProgress | null): string`
   - [ ] Return empty string if progress is null (no spec)
   - [ ] Format: `📋 {icon} Phase {completed}/{total}`
   - [ ] Compact format (fits in TreeItem.description)

2. **Icon Logic**:
   - [ ] All phases complete → `✓` (checkmark)
   - [ ] Spec in progress → `↻` (spinner/cycle)
   - [ ] No phases started → `○` (empty circle)
   - [ ] Examples:
     - 0/3 phases → "📋 ○ Phase 0/3"
     - 2/3 phases → "📋 ↻ Phase 2/3"
     - 3/3 phases → "📋 ✓ Phase 3/3"

3. **Sync Warning**:
   - [ ] Add `⚠️` prefix when spec/story out of sync
   - [ ] Format: `⚠️ 📋 ✓ Phase 3/3`
   - [ ] Only show warning when `progress.inSync === false`

4. **Rendering Examples**:
   ```typescript
   // No spec
   renderSpecPhaseIndicator(null) → ""

   // Spec not started
   renderSpecPhaseIndicator({
     completedPhases: 0,
     totalPhases: 3,
     inSync: true
   }) → "📋 ○ Phase 0/3"

   // Spec in progress
   renderSpecPhaseIndicator({
     completedPhases: 2,
     totalPhases: 3,
     inSync: true
   }) → "📋 ↻ Phase 2/3"

   // Spec complete
   renderSpecPhaseIndicator({
     completedPhases: 3,
     totalPhases: 3,
     inSync: true
   }) → "📋 ✓ Phase 3/3"

   // Spec complete but out of sync
   renderSpecPhaseIndicator({
     completedPhases: 3,
     totalPhases: 3,
     inSync: false
   }) → "⚠️ 📋 ✓ Phase 3/3"
   ```

5. **Performance**:
   - [ ] Pure function (no side effects)
   - [ ] O(1) string operations
   - [ ] Safe for high-frequency calls (100+ items)

6. **Edge Cases**:
   - [ ] 0 total phases → "📋 ○ Phase 0/0"
   - [ ] Completed > total (malformed) → show actual values
   - [ ] Null/undefined progress → return empty string

## Technical Approach

**File**: `vscode-extension/src/treeview/specPhaseRenderer.ts`

```typescript
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

  // Determine icon based on completion state
  let icon: string;
  if (progress.completedPhases === progress.totalPhases) {
    icon = COMPLETE_ICON;
  } else if (progress.completedPhases > 0) {
    icon = IN_PROGRESS_ICON;
  } else {
    icon = NOT_STARTED_ICON;
  }

  // Add sync warning if out of sync
  const syncWarning = progress.inSync ? '' : `${SYNC_WARNING_ICON} `;

  // Format: "{syncWarning}📋 {icon} Phase {completed}/{total}"
  return `${syncWarning}${SPEC_ICON} ${icon} Phase ${progress.completedPhases}/${progress.totalPhases}`;
}
```

## Dependencies

- S93 (Spec Progress Reader) - Provides SpecProgress interface
- Similar pattern to badgeRenderer.ts and progressRenderer.ts

## Testing Strategy

**Unit Tests** (`specPhaseRenderer.test.ts`):
- Test null progress returns empty string
- Test 0/3 phases renders with ○ icon
- Test 2/3 phases renders with ↻ icon
- Test 3/3 phases renders with ✓ icon
- Test out-of-sync adds ⚠️ prefix
- Test edge cases (0/0 phases, completed > total)
- Test all icons render correctly

**Visual Tests**:
- View indicators in actual TreeView
- Verify icons display correctly in VSCode font
- Confirm spacing and alignment with other badges

## Files to Create

1. **Implementation**: `vscode-extension/src/treeview/specPhaseRenderer.ts`
2. **Tests**: `vscode-extension/src/test/suite/specPhaseRenderer.test.ts`

## Success Metrics

- Indicators render correctly for all phase states
- Icons clearly distinguish completion states
- Sync warnings visible when spec/story mismatched
- Compact format fits in TreeItem.description
- All tests pass (100% coverage)

## Notes

- Keep format compact (TreeItem.description has limited space)
- Use Unicode icons consistently with badgeRenderer.ts pattern
- Consider adding color/theme support in future iteration
- Sync warning critical for user visibility (prevents silent drift)
- Icons must be universally supported (no custom fonts required)
