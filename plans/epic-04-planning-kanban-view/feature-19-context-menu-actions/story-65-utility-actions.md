---
item: S65
title: Utility Context Menu Actions (Open, Copy, Reveal)
type: story
parent: F19
status: Completed
priority: Medium
dependencies: []
estimate: XS
created: 2025-10-16
updated: 2025-10-17
spec: specs/S65-utility-context-menu-actions/
---

# S65 - Utility Context Menu Actions (Open, Copy, Reveal)

## Description

Implement utility context menu actions for planning items in the Cascade TreeView:

1. **Open File**: Opens markdown file in editor (same behavior as clicking item)
2. **Copy Item Number**: Copies item ID (e.g., "S39") to clipboard
3. **Reveal in Explorer**: Shows file in VSCode File Explorer view

These actions improve user productivity by providing quick access to common operations without leaving the TreeView.

### User Workflows

**Open File:**
1. Right-click on any planning item
2. Select "Open File"
3. File opens in editor (same as clicking item)

**Copy Item Number:**
1. Right-click on any planning item
2. Select "Copy Item Number"
3. Item ID copied to clipboard (e.g., "S39")
4. Toast notification confirms copy

**Reveal in Explorer:**
1. Right-click on any planning item
2. Select "Reveal in Explorer"
3. VSCode File Explorer opens and highlights file

### Technical Details

**Command Registration (package.json):**
```json
{
  "contributes": {
    "commands": [
      {
        "command": "cascade.openFileContext",
        "title": "Open File",
        "icon": "$(go-to-file)"
      },
      {
        "command": "cascade.copyItemNumber",
        "title": "Copy Item Number",
        "icon": "$(clippy)"
      },
      {
        "command": "cascade.revealInExplorer",
        "title": "Reveal in Explorer",
        "icon": "$(folder-opened)"
      }
    ],
    "menus": {
      "view/item/context": [
        {
          "command": "cascade.openFileContext",
          "when": "view == cascadeView && viewItem != status-group",
          "group": "2_navigation@1"
        },
        {
          "command": "cascade.copyItemNumber",
          "when": "view == cascadeView && viewItem != status-group",
          "group": "3_utils@1"
        },
        {
          "command": "cascade.revealInExplorer",
          "when": "view == cascadeView && viewItem != status-group",
          "group": "3_utils@2"
        }
      ]
    }
  }
}
```

**Note on Group Numbers:**
- `1_modification`: Edit actions (Change Status, Create Child)
- `2_navigation`: Navigation actions (Open File)
- `3_utils`: Utility actions (Copy, Reveal)

This grouping creates visual separators in the context menu.

**Command Implementations (extension.ts):**

```typescript
// Open File - Reuses existing openPlanningFile function
function openFileContextCommand(item: PlanningTreeItem): void {
  openPlanningFile(item.filePath, outputChannel);
}

// Copy Item Number - Uses VSCode clipboard API
async function copyItemNumberCommand(item: PlanningTreeItem): Promise<void> {
  try {
    // Copy to clipboard
    await vscode.env.clipboard.writeText(item.item);

    // Log to output channel
    outputChannel.appendLine(`[CopyItem] Copied to clipboard: ${item.item}`);

    // Success notification
    vscode.window.showInformationMessage(`Copied: ${item.item}`);

  } catch (error) {
    // Error notification
    vscode.window.showErrorMessage(
      `Failed to copy item number: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    outputChannel.appendLine(`[CopyItem] ❌ Error: ${error}`);
  }
}

// Reveal in Explorer - Uses VSCode reveal command
async function revealInExplorerCommand(item: PlanningTreeItem): Promise<void> {
  try {
    // Convert file path to URI
    const uri = vscode.Uri.file(item.filePath);

    // Execute reveal command
    // This command focuses File Explorer and highlights the file
    await vscode.commands.executeCommand('revealInExplorer', uri);

    // Log to output channel
    outputChannel.appendLine(`[RevealExplorer] Revealed: ${item.filePath}`);

  } catch (error) {
    // Error notification
    vscode.window.showErrorMessage(
      `Failed to reveal file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    outputChannel.appendLine(`[RevealExplorer] ❌ Error: ${error}`);
  }
}
```

**Command Registration (extension.ts):**
```typescript
export function activate(context: vscode.ExtensionContext) {
  // ... existing activation code ...

  // Register utility commands
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
}
```

## Acceptance Criteria

### Open File
- [ ] Right-click on any planning item shows "Open File" action
- [ ] Action not visible for status groups
- [ ] Clicking action opens file in editor
- [ ] File opens in permanent tab (not preview)
- [ ] Editor receives focus
- [ ] Error handling if file doesn't exist

### Copy Item Number
- [ ] Right-click on any planning item shows "Copy Item Number" action
- [ ] Action not visible for status groups
- [ ] Clicking action copies item ID to clipboard (e.g., "S39")
- [ ] Toast notification confirms copy: "Copied: S39"
- [ ] Clipboard content can be pasted elsewhere (Ctrl+V)
- [ ] Works for all item types (Epic, Feature, Story, Bug)
- [ ] Error handling if clipboard API fails

### Reveal in Explorer
- [ ] Right-click on any planning item shows "Reveal in Explorer" action
- [ ] Action not visible for status groups
- [ ] Clicking action opens File Explorer view
- [ ] File is highlighted/selected in Explorer
- [ ] Explorer scrolls to show file if needed
- [ ] Works for all item types
- [ ] Error handling if file doesn't exist

### Context Menu Layout
- [ ] Menu items grouped correctly:
  - Group 1: Change Status, Create Child
  - Group 2: Open File (separator above)
  - Group 3: Copy Item Number, Reveal in Explorer (separator above)
- [ ] Visual separators between groups
- [ ] Icons shown next to menu items

## Testing Notes

**Manual Test - Open File:**
1. Right-click Story in TreeView
2. Select "Open File"
3. Verify file opens in permanent tab
4. Verify editor has focus

**Manual Test - Copy Item Number:**
1. Right-click Story S63
2. Select "Copy Item Number"
3. Verify toast: "Copied: S63"
4. Open any text file and press Ctrl+V
5. Verify "S63" is pasted

**Manual Test - Reveal in Explorer:**
1. Right-click Story in TreeView
2. Select "Reveal in Explorer"
3. Verify File Explorer view opens
4. Verify story file is highlighted
5. Verify correct directory expanded

**Manual Test - Context Menu Groups:**
1. Right-click Story in TreeView
2. Verify menu structure:
   ```
   Change Status
   ──────────────
   Open File
   ──────────────
   Copy Item Number
   Reveal in Explorer
   ```

**Edge Cases:**
- Status group → Utility actions not visible
- File deleted but cached → Error toast shown
- Clipboard unavailable → Error toast shown

**Output Channel Logs:**
```
[CopyItem] Copied to clipboard: S63
[RevealExplorer] Revealed: D:\projects\lineage\plans\...\story-63.md
```

## File References

- Command registration: `vscode-extension/package.json`
- Command implementations: `vscode-extension/src/extension.ts`
- Open file function: `vscode-extension/src/extension.ts:781` (openPlanningFile - already exists)
- VSCode Clipboard API: `vscode.env.clipboard`
- VSCode Reveal Command: `revealInExplorer` (built-in)

## Dependencies

- **F17**: TreeView foundation with contextValue - already implemented
- **S51**: Click-to-open functionality (openPlanningFile) - already implemented
