---
spec: S50
phase: 3
title: Collapsible State and Context Value
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 3: Collapsible State and Context Value

## Overview

This phase refactors the collapsible state logic into a dedicated helper function `getCollapsibleState()` and adds the `contextValue` property to TreeItem for context menu support. These enhancements improve code maintainability and prepare the TreeView for future features (F19: Context Menu Actions, F17: Hierarchical Grouping).

The current `getTreeItem()` method contains inline collapsible state logic (lines 59-65). Extracting this into a helper function follows the single-responsibility principle and makes the logic reusable for future hierarchical tree implementation.

The `contextValue` property enables VSCode to filter context menu items based on tree item type, allowing F19 to show type-specific actions (e.g., "Open Spec" for stories, "Create Feature" for epics).

## Prerequisites

- Phase 2 completed (enhanced tooltip system implemented)
- TreeView displays items with icons and enhanced tooltips
- TypeScript compiles without errors
- Understanding of VSCode TreeItem contextValue usage

## Tasks

### Task 1: Review TreeItem Context Value System

**Objective**: Understand how contextValue enables context menu filtering.

**Documentation**:
- VSCode API: https://code.visualstudio.com/api/references/vscode-api#TreeItem.contextValue
- Context menus: https://code.visualstudio.com/api/references/contribution-points#contributes.menus

**Key concepts**:
- `contextValue` is an optional string property on TreeItem
- Used in `when` clauses for context menu visibility (package.json)
- Example: `"when": "viewItem == epic"` shows menu item only for epic items
- Can use complex expressions: `"when": "viewItem == story || viewItem == bug"`
- Convention: Use simple type identifier (e.g., 'epic', 'story', 'bug')

**Future usage** (F19 example):
```json
// package.json - context menu for stories
"menus": {
  "view/item/context": [
    {
      "command": "cascade.openSpec",
      "when": "view == cascadeView && viewItem == story"
    }
  ]
}
```

**Verification**:
- ✅ Understand contextValue property purpose
- ✅ Confirm string value maps to item type
- ✅ Understand how context menus filter using viewItem in when clauses

### Task 2: Extract Collapsible State Logic into Helper

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Current code** (lines 59-65 in getTreeItem()):
```typescript
// Determine collapsible state based on item type
// Epic/Feature: Collapsed (prepare for F17 hierarchy)
// Story/Bug: None (leaf nodes)
let collapsibleState = vscode.TreeItemCollapsibleState.None;
if (element.type === 'epic' || element.type === 'feature') {
  collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
}
```

**New helper function** (add after `buildTooltip()`):
```typescript
/**
 * Determines the collapsible state for a tree item based on its type.
 *
 * Collapsible state logic:
 * - Parent items (Project, Epic, Feature): Collapsed
 *   - These items can contain children in hierarchical view (F17)
 *   - Set to Collapsed even in flat tree (prepares for future hierarchy)
 * - Leaf items (Story, Bug, Spec, Phase): None
 *   - These items never have children (terminal nodes in hierarchy)
 *   - No collapse arrow shown
 *
 * Note: In current flat tree (S49), collapsible state has no effect because
 * getChildren() returns empty array for all items. However, setting the
 * correct state now avoids refactoring when hierarchy is implemented in F17.
 *
 * @param element - Planning tree item
 * @returns Collapsible state for the item
 */
private getCollapsibleState(element: PlanningTreeItem): vscode.TreeItemCollapsibleState {
  // Parent types that can contain children in hierarchical view
  const parentTypes: ItemType[] = ['project', 'epic', 'feature'];

  if (parentTypes.includes(element.type)) {
    return vscode.TreeItemCollapsibleState.Collapsed;
  }

  // Leaf types (story, bug, spec, phase) never have children
  return vscode.TreeItemCollapsibleState.None;
}
```

**Code improvements over inline logic**:
- Handles all 7 ItemType values explicitly (including 'project', 'spec', 'phase')
- Uses array-based approach for parent types (easier to modify)
- Comprehensive documentation explains design decision
- Explicitly mentions F17 preparation
- More maintainable for future hierarchy changes

