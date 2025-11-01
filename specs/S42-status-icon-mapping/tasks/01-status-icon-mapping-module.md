---
spec: S42
phase: 1
title: Status Icon Mapping Module
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 1: Status Icon Mapping Module

## Overview

Create the core mapping module that translates status strings into VSCode FileDecoration objects. This module will be imported by the decoration provider (S44) to apply visual status indicators to planning files.

## Prerequisites

- S41 completed (FileDecorationProvider foundation exists)
- Understanding of VSCode FileDecoration API
- Familiarity with ThemeColor for theme-aware colors

## Tasks

### Task 1: Create Module File Structure

**Action**: Create new file `vscode-extension/src/statusIcons.ts`

**Expected Outcome**: Empty TypeScript file ready for implementation

**Reference**: Extension follows structure established in S36

---

### Task 2: Import Required VSCode Types

**Action**: Add imports at top of `statusIcons.ts`

**Code Sample**:
```typescript
import * as vscode from 'vscode';
import { Status } from './types';
```

**Expected Outcome**:
- VSCode API available for `FileDecoration` and `ThemeColor`
- Status enum imported from existing types

**Reference**: `vscode-extension/src/types.ts:14` defines Status type

---

### Task 3: Define Status-to-Badge Mapping

**Action**: Create mapping object for status badges

**Code Sample**:
```typescript
/**
 * Maps status values to single-character Unicode badge symbols.
 *
 * These badges appear as small overlays on file icons in VSCode explorer.
 * Each symbol is chosen for semantic meaning:
 * - ○ (hollow circle): Empty, not started
 * - ✎ (pencil): Planning/design work
 * - ✓ (checkmark): Ready to proceed
 * - ↻ (circular arrows): Active work in progress
 * - ⊘ (prohibition): Blocked/stopped
 * - ✔ (heavy checkmark): Complete
 *
 * @see https://code.visualstudio.com/api/references/vscode-api#FileDecoration
 */
const STATUS_BADGES: Record<Status, string> = {
  'Not Started': '○',
  'In Planning': '✎',
  'Ready': '✓',
  'In Progress': '↻',
  'Blocked': '⊘',
  'Completed': '✔',
};
```

**Expected Outcome**:
- All 6 status values mapped to Unicode symbols
- Symbols render correctly in VSCode file explorer
- JSDoc explains symbol choices

**Validation**: Run `npm run compile` - should compile without errors

---

### Task 4: Define Status-to-Color Mapping

**Action**: Create mapping for status colors using ThemeColor

**Code Sample**:
```typescript
/**
 * Maps status values to VSCode theme-aware colors.
 *
 * Uses semantic color tokens that adapt to user's theme (light/dark):
 * - charts.blue: Info/planning states
 * - charts.green: Success/ready/complete states
 * - charts.yellow: Warning/in-progress states
 * - charts.red: Error/blocked states
 * - undefined: Default theme color
 *
 * @see https://code.visualstudio.com/api/references/theme-color
 */
const STATUS_COLORS: Record<Status, vscode.ThemeColor | undefined> = {
  'Not Started': undefined, // Use default file icon color
  'In Planning': new vscode.ThemeColor('charts.blue'),
  'Ready': new vscode.ThemeColor('charts.green'),
  'In Progress': new vscode.ThemeColor('charts.yellow'),
  'Blocked': new vscode.ThemeColor('charts.red'),
  'Completed': new vscode.ThemeColor('charts.green'),
};
```

**Expected Outcome**:
- Colors match semantic meaning of status
- ThemeColor ensures compatibility with all themes
- undefined used for "Not Started" (neutral default)

**Validation**: Check VSCode theme color reference for valid color IDs

**Reference**: https://code.visualstudio.com/api/references/theme-color#charts-colors

---

### Task 5: Implement getDecorationForStatus Function

**Action**: Create main export function that returns FileDecoration

**Code Sample**:
```typescript
/**
 * Returns VSCode FileDecoration for a given status value.
 *
 * Creates a decoration with:
 * - Badge: Single-character symbol overlay
 * - Tooltip: Status text shown on hover
 * - Color: Theme-aware color tint
 *
 * @param status - Status string from frontmatter (e.g., "In Progress")
 * @returns FileDecoration object for VSCode API
 *
 * @example
 * const decoration = getDecorationForStatus('In Progress');
 * // Returns FileDecoration with:
 * //   badge: '↻'
 * //   tooltip: 'In Progress'
 * //   color: ThemeColor('charts.yellow')
 */
export function getDecorationForStatus(status: Status): vscode.FileDecoration {
  const badge = STATUS_BADGES[status];
  const color = STATUS_COLORS[status];

  return new vscode.FileDecoration(
    badge,        // Badge: 1-2 char string overlay
    status,       // Tooltip: Full status text on hover
    color         // Color: ThemeColor or undefined
  );
}
```

