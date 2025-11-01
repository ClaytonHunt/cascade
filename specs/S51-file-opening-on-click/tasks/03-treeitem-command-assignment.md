---
spec: S51
phase: 3
title: TreeItem Command Assignment
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 3: TreeItem Command Assignment

## Overview

Modify the `PlanningTreeProvider.getTreeItem()` method to assign a command property to each TreeItem. This connects user clicks in the TreeView to the command registered in Phase 2.

This is the final wiring step that makes the feature functional.

## Prerequisites

- Phase 1 completed (openPlanningFile function exists)
- Phase 2 completed (cascade.openFile command registered)
- PlanningTreeProvider.getTreeItem() method accessible

## Tasks

### Task 1: Locate TreeItem Command Assignment Point

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
**Method**: `getTreeItem(element: PlanningTreeItem)`
**Line**: Around 79-82 (after contextValue assignment, before return statement)

**Current code** (lines 54-82):
```typescript
getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
  // Format label: "[item] - [title]"
  const label = `${element.item} - ${element.title}`;

  // Determine collapsible state
  const collapsibleState = this.getCollapsibleState(element);

  // Create TreeItem
  const treeItem = new vscode.TreeItem(label, collapsibleState);

  // Set icon based on item type
  treeItem.iconPath = this.getIconForItemType(element.type);

  // Set resourceUri for file association
  treeItem.resourceUri = vscode.Uri.file(element.filePath);

  // Set tooltip with comprehensive metadata
  treeItem.tooltip = this.buildTooltip(element);

  // Set description (shows after label, dimmed)
  treeItem.description = element.status;

  // Set context value for context menu filtering (used in F19)
  treeItem.contextValue = element.type;

  return treeItem;  // <-- Command assignment goes BEFORE this line
}
```

**Insertion point**: Line 81 (after `treeItem.contextValue = element.type;`, before `return treeItem;`)

**Expected Outcome**: Identified correct insertion point in getTreeItem method

---

### Task 2: Add Command Property Assignment

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts:81`

Insert the following code before the return statement:

```typescript
  // Set context value for context menu filtering (used in F19)
  treeItem.contextValue = element.type;

  // Assign command for click handling (S51)
  treeItem.command = {
    command: 'cascade.openFile',
    title: 'Open File',
    arguments: [element.filePath]
  };

  return treeItem;
}
```

**Code Breakdown**:

1. **treeItem.command**: TreeItem property that defines click behavior
   - Type: `vscode.Command | undefined`
   - When user clicks TreeItem, VSCode executes this command
   - Alternative would be `onDidChangeSelection` event (more complex, unnecessary)

2. **command: 'cascade.openFile'**: Command ID to execute
   - Must match ID registered in Phase 2 (extension.ts:561)
   - Typo here → Command not found error (VSCode will log warning)
   - Command looked up at runtime (no compile-time validation)

3. **title: 'Open File'**: Human-readable command description
   - Shown in keyboard shortcuts UI (if command in package.json)
   - Not displayed in TreeView (cosmetic for this use case)
   - Good practice to include (self-documenting)

4. **arguments: [element.filePath]**: Parameters passed to command handler
   - Array of arguments (order matters!)
   - First element → filePath parameter in command handler
   - element.filePath is absolute path (from PlanningTreeItem interface)
   - Command handler receives: `(filePath: string) => { ... }`

**Why this approach?**
- **Declarative**: TreeItem declares behavior, VSCode handles execution
  - Cleaner than event-based approach (onDidChangeSelection)
  - Less code to maintain (no state management)
  - Follows VSCode conventions (e.g., File Explorer uses same pattern)
- **Single Click**: VSCode triggers command on single click
  - Matches user expectations (File Explorer behavior)
  - No need for double-click handling (VSCode doesn't provide API)
- **Arguments Array**: Flexible for multiple parameters
  - Currently only need filePath
  - Could add more parameters later (e.g., line number to jump to)

**API Reference**:
- [TreeItem.command](https://code.visualstudio.com/api/references/vscode-api#TreeItem.command)
- [Command interface](https://code.visualstudio.com/api/references/vscode-api#Command)

**Expected Outcome**: Command property assigned to TreeItem

---

### Task 3: Add Inline Comment for Context

**Location**: Same as Task 2 (already included in code sample)

Verify the inline comment is present:

```typescript
// Assign command for click handling (S51)
treeItem.command = { /* ... */ };
```

**Why this comment?**
- **Story Reference**: Links code to requirement (S51)
  - Helps developers understand why code exists
  - Makes it easier to track changes across planning system
- **Purpose**: "click handling" describes behavior
  - Self-documenting (reduces need to read TreeItem API docs)
  - Distinguishes from other command use cases (context menus, buttons, etc.)

**Expected Outcome**: Comment clearly explains purpose with story reference

---

### Task 4: Verify Element FilePath Usage

**Location**: Same location, verify argument array

Ensure `element.filePath` is used correctly:

```typescript
arguments: [element.filePath]
```

**Verification checklist**:
- ✅ Property name: `filePath` (not `file_path` or `path`)
- ✅ Source: `element` parameter (PlanningTreeItem)
- ✅ Type: string (absolute path)
- ✅ Array: Wrapped in array literal `[...]`
- ✅ Order: First element (matches command handler parameter order)

**Why absolute path?**
- element.filePath comes from PlanningTreeProvider.getChildren() (line 115)
- File URI from findFiles() → fsPath gives absolute path
- Absolute paths work across all workspace folders (multi-root support)
- openPlanningFile expects absolute path (vscode.Uri.file works with absolute)

**Expected Outcome**: Correct property used, properly formatted

---

### Task 5: Review Complete Implementation

**Location**: `vscode-extension/src/treeview/PlanningTreeProvider.ts` (lines 54-86)

Verify the complete getTreeItem method:

```typescript
getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
  // Format label: "[item] - [title]"
  const label = `${element.item} - ${element.title}`;

  // Determine collapsible state
  const collapsibleState = this.getCollapsibleState(element);

  // Create TreeItem
  const treeItem = new vscode.TreeItem(label, collapsibleState);

  // Set icon based on item type
  treeItem.iconPath = this.getIconForItemType(element.type);

  // Set resourceUri for file association
  treeItem.resourceUri = vscode.Uri.file(element.filePath);

  // Set tooltip with comprehensive metadata
  treeItem.tooltip = this.buildTooltip(element);

  // Set description (shows after label, dimmed)
  treeItem.description = element.status;

  // Set context value for context menu filtering (used in F19)
  treeItem.contextValue = element.type;

  // Assign command for click handling (S51)
  treeItem.command = {
    command: 'cascade.openFile',
    title: 'Open File',
    arguments: [element.filePath]
  };

  return treeItem;
}
```

**Code Quality Checklist**:
- ✅ Command property assigned to treeItem (not new TreeItem instance)
- ✅ Command ID matches registered command ('cascade.openFile')
- ✅ Title is descriptive ('Open File')
- ✅ Arguments array contains filePath
- ✅ Comment includes story reference (S51)
- ✅ Code positioned logically (after properties, before return)
- ✅ Formatting matches existing code style
- ✅ No TypeScript errors (command property is valid TreeItem property)

**Expected Outcome**: Complete, production-ready getTreeItem implementation

---

### Task 6: Compile and Verify No Errors

**Location**: Terminal in `vscode-extension/` directory

Run TypeScript compilation:

```bash
npm run compile
```

**Expected Output**:
```
> cascade@0.1.0 compile
> node esbuild.js

