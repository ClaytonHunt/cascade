---
spec: S50
phase: 1
title: Icon Mapping Implementation
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 1: Icon Mapping Implementation

## Overview

This phase implements type-specific icons for planning items using VSCode's ThemeIcon system. The implementation creates a helper function `getIconForItemType()` that maps ItemType enum values to VSCode icon IDs, then integrates this function into the existing `getTreeItem()` method.

Icons provide immediate visual identification of item types in the TreeView, improving navigation efficiency and user experience. The implementation uses built-in VSCode icons (Codicons) which are theme-aware and require no custom assets.

## Prerequisites

- S49 completed (PlanningTreeProvider exists)
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` file exists
- `vscode-extension/src/types.ts` defines ItemType enum
- VSCode extension development environment configured

## Tasks

### Task 1: Review VSCode ThemeIcon API

**Objective**: Understand ThemeIcon usage and available icon IDs.

**Documentation**:
- VSCode API: https://code.visualstudio.com/api/references/vscode-api#ThemeIcon
- Icon reference: https://code.visualstudio.com/api/references/icons-in-labels
- Codicon gallery: https://microsoft.github.io/vscode-codicons/dist/codicon.html

**Key concepts**:
- `new vscode.ThemeIcon('icon-id')` - Creates icon from built-in ID string
- Icons automatically adapt to current theme (light/dark/high-contrast)
- Icon IDs are strings like 'bug', 'check', 'layers', 'project'
- Icons are font glyphs (Codicons), not image files

**Verification**:
- ✅ Understand ThemeIcon constructor signature
- ✅ Confirm all selected icons exist in Codicon set
- ✅ Understand how icons adapt to themes

### Task 2: Create Icon Mapping Function

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: Add new private method after `compareItemNumbers()` (after line 192)

**Implementation**:

```typescript
/**
 * Returns the appropriate VSCode ThemeIcon for a given item type.
 *
 * Icon selection rationale:
 * - project: Folder with marker (projects contain epics)
 * - epic: Stacked layers (epics contain features)
 * - feature: Box/package (features contain stories)
 * - story: Checkmark (stories are tasks to complete)
 * - bug: Bug symbol (standard bug representation)
 * - spec: Code file (specs are technical documents)
 * - phase: Flag/marker (phases are spec milestones)
 *
 * All icons are built-in VSCode Codicons, automatically theme-aware.
 *
 * @param type - Item type from frontmatter
 * @returns ThemeIcon instance for the type
 */
private getIconForItemType(type: ItemType): vscode.ThemeIcon {
  const iconMap: Record<ItemType, string> = {
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

**Code explanation**:
- Uses `Record<ItemType, string>` for type-safe mapping
- Maps all 7 ItemType enum values to corresponding icon IDs
- Returns ThemeIcon instance (not just icon ID string)
- Private method (only used within PlanningTreeProvider)
- Comprehensive documentation explains icon choices

**Expected outcome**: Helper function compiles without errors and provides icon for each type.

### Task 3: Integrate Icons into getTreeItem()

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: Modify `getTreeItem()` method (currently at lines 54-80)

**Current code** (lines 68-72):
```typescript
// Create TreeItem
const treeItem = new vscode.TreeItem(label, collapsibleState);

// Set resourceUri for file association (enables icons, click handling)
treeItem.resourceUri = vscode.Uri.file(element.filePath);
```

**Modified code**:
```typescript
// Create TreeItem
const treeItem = new vscode.TreeItem(label, collapsibleState);

// Set icon based on item type
treeItem.iconPath = this.getIconForItemType(element.type);

// Set resourceUri for file association (enables click handling)
treeItem.resourceUri = vscode.Uri.file(element.filePath);
```

**Changes**:
- Add line: `treeItem.iconPath = this.getIconForItemType(element.type);`
- Update comment for resourceUri (icons now set explicitly, not from resourceUri)
- Insert after TreeItem creation, before tooltip assignment

**Expected outcome**: TreeView displays type-specific icons for each item.

### Task 4: Compile and Verify TypeScript

**Command**:
```bash
cd vscode-extension
npm run compile
```

**Verification**:
- ✅ No TypeScript compilation errors
- ✅ No linting warnings about unused imports
- ✅ Output: "Compiled successfully"

**Common issues**:
- Missing `vscode.ThemeIcon` import: Already imported via `import * as vscode from 'vscode';`
- Type errors in `iconMap`: Ensure all ItemType values are included
- Type mismatch on `iconPath`: Should accept `vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri, dark: vscode.Uri }`

**Resolution**: Fix any compilation errors before proceeding to manual testing.

### Task 5: Manual Testing - Icon Display

**Setup**:
1. Package extension: `npm run package` (creates cascade-0.1.0.vsix)
2. Install extension: `code --install-extension cascade-0.1.0.vsix --force`
3. Reload VSCode: Ctrl+Shift+P → "Developer: Reload Window"

**Test procedure**:
1. Open Cascade TreeView (Activity Bar → Cascade icon)
2. Verify each item type displays correct icon:
   - Project items: folder-like icon with marker
   - Epic items: layered/stacked icon
   - Feature items: box/package icon
   - Story items: checkmark icon
   - Bug items: bug symbol
   - Spec items: code file icon
   - Phase items: milestone/flag icon

3. Test theme compatibility:
   - Switch to dark theme (if in light theme, or vice versa)
   - Verify icons remain visible and correctly styled
   - Test high-contrast theme (optional)

**Verification checklist**:
- ✅ All item types display icons (no blank/missing icons)
- ✅ Icons match expected type (e.g., epics show layers icon)
- ✅ Icons are clearly visible in current theme
- ✅ No console errors in Output → Cascade channel
- ✅ TreeView loads without errors

**Troubleshooting**:
- Icons not appearing: Check Output → Cascade for errors, verify iconPath is set
- Wrong icons: Verify iconMap includes all types and uses correct icon IDs
- Theme issues: Verify using ThemeIcon (not Uri paths)

### Task 6: Output Channel Logging Verification

**Objective**: Ensure no new errors or warnings introduced.

**Steps**:
1. Open Output channel: Ctrl+Shift+P → "View: Toggle Output"
2. Select "Cascade" from dropdown
3. Check for errors during TreeView load

**Expected output**:
```
[TreeView] Found X markdown files in plans/
[TreeView] Loaded X planning items
```

**No new errors**: Icon implementation should not generate any errors or warnings.

**If errors present**: Review stack trace, check icon mapping logic, verify all types handled.

## Completion Criteria

- ✅ `getIconForItemType()` method created with full documentation
- ✅ Method handles all 7 ItemType enum values
- ✅ `getTreeItem()` sets `iconPath` property using helper function
- ✅ TypeScript compiles without errors
- ✅ Extension packages successfully
- ✅ Manual testing confirms icons display correctly
- ✅ Icons work in both light and dark themes
- ✅ Output channel shows no new errors or warnings
- ✅ All item types in TreeView show appropriate icons

## Next Phase

**Phase 2: Enhanced Tooltip System**

With icons in place, Phase 2 will enhance the tooltip to display comprehensive metadata in a structured markdown format. This includes item details, status information, and file path for navigation context.

The tooltip enhancement builds on this phase's icon work by providing additional information when users hover over the now-iconified tree items.
