---
spec: S63
phase: 2
title: Command Implementation with Status Transition Logic
status: Completed
priority: High
created: 2025-10-16
updated: 2025-10-17
---

# Phase 2: Command Implementation with Status Transition Logic

## Overview

This phase implements the command handler for "Change Status" with status transition validation, quick pick UI, and integration with S61's updateItemStatus function. After completion, clicking "Change Status" will show a quick pick menu with valid status options, update the file, and show a success notification.

**Goal**: Implement the command handler that validates transitions, shows quick pick UI, and persists status changes.

## Prerequisites

- Phase 1 completed (command registered in package.json)
- S61 completed (updateItemStatus function available)
- Understanding of VSCode Quick Pick API
- Familiarity with status transition rules

## Tasks

### Task 1: Import Required Dependencies

**File**: `vscode-extension/src/extension.ts:1-12`

Add imports for types and functions needed by the command handler.

**Current Imports** (extension.ts:1-12):
```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Export parser for testing
export { parseFrontmatter } from './parser';

// Import cache for file watcher integration
import { FrontmatterCache } from './cache';
import { PlansDecorationProvider } from './decorationProvider';
import { PlanningTreeProvider, PlanningDragAndDropController } from './treeview';
```

**Add Import**:
```typescript
import { updateItemStatus } from './fileUpdates';
import { Status, PlanningTreeItem } from './types';
```

**Explanation**:
- `updateItemStatus` - Function from S61 that updates file frontmatter (fileUpdates.ts:119)
- `Status` - Type for valid status values (types.ts:14)
- `PlanningTreeItem` - Interface for TreeView items (types.ts:22-40)

**Note**: PlanningTreeItem may already be imported. If so, just add it to the existing import statement from './treeview/PlanningTreeItem'.

### Task 2: Create Status Transition Helper Function

Add a helper function that returns valid status transitions based on current status. This enforces workflow rules and prevents invalid transitions.

**Location**: Add before the `activate()` function (around line 493)

**Implementation**:
```typescript
/**
 * Returns valid status transitions for a given current status.
 *
 * Enforces workflow rules:
 * - Not Started → In Planning, Blocked
 * - In Planning → Ready, Blocked
 * - Ready → In Progress, Blocked
 * - In Progress → Completed, Blocked
 * - Blocked → Any previous state (Not Started, In Planning, Ready, In Progress)
 * - Completed → No transitions (final state)
 *
 * @param currentStatus - The item's current status
 * @returns Array of valid status values user can transition to
 */
function getValidTransitions(currentStatus: Status): Status[] {
  const transitions: Record<Status, Status[]> = {
    'Not Started': ['In Planning', 'Blocked'],
    'In Planning': ['Ready', 'Blocked'],
    'Ready': ['In Progress', 'Blocked'],
    'In Progress': ['Completed', 'Blocked'],
    'Blocked': ['Not Started', 'In Planning', 'Ready', 'In Progress'], // Return to any previous state
    'Completed': [] // Final state - no transitions
  };

  return transitions[currentStatus] || [];
}
```

**Validation Rules**:
- Linear progression: Not Started → In Planning → Ready → In Progress → Completed
- Any status can transition to Blocked (for blocking issues)
- Blocked can return to any previous state (to resume work)
- Completed is terminal (no further transitions)

**Reference**: Story-63 frontmatter dependencies and workflow rules

### Task 3: Create Status Description Helper Function

Add a helper function that returns user-friendly descriptions for each status. These descriptions appear in the quick pick menu to help users understand each status.

**Location**: Add after `getValidTransitions()` function

**Implementation**:
```typescript
/**
 * Returns a user-friendly description for a status value.
 *
 * These descriptions appear in the quick pick menu to help users
 * understand what each status means.
 *
 * @param status - The status to describe
 * @returns Human-readable description string
 */
function getStatusDescription(status: Status): string {
  const descriptions: Record<Status, string> = {
    'Not Started': 'Initial state - not yet planned',
    'In Planning': 'Requirements being refined',
    'Ready': 'Ready for implementation',
    'In Progress': 'Currently being implemented',
    'Blocked': 'Waiting on dependency or issue',
    'Completed': 'Implementation finished'
  };

  return descriptions[status] || '';
}
```

**Description Guidelines**:
- Keep descriptions short (< 50 characters) for readability
- Use present tense for active states ("being refined", "being implemented")
- Use past tense for completed state ("finished")
- Explain the state, not the action to transition to it

### Task 4: Implement Command Handler Function

Create the main command handler function that orchestrates the status change workflow.

**Location**: Add after `getStatusDescription()` function

