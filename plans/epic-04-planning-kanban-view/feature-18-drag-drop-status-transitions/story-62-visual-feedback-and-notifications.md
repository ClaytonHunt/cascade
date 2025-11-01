---
item: S62
title: Visual Feedback and Notifications
type: story
parent: F18
status: Completed
priority: Medium
estimate: S
dependencies: [S61]
spec: specs/S62-visual-feedback-and-notifications/
created: 2025-10-16
updated: 2025-10-16
---

# S62 - Visual Feedback and Notifications

## Description

Implement visual feedback and user notifications for drag-and-drop status transitions. This story provides clear UI feedback to users about successful drops, invalid transitions, and file write errors.

Completes the drag-and-drop feature by making the operation feel responsive and providing helpful error messages.

### Scope

**In Scope:**
- Success notifications for valid status transitions
- Error notifications for invalid transitions
- Error notifications for file write failures
- Drag cursor visual feedback (default VSCode behavior)
- Drop target highlighting (if supported by VSCode API)
- Comprehensive notification messages

**Out of Scope:**
- Custom drag preview images (use default VSCode preview)
- Animated transitions (not supported by VSCode TreeView API)
- Undo functionality (future enhancement)
- Drag-and-drop outside TreeView (already prevented by MIME types)

### Technical Implementation

**Notification Types:**

**Success Notification:**
```typescript
vscode.window.showInformationMessage(
  `✅ ${item.item} moved to "${targetStatus}"`
);
```

**Invalid Transition Notification:**
```typescript
vscode.window.showWarningMessage(
  `⚠️ Cannot move ${item.item} from "${item.status}" to "${targetStatus}"\n` +
  `Valid transitions: ${validTransitions[item.status].join(', ')}`
);
```

**File Write Error Notification:**
```typescript
vscode.window.showErrorMessage(
  `❌ Failed to update ${item.item}: ${error.message}\n` +
  `Click to view file`,
  'Open File'
).then(selection => {
  if (selection === 'Open File') {
    vscode.commands.executeCommand('cascade.openFile', item.filePath);
  }
});
```

**Integration Points:**

Update S61's `handleDrop()` to add notifications:

```typescript
async handleDrop(...): Promise<void> {
  // ... existing validation ...

  // Invalid transition
  if (!isValidTransition(item.status, targetStatus)) {
    this.outputChannel.appendLine(`[DragDrop] ❌ Invalid transition: ${item.status} → ${targetStatus}`);

    // NEW: Show warning notification
    const validNext = validTransitions[item.status];
    vscode.window.showWarningMessage(
      `Cannot move ${item.item} from "${item.status}" to "${targetStatus}".\n` +
      `Valid transitions: ${validNext.join(', ')}`
    );
    return;
  }

  // Update file
  try {
    await updateItemStatus(item.filePath, targetStatus, this.outputChannel);

    // NEW: Show success notification
    vscode.window.showInformationMessage(
      `✅ ${item.item} moved to "${targetStatus}"`
    );
  } catch (error) {
    this.outputChannel.appendLine(`[DragDrop] ❌ File update failed: ${error}`);

    // NEW: Show error notification with action
    const selection = await vscode.window.showErrorMessage(
      `Failed to update ${item.item}: ${error.message}`,
      'Open File'
    );

    if (selection === 'Open File') {
      vscode.commands.executeCommand('cascade.openFile', item.filePath);
    }
  }
}
```

**Visual Feedback:**

VSCode TreeView API provides default drag-and-drop visual feedback:
- **Drag cursor:** Shows item label while dragging
- **Drop indicator:** Highlights valid drop targets
- **Invalid cursor:** Shows "no entry" cursor for invalid drops

No custom implementation required - VSCode handles this automatically based on MIME type validation and drop handler return values.

### Notification Best Practices

**Keep Messages Concise:**
- Single line for success (item + status)
- Two lines max for errors (problem + action)

**Use Emojis for Quick Recognition:**
- ✅ Success (green)
- ⚠️ Warning (yellow)
- ❌ Error (red)

**Provide Actionable Information:**
- Invalid transitions: Show valid options
- File errors: Offer "Open File" action

**Don't Overwhelm Users:**
- Success: Info message (auto-dismisses)
- Warnings: Warning message (user dismisses)
- Errors: Error message (user dismisses, action button)

## Acceptance Criteria

- [ ] Success notification shows after valid status transition
- [ ] Success message includes item number and target status
- [ ] Invalid transition warning shows when transition not allowed
- [ ] Invalid transition message lists valid target statuses
- [ ] File write error notification shows on write failure
- [ ] File error notification includes "Open File" button
- [ ] Clicking "Open File" opens the file in editor
- [ ] Drag cursor shows item label while dragging
- [ ] Drop indicator highlights status groups during drag
- [ ] Invalid drop targets show "no entry" cursor
- [ ] Notifications auto-dismiss after 5 seconds (VSCode default)
- [ ] No notifications for cancelled drags (Esc key)

## Test Scenarios

**Success Flow:**
1. Drag S49 from "Ready" to "In Progress"
   - Drop completes
   - Success notification: "✅ S49 moved to 'In Progress'"
   - Notification auto-dismisses after 5 seconds

**Invalid Transition:**
1. Drag S49 from "Not Started" to "Completed"
   - Drop rejected
   - Warning notification: "Cannot move S49 from 'Not Started' to 'Completed'. Valid transitions: In Planning"
   - User dismisses notification

**File Write Error:**
1. Make file read-only: `chmod 444 story-49.md`
2. Drag S49 from "Ready" to "In Progress"
   - Drop fails
   - Error notification: "Failed to update S49: EACCES: permission denied"
   - "Open File" button shown
3. Click "Open File"
   - File opens in editor

**Visual Feedback:**
1. Start dragging Story
   - Cursor shows item label (e.g., "S49 - TreeDataProvider")
2. Hover over status group
   - Status group highlighted (or drop indicator shown)
3. Hover over non-droppable item (Epic)
   - "No entry" cursor shown
4. Press Esc while dragging
   - Drag cancelled, no notification

## Implementation Notes

**Notification Timing:**
- Show notifications immediately after operation completes
- Don't wait for TreeView refresh (FileSystemWatcher handles refresh asynchronously)

**Error Message Details:**
Include enough context for debugging:
- Item number (e.g., "S49")
- Current status (e.g., "Ready")
- Target status (e.g., "In Progress")
- Error message (from exception)

**Action Buttons:**
Only show action buttons for errors where user can take action:
- File write errors: "Open File" to inspect/fix permissions
- Don't show action buttons for invalid transitions (nothing user can do)

**Testing in Development:**
1. Open VSCode Extension Development Host (F5)
2. Open workspace with plans/ directory
3. Test drag-and-drop with various scenarios
4. Verify notifications appear and auto-dismiss
5. Verify error actions work correctly

## Related Stories

- **S61:** Status Update and File Persistence (dependency)
- **S60:** Drag-and-Drop Controller Implementation (foundation)
- **F18:** Drag-and-Drop Status Transitions (parent feature)