[esbuild] Build succeeded
```

**If compilation errors occur**, check:
1. Command property syntax (object with command, title, arguments)
2. Command ID spelling ('cascade.openFile')
3. Element property name (element.filePath, not element.file_path)
4. Array syntax for arguments ([element.filePath])

**Common errors**:
- `Type '{ command: string; title: string; arguments: string[]; }' is not assignable to type 'Command'`
  → Check command property structure matches vscode.Command interface
- `Property 'filePath' does not exist on type 'PlanningTreeItem'`
  → Check PlanningTreeItem interface definition (should have filePath)
- `Expected ';'`
  → Check for missing semicolons or commas in command object

**Expected Outcome**: Clean compilation with no errors

## Completion Criteria

- ✅ TreeItem command property assigned in getTreeItem method
- ✅ Command ID is 'cascade.openFile' (matches Phase 2 registration)
- ✅ Command title is 'Open File'
- ✅ Arguments array contains element.filePath
- ✅ Command assignment positioned after contextValue, before return
- ✅ Inline comment includes story reference (S51)
- ✅ TypeScript compilation succeeds (npm run compile)
- ✅ All existing TreeItem properties preserved (icon, tooltip, description, etc.)
- ✅ Code follows existing method structure and style
- ✅ No ESLint warnings (if configured)

## Testing

Manual testing now possible! Feature is fully wired.

### Manual Test Procedure

```bash
# 1. Compile extension
cd vscode-extension
npm run compile

# 2. Package extension
npm run package

# 3. Install extension
code --install-extension cascade-0.1.0.vsix --force

# 4. Reload VSCode window
# Press Ctrl+Shift+P → "Developer: Reload Window"
```

### Test Cases

1. **Basic Click Test**:
   - Open Cascade TreeView (Activity Bar → Cascade icon)
   - Click any story item (e.g., "S49 - TreeDataProvider Core Implementation")
   - **Expected**: File opens in editor, editor receives focus

2. **Multiple Clicks Test**:
   - Click different items in TreeView
   - **Expected**: Each file opens in separate tab

3. **Same Item Click Test**:
   - Click same item twice
   - **Expected**: Second click switches to existing tab (VSCode default behavior)

4. **Tab Behavior Test**:
   - Click item to open file
   - Check tab type (preview vs permanent)
   - **Expected**: Permanent tab (not italic text, not replaced by next preview)

5. **Error Handling Test** (requires manual setup):
   - Open TreeView
   - Note file path of an item (hover to see tooltip)
   - Delete that file from file system (using File Explorer)
   - Click the item in TreeView
   - **Expected**: Error notification shown, error logged to output channel

6. **Item Type Test**:
   - Click items of different types (Project, Epic, Feature, Story)
   - **Expected**: All types open their respective files correctly

### Verification Checklist

- ✅ Clicking tree item opens corresponding markdown file
- ✅ File opens in editor (not external application)
- ✅ Editor receives focus after opening
- ✅ File opens in permanent tab (not preview)
- ✅ Multiple files can be open simultaneously
- ✅ Clicking same item switches to existing tab
- ✅ Error notification shown for missing files
- ✅ Error logged to output channel (check "Cascade" output)
- ✅ No console errors (open Dev Tools: Help → Toggle Developer Tools)
- ✅ Works for all item types (Project, Epic, Feature, Story, Bug)

**If any test fails**, see troubleshooting in Phase 4.

## Next Phase

**Phase 4: Unit Tests**

Create comprehensive unit tests for the implementation, covering command registration, TreeItem configuration, and error handling scenarios.

File: Create `vscode-extension/src/test/suite/fileOpening.test.ts`