**Implementation**:
```typescript
/**
 * Command handler for "Change Status" context menu action.
 *
 * Workflow:
 * 1. Get valid transitions for current status
 * 2. Show quick pick menu with status options
 * 3. If user selects status, update file and show notification
 * 4. If user cancels (ESC), do nothing
 *
 * File updates trigger FileSystemWatcher (S38) which automatically:
 * - Invalidates cache (S40)
 * - Refreshes TreeView
 *
 * @param item - The PlanningTreeItem that was right-clicked
 */
async function changeStatusCommand(item: PlanningTreeItem): Promise<void> {
  // Validate input (should never be null due to when clause, but defensive programming)
  if (!item) {
    outputChannel.appendLine('[ChangeStatus] ❌ Error: No item provided to command');
    vscode.window.showErrorMessage('No item selected');
    return;
  }

  // Log command invocation
  outputChannel.appendLine('');
  outputChannel.appendLine(`[ChangeStatus] Command invoked for ${item.item} - ${item.title}`);
  outputChannel.appendLine(`  Current status: ${item.status}`);
  outputChannel.appendLine(`  File: ${item.filePath}`);

  // Step 1: Get valid transitions for current status
  const validStatuses = getValidTransitions(item.status);

  // Handle edge case: No valid transitions (e.g., Completed items)
  if (validStatuses.length === 0) {
    outputChannel.appendLine(`  ℹ️  No valid transitions from "${item.status}"`);
    vscode.window.showInformationMessage(
      `${item.item} is "${item.status}" - no status changes available`
    );
    return;
  }

  // Step 2: Show quick pick with status options
  const selected = await vscode.window.showQuickPick(
    validStatuses.map(s => ({
      label: s,
      description: getStatusDescription(s)
    })),
    {
      placeHolder: `Change status from "${item.status}" to...`,
      title: `${item.item} - ${item.title}`
    }
  );

  // Handle cancellation (user pressed ESC or clicked outside)
  if (!selected) {
    outputChannel.appendLine('  ℹ️  User cancelled status change');
    return;
  }

  outputChannel.appendLine(`  → Selected status: ${selected.label}`);

  // Step 3: Update file frontmatter
  try {
    await updateItemStatus(item.filePath, selected.label as Status, outputChannel);

    // Step 4: Show success notification
    vscode.window.showInformationMessage(
      `${item.item} status changed to "${selected.label}"`
    );

    outputChannel.appendLine(`  ✅ Status change successful`);

  } catch (error) {
    // Handle errors (file read/write failures, parse errors, etc.)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    outputChannel.appendLine(`  ❌ Status change failed: ${errorMsg}`);

    // Show error notification to user
    vscode.window.showErrorMessage(
      `Failed to update ${item.item}: ${errorMsg}`
    );
  }
}
```

**Error Handling**:
- Validates item input (defensive programming)
- Handles zero transitions (Completed items)
- Catches updateItemStatus errors (file read/write failures)
- Logs all events to output channel for debugging

**Quick Pick Configuration**:
- `label`: The status value (e.g., "In Progress")
- `description`: User-friendly explanation (e.g., "Currently being implemented")
- `placeHolder`: Shows current status and prompts for selection
- `title`: Shows item number and title for context

**Reference**:
- VSCode Quick Pick API: https://code.visualstudio.com/api/references/vscode-api#window.showQuickPick
- updateItemStatus: fileUpdates.ts:119-209

### Task 5: Register Command Handler in activate()

Register the command handler with VSCode so it's called when the context menu item is clicked.

**Location**: `vscode-extension/src/extension.ts:628` (after showCacheStatsCommand registration)

**Add Registration Code**:
```typescript
  // Register change status command (S63)
  const changeStatusCommand = vscode.commands.registerCommand(
    'cascade.changeStatus',
    (item: PlanningTreeItem) => {
      changeStatusCommand(item);
    }
  );
  context.subscriptions.push(changeStatusCommand);
```

**Wait, there's a naming conflict!** The constant `changeStatusCommand` can't have the same name as the function. Let's fix this:

**Correct Implementation**:
```typescript
  // Register change status command (S63)
  const changeStatusCommandDisposable = vscode.commands.registerCommand(
    'cascade.changeStatus',
    (item: PlanningTreeItem) => {
      changeStatusCommand(item);
    }
  );
  context.subscriptions.push(changeStatusCommandDisposable);
```

**Explanation**:
- First parameter: Command ID (must match package.json contribution)
- Second parameter: Handler function (receives the TreeItem that was right-clicked)
- Return value: Disposable for cleanup
- `context.subscriptions.push()`: Ensures command is disposed on deactivation

**Parameter Passing**: VSCode automatically passes the clicked TreeItem to the handler. The TreeItem is of type `PlanningTreeItem` because that's what `getTreeItem()` returns in PlanningTreeProvider.

### Task 6: Compile, Package, and Install Extension

Rebuild and reinstall the extension with the new command handler.

**Commands**:
```bash
cd vscode-extension
npm run compile
npm run package
code --install-extension cascade-0.1.0.vsix --force
```

**Reload Window**: Ctrl+Shift+P → "Developer: Reload Window"

### Task 7: Manual Testing - Basic Workflow

Test the basic happy path: changing a Story's status from Ready to In Progress.

