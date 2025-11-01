---
spec: S57
phase: 1
title: Refactor statusIcons.ts
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 1: Refactor statusIcons.ts

## Overview

This phase refactors the `statusIcons.ts` module to support TreeView rendering instead of FileDecoration. We will remove the `getDecorationForStatus()` function (which returns `FileDecoration` objects) and replace it with `getTreeItemIcon()` (which returns `ThemeIcon` instances).

The badge and color mappings will be preserved as exported constants for potential future use, but the primary API will shift from FileDecoration to TreeView icon generation.

## Prerequisites

- Understanding of VSCode ThemeIcon API
- Understanding of VSCode Codicon library
- Familiarity with current statusIcons.ts implementation

## Tasks

### Task 1: Review Current Implementation

**Objective**: Understand the existing code structure before refactoring.

**Steps**:
1. Open `vscode-extension/src/statusIcons.ts`
2. Review the `getDecorationForStatus()` function (lines 74-100)
3. Note the STATUS_BADGES and STATUS_COLORS mappings (lines 43-71)
4. Verify no other files import `getDecorationForStatus()`:
   ```bash
   grep -r "getDecorationForStatus" vscode-extension/src
   ```
   Expected: Only statusIcons.ts and statusIcons.test.ts reference this function

**Expected Outcome**: Confirmation that `getDecorationForStatus()` is safe to remove (only used in tests)

**File Reference**: `vscode-extension/src/statusIcons.ts:74-100`

### Task 2: Remove FileDecoration Function

**Objective**: Delete the `getDecorationForStatus()` function.

**Steps**:
1. Open `vscode-extension/src/statusIcons.ts`
2. Locate the `getDecorationForStatus()` function (lines 74-100)
3. Delete the entire function including:
   - JSDoc comments (lines 74-89)
   - Function implementation (lines 90-100)
4. Save the file

**Code to Remove**:
```typescript
/**
 * Returns VSCode FileDecoration for a given status value.
 * ...
 */
export function getDecorationForStatus(status: Status): vscode.FileDecoration {
  const badge = STATUS_BADGES[status] ?? '?';
  const color = status in STATUS_COLORS ? STATUS_COLORS[status] : new vscode.ThemeColor('charts.red');

  return new vscode.FileDecoration(
    badge,
    status,
    color
  );
}
```

**Expected Outcome**: File compiles with error (missing export), tests fail

**File Reference**: `vscode-extension/src/statusIcons.ts:74-100`

### Task 3: Update STATUS_BADGES Mapping

**Objective**: Keep badge mapping but mark as reference-only.

**Steps**:
1. Locate the STATUS_BADGES constant (line 43)
2. Update JSDoc comment to indicate reference purpose:
   ```typescript
   /**
    * Badge symbols for status indicators (for reference/future use).
    *
    * These symbols were originally used for FileDecoration badges.
    * Retained as reference for potential future features (tooltips, custom themes).
    */
   export const STATUS_BADGES: Record<Status, string> = {
     // ... existing mapping
   };
   ```

**Expected Outcome**: STATUS_BADGES remains exported with updated documentation

**File Reference**: `vscode-extension/src/statusIcons.ts:43-50`

### Task 4: Update STATUS_COLORS Mapping

**Objective**: Refactor color mapping to use string IDs instead of ThemeColor instances.

**Steps**:
1. Locate the STATUS_COLORS constant (line 64)
2. Change the type from `Record<Status, ThemeColor | undefined>` to `Record<Status, string | undefined>`
3. Update the values to use color ID strings instead of ThemeColor instances:
   ```typescript
   /**
    * Color IDs for status indicators (for reference/future use).
    *
    * These theme color IDs are used by both TreeView icons and potential future decorations.
    */
   export const STATUS_COLORS: Record<Status, string | undefined> = {
     'Not Started': undefined,          // Use default color
     'In Planning': 'charts.yellow',    // Warning/planning color
     'Ready': 'charts.green',           // Success/ready color
     'In Progress': 'charts.blue',      // Info/active color
     'Blocked': 'charts.red',           // Error/blocked color
     'Completed': 'testing.iconPassed'  // Success/completion color
   };
   ```