**Expected Outcome**:
- Function exported (can be imported by other modules)
- Returns valid FileDecoration object
- Badge, tooltip, and color all set correctly

**Validation**:
- Run `npm run compile` - should compile without errors
- TypeScript should infer correct return type

**Reference**: VSCode FileDecoration API - https://code.visualstudio.com/api/references/vscode-api#FileDecoration

---

### Task 6: Add Default Case for Unknown Statuses

**Action**: Handle unknown status values gracefully

**Code Sample**:
```typescript
/**
 * Returns VSCode FileDecoration for a given status value.
 *
 * If status is not recognized (e.g., typo in frontmatter or future status),
 * returns a default decoration with "?" badge and error color.
 *
 * @param status - Status string from frontmatter (e.g., "In Progress")
 * @returns FileDecoration object for VSCode API
 *
 * @example
 * const decoration = getDecorationForStatus('In Progress');
 * // Returns FileDecoration with badge '↻'
 *
 * @example
 * const decoration = getDecorationForStatus('Invalid' as Status);
 * // Returns FileDecoration with badge '?' (unknown status)
 */
export function getDecorationForStatus(status: Status): vscode.FileDecoration {
  const badge = STATUS_BADGES[status] ?? '?';
  const color = STATUS_COLORS[status] ?? new vscode.ThemeColor('charts.red');

  return new vscode.FileDecoration(
    badge,        // Badge: mapped symbol or '?' for unknown
    status,       // Tooltip: Shows actual status value
    color         // Color: mapped color or red for unknown
  );
}
```

**Expected Outcome**:
- Unknown statuses don't crash the extension
- '?' badge indicates something is wrong
- Red color draws attention to the issue
- Tooltip shows actual status value for debugging

**Validation**:
- Manually test by passing invalid status (e.g., `'Invalid' as Status`)
- Should return decoration with '?' badge

---

### Task 7: Add Module Documentation

**Action**: Add file-level JSDoc with usage examples

**Code Sample**:
```typescript
/**
 * Status icon mapping for VSCode file decorations.
 *
 * Provides visual status indicators for planning hierarchy files.
 * Translates frontmatter `status` field into FileDecoration objects.
 *
 * Usage:
 * ```typescript
 * import { getDecorationForStatus } from './statusIcons';
 * import { Status } from './types';
 *
 * const status: Status = 'In Progress';
 * const decoration = getDecorationForStatus(status);
 *
 * // Returns FileDecoration:
 * //   badge: '↻'
 * //   tooltip: 'In Progress'
 * //   color: ThemeColor('charts.yellow')
 * ```
 *
 * @module statusIcons
 * @see S42 - Status Icon Mapping specification
 * @see decorationProvider.ts - Consumer of this module (S44)
 */
```

**Expected Outcome**:
- Clear module purpose documented
- Usage example shows import and function call
- References related stories (S42, S44)

---

## Completion Criteria

- ✅ `vscode-extension/src/statusIcons.ts` file created
- ✅ VSCode and Status types imported
- ✅ STATUS_BADGES mapping defined for all 6 statuses
- ✅ STATUS_COLORS mapping defined for all 6 statuses
- ✅ `getDecorationForStatus()` function implemented
- ✅ Unknown status fallback implemented ('?' badge)
- ✅ Module-level JSDoc documentation added
- ✅ Code compiles without errors (`npm run compile`)
- ✅ Function is exported (can be imported)
- ✅ TypeScript strict mode passes

## Verification Steps

1. **Compilation Check**:
   ```bash
   cd vscode-extension
   npm run compile
   ```
   Expected: No TypeScript errors

2. **Import Test** (in extension.ts or test file):
   ```typescript
   import { getDecorationForStatus } from './statusIcons';
   ```
   Expected: Import resolves, no module errors

3. **Type Check**:
   ```typescript
   const decoration: vscode.FileDecoration = getDecorationForStatus('Ready');
   ```
   Expected: Type inference works, no type errors

## Next Phase

Proceed to **Phase 2: Unit Tests** (`tasks/02-unit-tests.md`) to validate mapping correctness and edge case handling.
