---
spec: S62
phase: 2
title: Error and Warning Notifications
status: Completed
priority: High
created: 2025-10-16
updated: 2025-10-16
---

# Phase 2: Error and Warning Notifications

## Overview

Implement error and warning notifications for drag-and-drop failure scenarios. This phase adds two types of notifications:

1. **Warning Notification**: Invalid status transitions (e.g., "Not Started" → "Completed")
2. **Error Notification**: File write failures (e.g., read-only file, permission denied)

Error notifications include an actionable "Open File" button to help users investigate and fix issues.

## Prerequisites

- Phase 1 completed (success notifications implemented)
- Understanding of `statusTransitions.ts` module (validation logic)
- Familiarity with VSCode notification action buttons

## Tasks

### Task 1: Add Warning Notification for Invalid Transitions

**Location**: `vscode-extension/src/treeview/PlanningDragAndDropController.ts:225-230`

**Current Code** (lines 225-230):
```typescript
// Validate status transition
if (!isValidTransition(itemData.status, targetStatus)) {
  this.outputChannel.appendLine('[DragDrop] ❌ Invalid status transition');
  this.outputChannel.appendLine(`  ${itemData.status} → ${targetStatus} is not allowed`);
  // TODO S62: Show error notification
  return;
}
```

**Action**:
1. Import `getValidNextStatuses` function from `statusTransitions.ts`
2. Replace TODO comment with warning notification that lists valid transitions

**Step 1: Add Import at Top of File** (line 4):
```typescript
import { isValidTransition, getValidNextStatuses } from '../statusTransitions';
```

**Step 2: Replace TODO with Warning Notification** (lines 225-235):
```typescript
// Validate status transition
if (!isValidTransition(itemData.status, targetStatus)) {
  this.outputChannel.appendLine('[DragDrop] ❌ Invalid status transition');
  this.outputChannel.appendLine(`  ${itemData.status} → ${targetStatus} is not allowed`);

  // Show warning notification with valid transition options
  const validStatuses = getValidNextStatuses(itemData.status);
  vscode.window.showWarningMessage(
    `⚠️ Cannot move ${itemData.item} from "${itemData.status}" to "${targetStatus}". ` +
    `Valid transitions: ${validStatuses.join(', ')}`
  );

  return;
}
```

**Explanation**:
- `vscode.window.showWarningMessage()` displays warning-level notification (yellow)
- `getValidNextStatuses()` retrieves list of allowed next statuses for current status
- Message format: `⚠️ Cannot move S49 from "Not Started" to "Completed". Valid transitions: In Planning`
- Users see both the problem and the solution in one notification

