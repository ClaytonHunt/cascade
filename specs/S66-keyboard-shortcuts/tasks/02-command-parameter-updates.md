---
spec: S66
phase: 2
title: Command Parameter Updates
status: Completed
priority: Low
created: 2025-10-17
updated: 2025-10-17
---

# Phase 2: Command Parameter Updates

## Overview

Modify existing command handlers (S63, S64, S65) to support keyboard invocation by making the `item` parameter optional and adding selection fallback logic.

When commands are invoked via keyboard shortcuts (Phase 1), VSCode does NOT pass the item parameter. Commands must get the selected item from `cascadeTreeView.selection` API.

**Pattern**:
```typescript
async function someCommand(item?: PlanningTreeItem): Promise<void> {
  // If no item provided (keyboard shortcut), get from TreeView selection
  if (!item && cascadeTreeView) {
    const selection = cascadeTreeView.selection;
    if (selection.length === 0) {
      vscode.window.showWarningMessage('No item selected');
      return;
    }
    item = selection[0] as PlanningTreeItem;
  }

  // Existing validation and logic continues...
}
```

This pattern maintains backward compatibility with context menu invocation (item passed) while adding keyboard support (item from selection).

## Prerequisites

- Phase 1 completed (keybindings registered in package.json) ✅
- Commands registered in extension.ts (S63, S64, S65) ✅
- TreeView instance available as `cascadeTreeView` (extension.ts:38)
- Understanding of VSCode TreeView selection API

## Tasks

### Task 1: Update changeStatusCommand for Keyboard Support

Modify `changeStatusCommand` function to support both context menu and keyboard invocation.

**File**: `vscode-extension/src/extension.ts:555`

**Current Implementation**:
```typescript
async function changeStatusCommand(item: PlanningTreeItem): Promise<void> {
  // Validate input (should never be null due to when clause, but defensive programming)
  if (!item) {
    outputChannel.appendLine('[ChangeStatus] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }
  // ... rest of function
}
```

