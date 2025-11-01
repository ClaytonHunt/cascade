/**
 * Label formatter utility for VSCode TreeView items.
 *
 * Provides label generation for PlanningTreeItem with type prefixes.
 * Labels appear in TreeItem.label field with format: "Type # - Title"
 *
 * Usage:
 * ```typescript
 * import { formatItemLabel } from './labelFormatter';
 * import { PlanningTreeItem } from './PlanningTreeItem';
 *
 * const item: PlanningTreeItem = { ... };
 * const label = formatItemLabel(item);
 * // Returns: "Story 75 - Archive Detection"
 * ```
 *
 * @module labelFormatter
 * @see S99 - Type Label Formatter Utility specification
 * @see S100 - Integration into PlanningTreeProvider
 */

import { PlanningTreeItem } from './PlanningTreeItem';
import { ItemType } from '../types';

/**
 * Static mapping of ItemType values to human-readable labels.
 * Using a module-level constant for optimal performance (no object creation per call).
 *
 * Type-to-Label Mapping:
 * - project → "Project"
 * - epic → "Epic"
 * - feature → "Feature"
 * - story → "Story"
 * - bug → "Bug"
 * - spec → "Spec"
 * - phase → "Phase"
 */
const TYPE_LABELS: Record<ItemType, string> = {
	'project': 'Project',
	'epic': 'Epic',
	'feature': 'Feature',
	'story': 'Story',
	'bug': 'Bug',
	'spec': 'Spec',
	'phase': 'Phase'
};

/**
 * Capitalize first letter of string.
 * Used as fallback for unknown item types.
 *
 * @param str - String to capitalize
 * @returns String with first letter uppercase, rest unchanged
 *
 * @example
 * capitalize('story') // Returns: "Story"
 * capitalize('EPIC') // Returns: "EPIC" (rest unchanged)
 */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get display label for item type (e.g., "Story", "Epic").
 *
 * Maps ItemType values to human-readable labels using static mapping.
 * For unknown types (should never occur in practice), falls back to
 * capitalized type string.
 *
 * **Performance:** O(1) lookup via Record. Safe for high-frequency calls.
 *
 * **Type-to-Label Mapping:**
 * - project → "Project"
 * - epic → "Epic"
 * - feature → "Feature"
 * - story → "Story"
 * - bug → "Bug"
 * - spec → "Spec"
 * - phase → "Phase"
 * - unknown → Capitalized (e.g., "custom" → "Custom")
 *
 * @param type - Item type from frontmatter (e.g., "story", "epic")
 * @returns Human-readable type label (e.g., "Story", "Epic")
 *
 * @example
 * const label = getTypeLabel('story');
 * // Returns: "Story"
 *
 * @example
 * const label = getTypeLabel('custom' as ItemType);
 * // Returns: "Custom" (fallback for unknown type)
 */
export function getTypeLabel(type: ItemType): string {
	return TYPE_LABELS[type] || capitalize(type);
}

/**
 * Format item label with type prefix.
 *
 * Generates TreeView label in format: "Type # - Title"
 * Examples:
 * - "Story 75 - Archive Detection"
 * - "Epic 5 - Rich TreeView Visualization"
 * - "Feature 26 - Enhanced Typography Colors"
 *
 * **Label Format:** `{TypeLabel} {ItemNumber} - {Title}`
 * - TypeLabel: Human-readable type (from getTypeLabel)
 * - ItemNumber: Raw item number (e.g., S75, E5, F26)
 * - Separator: Space-dash-space (` - `)
 * - Title: Item title from frontmatter
 *
 * **Performance:** O(1) operation with single string interpolation. Safe for
 * high-frequency calls during TreeView rendering (100+ items).
 *
 * **Edge Case Handling:**
 * - Missing title → Use item number only (e.g., "Story S75")
 * - Undefined item number → Use "Unknown" (e.g., "Story Unknown - Title")
 * - Unknown type → Capitalized type label (via getTypeLabel fallback)
 *
 * @param item - Planning tree item to format
 * @returns Formatted label string
 *
 * @example
 * const item: PlanningTreeItem = {
 *   item: 'S75',
 *   title: 'Archive Detection',
 *   type: 'story',
 *   // ... other fields
 * };
 * const label = formatItemLabel(item);
 * // Returns: "Story S75 - Archive Detection"
 *
 * @example Missing title
 * const item: PlanningTreeItem = {
 *   item: 'S75',
 *   title: '',
 *   type: 'story',
 *   // ... other fields
 * };
 * const label = formatItemLabel(item);
 * // Returns: "Story S75"
 *
 * @example Undefined item number
 * const item: PlanningTreeItem = {
 *   item: undefined as any,
 *   title: 'Archive Detection',
 *   type: 'story',
 *   // ... other fields
 * };
 * const label = formatItemLabel(item);
 * // Returns: "Story Unknown - Archive Detection"
 */
export function formatItemLabel(item: PlanningTreeItem): string {
	const typeLabel = getTypeLabel(item.type);
	const number = item.item || 'Unknown';
	const title = item.title || number;

	return `${typeLabel} ${number} - ${title}`;
}
