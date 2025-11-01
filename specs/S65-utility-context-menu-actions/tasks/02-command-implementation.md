---
spec: S65
phase: 2
title: Command Implementation
status: Completed
priority: Medium
created: 2025-10-17
updated: 2025-10-17
---

# Phase 2: Command Implementation

## Overview

Implement three command handler functions in extension.ts and register them in the activate() function. Each handler follows the established pattern from S63/S64 with error handling, output channel logging, and user notifications.

## Prerequisites

- Phase 1 completed (commands registered in package.json)
- Understanding of PlanningTreeItem interface
- Familiarity with VSCode APIs (clipboard, commands, notifications)

## Tasks

### Task 1: Implement "Open File" Command Handler

**Location**: `vscode-extension/src/extension.ts` (after `createChildItemCommand` function, around line 851)

Add command handler function that reuses existing `openPlanningFile` function:

```typescript
/**
 * Command handler for "Open File" context menu action (S65).
 *
 * Opens the planning item's markdown file in the VSCode editor.
 * This is the same behavior as clicking the item in the TreeView,
 * but accessible via right-click context menu.
 *
 * Reuses existing openPlanningFile function (line 1170) which handles:
 * - URI conversion
 * - Permanent tab mode
 * - Editor focus
 * - Error handling
 *
 * @param item - The PlanningTreeItem that was right-clicked
 */
async function openFileContextCommand(item: PlanningTreeItem): Promise<void> {
  // Defensive programming: Validate input
  if (!item) {
    outputChannel.appendLine('[OpenFile] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[OpenFile] Opening file: ${item.item} - ${item.title}`);
  outputChannel.appendLine(`  Path: ${item.filePath}`);

  // Delegate to existing openPlanningFile function
  // This function already handles:
  // - URI conversion
  // - Document opening
  // - Permanent tab mode (preview: false)
  // - Editor focus (preserveFocus: false)
  // - Error handling and user notifications
  await openPlanningFile(item.filePath, outputChannel);

  outputChannel.appendLine(`[OpenFile] ✅ File opened successfully`);
}
```

**Implementation Notes**:
- Reuses `openPlanningFile` function at line 1170 (already implemented for TreeView clicks)
- No need to duplicate URI conversion, error handling, or editor configuration
- Follows existing logging pattern: `[CommandName] Message`
- Uses emoji indicators: ❌ for errors, ✅ for success

**Validation**:
- Function signature matches: `async function openFileContextCommand(item: PlanningTreeItem): Promise<void>`
- Calls `openPlanningFile(item.filePath, outputChannel)`
- Logs to output channel before and after operation
- Error handling via defensive programming (null check)

**References**:
- Existing openPlanningFile function: extension.ts:1170-1210
- Similar pattern: changeStatusCommand function: extension.ts:555-623

---

### Task 2: Implement "Copy Item Number" Command Handler

**Location**: `vscode-extension/src/extension.ts` (after `openFileContextCommand` function)

Add command handler function that copies item ID to clipboard:

```typescript
/**
 * Command handler for "Copy Item Number" context menu action (S65).
 *
 * Copies the planning item's ID (e.g., "S39", "F16", "E4") to the clipboard
 * and shows a toast notification to confirm the operation.
 *
 * Uses VSCode clipboard API (vscode.env.clipboard) which provides cross-platform
 * clipboard access with proper error handling.
 *
 * @param item - The PlanningTreeItem that was right-clicked
 */
