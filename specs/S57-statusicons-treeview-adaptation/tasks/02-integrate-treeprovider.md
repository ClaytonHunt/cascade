---
spec: S57
phase: 2
title: Integrate with PlanningTreeProvider
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 2: Integrate with PlanningTreeProvider

## Overview

This phase integrates the refactored `statusIcons.ts` module with the `PlanningTreeProvider` to display status-based icons in the TreeView. We will update the `getTreeItem()` method to use `getTreeItemIcon()` instead of the type-based `getIconForItemType()` method.

This changes the TreeView from showing type-based icons (project, epic, feature, story, bug) to status-based icons (not started, in planning, ready, in progress, blocked, completed).

## Prerequisites

- Phase 1 completed (statusIcons.ts refactored)
- TypeScript compilation succeeds
- Understanding of PlanningTreeProvider.getTreeItem() method

## Tasks

### Task 1: Review Current Icon Assignment

**Objective**: Understand how icons are currently assigned in PlanningTreeProvider.

**Steps**:
1. Open `vscode-extension/src/treeview/PlanningTreeProvider.ts`
2. Locate the `getTreeItem()` method (line 131)
3. Find the icon assignment line (line 166):
   ```typescript
   treeItem.iconPath = this.getIconForItemType(element.type);
   ```
4. Review the `getIconForItemType()` method (lines 443-456):
   ```typescript
   private getIconForItemType(type: string): vscode.ThemeIcon {
     const iconMap: { [key: string]: string } = {
       'project': 'project',
       'epic': 'layers',
       'feature': 'package',
       'story': 'check',
       'bug': 'bug',
       'spec': 'file-code',
       'phase': 'milestone'
     };
     const iconId = iconMap[type];
     return new vscode.ThemeIcon(iconId);
   }
   ```

**Expected Outcome**: Understanding of current type-based icon implementation

**File Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:166, 443-456`

### Task 2: Add Import Statement

**Objective**: Import the `getTreeItemIcon()` function from statusIcons module.

**Steps**:
1. Locate the import section at the top of PlanningTreeProvider.ts (lines 1-6)
2. Add import for `getTreeItemIcon()`:
   ```typescript
   import { getTreeItemIcon } from '../statusIcons';
   ```
3. Place it after the existing imports, maintaining alphabetical order

**Code to Add** (after line 6):
```typescript
import { getTreeItemIcon } from '../statusIcons';
```

**Expected Outcome**: statusIcons module imported and available for use

**File Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:1-6`

### Task 3: Update getTreeItem() for Status Groups

**Objective**: Ensure status group nodes continue to use folder icon (not affected by status-based icons).

**Steps**:
1. Locate the status group handling in `getTreeItem()` (lines 133-152)
2. Verify folder icon is hardcoded (line 143):
   ```typescript
   treeItem.iconPath = new vscode.ThemeIcon('folder');
   ```
3. No changes needed - status groups should remain as folder icons

**Expected Outcome**: Status group nodes unaffected by this change

**File Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:143`

### Task 4: Update getTreeItem() for Planning Items

**Objective**: Replace type-based icon assignment with status-based icon assignment.

**Steps**:
1. Locate the icon assignment for planning items in `getTreeItem()` (line 166):
   ```typescript
   treeItem.iconPath = this.getIconForItemType(element.type);
   ```
2. Replace with status-based icon assignment:
   ```typescript
   treeItem.iconPath = getTreeItemIcon(element.status);
   ```

**Before**:
```typescript
// Set icon based on item type
treeItem.iconPath = this.getIconForItemType(element.type);
```

**After**:
```typescript
// Set icon based on item status (S57)
treeItem.iconPath = getTreeItemIcon(element.status);
```

**Rationale**: This changes the visual representation from item type (what it is) to item status (what state it's in), providing better workflow visibility.

**Expected Outcome**: TreeView will display status icons instead of type icons

**File Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:166`

### Task 5: Remove getIconForItemType() Method

**Objective**: Delete the now-unused type-based icon method.

**Steps**:
1. Locate the `getIconForItemType()` method (lines 443-456)
2. Delete the entire method including JSDoc comments (lines 427-456)
3. This method is no longer needed since icons are now status-based

**Code to Remove**:
```typescript
/**
 * Returns the appropriate VSCode ThemeIcon for a given item type.
 * ...
 */
private getIconForItemType(type: string): vscode.ThemeIcon {
  const iconMap: { [key: string]: string } = {
    'project': 'project',
    'epic': 'layers',
    'feature': 'package',
    'story': 'check',
    'bug': 'bug',
    'spec': 'file-code',
    'phase': 'milestone'
  };

  const iconId = iconMap[type];
  return new vscode.ThemeIcon(iconId);
}
```

**Expected Outcome**: Method removed, file compiles without errors

