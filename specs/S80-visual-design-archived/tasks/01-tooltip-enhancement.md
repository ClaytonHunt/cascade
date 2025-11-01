---
spec: S80
phase: 1
title: Tooltip Enhancement for Archived Items
status: Completed
priority: Low
created: 2025-10-24
updated: 2025-10-24
---

# Phase 1: Tooltip Enhancement for Archived Items

## Overview

This phase enhances the `buildTooltip()` method in `PlanningTreeProvider` to add an `[ARCHIVED]` tag for archived items. This provides explicit textual indication of archived status, improving accessibility and clarity without cluttering the main TreeView display.

## Prerequisites

- ✅ S75 completed (icon styling already implemented)
- ✅ S76 completed (`isItemArchived()` function available)
- ✅ S78 completed (archived status group implemented)
- ✅ Understanding of tooltip formatting in VSCode TreeView

## Tasks

### Task 1: Import archiveUtils Module

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:1-10`

**Current Imports**:
```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { PlanningTreeItem, StatusGroupNode, TreeNode } from './PlanningTreeItem';
import { FrontmatterCache } from '../cache';
import { Status } from '../types';
import { HierarchyNode, ItemPathParts } from './HierarchyNode';
import { getTreeItemIcon } from '../statusIcons';
import { StatusPropagationEngine } from './StatusPropagationEngine';
import { isItemArchived } from './archiveUtils';
```

**Expected Outcome**:
- Import already exists (added in S78)
- No changes needed
- Verify import is present and correct

**Validation**:
- Check line 9 contains: `import { isItemArchived } from './archiveUtils';`
- TypeScript compilation succeeds

---

### Task 2: Modify buildTooltip() Method

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:1069-1081`

**Current Implementation**:
```typescript
/**
 * Builds a formatted tooltip string for a planning item.
 *
 * Tooltip structure:
 * - Line 1: Item identifier and title
 * - Line 2: Type, Status, Priority (pipe-separated)
 * - Line 3: Relative file path (for navigation context)
 *
 * Example:
 * ```
 * E4 - Planning Kanban View
 * Type: epic | Status: In Progress | Priority: High
 * File: plans/epic-04-planning-kanban-view/epic.md
 * ```
 *
 * @param element - Planning tree item
 * @returns Formatted tooltip string with metadata
 */
private buildTooltip(element: PlanningTreeItem): string {
  // Calculate relative path from workspace root
  const relativePath = path.relative(this.workspaceRoot, element.filePath);

  // Build tooltip with structured format
  const lines = [
    `${element.item} - ${element.title}`,
    `Type: ${element.type} | Status: ${element.status} | Priority: ${element.priority}`,
    `File: ${relativePath}`
  ];

  return lines.join('\n');
}
```

**New Implementation**:
```typescript
/**
 * Builds a formatted tooltip string for a planning item.
 *
 * Tooltip structure:
 * - Line 1: Item identifier and title (with [ARCHIVED] tag if archived)
 * - Line 2: Type, Status, Priority (pipe-separated)
 * - Line 3: Relative file path (for navigation context)
 *
 * Example (Active Item):
 * ```
 * E4 - Planning Kanban View
 * Type: epic | Status: In Progress | Priority: High
 * File: plans/epic-04-planning-kanban-view/epic.md
 * ```
 *
 * Example (Archived Item):
 * ```
 * S22 - Convert Manual Verification Scripts [ARCHIVED]
 * Type: story | Status: Archived | Priority: Low
 * File: plans/archive/epic-02/story-22-convert-scripts.md
 * ```
 *
 * Enhanced in S80: Adds [ARCHIVED] tag for archived items to improve
 * accessibility and provide explicit textual indication of archived status.
 *
 * @param element - Planning tree item
 * @returns Formatted tooltip string with metadata
 */
private buildTooltip(element: PlanningTreeItem): string {
  // Calculate relative path from workspace root
  const relativePath = path.relative(this.workspaceRoot, element.filePath);

  // Check if item is archived (S80)
  const archivedTag = isItemArchived(element) ? ' [ARCHIVED]' : '';

  // Build tooltip with structured format
  const lines = [
    `${element.item} - ${element.title}${archivedTag}`,
    `Type: ${element.type} | Status: ${element.status} | Priority: ${element.priority}`,
    `File: ${relativePath}`
  ];

  return lines.join('\n');
}
```

