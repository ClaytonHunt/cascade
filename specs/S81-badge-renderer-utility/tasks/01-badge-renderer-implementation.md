---
spec: S81
phase: 1
title: Badge Renderer Implementation
status: Completed
priority: High
created: 2025-10-24
updated: 2025-10-24
---

# Phase 1: Badge Renderer Implementation

## Overview

Create the core badge renderer utility that converts Status values into color-coded text badges using VSCode Codicon syntax. This phase implements a pure function with static badge mapping for optimal performance and testability.

## Prerequisites

- Understanding of VSCode Codicon syntax: `$(icon-name) Text`
- Familiarity with Status type definition (types.ts:14)
- Knowledge of existing Codicon usage in statusIcons.ts

## Tasks

### Task 1: Create badgeRenderer.ts File

**Location:** `vscode-extension/src/treeview/badgeRenderer.ts`

**Implementation:**

1. Create new file in treeview directory (co-located with TreeView utilities)

2. Add file header with module documentation:

```typescript
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
```

3. Import Status type:

```typescript
import { Status } from '../types';
```

**Expected Outcome:**
- File created at correct location
- Module documentation present
- Status type imported

**Validation:**
- File exists: `ls vscode-extension/src/treeview/badgeRenderer.ts`
- No TypeScript errors: `npm run compile`

---

### Task 2: Implement renderStatusBadge Function

**Function Signature:**

```typescript
export function renderStatusBadge(status: Status): string
```

**Implementation Steps:**

1. Define static badge mapping using Record<Status, string>:

```typescript
export function renderStatusBadge(status: Status): string {
  const badges: Record<Status, string> = {
    'Not Started': '$(circle-outline) Not Started',
    'In Planning': '$(circle-filled) In Planning',
    'Ready': '$(circle-filled) Ready',
    'In Progress': '$(sync) In Progress',
    'Blocked': '$(error) Blocked',
    'Completed': '$(pass-filled) Completed',
    'Archived': '$(archive) Archived'
  };

  return badges[status] || status;
}
```

2. Badge format rationale:
   - `$(icon-name)` - VSCode Codicon syntax for inline icon
   - Space separator - Visual separation between icon and text
   - Status text - Full status name for clarity (e.g., "Not Started", not "NS")

3. Codicon alignment with statusIcons.ts:
   - `circle-outline` - Matches getTreeItemIcon() for "Not Started" (statusIcons.ts:109)
   - `sync` - Matches getTreeItemIcon() for "In Planning" (statusIcons.ts:110)
   - `debug-start` - Changed to `circle-filled` for text badge (simpler, still semantic)
   - `gear` - Changed to `sync` for "In Progress" (matches TreeItem icon)
   - `warning` - Changed to `error` for "Blocked" (stronger visual signal)
   - `pass` - Changed to `pass-filled` for "Completed" (filled version)
   - `archive` - Matches getTreeItemIcon() for "Archived" (statusIcons.ts:115)

**Codicon Selection Reference:**

Codicons chosen for semantic meaning and visual clarity:

- **Not Started:** `$(circle-outline)` - Empty circle, work not begun
- **In Planning:** `$(circle-filled)` - Filled circle, planning in progress
- **Ready:** `$(circle-filled)` - Filled circle, ready to execute (green via theme)
- **In Progress:** `$(sync)` - Sync/circular arrows, active work
- **Blocked:** `$(error)` - Error/warning icon, attention needed
- **Completed:** `$(pass-filled)` - Filled checkmark, success
- **Archived:** `$(archive)` - Archive/box icon, stored away

See full Codicon reference: https://microsoft.github.io/vscode-codicons/dist/codicon.html

**Expected Outcome:**
- Function returns correct badge format for all Status values
- Unknown status returns plain status string (fallback)
- No exceptions thrown
- Function is pure (no side effects)

**Validation:**
- TypeScript compilation succeeds: `npm run compile`
- Function signature matches specification
- All 7 Status values have badge mappings
- Fallback operator (`||`) handles unknown status

---

### Task 3: Add JSDoc Documentation

**Documentation Requirements:**

Add comprehensive JSDoc comments for renderStatusBadge function:

```typescript
/**
 * Converts a Status value into a color-coded text badge with Codicon icon.
 *
 * This function generates badge strings for display in VSCode TreeView description
 * fields. Badges use Codicon syntax `$(icon-name)` for inline icons that automatically
 * adapt to the user's theme (light/dark).
 *
 * Badge format: `$(icon-name) Status Text`
 *
 * Status-to-Badge Mapping:
 * - Not Started: $(circle-outline) Not Started (gray circle)
 * - In Planning: $(circle-filled) In Planning (yellow circle)
 * - Ready: $(circle-filled) Ready (green circle)
 * - In Progress: $(sync) In Progress (blue sync icon)
 * - Blocked: $(error) Blocked (red error icon)
 * - Completed: $(pass-filled) Completed (green checkmark)
 * - Archived: $(archive) Archived (gray archive icon)
 *
 * @param status - Status value from frontmatter (e.g., "In Progress")
 * @returns Badge string with Codicon syntax (e.g., "$(sync) In Progress")
 *          Returns plain status string if status is unknown (fallback)
 *
 * @example
 * const badge = renderStatusBadge('In Progress');
 * // Returns: "$(sync) In Progress"
 *
 * @example
 * const badge = renderStatusBadge('Unknown' as Status);
 * // Returns: "Unknown" (fallback for unknown status)
 *
 * @see https://microsoft.github.io/vscode-codicons/dist/codicon.html - Codicon reference
 * @see statusIcons.ts - Related TreeItem icon mapping (uses ThemeIcon, not text)
 */
export function renderStatusBadge(status: Status): string {
  // ... implementation from Task 2
}
```

**Expected Outcome:**
- JSDoc comment explains function purpose clearly
- Parameter and return value documented
- Examples provided for common usage
- Links to external resources included

**Validation:**
- JSDoc comment present above function
- TypeScript IntelliSense shows documentation on hover
- Examples are accurate and executable

---

### Task 4: Verify Module Exports

**Export Verification:**

1. Ensure `renderStatusBadge` is exported (public API):

```typescript
export function renderStatusBadge(status: Status): string {
  // ... implementation
}
```

2. Verify no other symbols are exported (minimal API surface):
   - Internal `badges` object is scoped inside function (not exported)
   - Only `renderStatusBadge` function is public

3. Confirm TypeScript compilation:

```bash
cd vscode-extension
npm run compile
```

**Expected Outcome:**
- Only `renderStatusBadge` function is exported
- No TypeScript compilation errors
- Module ready for import in tests (Phase 2) and TreeView integration (S82)

**Validation:**
- Compilation succeeds without errors
- No unused export warnings
- Function accessible via import statement

---

## Completion Criteria

- ✅ File created: `vscode-extension/src/treeview/badgeRenderer.ts`
- ✅ Status type imported from `../types`
- ✅ `renderStatusBadge(status: Status): string` function implemented
- ✅ Static badge mapping for all 7 Status values
- ✅ Badge format: `$(icon-name) Status Text`
- ✅ Unknown status fallback returns plain text
- ✅ JSDoc documentation complete with examples
- ✅ Function exported as public API
- ✅ TypeScript compilation succeeds (`npm run compile`)

## Next Phase

**Phase 2: Unit Testing**

Create comprehensive test suite for badge renderer:
- Test all Status value mappings
- Test unknown status fallback
- Test badge format correctness
- Verify function is pure (deterministic)

File to create: `vscode-extension/src/test/suite/badgeRenderer.test.ts`
