/**
 * Helper functions for S64 Create Child Item feature
 *
 * These pure functions handle:
 * - Item number generation (generateNextItemNumber)
 * - Title slugification (slugify)
 * - Markdown template generation (generateChildItemTemplate)
 */

import { PlanningTreeItem } from './treeview/PlanningTreeItem';
import { Frontmatter } from './types';

/**
 * Generates the next available item number for a given type.
 *
 * Algorithm:
 * 1. Filter all items by target type
 * 2. Extract numeric portions from item IDs (e.g., "F18" → 18)
 * 3. Find maximum number
 * 4. Increment by 1
 * 5. Format with type prefix
 *
 * Examples:
 * - generateNextItemNumber('feature', items) → "F20" (if F19 exists)
 * - generateNextItemNumber('story', items) → "S65" (if S64 exists)
 *
 * @param type - Child item type ('feature' or 'story')
 * @param allItems - All planning items from TreeView cache
 * @returns Next item number with prefix (e.g., "F20", "S65")
 */
export function generateNextItemNumber(
  type: 'feature' | 'story',
  allItems: PlanningTreeItem[]
): string {
  // Filter items by type
  const typedItems = allItems.filter(item => item.type === type);

  // Extract numbers from item IDs (e.g., "F18" → 18)
  const numbers = typedItems.map(item => {
    const match = item.item.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  });

  // Get max and increment
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;

  // Format with prefix
  const prefix = type === 'feature' ? 'F' : 'S';
  return `${prefix}${nextNumber}`;
}

/**
 * Converts a title to filesystem-safe slug for directory/file names.
 *
 * Algorithm:
 * 1. Convert to lowercase
 * 2. Replace non-alphanumeric characters with hyphens
 * 3. Remove leading/trailing hyphens
 *
 * Examples:
 * - "User Authentication" → "user-authentication"
 * - "Drag & Drop Status" → "drag-drop-status"
 * - "API v2 Integration!" → "api-v2-integration"
 * - "  Multiple   Spaces  " → "multiple-spaces"
 *
 * @param title - User-provided title
 * @returns Slugified string safe for filesystem
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
}

/**
 * Generates complete markdown content for a new child item.
 *
 * Structure:
 * - YAML frontmatter (item, title, type, status, priority, dependencies, created, updated)
 * - Markdown heading (# [item] - [title])
 * - Description section placeholder
 * - Acceptance Criteria section
 * - Child Items section (features only)
 *
 * @param frontmatter - Frontmatter object for the new item
 * @param childType - Type of child item ('feature' or 'story')
 * @returns Complete markdown file content
 */
export function generateChildItemTemplate(
  frontmatter: Frontmatter,
  childType: 'feature' | 'story'
): string {
  const yaml = require('js-yaml');

  // Serialize frontmatter to YAML
  const yamlStr = yaml.dump(frontmatter, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false
  });

  // Child Items section only for features
  const childItemsSection = childType === 'feature'
    ? `\n## Child Items\n\nStories will be created when this Feature is selected for implementation via \`/plan #${frontmatter.item}\`.\n`
    : '';

  return `---
${yamlStr}---

# ${frontmatter.item} - ${frontmatter.title}

## Description

[Add description here]

## Acceptance Criteria

- [ ] ${childItemsSection}`;
}