**Expected outcome**: Helper function compiles and returns correct collapsible state for each type.

### Task 3: Refactor getTreeItem() to Use Helper

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: Modify `getTreeItem()` method collapsible state section

**Current code** (lines 54-68):
```typescript
getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
  // Format label: "[item] - [title]"
  // Examples: "E4 - Planning Kanban View", "S49 - TreeDataProvider Core Implementation"
  const label = `${element.item} - ${element.title}`;

  // Determine collapsible state based on item type
  // Epic/Feature: Collapsed (prepare for F17 hierarchy)
  // Story/Bug: None (leaf nodes)
  let collapsibleState = vscode.TreeItemCollapsibleState.None;
  if (element.type === 'epic' || element.type === 'feature') {
    collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
  }

  // Create TreeItem
  const treeItem = new vscode.TreeItem(label, collapsibleState);
```

**Modified code**:
```typescript
getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
  // Format label: "[item] - [title]"
  // Examples: "E4 - Planning Kanban View", "S49 - TreeDataProvider Core Implementation"
  const label = `${element.item} - ${element.title}`;

  // Determine collapsible state (parent items collapse, leaf items don't)
  const collapsibleState = this.getCollapsibleState(element);

  // Create TreeItem
  const treeItem = new vscode.TreeItem(label, collapsibleState);
```

**Changes**:
- Remove inline `let collapsibleState` variable and `if` statement (9 lines)
- Replace with single line: `const collapsibleState = this.getCollapsibleState(element);`
- Update comment to be more concise (implementation details in helper)
- Change `let` to `const` (value no longer reassigned)

**Expected outcome**: `getTreeItem()` method simplified, easier to read, maintains same functionality.

### Task 4: Add Context Value Property

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Location**: Modify `getTreeItem()` method, add contextValue after description assignment

**Current code** (lines 76-78):
```typescript
// Set description (shows after label, dimmed)
treeItem.description = element.status;

return treeItem;
```

**Modified code**:
```typescript
// Set description (shows after label, dimmed)
treeItem.description = element.status;

// Set context value for context menu filtering (used in F19)
// Enables type-specific menu items via "when": "viewItem == [type]"
treeItem.contextValue = element.type;

return treeItem;
```

**Code explanation**:
- Sets contextValue to item type string ('epic', 'story', 'bug', etc.)
- Simple implementation: Direct type mapping (no namespacing needed yet)
- Comment explains purpose and references future feature (F19)
- Enables `when` clauses in package.json context menu definitions

**Expected outcome**: Each TreeItem has contextValue set to its type, enabling context menu filtering.

### Task 5: Review Final getTreeItem() Structure

**Objective**: Verify method structure is clean and well-organized.

**Expected final structure** (after all Phase 1-3 changes):
```typescript
getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
  // 1. Format label
  const label = `${element.item} - ${element.title}`;

  // 2. Determine collapsible state
  const collapsibleState = this.getCollapsibleState(element);

  // 3. Create TreeItem
  const treeItem = new vscode.TreeItem(label, collapsibleState);

  // 4. Set icon (Phase 1)
  treeItem.iconPath = this.getIconForItemType(element.type);

  // 5. Set resourceUri (file association)
  treeItem.resourceUri = vscode.Uri.file(element.filePath);

  // 6. Set tooltip (Phase 2)
  treeItem.tooltip = this.buildTooltip(element);

  // 7. Set description (status badge)
  treeItem.description = element.status;

  // 8. Set context value (Phase 3)
  treeItem.contextValue = element.type;

  return treeItem;
}
```

**Structure analysis**:
- Clear sequential flow (label → state → create → configure → return)
- All helper functions extracted (single responsibility)
- Well-commented sections
- Each property assignment has clear purpose
- Total length: ~20 lines (down from ~27 lines initially)

**Verification**:
- ✅ Method structure matches expected format
- ✅ All properties configured correctly
- ✅ Comments concise and informative
- ✅ No redundant code or unnecessary complexity

