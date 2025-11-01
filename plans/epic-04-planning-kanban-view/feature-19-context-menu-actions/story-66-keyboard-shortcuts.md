---
item: S66
title: Keyboard Shortcuts for Context Actions
type: story
parent: F19
status: Completed
priority: Low
dependencies: [S63, S64, S65]
estimate: XS
created: 2025-10-16
updated: 2025-10-17
spec: specs/S66-keyboard-shortcuts/
---

# S66 - Keyboard Shortcuts for Context Actions

## Description

Add keyboard shortcuts for frequently used context menu actions in the Cascade TreeView. Users can trigger actions via keyboard when the TreeView has focus, improving productivity for keyboard-driven workflows.

This story registers keybindings in package.json and ensures commands work when invoked via keyboard with proper focus management.

### Keyboard Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Enter` | Open File | Default TreeView behavior (already works) |
| `Ctrl+Shift+S` | Change Status | Shows quick pick for status transitions |
| `Ctrl+Shift+N` | Create Child Item | Prompts for child item title |
| `Ctrl+C` | Copy Item Number | Copies item ID to clipboard |

### Focus Context

Keybindings only work when:
- Cascade TreeView is focused (user clicked or tabbed to TreeView)
- A planning item is selected (not status group)

Shortcuts disabled when:
- Another view has focus (e.g., File Explorer, Editor)
- No item selected
- Status group selected

### Technical Details

**Keybinding Registration (package.json):**
```json
{
  "contributes": {
    "keybindings": [
      {
        "command": "cascade.changeStatus",
        "key": "ctrl+shift+s",
        "when": "focusedView == cascadeView && viewItem != status-group"
      },
      {
        "command": "cascade.createChildItem",
        "key": "ctrl+shift+n",
        "when": "focusedView == cascadeView && (viewItem == epic || viewItem == feature)"
      },
      {
        "command": "cascade.copyItemNumber",
        "key": "ctrl+c",
        "when": "focusedView == cascadeView && viewItem != status-group"
      }
    ]
  }
}
```

**When Clause Breakdown:**

- `focusedView == cascadeView`: Cascade TreeView has keyboard focus
- `viewItem != status-group`: Selected item is not a status group
- `viewItem == epic || viewItem == feature`: Selected item is Epic or Feature (for Create Child)

**Command Modifications (extension.ts):**

Existing commands need to handle keyboard invocation by getting the currently selected item from the TreeView:

```typescript
// Modified command registration to support both context menu and keyboard
const changeStatusCmd = vscode.commands.registerCommand(
  'cascade.changeStatus',
  async (item?: PlanningTreeItem) => {
    // If no item provided (keyboard shortcut), get from TreeView selection
    if (!item && cascadeTreeView) {
      const selection = cascadeTreeView.selection;
      if (selection.length === 0) {
        vscode.window.showWarningMessage('No item selected');
        return;
      }
      item = selection[0] as PlanningTreeItem;
    }

    if (!item) {
      vscode.window.showWarningMessage('No item selected');
      return;
    }

    // Validate item type (only Stories and Bugs)
    if (item.type !== 'story' && item.type !== 'bug') {
      vscode.window.showWarningMessage('Change Status only works for Stories and Bugs');
      return;
    }

    await changeStatusCommand(item);
  }
);
```

Similar modifications needed for:
- `cascade.createChildItem`
- `cascade.copyItemNumber`

### Enter Key (Open File)

The `Enter` key already works by default in VSCode TreeViews:
- TreeView has built-in behavior: Enter → `onDidChangeSelection` event
- PlanningTreeProvider already handles clicks (S51)
- No additional keybinding needed

If explicit Enter key handling is desired:
```json
{
  "command": "cascade.openFileContext",
  "key": "enter",
  "when": "focusedView == cascadeView && viewItem != status-group"
}
```

### Keyboard Shortcut Conflicts

**Ctrl+C (Copy):**
- VSCode default: Copy text in editor
- Our binding: Copy item number when TreeView focused
- No conflict - `when` clause ensures it only works in TreeView

**Ctrl+Shift+S (Save All):**
- VSCode default: Save All open files
- Our binding: Change status when TreeView focused
- Potential conflict - consider alternative shortcut if users complain

**Alternative Shortcut Options:**
- `F2`: Rename/Edit (common for status change)
- `Ctrl+Shift+T`: Status (mnemonic: T for Transition)
- `Ctrl+Alt+S`: Status (less conflict risk)

