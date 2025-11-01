/**
 * Badge renderer utility for VSCode TreeView items.
 *
 * Provides text badge generation for Status values using Codicon syntax.
 * Badges appear in TreeItem description field with inline icons and status text.
 *
 * Usage:
 * ```typescript
 * import { renderStatusBadge } from './badgeRenderer';
 * import { Status } from '../types';
 *
 * const status: Status = 'In Progress';
 * const badge = renderStatusBadge(status);
 * treeItem.description = badge;
 *
 * // TreeItem displays: "$(sync) In Progress"
 * ```
 *
 * @module badgeRenderer
 * @see S81 - Badge Renderer Utility specification
 * @see PlanningTreeProvider.ts - Future consumer of this module (S82)
 */

import { Status } from '../types';

/**
 * Static mapping of Status values to badge strings.
 * Using a module-level constant for optimal performance (no object creation per call).
 *
 * Note: Codicon syntax $(icon-name) does NOT work in TreeItem.description field.
 * Icons are already shown via TreeItem.iconPath, so description shows status text only.
 */
const STATUS_BADGES: Record<Status, string> = {
	'Not Started': 'Not Started',
	'In Planning': 'In Planning',
	'Ready': 'Ready',
	'In Progress': 'In Progress',
	'Blocked': 'Blocked',
	'Completed': 'Completed',
	'Archived': 'Archived'
};

/**
 * Converts a Status value into a plain text badge string.
 *
 * This function generates badge strings for display in VSCode TreeView description
 * fields. The TreeItem.iconPath already shows the status icon, so the description
 * only needs the status text.
 *
 * **Note:** Codicon syntax `$(icon-name)` does NOT render in TreeItem.description.
 * It only works in TreeItem.label. Since we use iconPath for icons, description
 * should contain plain text only.
 *
 * **Performance:** Pure function with O(1) lookup via static mapping. Safe for
 * high-frequency calls during TreeView rendering (100+ items).
 *
 * **Badge format:** `Status Text`
 *
 * **Status-to-Badge Mapping:**
 * - Not Started: `Not Started`
 * - In Planning: `In Planning`
 * - Ready: `Ready`
 * - In Progress: `In Progress`
 * - Blocked: `Blocked`
 * - Completed: `Completed`
 * - Archived: `Archived`
 *
 * @param status - Status value from frontmatter (e.g., "In Progress")
 * @returns Badge string with status text (e.g., "In Progress")
 *          Returns plain status string if status is unknown (fallback)
 *
 * @example
 * const badge = renderStatusBadge('In Progress');
 * // Returns: "In Progress"
 *
 * @example
 * const badge = renderStatusBadge('Unknown' as Status);
 * // Returns: "Unknown" (fallback for unknown status)
 *
 * @see statusIcons.ts - TreeItem icon mapping (uses ThemeIcon for visual icons)
 */
export function renderStatusBadge(status: Status): string {
	return STATUS_BADGES[status] || status;
}