**File Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:427-456`

### Task 6: Update Inline Comments

**Objective**: Update comment to reflect status-based icon approach.

**Steps**:
1. Locate the comment before icon assignment (line 165)
2. Update from "Set icon based on item type" to "Set icon based on item status (S57)"
3. This documents the change and references the story

**Before**:
```typescript
// Set icon based on item type
```

**After**:
```typescript
// Set icon based on item status (S57)
```

**Expected Outcome**: Comment accurately describes new behavior

**File Reference**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:165`

### Task 7: Compile and Verify

**Objective**: Ensure the integration compiles without errors.

**Steps**:
1. Run TypeScript compiler:
   ```bash
   cd vscode-extension
   npm run compile
   ```
2. Verify no compilation errors
3. Expected: Successful compilation (tests may still fail - addressed in Phase 3)

**Expected Outcome**: TypeScript compilation succeeds

**Validation Commands**:
```bash
cd vscode-extension
npm run compile
```

### Task 8: Manual Visual Testing

**Objective**: Verify status icons display correctly in TreeView.

**Steps**:
1. Package the extension:
   ```bash
   cd vscode-extension
   npm run package
   ```
2. Install the VSIX file:
   ```bash
   code --install-extension cascade-0.1.0.vsix --force
   ```
3. Reload VSCode window:
   - Press Ctrl+Shift+P
   - Type "Developer: Reload Window"
   - Press Enter
4. Open Cascade TreeView (Activity Bar, left sidebar)
5. Expand status groups and verify icons:
   - **Not Started** items: Gray circle-outline icon
   - **In Planning** items: Yellow sync (circular arrows) icon
   - **Ready** items: Green debug-start (play button) icon
   - **In Progress** items: Blue loading~spin (spinner) icon
   - **Blocked** items: Red warning (triangle) icon
   - **Completed** items: Green/purple pass (checkmark) icon
6. Open Output Channel ("Cascade") and check for errors
7. Verify no console errors in Developer Tools (Help > Toggle Developer Tools)

**Expected Visual Result**:
- All items display status-based icons (not type-based icons)
- Icons use appropriate colors matching status
- Icons adapt to theme (test both light and dark themes)
- No console errors or warnings

**Validation Workflow**:
```bash
# Package
cd vscode-extension
npm run package

# Install
code --install-extension cascade-0.1.0.vsix --force

# Reload window (manual step)
# Ctrl+Shift+P -> "Developer: Reload Window"

# Visual inspection (manual step)
# Check TreeView icons for all status types
```

### Task 9: Test Theme Adaptation

**Objective**: Verify icons adapt to light/dark themes.

**Steps**:
1. With extension installed, switch to dark theme:
   - File > Preferences > Color Theme
   - Select a dark theme (e.g., "Dark+ (default dark)")
2. Observe TreeView icons - should be visible and appropriately colored
3. Switch to light theme:
   - File > Preferences > Color Theme
   - Select a light theme (e.g., "Light+ (default light)")
4. Observe TreeView icons - colors should adapt (e.g., gray not too dark/light)
5. ThemeColor should handle theme adaptation automatically

**Expected Outcome**: Icons visible and appropriately colored in both light and dark themes

**File Reference**: Theme adaptation is automatic via ThemeColor API

### Task 10: Edge Case Testing

**Objective**: Verify fallback behavior for unknown status values.

**Steps**:
1. Open a planning file in plans/ directory
2. Temporarily modify frontmatter to use invalid status:
   ```yaml
   status: InvalidStatus
   ```
3. Save file and observe TreeView
4. Should display circle-outline icon in red (fallback behavior)
5. Restore original status value

**Expected Outcome**: Unknown status values display fallback icon (circle-outline, red)

**File Reference**: Fallback logic in `vscode-extension/src/statusIcons.ts:getTreeItemIcon()`

## Completion Criteria

- [ ] `getTreeItemIcon()` imported from statusIcons module
- [ ] `getTreeItem()` updated to use status-based icons
- [ ] `getIconForItemType()` method removed
- [ ] Inline comments updated to reflect new approach
- [ ] TypeScript compilation succeeds
- [ ] Extension packaged and installed successfully
- [ ] Visual inspection confirms status icons render correctly
- [ ] All 6 status types display appropriate icons and colors
- [ ] Icons adapt to light/dark themes
- [ ] Unknown status displays fallback icon (red circle-outline)
- [ ] No console errors or warnings in Output Channel

## Next Phase

**Phase 3: Update Tests and Validation**
- Modify statusIcons.test.ts to test getTreeItemIcon()
- Add tests for all 6 status types
- Add test for unknown status (fallback)
- Run test suite and verify passing

## Reference Documentation

- **VSCode TreeView API**: https://code.visualstudio.com/api/extension-guides/tree-view
- **VSCode ThemeIcon**: https://code.visualstudio.com/api/references/vscode-api#ThemeIcon
- **Extension Testing**: CLAUDE.md - "VSCode Extension Testing" section