## Acceptance Criteria

### Change Status (Ctrl+Shift+S)
- [ ] Shortcut works when TreeView focused and Story/Bug selected
- [ ] Quick pick menu opens showing status transitions
- [ ] Shortcut disabled when Epic/Feature/StatusGroup selected
- [ ] Shortcut disabled when TreeView not focused
- [ ] Warning shown if invalid item selected

### Create Child Item (Ctrl+Shift+N)
- [ ] Shortcut works when TreeView focused and Epic/Feature selected
- [ ] Input box opens prompting for title
- [ ] Shortcut disabled when Story/Bug/StatusGroup selected
- [ ] Shortcut disabled when TreeView not focused
- [ ] Warning shown if invalid item selected

### Copy Item Number (Ctrl+C)
- [ ] Shortcut works when TreeView focused and item selected
- [ ] Item ID copied to clipboard
- [ ] Toast notification confirms copy
- [ ] Shortcut disabled when StatusGroup selected
- [ ] Shortcut disabled when TreeView not focused

### Focus Management
- [ ] Shortcuts only work when TreeView focused
- [ ] Shortcuts don't interfere with editor shortcuts
- [ ] Clicking editor disables TreeView shortcuts
- [ ] Clicking TreeView enables TreeView shortcuts

### Command Palette Integration
- [ ] All commands appear in Command Palette (Ctrl+Shift+P)
- [ ] Commands show keyboard shortcuts in palette
- [ ] Commands disabled when no item selected (grayed out)

## Testing Notes

**Manual Test - Change Status:**
1. Open Cascade TreeView
2. Click on Story to select it
3. Press Ctrl+Shift+S
4. Verify quick pick opens
5. Select new status
6. Verify file updated

**Manual Test - Create Child Item:**
1. Select Feature in TreeView
2. Press Ctrl+Shift+N
3. Verify input box opens: "Enter Story title"
4. Enter title and press Enter
5. Verify Story file created

**Manual Test - Copy Item Number:**
1. Select Story S63 in TreeView
2. Press Ctrl+C
3. Verify toast: "Copied: S63"
4. Press Ctrl+V in text file
5. Verify "S63" pasted

**Manual Test - Focus Context:**
1. Select Story in TreeView
2. Click in editor
3. Press Ctrl+C
4. Verify text copied (not item number - editor has focus)
5. Click TreeView again
6. Press Ctrl+C
7. Verify item number copied (TreeView has focus)

**Manual Test - Command Palette:**
1. Press Ctrl+Shift+P
2. Type "cascade"
3. Verify commands appear:
   - Cascade: Change Status (Ctrl+Shift+S)
   - Cascade: Create Child Item (Ctrl+Shift+N)
   - Cascade: Copy Item Number (Ctrl+C)
   - Cascade: Open File
   - Cascade: Reveal in Explorer
   - Cascade: Refresh TreeView
   - Cascade: Show Cache Statistics

**Edge Cases:**
- No item selected → Warning: "No item selected"
- Status group selected + Ctrl+C → No action (when clause prevents)
- Epic selected + Ctrl+Shift+S → Warning: "Change Status only works for Stories and Bugs"

## File References

- Keybinding registration: `vscode-extension/package.json` (contributes.keybindings)
- Command modifications: `vscode-extension/src/extension.ts` (add selection handling)
- TreeView selection API: `cascadeTreeView.selection`

## Dependencies

- **S63**: Change Status action - keyboard shortcut target
- **S64**: Create Child Item action - keyboard shortcut target
- **S65**: Copy Item Number action - keyboard shortcut target
- **F17**: TreeView foundation with selection tracking - already implemented

## Notes

**Shortcut Conflict Discussion:**

If users report conflicts with Ctrl+Shift+S (Save All), consider alternatives:
- F2 (common for edit/rename operations)
- Ctrl+Alt+S (less likely conflict)
- Ctrl+Shift+T (mnemonic: Transition)

Collect user feedback before changing - Ctrl+Shift+S is rare enough that conflicts may not be an issue.

**Command Palette Discovery:**

All commands automatically appear in Command Palette once registered in package.json. No additional configuration needed.

Users can discover keyboard shortcuts by:
1. Opening Command Palette (Ctrl+Shift+P)
2. Typing "Cascade"
3. Seeing shortcuts next to command names