**Expected Behavior**:
- Warning notification appears for invalid transitions
- Notification persists until user dismisses (warning level doesn't auto-dismiss)
- Valid transition list helps user understand workflow rules
- Drop operation is rejected (no file changes)

### Task 2: Add Error Notification for File Write Failures

**Location**: `vscode-extension/src/treeview/PlanningDragAndDropController.ts:245-249`

**Current Code** (lines 245-249):
```typescript
} catch (error) {
  this.outputChannel.appendLine('[DragDrop] ❌ File update failed');
  this.outputChannel.appendLine(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  // TODO S62: Show error notification
}
```

**Action**: Replace TODO comment with error notification that includes "Open File" action button.

**New Code** (lines 245-255):
```typescript
} catch (error) {
  this.outputChannel.appendLine('[DragDrop] ❌ File update failed');
  this.outputChannel.appendLine(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

  // Show error notification with "Open File" action button
  const errorMsg = error instanceof Error ? error.message : 'Unknown error';
  vscode.window.showErrorMessage(
    `❌ Failed to update ${itemData.item}: ${errorMsg}`,
    'Open File'
  ).then(selection => {
    if (selection === 'Open File') {
      vscode.workspace.openTextDocument(itemData.filePath).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    }
  });
}
```

**Explanation**:
- `vscode.window.showErrorMessage()` displays error-level notification (red)
- Second parameter `'Open File'` adds action button
- `.then()` handles user's button click
- `vscode.workspace.openTextDocument()` opens file in editor
- Message format: `❌ Failed to update S49: EACCES: permission denied`

**Expected Behavior**:
- Error notification appears for file write failures
- "Open File" button is clickable
- Clicking button opens the file in editor
- Notification persists until user dismisses
- No status change occurs (file unchanged)

**Alternative Implementation (Using executeCommand)**:

If your extension has registered a `cascade.openFile` command in `extension.ts`, you can use:

```typescript
vscode.window.showErrorMessage(
  `❌ Failed to update ${itemData.item}: ${errorMsg}`,
  'Open File'
).then(selection => {
  if (selection === 'Open File') {
    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(itemData.filePath));
  }
});
```

This uses VSCode's built-in `vscode.open` command (simpler, no async chaining).

### Task 3: Test Invalid Transition Warnings

**Test Scenario 1: Skip Planning Phase**
1. Create Story with status "Not Started"
2. Drag to "In Progress" status group
3. **Expected Warning**: `⚠️ Cannot move S99 from "Not Started" to "In Progress". Valid transitions: In Planning`
4. Verify drop is rejected (file unchanged)

**Test Scenario 2: Invalid Rollback**
1. Create Story with status "Completed"
2. Drag to "Not Started" status group
3. **Expected Warning**: `⚠️ Cannot move S99 from "Completed" to "Not Started". Valid transitions: In Progress`
4. Verify drop is rejected

**Test Scenario 3: Valid Transition (No Warning)**
1. Create Story with status "Ready"
2. Drag to "In Progress" status group
3. **Expected**: No warning, success notification appears (Phase 1 behavior)

**Verification Checklist**:
- ✅ Warning shows source status and target status
- ✅ Warning lists all valid next statuses
- ✅ Warning uses emoji prefix (⚠️)
- ✅ Drop is rejected for invalid transitions
- ✅ File remains unchanged
- ✅ Output channel logs validation failure

### Task 4: Test File Write Error Notifications

**Test Scenario 1: Read-Only File**
1. Make file read-only:
   ```bash
   # Windows
   attrib +R plans/epic-04-planning-kanban-view/feature-18-drag-drop-status-transitions/story-62-visual-feedback-and-notifications.md

   # Linux/Mac
   chmod 444 plans/epic-04-planning-kanban-view/feature-18-drag-drop-status-transitions/story-62-visual-feedback-and-notifications.md
   ```
2. Drag S62 from "Not Started" to "In Progress"
3. **Expected Error**: `❌ Failed to update S62: EACCES: permission denied` (or similar)
4. Click "Open File" button
5. **Expected**: File opens in editor
6. Verify file status unchanged (still "Not Started")

**Test Scenario 2: Restore Permissions**
1. Make file writable again:
   ```bash
   # Windows
   attrib -R plans/epic-04-planning-kanban-view/feature-18-drag-drop-status-transitions/story-62-visual-feedback-and-notifications.md

   # Linux/Mac
   chmod 644 plans/epic-04-planning-kanban-view/feature-18-drag-drop-status-transitions/story-62-visual-feedback-and-notifications.md
   ```
2. Drag S62 from "Not Started" to "In Progress"
3. **Expected**: Success notification (Phase 1 behavior)

**Test Scenario 3: Corrupted Frontmatter**
1. Manually edit file to break YAML frontmatter (e.g., remove closing `---`)
2. Drag item to different status
3. **Expected Error**: `❌ Failed to update S62: Frontmatter delimiters not found` (or similar)
4. Click "Open File" button
5. **Expected**: File opens, allowing user to fix corruption

**Verification Checklist**:
- ✅ Error notification shows item number and error message
- ✅ "Open File" button is visible and clickable
- ✅ Clicking button opens file in editor
- ✅ File remains unchanged after error
- ✅ Output channel logs full error details
- ✅ Error notification uses emoji prefix (❌)

### Task 5: Verify Notification Hierarchy

**Test**: Ensure notification types have correct severity levels.

**Expected Hierarchy**:
1. **Error** (Red, ❌): File write failures, corruption, critical issues
2. **Warning** (Yellow, ⚠️): Invalid transitions, validation failures
3. **Info** (Blue, ✅): Success messages, confirmations

**Verification**:
- Error notifications are red/prominent
- Warning notifications are yellow/medium prominence
- Info notifications are blue/subtle (auto-dismiss)

## Completion Criteria

**Warning Notifications**:
- ✅ Invalid transition warning shows when transition not allowed
- ✅ Warning message includes source status and target status
- ✅ Warning lists all valid target statuses
- ✅ Warning uses emoji prefix (⚠️)
- ✅ Drop is rejected for invalid transitions

**Error Notifications**:
- ✅ File write error notification shows on write failure
- ✅ Error message includes item number and error details
- ✅ "Open File" button is visible and functional
- ✅ Clicking "Open File" opens file in editor
- ✅ Error uses emoji prefix (❌)
- ✅ File remains unchanged after error

**Integration**:
- ✅ Both notifications coexist with success notifications (Phase 1)
- ✅ Output channel logging preserved for all scenarios
- ✅ No duplicate notifications

## Code References

- **File**: `vscode-extension/src/treeview/PlanningDragAndDropController.ts:225-255`
- **Import**: `vscode-extension/src/statusTransitions.ts:143` (getValidNextStatuses)
- **VSCode API**: [showWarningMessage](https://code.visualstudio.com/api/references/vscode-api#window.showWarningMessage)
- **VSCode API**: [showErrorMessage](https://code.visualstudio.com/api/references/vscode-api#window.showErrorMessage)
- **VSCode API**: [openTextDocument](https://code.visualstudio.com/api/references/vscode-api#workspace.openTextDocument)

## Next Phase

Proceed to **Phase 3: Visual Feedback Verification** to test VSCode's default drag-and-drop visual feedback.