async function copyItemNumberCommand(item: PlanningTreeItem): Promise<void> {
  // Defensive programming: Validate input
  if (!item) {
    outputChannel.appendLine('[CopyItem] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[CopyItem] Copying item number: ${item.item}`);
  outputChannel.appendLine(`  Title: ${item.title}`);

  try {
    // Copy to clipboard using VSCode API
    // This API handles platform differences (Windows/Mac/Linux clipboard)
    await vscode.env.clipboard.writeText(item.item);

    // Log success
    outputChannel.appendLine(`[CopyItem] ✅ Copied to clipboard: ${item.item}`);

    // Show success notification
    // Toast appears briefly in bottom-right corner
    vscode.window.showInformationMessage(`Copied: ${item.item}`);

  } catch (error) {
    // Handle errors (clipboard unavailable, permissions issue, etc.)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Log error
    outputChannel.appendLine(`[CopyItem] ❌ Error: ${errorMsg}`);

    // Show error notification
    vscode.window.showErrorMessage(
      `Failed to copy item number: ${errorMsg}`
    );
  }
}
```

**Implementation Notes**:
- Uses VSCode clipboard API: `vscode.env.clipboard.writeText()`
- Async operation (clipboard API returns Promise)
- Error handling with try-catch (clipboard might be unavailable)
- Success toast notification: `showInformationMessage()`
- Error toast notification: `showErrorMessage()`

**Validation**:
- Function signature: `async function copyItemNumberCommand(item: PlanningTreeItem): Promise<void>`
- Calls `vscode.env.clipboard.writeText(item.item)`
- Shows toast notification on success
- Error handling with try-catch
- Logs all operations to output channel

**References**:
- VSCode Clipboard API: https://code.visualstudio.com/api/references/vscode-api#env.clipboard
- Similar error handling: changeStatusCommand function: extension.ts:602-622

---

### Task 3: Implement "Reveal in Explorer" Command Handler

**Location**: `vscode-extension/src/extension.ts` (after `copyItemNumberCommand` function)

Add command handler function that reveals file in File Explorer:

```typescript
/**
 * Command handler for "Reveal in Explorer" context menu action (S65).
 *
 * Opens the VSCode File Explorer view and highlights the planning item's file.
 * If the file's directory is collapsed, the explorer expands it to show the file.
 *
 * Uses VSCode built-in command 'revealInExplorer' which handles:
 * - Opening File Explorer view if closed
 * - Expanding parent directories
 * - Highlighting and scrolling to file
 *
 * @param item - The PlanningTreeItem that was right-clicked
 */
async function revealInExplorerCommand(item: PlanningTreeItem): Promise<void> {
  // Defensive programming: Validate input
  if (!item) {
    outputChannel.appendLine('[RevealExplorer] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[RevealExplorer] Revealing file: ${item.item} - ${item.title}`);
  outputChannel.appendLine(`  Path: ${item.filePath}`);

  try {
    // Convert file path to URI
    const uri = vscode.Uri.file(item.filePath);

    // Execute built-in VSCode command to reveal file in Explorer
    // This command:
    // - Opens File Explorer view if closed
    // - Expands parent directories to show file
    // - Highlights file in tree
    // - Scrolls to file if needed
    await vscode.commands.executeCommand('revealInExplorer', uri);

    // Log success
    outputChannel.appendLine(`[RevealExplorer] ✅ File revealed in Explorer`);

  } catch (error) {
    // Handle errors (file not found, command unavailable, etc.)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Log error
    outputChannel.appendLine(`[RevealExplorer] ❌ Error: ${errorMsg}`);

    // Show error notification
    vscode.window.showErrorMessage(
      `Failed to reveal file: ${errorMsg}`
    );
  }
}
```

**Implementation Notes**:
- Uses VSCode built-in command: `vscode.commands.executeCommand('revealInExplorer', uri)`
- Requires URI conversion: `vscode.Uri.file(item.filePath)`
- Async operation (command execution returns Promise)
- Error handling with try-catch (command might fail if file deleted)
- No success toast (operation is self-evident when File Explorer opens)

**Validation**:
- Function signature: `async function revealInExplorerCommand(item: PlanningTreeItem): Promise<void>`
- Converts path to URI: `vscode.Uri.file(item.filePath)`
- Calls `vscode.commands.executeCommand('revealInExplorer', uri)`
- Error handling with try-catch
- Logs all operations to output channel

**References**:
- VSCode Commands API: https://code.visualstudio.com/api/references/vscode-api#commands.executeCommand
- Built-in revealInExplorer command: https://code.visualstudio.com/docs/getstarted/keybindings#_default-keyboard-shortcuts

---

### Task 4: Register Commands in activate() Function

**Location**: `vscode-extension/src/extension.ts:1015-1018` (after existing command registrations)

Register three new commands in the activate() function:

```typescript
// Register utility commands (S65)
const openFileContextCmd = vscode.commands.registerCommand(
  'cascade.openFileContext',
  (item: PlanningTreeItem) => openFileContextCommand(item)
);
context.subscriptions.push(openFileContextCmd);

const copyItemNumberCmd = vscode.commands.registerCommand(
  'cascade.copyItemNumber',
  (item: PlanningTreeItem) => copyItemNumberCommand(item)
);
context.subscriptions.push(copyItemNumberCmd);

const revealInExplorerCmd = vscode.commands.registerCommand(
  'cascade.revealInExplorer',
  (item: PlanningTreeItem) => revealInExplorerCommand(item)
);
context.subscriptions.push(revealInExplorerCmd);
```

**Implementation Notes**:
- Register commands with VSCode API: `vscode.commands.registerCommand(id, callback)`
- Command IDs match package.json: `cascade.openFileContext`, `cascade.copyItemNumber`, `cascade.revealInExplorer`
- Callbacks receive PlanningTreeItem from context menu
- Register disposables in context.subscriptions for cleanup on deactivation
- Follow existing pattern from S63/S64 command registration

**Validation**:
- Command IDs match package.json exactly (case-sensitive)
- Callbacks invoke correct handler functions
- Disposables added to context.subscriptions
- Code placed after existing command registrations (around line 1015)

**References**:
- Existing command registration: extension.ts:1002-1017 (changeStatus and createChildItem)

---

### Task 5: Update Extension Activation Logs

**Location**: `vscode-extension/src/extension.ts:1052-1054` (update "Available commands" section)

Add new commands to activation log output:

```typescript
outputChannel.appendLine('Available commands:');
outputChannel.appendLine('  - Cascade: Refresh TreeView (manual refresh)');
outputChannel.appendLine('  - Cascade: Open File (internal, triggered by TreeView clicks)');
outputChannel.appendLine('  - Cascade: Show Cache Statistics');
outputChannel.appendLine('  - Cascade: Change Status (context menu)');
outputChannel.appendLine('  - Cascade: Create Child Item (context menu)');
outputChannel.appendLine('  - Cascade: Open File (context menu)');           // NEW
outputChannel.appendLine('  - Cascade: Copy Item Number (context menu)');    // NEW
outputChannel.appendLine('  - Cascade: Reveal in Explorer (context menu)');  // NEW
```

**Implementation Notes**:
- Add three new lines to "Available commands" section
- Format matches existing entries (indentation, parenthetical notes)
- Helps users understand available functionality when reading output channel

**Validation**:
- Three new lines added after existing command list
- Indentation matches existing entries (2 spaces + "- ")
- Descriptions accurate (all are context menu commands)

---

## Completion Criteria

- [ ] openFileContextCommand function implemented
- [ ] copyItemNumberCommand function implemented
- [ ] revealInExplorerCommand function implemented
- [ ] All three commands registered in activate() function
- [ ] Command IDs match package.json exactly
- [ ] Error handling implemented for all commands
- [ ] Output channel logging for all operations
- [ ] User notifications (success/error toasts) where appropriate
- [ ] Activation logs updated with new commands
- [ ] Code follows existing style and conventions
- [ ] TypeScript compilation succeeds without errors

## Testing

**Test Command Registration**:
1. Save extension.ts
2. Run `npm run compile` in vscode-extension directory
3. Verify no TypeScript errors
4. Package extension: `npm run package`
5. Install extension: `code --install-extension cascade-0.1.0.vsix --force`
6. Reload window: Ctrl+Shift+P → "Developer: Reload Window"

**Test Open File Command**:
1. Open Cascade output channel: Ctrl+Shift+P → "View: Toggle Output" → "Cascade"
2. Right-click Story in TreeView
3. Select "Open File"
4. Verify:
   - File opens in permanent tab
   - Editor has focus
   - Output channel logs: `[OpenFile] Opening file: S## - Title`
   - Output channel logs: `[OpenFile] ✅ File opened successfully`

**Test Copy Item Number Command**:
1. Right-click Story S63 in TreeView
2. Select "Copy Item Number"
3. Verify:
   - Toast notification: "Copied: S63"
   - Output channel logs: `[CopyItem] Copying item number: S63`
   - Output channel logs: `[CopyItem] ✅ Copied to clipboard: S63`
4. Open any text file and press Ctrl+V
5. Verify "S63" is pasted

**Test Reveal in Explorer Command**:
1. Close File Explorer view (if open)
2. Right-click Story in TreeView
3. Select "Reveal in Explorer"
4. Verify:
   - File Explorer view opens
   - Story file is highlighted
   - Parent directories expanded
   - Output channel logs: `[RevealExplorer] Revealing file: S## - Title`
   - Output channel logs: `[RevealExplorer] ✅ File revealed in Explorer`

**Edge Cases**:
- File deleted but cached → Copy/Reveal show error toasts ✅
- Clipboard unavailable → Copy shows error toast ✅
- Status group right-click → Commands not visible (hidden by when clause) ✅

## Next Phase

Proceed to Phase 3: Testing and Polish
- Manual testing of all acceptance criteria
- Edge case verification
- Output channel log review
- Final polish and documentation