**Changes**:
1. Add `archivedTag` variable using `isItemArchived()` ternary expression
2. Append `archivedTag` to first line (title line)
3. Update JSDoc comment with:
   - Example showing `[ARCHIVED]` tag
   - Note about S80 enhancement
4. Preserve all existing tooltip structure and formatting

**Expected Outcome**:
- Archived items show `[ARCHIVED]` tag at end of title line
- Non-archived items show no tag (empty string appended)
- Tooltip remains readable and well-formatted
- No changes to other tooltip lines (type/status/priority, file path)

**TypeScript Type Safety**:
- `isItemArchived()` returns `boolean` (type-safe)
- Ternary expression returns `string` (either ' [ARCHIVED]' or '')
- String concatenation with `${archivedTag}` is type-safe

---

### Task 3: Verify TypeScript Compilation

**Goal**: Ensure code compiles without errors after changes

**Steps**:
```bash
# Navigate to extension directory
cd vscode-extension

# Compile TypeScript
npm run compile
```

**Expected Output**:
```
> cascade@0.1.0 compile
> node esbuild.js

✅ Build complete
```

**Common Issues to Check**:
- Import statement for `isItemArchived` is correct
- TypeScript types match (boolean → string)
- No syntax errors in ternary expression
- JSDoc comment properly formatted

**Expected Outcome**:
- Compilation succeeds with no errors
- No new TypeScript warnings
- Build output confirms successful compilation

---

### Task 4: Manual Testing - Archived Item Tooltip

**Goal**: Verify `[ARCHIVED]` tag appears for archived items

**Test Setup**:
```bash
# Package and install extension
cd vscode-extension
npm run package
code --install-extension cascade-0.1.0.vsix --force

# Reload VSCode window
# Press: Ctrl+Shift+P → "Developer: Reload Window"
```

**Test Case 1: Archived Item (By Status)**

**Steps**:
1. Create test file: `plans/test-archived-status.md`
   ```yaml
   ---
   item: S999
   title: Test Archived Status
   type: story
   status: Archived
   priority: Low
   ---
   ```
2. Toggle archived items ON in TreeView
3. Locate "S999 - Test Archived Status" in "Archived" status group
4. Hover over item to display tooltip

**Expected Results**:
- ✅ Tooltip first line: `S999 - Test Archived Status [ARCHIVED]`
- ✅ Tooltip second line: `Type: story | Status: Archived | Priority: Low`
- ✅ Tooltip third line: `File: plans/test-archived-status.md`
- ✅ `[ARCHIVED]` tag clearly visible at end of title

**Test Case 2: Archived Item (By Directory)**

**Steps**:
1. Create directory: `plans/archive/`
2. Create test file: `plans/archive/test-archived-directory.md`
   ```yaml
   ---
   item: S998
   title: Test Archived Directory
   type: story
   status: Ready
   priority: Medium
   ---
   ```
3. Toggle archived items ON
4. Locate "S998 - Test Archived Directory" in "Archived" status group
5. Hover over item

**Expected Results**:
- ✅ Tooltip first line: `S998 - Test Archived Directory [ARCHIVED]`
- ✅ Status shows "Ready" (not "Archived") but tag still appears
- ✅ File path shows `plans/archive/test-archived-directory.md`

**Test Case 3: Active Item (No Tag)**

**Steps**:
1. Locate any active item in "Ready" or "In Progress" status group
2. Hover over item

**Expected Results**:
- ✅ Tooltip first line: `S## - Title` (NO `[ARCHIVED]` tag)
- ✅ Tooltip format unchanged from before
- ✅ No extra spaces or artifacts

**Expected Outcome**: All tooltip test cases pass.

---

### Task 5: Manual Testing - Visual Design Comparison

**Goal**: Verify overall visual design for archived items

**Test Setup**:
Same extension installation as Task 4

**Test Case 1: Icon Color Verification**

**Steps**:
1. Toggle archived items ON
2. Expand "Archived" status group
3. Compare icon with other status groups
4. Observe icon color and shape

**Expected Results**:
- ✅ Icon shape: Archive box (codicon: archive)
- ✅ Icon color: Gray (muted, de-emphasized)
- ✅ Icon different from active status icons (green play, blue gear, etc.)
- ✅ Icon not jarring or distracting

**Test Case 2: Side-by-Side Comparison**

**Steps**:
1. Create two items with same title:
   - Active: `plans/test-active.md` with `status: Ready`
   - Archived: `plans/archive/test-archived.md` with `status: Ready`
