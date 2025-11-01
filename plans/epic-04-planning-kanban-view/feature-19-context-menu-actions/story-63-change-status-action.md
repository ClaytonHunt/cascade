---
item: S63
title: Change Status Context Menu Action
type: story
parent: F19
status: Completed
priority: High
dependencies: [S61]
estimate: S
created: 2025-10-16
updated: 2025-10-17
spec: specs/S63-change-status-context-menu-action/
---

# S63 - Change Status Context Menu Action

## Description

Implement "Change Status" context menu action for Stories and Bugs in the Cascade TreeView. When right-clicking on a Story or Bug, users can select "Change Status" to open a quick pick menu showing valid status transitions. Selecting a new status updates the file and refreshes the TreeView.

This story reuses the status update logic from S61 (updateItemStatus) and integrates it with VSCode's command and context menu system.

### User Workflow

1. Right-click on Story or Bug in TreeView
2. Select "Change Status" from context menu
3. Quick pick menu appears with valid status transitions
4. Select new status
5. File updated with new status and updated timestamp
6. TreeView refreshes automatically (FileSystemWatcher)
7. Toast notification confirms success

### Valid Status Transitions

```
Not Started → In Planning, Blocked
In Planning → Ready, Blocked
Ready → In Progress, Blocked
In Progress → Completed, Blocked
Blocked → [Previous Status]
Completed → [No transitions - final state]
```

### Technical Details

**Command Registration (package.json):**
```json
{
  "contributes": {
    "commands": [
      {
        "command": "cascade.changeStatus",
        "title": "Change Status",
        "icon": "$(edit)"
      }
    ],
    "menus": {
      "view/item/context": [
        {
          "command": "cascade.changeStatus",
          "when": "view == cascadeView && (viewItem == story || viewItem == bug)",
          "group": "1_modification@1"
        }
      ]
    }
  }
}
```

**Command Implementation (extension.ts):**
```typescript
async function changeStatusCommand(item: PlanningTreeItem): Promise<void> {
  // Get valid transitions for current status
  const validStatuses = getValidTransitions(item.status);

  // Show quick pick with descriptions
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

  if (!selected) return; // User cancelled

  try {
    // Update file (reuses S61 logic)
    await updateItemStatus(item.filePath, selected.label as Status, outputChannel);

    // Success notification
    vscode.window.showInformationMessage(
      `${item.item} status changed to "${selected.label}"`
    );
  } catch (error) {
    // Error notification
    vscode.window.showErrorMessage(
      `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
```

**Status Transition Helper:**
```typescript
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

## Acceptance Criteria

- [ ] Right-click on Story/Bug shows "Change Status" in context menu
- [ ] Context menu item only visible for Stories and Bugs (not Epics/Features/StatusGroups)
- [ ] Clicking "Change Status" opens quick pick menu
- [ ] Quick pick shows only valid transitions for current status
- [ ] Quick pick includes status descriptions for clarity
- [ ] Quick pick shows item number and title in header
- [ ] Selecting status updates file frontmatter (status + updated fields)
- [ ] FileSystemWatcher automatically refreshes TreeView
- [ ] Success toast notification shown with item number and new status
- [ ] Error toast shown if file update fails
- [ ] Completed items show no transitions (empty quick pick or disabled)
- [ ] Blocked items can transition back to previous states
- [ ] ESC key cancels operation (no changes made)

## Testing Notes

**Manual Test:**
1. Package and install extension: `npm run package && code --install-extension cascade-0.1.0.vsix --force`
2. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
3. Open Cascade TreeView
4. Right-click on Story in "Ready" status group
5. Verify "Change Status" appears in context menu
6. Click "Change Status"
7. Verify quick pick shows "In Progress" and "Blocked"
8. Select "In Progress"
9. Verify toast notification: "S63 status changed to 'In Progress'"
10. Verify TreeView refreshes and Story appears in "In Progress" group
11. Open story file and verify frontmatter updated

**Edge Cases:**
- Right-click on Epic/Feature → "Change Status" not visible
- Right-click on Status Group → "Change Status" not visible
- Story with status "Completed" → Quick pick shows empty or "No transitions available"
- Cancel quick pick → No changes made

**Output Channel Logs:**
```
[FileUpdate] ✅ Updated status: D:\projects\lineage\plans\...\story-63.md
  Ready → In Progress
  Updated timestamp: 2025-10-16

[16:30:45] FILE_CHANGED: epic-04-planning-kanban-view\feature-19-context-menu-actions\story-63.md
[16:30:45] REFRESH: TreeView updated (file changed)
```

## File References

- Command registration: `vscode-extension/package.json` (contributes.commands, contributes.menus)
- Command implementation: `vscode-extension/src/extension.ts` (new changeStatusCommand function)
- Status update logic: `vscode-extension/src/fileUpdates.ts:119` (updateItemStatus - reused from S61)
- Status type definition: `vscode-extension/src/types.ts` (Status type)

## Dependencies

- **S61**: Status update logic (updateItemStatus function) - must be implemented first
- **F17**: TreeView foundation with contextValue - already implemented
- **S38**: FileSystemWatcher for auto-refresh - already implemented