**Test Steps**:
1. Open Cascade TreeView
2. Open Output Channel: Ctrl+Shift+P → "View: Toggle Output" → Select "Cascade"
3. Expand "Ready" status group
4. Right-click on a Story with status "Ready"
5. Click "Change Status"
6. Verify quick pick shows "In Progress" and "Blocked"
7. Select "In Progress"
8. Verify success notification: "S## status changed to 'In Progress'"
9. Wait 500ms for TreeView auto-refresh
10. Verify Story moved to "In Progress" status group

**Expected Output Channel Logs**:
```
[ChangeStatus] Command invoked for S49 - TreeDataProvider Core Implementation
  Current status: Ready
  File: D:\projects\lineage\plans\...\story-49.md
  → Selected status: In Progress

[FileUpdate] ✅ Updated status: D:\projects\lineage\plans\...\story-49.md
  Ready → In Progress
  Updated timestamp: 2025-10-16

[16:30:45] FILE_CHANGED: epic-...\story-49.md
[16:30:45] REFRESH: TreeView updated (file changed)

  ✅ Status change successful
```

**Verify File Changes**:
Open the story file and verify frontmatter:
```yaml
---
item: S49
title: TreeDataProvider Core Implementation
type: story
status: In Progress  # ← Changed from "Ready"
priority: High
dependencies: []
estimate: M
created: 2025-10-10
updated: 2025-10-16  # ← Updated timestamp
---
```

### Task 8: Manual Testing - Edge Cases

Test edge cases to verify error handling and transition rules.

**Test Case 1: Completed Items (No Transitions)**
1. Right-click on item with status "Completed"
2. Click "Change Status"
3. Verify notification: "S## is 'Completed' - no status changes available"
4. Verify no quick pick shown

**Test Case 2: Blocked Items (Return to Previous State)**
1. Right-click on item with status "Blocked"
2. Click "Change Status"
3. Verify quick pick shows: "Not Started", "In Planning", "Ready", "In Progress"
4. Select any option
5. Verify status updated successfully

**Test Case 3: Cancellation (ESC Key)**
1. Right-click on any Story
2. Click "Change Status"
3. Press ESC key (or click outside quick pick)
4. Verify no file changes made
5. Verify no notification shown
6. Check output channel for "User cancelled status change"

**Test Case 4: Context Menu Filtering**
1. Right-click on Epic → Verify "Change Status" NOT visible
2. Right-click on Feature → Verify "Change Status" NOT visible
3. Right-click on Status Group → Verify "Change Status" NOT visible
4. Right-click on Bug → Verify "Change Status" IS visible

**Test Case 5: File Update Error (Simulated)**
This test is optional but good for debugging:
1. Open story file in external editor
2. Lock the file (make read-only)
3. Try to change status via context menu
4. Verify error notification shown
5. Verify error logged to output channel

## Completion Criteria

- ✅ All helper functions implemented (getValidTransitions, getStatusDescription)
- ✅ Command handler function implemented (changeStatusCommand)
- ✅ Command registered in activate() function
- ✅ Extension compiled and installed successfully
- ✅ Basic workflow test passed (Ready → In Progress)
- ✅ Edge case tests passed:
  - Completed items show no transitions
  - Blocked items can return to previous states
  - ESC key cancels operation
  - Context menu filtered correctly
- ✅ Output channel logs all events correctly
- ✅ Success/error notifications working
- ✅ TreeView auto-refreshes after status change

## Output Artifacts

- Modified `vscode-extension/src/extension.ts` (3 new functions + 1 registration)
- Compiled extension: `vscode-extension/dist/extension.js`
- Packaged VSIX: `vscode-extension/cascade-0.1.0.vsix`

## Next Phase

Proceed to **Phase 3: Integration Testing and Edge Case Validation** for comprehensive testing across all status transitions and item types.

## Troubleshooting

### Quick Pick Not Showing

**Symptom**: Click "Change Status" but nothing happens

**Possible Causes**:
1. Command handler not registered → Verify registerCommand call in activate()
2. Command ID mismatch → Verify "cascade.changeStatus" matches package.json
3. Handler function not called → Check output channel for logs

**Debugging**:
- Add console.log at start of changeStatusCommand function
- Check Developer Tools console: Ctrl+Shift+P → "Developer: Toggle Developer Tools"
- Verify command registered: Run command palette → "Change Status" (should appear)

### Status Not Updating in File

**Symptom**: Quick pick completes but file not updated

**Possible Causes**:
1. updateItemStatus failing silently → Check output channel for errors
2. File permissions issue → Verify file is writable
3. FileSystemWatcher not triggering → Check watcher logs in output channel

**Debugging**:
- Check output channel for [FileUpdate] error logs
- Open file manually and verify timestamp changed
- Add try-catch logging around updateItemStatus call

### TreeView Not Refreshing

**Symptom**: File updated but TreeView shows old status

**Possible Causes**:
1. FileSystemWatcher not detecting change → Check watcher logs
2. Cache not invalidated → Check cache invalidation logs
3. TreeView refresh not triggered → Check refresh logs

**Debugging**:
- Wait longer (up to 500ms debounce delay)
- Manually refresh: Click TreeView toolbar refresh button
- Check output channel for FILE_CHANGED and REFRESH logs