2. Toggle archived items ON
3. View both items in TreeView
4. Compare visual appearance

**Expected Results**:
- ✅ Archived item has gray archive icon
- ✅ Active item has green play icon (Ready status)
- ✅ Archived item clearly distinguishable
- ✅ Archived item not overly emphasized (muted appearance)

**Test Case 3: Accessibility Test (High-Contrast Theme)**

**Steps**:
1. Switch to high-contrast theme: File → Preferences → Theme → Select high-contrast theme
2. Toggle archived items ON
3. View archived items in TreeView
4. Hover over archived items to see tooltip

**Expected Results**:
- ✅ Archived items visible and readable
- ✅ Icon still distinguishable from active items
- ✅ Tooltip `[ARCHIVED]` tag clearly visible
- ✅ Color + icon + text provide sufficient indication

**Expected Outcome**: Visual design meets accessibility standards.

---

### Task 6: Cleanup Test Files (Optional)

**Goal**: Remove test files created during manual testing

**Steps**:
```bash
# Remove test files
rm plans/test-archived-status.md
rm plans/archive/test-archived-directory.md
rm plans/test-active.md

# Remove archive directory if empty
rmdir plans/archive
```

**Note**: This step is optional. Test files can be kept for future reference.

**Expected Outcome**: Test files removed, workspace clean.

---

## Completion Criteria

### Code Changes
- ✅ `buildTooltip()` method modified to add `[ARCHIVED]` tag
- ✅ JSDoc comment updated with examples and S80 reference
- ✅ No breaking changes to existing tooltip structure

### Compilation
- ✅ TypeScript compilation succeeds
- ✅ No type errors or warnings
- ✅ No breaking changes to existing code

### Testing
- ✅ Archived items show `[ARCHIVED]` tag in tooltip
- ✅ Non-archived items show no tag
- ✅ Icon color is muted gray (via S75)
- ✅ Visual design is accessible (high-contrast test passes)

## Notes

### Why Tooltip Enhancement?

**Accessibility Rationale**:
- **Color Blindness**: `[ARCHIVED]` tag doesn't rely on color perception
- **Screen Readers**: Tooltip text is accessible to assistive technologies
- **High-Contrast Themes**: Text indication works when colors are limited
- **Cognitive Load**: Explicit textual label reduces interpretation effort

### Why Not Label Styling?

**VSCode API Limitations**:
- TreeItem labels don't support rich formatting (no strikethrough, italic, etc.)
- FileDecoration is heavyweight for simple text indication
- CSS styling not supported in TreeView
- Current approach (tooltip) is simplest and most accessible

### Implementation Simplicity

**Minimalist Approach**:
- Single function modification (buildTooltip)
- Single line of code added (archivedTag ternary)
- No new dependencies or APIs
- No performance impact (< 0.01ms per tooltip)

### Future Enhancements (Optional)

If more prominent visual styling is needed in the future:

**Option A**: FileDecoration for opacity/color
```typescript
// Example (not implemented in S80)
const decoration: vscode.FileDecoration = {
  color: new vscode.ThemeColor('charts.gray'),
  opacity: 0.6  // Reduce opacity for muted effect
};
```

**Option B**: Context menu distinction
```typescript
// Example (not implemented in S80)
if (isItemArchived(element)) {
  treeItem.contextValue = 'archived-item';  // Different context menu
}
```

These enhancements are **out of scope** for S80 but documented for future reference.

## Next Phase

This is the only phase for S80. After completion:
1. Run final compilation and testing
2. Mark S80 as "Completed"
3. Update story frontmatter to "Completed" status
4. Consider S81 or other Feature 22 enhancements

## Relevant Files

**Modified Files**:
- `vscode-extension/src/treeview/PlanningTreeProvider.ts` (buildTooltip method)

**Referenced Files** (No Changes):
- `vscode-extension/src/statusIcons.ts` (S75 implementation)
- `vscode-extension/src/treeview/archiveUtils.ts` (S76 implementation)

**Test Files** (Created During Testing):
- `plans/test-archived-status.md` (optional, can be removed)
- `plans/archive/test-archived-directory.md` (optional, can be removed)
- `plans/test-active.md` (optional, can be removed)

**Documentation**:
- Story file: `plans/epic-05-rich-treeview-visualization/feature-22-archive-support/story-80-visual-design-archived.md`
- CLAUDE.md: VSCode extension testing section