**Rationale**: Storing color ID strings makes them reusable for both ThemeColor and ThemeIcon creation.

**Expected Outcome**: STATUS_COLORS uses string IDs instead of ThemeColor instances

**File Reference**: `vscode-extension/src/statusIcons.ts:64-71`

### Task 5: Create getTreeItemIcon() Function

**Objective**: Add new function that returns ThemeIcon for TreeView items.

**Steps**:
1. Add the function after STATUS_COLORS constant
2. Implement icon ID mapping (Codicon IDs)
3. Implement color ID mapping (reuse STATUS_COLORS where applicable)
4. Add comprehensive JSDoc comments with examples
5. Handle unknown status (fallback to 'circle-outline' with error color)

**Code to Add**:
```typescript
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
 * - loading~spin: In Progress (spinning loader, active work)
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
    'In Progress': 'loading~spin',
    'Blocked': 'warning',
    'Completed': 'pass'
  };

  // Map status to ThemeColor ID
  const colorMap: { [key: string]: string | undefined } = {
    'Not Started': 'charts.gray',
    'In Planning': 'charts.yellow',
    'Ready': 'charts.green',
    'In Progress': 'charts.blue',
    'Blocked': 'charts.red',
    'Completed': 'testing.iconPassed'
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
```

**Expected Outcome**: File exports getTreeItemIcon() function

**File Reference**: New code after line 71

### Task 6: Update Module Documentation

**Objective**: Update file-level JSDoc to reflect new purpose.

**Steps**:
1. Locate the module-level comment block (lines 1-24)
2. Update description to reflect TreeView usage:
   ```typescript
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
   ```

**Expected Outcome**: Module documentation reflects TreeView usage

**File Reference**: `vscode-extension/src/statusIcons.ts:1-24`

### Task 7: Remove Integration Comments

**Objective**: Remove outdated FileDecorationProvider integration comments.

**Steps**:
1. Locate the integration comment block (lines 102-129)
2. Delete the entire "INTEGRATION WITH S44" comment section
3. These comments reference FileDecoration usage which no longer applies

**Code to Remove**:
```typescript
/**
 * INTEGRATION WITH S44 (Leaf Item Decorations)
 * ...
 */
```

**Expected Outcome**: No outdated comments remain in file

**File Reference**: `vscode-extension/src/statusIcons.ts:102-129`

### Task 8: Compile and Verify

**Objective**: Ensure the refactored module compiles without errors.

**Steps**:
1. Run TypeScript compiler:
   ```bash
   cd vscode-extension
   npm run compile
   ```
2. Verify no compilation errors
3. Expected output: "Compilation complete" or similar success message
4. Note: Tests will fail (expected) - we'll fix them in Phase 3

**Expected Outcome**: TypeScript compilation succeeds, tests fail (expected)

**Validation Commands**:
```bash
cd vscode-extension
npm run compile
```

## Completion Criteria

- [ ] `getDecorationForStatus()` function removed from statusIcons.ts
- [ ] `getTreeItemIcon()` function added and exported
- [ ] STATUS_BADGES and STATUS_COLORS preserved as exported constants
- [ ] STATUS_COLORS refactored to use string IDs (not ThemeColor instances)
- [ ] Module documentation updated to reflect TreeView usage
- [ ] Integration comments removed (outdated FileDecoration references)
- [ ] TypeScript compilation succeeds (no errors)
- [ ] All changes documented with inline comments

## Next Phase

**Phase 2: Integrate with PlanningTreeProvider**
- Update `getTreeItem()` method to use `getTreeItemIcon()`
- Remove `getIconForItemType()` method (type-based icons)
- Import `getTreeItemIcon()` function
- Test visual rendering in extension

## Reference Documentation

- **VSCode ThemeIcon API**: https://code.visualstudio.com/api/references/vscode-api#ThemeIcon
- **VSCode Codicons**: https://microsoft.github.io/vscode-codicons/dist/codicon.html
- **Theme Color IDs**: https://code.visualstudio.com/api/references/theme-color
