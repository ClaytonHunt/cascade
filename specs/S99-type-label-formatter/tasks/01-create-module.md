---
spec: S99
phase: 1
title: Create labelFormatter Module
status: Completed
priority: High
created: 2025-10-28
updated: 2025-10-28
---

# Phase 1: Create labelFormatter Module

## Overview

Create the `labelFormatter.ts` utility module with type mapping and label formatting functions. This module provides the core logic for generating TreeView item labels with human-readable type prefixes.

**Deliverable:** Working utility module that compiles without errors and exports two pure functions.

## Prerequisites

- TypeScript development environment configured
- VSCode extension workspace open at `vscode-extension/`
- Familiarity with existing utility modules (badgeRenderer.ts, archiveUtils.ts)

## Tasks

### Task 1: Create Module File

**Action:** Create new TypeScript file at `vscode-extension/src/treeview/labelFormatter.ts`

**Location:** `vscode-extension/src/treeview/labelFormatter.ts`

**Initial Content Structure:**
```typescript
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

// Module implementation follows...
```

**Reference:** Follow JSDoc pattern from badgeRenderer.ts:1-22

---

### Task 2: Implement Type Label Mapping

**Action:** Create static Record for ItemType-to-label mapping with O(1) lookup performance.

**Code:**
```typescript
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
```

**Reference Pattern:** badgeRenderer.ts:33-41 (STATUS_BADGES mapping)

**Validation:**
- TypeScript compiler will error if any ItemType value is missing
- Record type ensures compile-time type safety

**Documentation Reference:**
- VSCode TreeView API: https://code.visualstudio.com/api/references/vscode-api#TreeItem
- TypeScript Record utility type: https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type

---

### Task 3: Implement getTypeLabel() Function

**Action:** Create helper function to map ItemType to display label with unknown type fallback.

**Function Signature:**
```typescript
export function getTypeLabel(type: ItemType): string
```

**Implementation:**
```typescript
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
```

**Reference Pattern:** badgeRenderer.ts:82-84 (renderStatusBadge with fallback)

**Edge Case Handling:**
- Unknown type → Capitalize string (e.g., "custom" → "Custom")
- Prevents runtime errors if new types are added to ItemType
- Future-proof for custom types

---

### Task 4: Implement capitalize() Helper

**Action:** Create private helper function for capitalizing unknown type strings.

**Implementation:**
```typescript
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
```

**Note:** This is a private function (not exported). Used only by getTypeLabel().

**Edge Cases:**
- Empty string → Returns empty string (charAt(0) returns '')
- Single char → Works correctly (slice(1) returns '')

---

### Task 5: Implement formatItemLabel() Function

**Action:** Create main formatting function that generates complete label string.

**Function Signature:**
```typescript
export function formatItemLabel(item: PlanningTreeItem): string
```

**Implementation:**
```typescript
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
```

**Reference Pattern:** Inline label formatting from PlanningTreeProvider.ts:840

**Edge Case Logic:**
1. `item.item || 'Unknown'` - Handles undefined/empty item number
2. `item.title || number` - Falls back to item number if title missing
3. `getTypeLabel()` - Already handles unknown types

**Documentation Reference:**
- VSCode TreeItem.label: https://code.visualstudio.com/api/references/vscode-api#TreeItem.label
- String interpolation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals

---

### Task 6: Verify TypeScript Compilation

**Action:** Compile the module to verify no type errors.

**Command:**
```bash
cd vscode-extension
npm run compile
```

**Expected Output:**
- No TypeScript errors
- Output file created at `dist/treeview/labelFormatter.js`

**Common Errors to Check:**
- Import paths correct (./PlanningTreeItem, ../types)
- All ItemType values present in TYPE_LABELS
- Function signatures match JSDoc

**Fix Strategy:**
- Run `npm run compile` after each function implementation
- Use VSCode TypeScript IntelliSense for immediate feedback
- Check `Problems` panel (Ctrl+Shift+M) for errors

---

### Task 7: Manual Verification (Optional)

**Action:** Create temporary test file to verify functions work as expected.

**Test File:** `vscode-extension/src/treeview/labelFormatter.manual-test.ts` (temporary)

**Test Code:**
```typescript
import { formatItemLabel, getTypeLabel } from './labelFormatter';
import { PlanningTreeItem } from './PlanningTreeItem';

// Test type labels
console.log(getTypeLabel('story')); // "Story"
console.log(getTypeLabel('epic')); // "Epic"
console.log(getTypeLabel('feature')); // "Feature"

// Test full formatting
const testItem: PlanningTreeItem = {
	item: 'S75',
	title: 'Archive Detection',
	type: 'story',
	status: 'Ready',
	priority: 'High',
	filePath: '/fake/path.md'
};

console.log(formatItemLabel(testItem));
// Expected: "Story S75 - Archive Detection"
```

**Run Test:**
```bash
cd vscode-extension
npx ts-node src/treeview/labelFormatter.manual-test.ts
```

**Note:** Delete this temporary file after verification. Formal unit tests will be created in Phase 2.

---

## Completion Criteria

✅ **File Created:**
- `vscode-extension/src/treeview/labelFormatter.ts` exists
- File size ~80-100 lines including JSDoc

✅ **Functions Implemented:**
- `getTypeLabel()` exported and documented
- `formatItemLabel()` exported and documented
- `capitalize()` private helper implemented

✅ **Type Mapping Complete:**
- TYPE_LABELS Record with all 7 ItemType values
- Fallback logic for unknown types

✅ **Compilation Success:**
- `npm run compile` runs without errors
- No TypeScript warnings in VSCode
- Output file created at `dist/treeview/labelFormatter.js`

✅ **Code Quality:**
- Full JSDoc comments on all exported functions
- TypeScript strict mode compliance
- No ESLint warnings

✅ **Manual Verification (Optional):**
- Test file runs successfully
- Console output matches expected format
- Edge cases handled correctly

## Next Phase

Proceed to **Phase 2: Unit Testing** to create comprehensive test suite.

**Files to Create:**
- `vscode-extension/src/test/suite/labelFormatter.test.ts`

**Testing Approach:**
- Unit tests for all item types (7 tests)
- Edge case tests (3 tests)
- Format consistency tests (2 tests)
