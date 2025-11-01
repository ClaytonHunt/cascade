---
spec: S64
phase: 1
title: Command Registration and Helper Functions
status: Completed
priority: High
created: 2025-10-17
updated: 2025-10-17
---

# Phase 1: Command Registration and Helper Functions

## Overview

Register the "Create Child Item" command in package.json and implement core helper functions. These pure functions handle item number generation, title slugification, and template generation independently of the main command logic.

## Prerequisites

- Understanding of VSCode command contribution pattern (see S63 implementation)
- Familiarity with js-yaml library for frontmatter serialization
- Knowledge of existing item numbering scheme (P#, E#, F#, S#, B#)

## Tasks

### Task 1: Register Command in package.json

**Location:** `vscode-extension/package.json:33-46`

Add the command definition to the `contributes.commands` array:

```json
{
  "command": "cascade.createChildItem",
  "title": "Create Child Item",
  "icon": "$(add)"
}
```

**Expected Outcome:** Command registered in VSCode command palette (not visible until menu contribution added)

### Task 2: Add Context Menu Contribution

**Location:** `vscode-extension/package.json:56-63`

Add menu item to `contributes.menus["view/item/context"]` array:

```json
{
  "command": "cascade.createChildItem",
  "when": "view == cascadeView && (viewItem == epic || viewItem == feature)",
  "group": "1_modification@2"
}
```

**When Clause Breakdown:**
- `view == cascadeView` - Only show in Cascade TreeView
- `viewItem == epic || viewItem == feature` - Only show for parent types
- `group: "1_modification@2"` - Position after "Change Status" action (@1)

**Reference:** Context values set in `PlanningTreeProvider.ts:328` (`treeItem.contextValue = element.type`)

**Expected Outcome:** Right-click menu shows "Create Child Item" only for Epic/Feature items

### Task 3: Implement generateNextItemNumber() Helper

**Location:** `vscode-extension/src/extension.ts` (after changeStatusCommand function, around line 618)

Create function to generate next available item number:

```typescript
/**
 * Generates the next available item number for a given type.
 *
 * Algorithm:
 * 1. Get all items of target type from TreeView items cache
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
function generateNextItemNumber(
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
```

**Edge Cases:**
- No existing items of type → Returns "F1" or "S1"
- Non-standard item numbers → Handles gracefully (ignores invalid formats)

**Expected Outcome:** Function correctly generates sequential item numbers

### Task 4: Implement slugify() Helper

**Location:** `vscode-extension/src/extension.ts` (after generateNextItemNumber)

Create function to convert titles to filesystem-safe names:

```typescript
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
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
}
```

**Test Cases:**
- Special characters: `"Test & Debug"` → `"test-debug"`
- Multiple spaces: `"A  B  C"` → `"a-b-c"`
- Numbers: `"API v2"` → `"api-v2"`
- Trailing/leading spaces: `"  Test  "` → `"test"`

**Expected Outcome:** Function safely converts any title to valid directory/file name

### Task 5: Implement generateChildItemTemplate() Helper

**Location:** `vscode-extension/src/extension.ts` (after slugify)

Create function to generate markdown file content with frontmatter:

```typescript
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
function generateChildItemTemplate(
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

  const childLabel = childType === 'feature' ? 'Feature' : 'Story';

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
```

**Reference:** YAML dump options from `fileUpdates.ts:41-47`

**Frontmatter Fields:**
- `item`: Generated item number (F20, S65)
- `title`: User-provided title
- `type`: 'feature' or 'story'
- `status`: 'Not Started' (initial state)
- `priority`: 'Medium' (default)
- `dependencies`: [] (empty array)
- `created`: Current date (YYYY-MM-DD)
- `updated`: Current date (YYYY-MM-DD)

**Expected Outcome:** Function generates valid markdown with complete frontmatter matching schema

## Completion Criteria

- ✅ Command registered in package.json with icon
- ✅ Context menu contribution added with correct `when` clause
- ✅ `generateNextItemNumber()` correctly increments item numbers
- ✅ `slugify()` safely converts titles to filesystem names
- ✅ `generateChildItemTemplate()` generates valid frontmatter and markdown
- ✅ No compilation errors in extension.ts
- ✅ TypeScript types imported correctly (Frontmatter, PlanningTreeItem)

## Next Phase

Proceed to Phase 2: Main Command Implementation