### Task 6: Compile and Verify TypeScript

**Command**:
```bash
cd vscode-extension
npm run compile
```

**Verification**:
- ✅ No TypeScript compilation errors
- ✅ No warnings about unused variables
- ✅ Output: "Compiled successfully"

**Common issues**:
- Type error on `parentTypes`: Ensure declared as `ItemType[]` array
- Type error on `contextValue`: Should accept `string | undefined`
- Unused `collapsibleState` variable: Should be removed (replaced with const)

**Resolution**: Fix any compilation errors before proceeding to manual testing.

### Task 7: Manual Testing - Context Value Verification

**Setup**:
1. Package extension: `npm run package`
2. Install extension: `code --install-extension cascade-0.1.0.vsix --force`
3. Reload VSCode: Ctrl+Shift+P → "Developer: Reload Window"

**Test procedure**:

**Visual verification** (collapsible state):
1. Open Cascade TreeView
2. Check parent items (Project, Epic, Feature):
   - ✅ Show collapse arrow (▼ or ►)
   - ✅ Arrow appears even if no children (flat tree behavior)
3. Check leaf items (Story, Bug):
   - ✅ No collapse arrow shown
   - ✅ Item indentation unchanged

**Context value verification** (indirect):
Since context menus aren't implemented yet (F19), context value can't be directly tested. However, we can verify it's set:

**Option 1: VSCode API Inspector** (if available)
1. Use VSCode extension development tools to inspect TreeItem properties
2. Verify contextValue equals item type string

**Option 2: Future verification** (during F19)
When context menus are implemented, verify type-specific menus appear:
- Right-click epic → Shows epic-specific actions
- Right-click story → Shows story-specific actions

**For now**: Rely on TypeScript compilation and code review. Context value functionality will be verified in F19.

### Task 8: Test Collapsible State for All Types

**Objective**: Verify collapsible state logic handles all 7 ItemType values.

**Test cases**:

| Item Type | Expected State | Visual Indicator |
|-----------|----------------|------------------|
| project   | Collapsed      | Collapse arrow   |
| epic      | Collapsed      | Collapse arrow   |
| feature   | Collapsed      | Collapse arrow   |
| story     | None           | No arrow         |
| bug       | None           | No arrow         |
| spec      | None           | No arrow         |
| phase     | None           | No arrow         |

**Verification**:
- ✅ All parent types show collapse arrow
- ✅ All leaf types show no arrow
- ✅ No visual rendering issues (alignment, spacing)

**Note**: If your plans/ directory doesn't contain all item types, collapsible state logic is still verified through helper function implementation. The array-based approach ensures all types are handled consistently.

### Task 9: Output Channel Logging Verification

**Objective**: Ensure refactoring doesn't introduce errors.

**Steps**:
1. Open Output → Cascade
2. Check for errors during TreeView load

**Expected**: No new errors, same output as Phase 2.

**If errors present**: Review helper function implementations, check for type mismatches, verify all element properties exist.

## Completion Criteria

- ✅ `getCollapsibleState()` method created with full documentation
- ✅ Method handles all 7 ItemType values (project, epic, feature, story, bug, spec, phase)
- ✅ `getTreeItem()` refactored to use `getCollapsibleState()` helper
- ✅ Inline collapsible state logic removed from `getTreeItem()`
- ✅ `contextValue` property set to element type string
- ✅ `getTreeItem()` structure clean and well-organized
- ✅ TypeScript compiles without errors
- ✅ Extension packages successfully
- ✅ Manual testing confirms parent items show collapse arrow
- ✅ Manual testing confirms leaf items show no arrow
- ✅ Code review confirms contextValue assignment correct
- ✅ Output channel shows no new errors

## Next Phase

**Phase 4: Unit Tests**

With all TreeItem rendering enhancements complete (icons, tooltips, collapsible state, context value), Phase 4 will create comprehensive unit tests to validate all helper functions and TreeItem property assignments.

This phase ensures code quality and prevents regressions when future features modify the tree rendering logic.