**Updated Implementation**:
```typescript
async function changeStatusCommand(item?: PlanningTreeItem): Promise<void> {
  // If no item provided (keyboard shortcut), get from TreeView selection
  if (!item && cascadeTreeView) {
    const selection = cascadeTreeView.selection;
    if (selection.length === 0) {
      outputChannel.appendLine('[ChangeStatus] ℹ️  No item selected');
      vscode.window.showWarningMessage('No item selected');
      return;
    }
    item = selection[0] as PlanningTreeItem;
    outputChannel.appendLine('[ChangeStatus] ℹ️  Item retrieved from TreeView selection');
  }

  // Validate input (defensive programming - handles both null and undefined)
  if (!item) {
    outputChannel.appendLine('[ChangeStatus] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Validate item type (only Stories and Bugs can change status)
  if (item.type !== 'story' && item.type !== 'bug') {
    outputChannel.appendLine(`[ChangeStatus] ⚠️  Invalid item type: ${item.type}`);
    vscode.window.showWarningMessage('Change Status only works for Stories and Bugs');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[ChangeStatus] Command invoked for ${item.item} - ${item.title}`);
  // ... rest of existing function logic (no changes after this point)
}
```

**Changes Made**:
1. Parameter type: `item: PlanningTreeItem` → `item?: PlanningTreeItem` (optional)
2. Added selection fallback logic at beginning of function
3. Added item type validation (Stories/Bugs only) with user-friendly error
4. Added logging for keyboard invocation path

**Why Type Validation?**

The when clause (`viewItem == story || viewItem == bug`) prevents invalid shortcuts, but:
- User could invoke from Command Palette (bypasses when clause)
- Defensive programming catches edge cases
- Clear error message improves UX

**Expected Outcome**:
- Context menu invocation: Works as before (item passed directly)
- Keyboard invocation: Gets item from selection, validates type, proceeds
- No selection: Shows warning "No item selected"
- Wrong item type: Shows warning "Change Status only works for Stories and Bugs"

### Task 2: Update createChildItemCommand for Keyboard Support

Modify `createChildItemCommand` function to support both context menu and keyboard invocation.

**File**: `vscode-extension/src/extension.ts:642`

**Current Implementation**:
```typescript
async function createChildItemCommand(parentItem: PlanningTreeItem): Promise<void> {
  // Validate input (defensive programming)
  if (!parentItem) {
    outputChannel.appendLine('[CreateChild] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }
  // ... rest of function
}
```

**Updated Implementation**:
```typescript
async function createChildItemCommand(parentItem?: PlanningTreeItem): Promise<void> {
  // If no item provided (keyboard shortcut), get from TreeView selection
  if (!parentItem && cascadeTreeView) {
    const selection = cascadeTreeView.selection;
    if (selection.length === 0) {
      outputChannel.appendLine('[CreateChild] ℹ️  No item selected');
      vscode.window.showWarningMessage('No item selected');
      return;
    }
    parentItem = selection[0] as PlanningTreeItem;
    outputChannel.appendLine('[CreateChild] ℹ️  Item retrieved from TreeView selection');
  }

  // Validate input (defensive programming)
  if (!parentItem) {
    outputChannel.appendLine('[CreateChild] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Validate item type (only Epics and Features can create children)
  if (parentItem.type !== 'epic' && parentItem.type !== 'feature') {
    outputChannel.appendLine(`[CreateChild] ⚠️  Invalid item type: ${parentItem.type}`);
    vscode.window.showWarningMessage('Create Child Item only works for Epics and Features');
    return;
  }

  // Determine child type based on parent
  const childType: 'feature' | 'story' = parentItem.type === 'epic' ? 'feature' : 'story';
  // ... rest of existing function logic (no changes after this point)
}
```

**Changes Made**:
1. Parameter type: `parentItem: PlanningTreeItem` → `parentItem?: PlanningTreeItem` (optional)
2. Added selection fallback logic at beginning of function
3. Added item type validation (Epics/Features only) with user-friendly error
4. Added logging for keyboard invocation path

**Why Type Validation?**

The when clause (`viewItem == epic || viewItem == feature`) prevents invalid shortcuts, but:
- User could invoke from Command Palette (bypasses when clause)
- Defensive programming catches edge cases
- Clear error message improves UX

**Expected Outcome**:
- Context menu invocation: Works as before (parentItem passed directly)
- Keyboard invocation: Gets parentItem from selection, validates type, proceeds
- No selection: Shows warning "No item selected"
- Wrong item type: Shows warning "Create Child Item only works for Epics and Features"

### Task 3: Update copyItemNumberCommand for Keyboard Support

Modify `copyItemNumberCommand` function to support both context menu and keyboard invocation.

**File**: `vscode-extension/src/extension.ts:305`

**Current Implementation**:
```typescript
async function copyItemNumberCommand(item: PlanningTreeItem): Promise<void> {
  // Defensive programming: Validate input
  if (!item) {
    outputChannel.appendLine('[CopyItem] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }
  // ... rest of function
}
```

**Updated Implementation**:
```typescript
async function copyItemNumberCommand(item?: PlanningTreeItem): Promise<void> {
  // If no item provided (keyboard shortcut), get from TreeView selection
  if (!item && cascadeTreeView) {
    const selection = cascadeTreeView.selection;
    if (selection.length === 0) {
      outputChannel.appendLine('[CopyItem] ℹ️  No item selected');
      vscode.window.showWarningMessage('No item selected');
      return;
    }
    item = selection[0] as PlanningTreeItem;
    outputChannel.appendLine('[CopyItem] ℹ️  Item retrieved from TreeView selection');
  }

  // Defensive programming: Validate input
  if (!item) {
    outputChannel.appendLine('[CopyItem] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Validate item type (status groups don't have item numbers)
  if (!item.item || item.item.trim() === '') {
    outputChannel.appendLine('[CopyItem] ⚠️  Item has no item number (likely status group)');
    vscode.window.showWarningMessage('Cannot copy item number - no item number found');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[CopyItem] Copying item number: ${item.item}`);
  // ... rest of existing function logic (no changes after this point)
}
```

**Changes Made**:
1. Parameter type: `item: PlanningTreeItem` → `item?: PlanningTreeItem` (optional)
2. Added selection fallback logic at beginning of function
3. Added item number validation (status groups filtered out)
4. Added logging for keyboard invocation path

**Why Item Number Validation?**

The when clause (`viewItem != status-group`) prevents copying from status groups, but:
- User could invoke from Command Palette (bypasses when clause)
- Extra safety check ensures item has valid item number
- Graceful handling of edge cases

**Expected Outcome**:
- Context menu invocation: Works as before (item passed directly)
- Keyboard invocation: Gets item from selection, validates item number, proceeds
- No selection: Shows warning "No item selected"
- Status group selected: Shows warning "Cannot copy item number"

### Task 4: Update Command Registrations for Optional Parameters

Update command registrations in `activate()` function to pass optional parameters correctly.

**File**: `vscode-extension/src/extension.ts:548-582`

**Current Registrations**:
```typescript
// Register change status command (S63)
const changeStatusCommandDisposable = vscode.commands.registerCommand(
  'cascade.changeStatus',
  (item: PlanningTreeItem) => {
    changeStatusCommand(item);
  }
);
context.subscriptions.push(changeStatusCommandDisposable);

// Register create child item command (S64)
const createChildItemCommandDisposable = vscode.commands.registerCommand(
  'cascade.createChildItem',
  (item: PlanningTreeItem) => {
    createChildItemCommand(item);
  }
);
context.subscriptions.push(createChildItemCommandDisposable);

// Register utility commands (S65)
const copyItemNumberCmd = vscode.commands.registerCommand(
  'cascade.copyItemNumber',
  (item: PlanningTreeItem) => copyItemNumberCommand(item)
);
context.subscriptions.push(copyItemNumberCmd);
```

**Updated Registrations**:
```typescript
// Register change status command (S63, S66)
const changeStatusCommandDisposable = vscode.commands.registerCommand(
  'cascade.changeStatus',
  (item?: PlanningTreeItem) => {
    changeStatusCommand(item);
  }
);
context.subscriptions.push(changeStatusCommandDisposable);

// Register create child item command (S64, S66)
const createChildItemCommandDisposable = vscode.commands.registerCommand(
  'cascade.createChildItem',
  (item?: PlanningTreeItem) => {
    createChildItemCommand(item);
  }
);
context.subscriptions.push(createChildItemCommandDisposable);

// Register utility commands (S65, S66)
const copyItemNumberCmd = vscode.commands.registerCommand(
  'cascade.copyItemNumber',
  (item?: PlanningTreeItem) => copyItemNumberCommand(item)
);
context.subscriptions.push(copyItemNumberCmd);
```

**Changes Made**:
1. Parameter type: `(item: PlanningTreeItem)` → `(item?: PlanningTreeItem)` (optional)
2. Comments updated to reference S66

**Why This Change?**

VSCode command system:
- Context menu: Passes item parameter explicitly
- Keyboard/Command Palette: Passes `undefined` (no parameters)
- Lambda function signature must match both cases (optional parameter)

**Expected Outcome**:
- Commands register without TypeScript errors
- Context menu invocation passes item parameter
- Keyboard invocation passes undefined (command handles internally)

### Task 5: Compile and Validate

Compile TypeScript code and validate all changes.

**Compilation**:
```bash
cd vscode-extension
npm run compile
```

**Expected Output**:
```
> cascade@0.1.0 compile
> node esbuild.js

[esbuild] Build succeeded (0 errors, 0 warnings)
```

**If Compilation Fails**:

1. **Type Errors**: Check parameter types match (optional `?`)
2. **Undefined cascadeTreeView**: Ensure variable declared at module level (extension.ts:38)
3. **Import Errors**: Ensure PlanningTreeItem imported (extension.ts:20)

**Manual Testing Plan**:

1. **Test Change Status (Ctrl+Shift+S)**:
   - Package extension: `npm run package`
   - Install: `code --install-extension cascade-0.1.0.vsix --force`
   - Reload VSCode: Ctrl+Shift+P → "Developer: Reload Window"
   - Open Cascade TreeView
   - Select Story in Ready status
   - Press Ctrl+Shift+S
   - Verify quick pick opens with status transitions
   - Select "In Progress"
   - Verify file updated, TreeView refreshed

2. **Test Create Child Item (Ctrl+Shift+N)**:
   - Select Feature in TreeView
   - Press Ctrl+Shift+N
   - Verify input box opens: "Enter Story title"
   - Enter "Test Keyboard Story"
   - Verify Story created, file opens, TreeView refreshed

3. **Test Copy Item Number (Ctrl+C)**:
   - Select Story (e.g., S63)
   - Press Ctrl+C
   - Verify toast: "Copied: S63"
   - Open text file and press Ctrl+V
   - Verify "S63" pasted

4. **Test Edge Cases**:
   - No selection + Ctrl+C → Warning: "No item selected"
   - Epic selected + Ctrl+Shift+S → Warning: "Change Status only works for Stories and Bugs"
   - Editor focused + Ctrl+C → Normal copy (not item number)

5. **Test Context Menu (Regression)**:
   - Right-click Story → Change Status → Verify works
   - Right-click Feature → Create Child Item → Verify works
   - Right-click Story → Copy Item Number → Verify works

**Output Channel Validation**:

Open output channel (Ctrl+Shift+P → "View: Toggle Output" → "Cascade") and verify logs:
```
[ChangeStatus] ℹ️  Item retrieved from TreeView selection
[ChangeStatus] Command invoked for S63 - Change Status Context Menu Action
  Current status: Ready
  ...

[CreateChild] ℹ️  Item retrieved from TreeView selection
[CreateChild] Creating child story for F19
  ...

[CopyItem] ℹ️  Item retrieved from TreeView selection
[CopyItem] Copying item number: S63
  ...
```

**Expected Outcome**:
- TypeScript compilation succeeds
- Extension loads without errors
- All keyboard shortcuts work as expected
- Context menu functionality preserved (no regressions)
- Edge cases handled gracefully (warnings shown)
- Output channel shows selection retrieval logs

## Completion Criteria

- [ ] `changeStatusCommand` parameter updated to optional
- [ ] `changeStatusCommand` has selection fallback logic
- [ ] `changeStatusCommand` validates item type (Stories/Bugs only)
- [ ] `createChildItemCommand` parameter updated to optional
- [ ] `createChildItemCommand` has selection fallback logic
- [ ] `createChildItemCommand` validates item type (Epics/Features only)
- [ ] `copyItemNumberCommand` parameter updated to optional
- [ ] `copyItemNumberCommand` has selection fallback logic
- [ ] `copyItemNumberCommand` validates item number exists
- [ ] Command registrations updated to accept optional parameters
- [ ] TypeScript compilation succeeds (no errors)
- [ ] Manual testing passes all test cases
- [ ] Context menu functionality preserved (no regressions)
- [ ] Output channel logs show keyboard invocation path
- [ ] User warnings shown for invalid selections

## Next Phase

This is the final phase. After completion:
1. Mark S66 as "Completed" in plans/
2. Update F19 (Context Menu Actions) feature status
3. Consider user feedback for alternative keyboard shortcuts if conflicts reported

## Notes

**VSCode TreeView Selection API**

Documentation: https://code.visualstudio.com/api/references/vscode-api#TreeView

Key properties:
- `selection: readonly T[]` - Currently selected tree items
- `onDidChangeSelection: Event<TreeViewSelectionChangeEvent<T>>` - Selection change event

Why we use `selection[0]`:
- TreeView configured as single-select (default)
- User can only select one item at a time
- `selection[0]` gets the currently selected item
- `selection.length === 0` means no selection

**Command Palette Behavior**

When users invoke commands via Command Palette (Ctrl+Shift+P):
- When clauses do NOT apply (commands always visible)
- No parameters passed (item = undefined)
- Commands must validate input and show helpful error messages

This is why we add type validation even though when clauses restrict shortcuts.

**Alternative: Enable Multi-Select**

TreeView could support multi-select:
```typescript
cascadeTreeView = vscode.window.createTreeView('cascadeView', {
  treeDataProvider: planningTreeProvider,
  canSelectMany: true  // Enable multi-select
});
```

Then commands could process all selected items:
```typescript
const selection = cascadeTreeView.selection;
for (const item of selection) {
  await changeStatusCommand(item);
}
```

But this is out of scope for S66. Single-select is sufficient for current requirements.
