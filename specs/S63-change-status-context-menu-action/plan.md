---
spec: S63
title: Change Status Context Menu Action
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-16
updated: 2025-10-17
---

# S63 - Change Status Context Menu Action - Implementation Plan

## Overview

Implement a context menu action for Stories and Bugs in the Cascade TreeView that allows users to change status through a quick pick menu. This feature integrates with the existing S61 status update logic and leverages VSCode's command and context menu system.

**Key User Benefit:** Provides a faster, more discoverable alternative to drag-and-drop for changing story/bug status. Users can right-click items and select from valid status transitions without needing to understand the drag-and-drop interface.

## Implementation Strategy

The implementation follows a three-phase incremental approach:

1. **Phase 1: Command Registration and Package.json Updates** - Register the command and context menu contributions in package.json. This establishes the VSCode extension API contract for the feature.

2. **Phase 2: Command Implementation with Status Transition Logic** - Implement the command handler with status transition validation, quick pick UI, and integration with S61's updateItemStatus function.

3. **Phase 3: Integration Testing and Edge Case Validation** - Comprehensive manual testing to verify context menu visibility, quick pick behavior, file updates, and TreeView refresh.

## Architecture Decisions

### Reuse S61 Status Update Logic
The command will call `updateItemStatus()` from `fileUpdates.ts` (implemented in S61) to persist status changes. This ensures consistency with drag-and-drop status updates and avoids code duplication.

### Status Transition Validation
Valid transitions are enforced using a helper function `getValidTransitions()` that returns an array of allowed statuses based on the current status. This prevents invalid transitions (e.g., "Not Started" → "Completed").

### Quick Pick UI Design
- **Title**: Shows item number and title for context
- **Placeholder**: Shows current status and prompts for new status
- **Items**: Each status shows a description for clarity
- **Cancellation**: ESC key or clicking outside cancels operation (no changes)

### Context Menu Filtering
The command is visible only for Stories and Bugs, not for Epics, Features, or Status Groups. This is controlled by the `when` clause in package.json using the `contextValue` field from TreeItems.

## Key Integration Points

### VSCode Extension APIs
- `vscode.commands.registerCommand()` - Register command handler (extension.ts:589-618)
- `vscode.window.showQuickPick()` - Display status selection UI
- `vscode.window.showInformationMessage()` - Success notifications
- `vscode.window.showErrorMessage()` - Error notifications
- `package.json` contributions - Command and menu registration

### Cascade TreeView System
- **PlanningTreeItem** (`treeview/PlanningTreeItem.ts:22-40`) - Contains item data (item, title, type, status, filePath)
- **contextValue** (`treeview/PlanningTreeProvider.ts:328`) - Set to item type for menu filtering
- **FileSystemWatcher** (`extension.ts:333-452`) - Triggers TreeView refresh after file update

### Status Update Logic (S61)
- **updateItemStatus()** (`fileUpdates.ts:119-209`) - Updates frontmatter status and updated fields
- **Status Type** (`types.ts:14`) - Valid status values enum

## Risk Assessment

### Low Risk
- Command registration is straightforward and well-documented by VSCode
- updateItemStatus() is already tested and working in S61
- Quick pick UI is a standard VSCode pattern with good documentation

### Medium Risk
- **Context menu visibility**: Ensuring the `when` clause correctly filters by contextValue requires manual testing. Incorrect filtering could show the command on invalid item types.
- **Status transition logic**: The transition rules must match business requirements. Incorrect transitions could lead to invalid workflow states.

### Mitigation Strategies
- Comprehensive manual testing with all item types (S63 acceptance criteria)
- Edge case testing for Blocked and Completed states
- Output channel logging for debugging context menu and quick pick behavior

## Phase Overview

### Phase 1: Command Registration and Package.json Updates
- Update package.json with command contribution
- Add context menu contribution for Stories and Bugs
- Verify extension packaging and installation

**Deliverable**: Command appears in context menu when right-clicking Stories/Bugs

### Phase 2: Command Implementation with Status Transition Logic
- Implement changeStatusCommand handler function
- Add getValidTransitions() helper for status validation
- Add getStatusDescription() helper for quick pick items
- Integrate with updateItemStatus() from S61
- Add success/error toast notifications

**Deliverable**: Command updates file frontmatter and shows notifications

### Phase 3: Integration Testing and Edge Case Validation
- Test context menu visibility across all item types
- Test status transitions for all status values
- Verify TreeView auto-refresh after file update
- Test cancellation behavior (ESC key)
- Verify output channel logging

**Deliverable**: Feature fully tested and working per acceptance criteria

## Testing Strategy

### Manual Testing Approach
1. Package and install extension: `npm run package && code --install-extension cascade-0.1.0.vsix --force`
2. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
3. Open Cascade TreeView
4. Test each acceptance criterion from story-63

### Output Channel Monitoring
The output channel ("Cascade") will log:
- File update events from updateItemStatus()
- FileSystemWatcher events (FILE_CHANGED)
- TreeView refresh events

### Edge Cases to Test
- Right-click on Epic/Feature → Command not visible
- Right-click on Status Group → Command not visible
- Story with status "Completed" → Quick pick shows "No transitions available"
- ESC key during quick pick → No file changes
- File update error → Error toast shown

## Completion Criteria

All acceptance criteria from story-63 must pass:
- ✅ Context menu shows "Change Status" for Stories and Bugs
- ✅ Context menu item hidden for Epics, Features, Status Groups
- ✅ Quick pick shows valid transitions only
- ✅ Quick pick includes status descriptions
- ✅ Quick pick shows item number and title in header
- ✅ File frontmatter updated (status + updated fields)
- ✅ TreeView auto-refreshes via FileSystemWatcher
- ✅ Success toast notification shown
- ✅ Error toast shown on failure
- ✅ Completed items show no transitions
- ✅ Blocked items can transition back to previous states
- ✅ ESC key cancels operation

## Next Steps After Completion

Once S63 is completed, the following stories in F19 can be implemented:
- **S64**: Create Child Item Action (context menu for creating child stories)
- **S65**: Utility Actions (copy item number, open in file explorer, etc.)
- **S66**: Keyboard Shortcuts (assign shortcuts to context menu actions)

These stories will follow the same command registration pattern established in S63.
