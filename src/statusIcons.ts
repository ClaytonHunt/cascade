/**
 * Status icon mapping for VSCode TreeView items.
 *
 * Provides visual status indicators for planning hierarchy items in the TreeView.
 * Translates frontmatter `status` field into ThemeIcon objects for TreeItem.iconPath.
 *
 * Usage:
 * ```typescript
 * import { getTreeItemIcon } from './statusIcons';
 * import { Status } from './types';
 *
 * const status: Status = 'In Progress';
 * const icon = getTreeItemIcon(status);
 * treeItem.iconPath = icon;
 *
 * // TreeItem displays spinning loader icon in blue
 * ```
 *
 * @module statusIcons
 * @see S57 - StatusIcons TreeView Adaptation specification
 * @see PlanningTreeProvider.ts - Consumer of this module
 */

import * as vscode from 'vscode';
import { Status } from './types';

/**
 * Badge symbols for status indicators (for reference/future use).
 *
 * These symbols were originally used for FileDecoration badges.
 * Retained as reference for potential future features (tooltips, custom themes).
 *
 * Each symbol is chosen for semantic meaning:
 * - ○ (hollow circle): Empty, not started
 * - ✎ (pencil): Planning/design work
 * - ✓ (checkmark): Ready to proceed
 * - ↻ (circular arrows): Active work in progress
 * - ⊘ (prohibition): Blocked/stopped
 * - ✔ (heavy checkmark): Complete
 */
export const STATUS_BADGES: Record<Status, string> = {
  'Not Started': '○',
  'In Planning': '✎',
  'Ready': '✓',
  'In Progress': '↻',
  'Blocked': '⊘',
  'Completed': '✔',
  'Archived': '📦',  // Box emoji for archived items (Phase 2 will finalize)
};

/**
 * Color IDs for status indicators (for reference/future use).
 *
 * These theme color IDs are used by both TreeView icons and potential future decorations.
 * Uses semantic color tokens that adapt to user's theme (light/dark):
 * - charts.gray: Neutral/inactive states
 * - charts.yellow: Warning/planning states
 * - charts.green: Success/ready states
 * - charts.blue: Info/active states
 * - charts.red: Error/blocked states
 * - testing.iconPassed: Success/completion states
 * - undefined: Default theme color
 *
 * @see https://code.visualstudio.com/api/references/theme-color
 */
export const STATUS_COLORS: Record<Status, string | undefined> = {
  'Not Started': undefined,          // Use default color
  'In Planning': 'charts.yellow',    // Warning/planning color
  'Ready': 'charts.green',           // Success/ready color
  'In Progress': 'charts.blue',      // Info/active color
  'Blocked': 'charts.red',           // Error/blocked color
  'Completed': 'testing.iconPassed', // Success/completion color
  'Archived': 'charts.gray'          // Muted gray for archived items (Phase 2 will finalize)
};

/**
 * Returns a ThemeIcon for TreeView rendering based on status.
 *
 * This function maps status values to VSCode Codicons (built-in icons)
 * and applies theme-aware colors using ThemeColor. The icons are designed
 * to visually represent the workflow state of planning items.
 *
 * Icon Selection Rationale:
 * - circle-outline: Not Started (empty circle, work not begun)
 * - sync: In Planning (circular arrows, iterative planning)
 * - debug-start: Ready (play button, ready to execute)
 * - gear: In Progress (gear/cog, active work)
 * - warning: Blocked (warning triangle, attention needed)
 * - pass: Completed (checkmark, success)
 *
 * @param status - Status string from frontmatter (e.g., "In Progress")
 * @returns ThemeIcon instance with appropriate icon ID and color
 *
 * @example
 * const icon = getTreeItemIcon('In Progress');
 * treeItem.iconPath = icon;
 * // TreeItem will display spinning loader icon in blue color
 *
 * @example
 * const icon = getTreeItemIcon('Unknown' as Status);
 * // Returns circle-outline icon in red (unknown status fallback)
 *
 * @see https://microsoft.github.io/vscode-codicons/dist/codicon.html
 * @see https://code.visualstudio.com/api/references/vscode-api#ThemeIcon
 */
export function getTreeItemIcon(status: string): vscode.ThemeIcon {
  // Map status to Codicon ID
  const iconMap: { [key: string]: string } = {
    'Not Started': 'circle-outline',
    'In Planning': 'sync',
    'Ready': 'debug-start',
    'In Progress': 'gear',
    'Blocked': 'warning',
    'Completed': 'pass',
    'Archived': 'archive'  // Archive/box icon for archived items
  };

  // Map status to ThemeColor ID
  const colorMap: { [key: string]: string | undefined } = {
    'Not Started': 'charts.gray',
    'In Planning': 'charts.yellow',
    'Ready': 'charts.green',
    'In Progress': 'charts.blue',
    'Blocked': 'charts.red',
    'Completed': 'testing.iconPassed',
    'Archived': 'charts.gray'  // Muted gray to de-emphasize archived items
  };

  // Get icon ID (fallback to circle-outline for unknown status)
  const iconId = iconMap[status] || 'circle-outline';

  // Get color ID (fallback to red for unknown status)
  const colorId = status in colorMap ? colorMap[status] : 'charts.red';

  // Create ThemeIcon with optional color
  return new vscode.ThemeIcon(
    iconId,
    colorId ? new vscode.ThemeColor(colorId) : undefined
  );
}
