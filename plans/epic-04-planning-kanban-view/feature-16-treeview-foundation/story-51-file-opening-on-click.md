---
item: S51
title: File Opening on Click
type: story
parent: F16
status: Completed
priority: High
dependencies: [S50]
estimate: S
spec: specs/S51-file-opening-on-click/
created: 2025-10-13
updated: 2025-10-14
---

# S51 - File Opening on Click

## Description

Implement click handler to open planning item markdown files in the VSCode editor when a tree item is clicked. This provides essential navigation functionality, allowing users to quickly jump from the TreeView to the full planning document.

This story completes the basic user interaction flow: view items → click → open file.

### Technical Approach

**Command Registration:**
```typescript
// In extension.ts activate()
const openFileCommand = vscode.commands.registerCommand(
  'cascade.openFile',
  (filePath: string) => {
    openPlanningFile(filePath, outputChannel);
  }
);
context.subscriptions.push(openFileCommand);
```

**File Opening Function:**
```typescript
async function openPlanningFile(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    // Convert to URI
    const uri = vscode.Uri.file(filePath);

    // Open in editor (preserves focus behavior)
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      preview: false,  // Open in permanent tab (not preview)
      preserveFocus: false  // Focus editor after opening
    });
  } catch (error) {
    // Log error and show user notification
    const errorMsg = `Failed to open file: ${filePath}`;
    outputChannel.appendLine(`[ERROR] ${errorMsg}`);
    outputChannel.appendLine(`  ${error}`);

    vscode.window.showErrorMessage(errorMsg);
  }
}
```

**TreeItem Command Assignment:**
```typescript
// In PlanningTreeProvider.getTreeItem()
getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
  const treeItem = new vscode.TreeItem(/* ... */);

  // ... icon, tooltip, description setup ...

  // Assign click command
  treeItem.command = {
    command: 'cascade.openFile',
    title: 'Open File',
    arguments: [element.filePath]
  };

  return treeItem;
}
```

### Integration Points

- **S50 (Tree Item Rendering)**: Add command property to TreeItem
- **extension.ts**: Register command in activate() function
- **VSCode Commands API**: Use built-in command system
- **VSCode Editor API**: Use showTextDocument() for file opening

## Acceptance Criteria

- [ ] Clicking tree item opens corresponding markdown file in editor
- [ ] File opens in permanent tab (not preview mode)
- [ ] Editor receives focus after file opens
- [ ] Error message shown if file doesn't exist
- [ ] Error logged to output channel with file path and error details
- [ ] Click works for all item types (Project/Epic/Feature/Story/Bug/Spec/Phase)
- [ ] Multiple clicks on different items open multiple files
- [ ] Clicking same item twice switches to existing tab (VSCode default)
- [ ] No console errors during command execution
- [ ] Command registered in package.json (not required but good practice)

## Analysis Summary

### VSCode Command System

**Command Registration:**
- Commands registered via `vscode.commands.registerCommand()`
- Command ID: `cascade.openFile` (namespace convention)
- Commands automatically disposed when extension deactivates
- Add to context.subscriptions for proper cleanup

**TreeItem Command Property:**
- `vscode.TreeItem.command` - Defines click behavior
- Command executed when item clicked (single click)
- Arguments passed to command handler
- Alternative: Use `onDidChangeSelection` event (more complex, unnecessary)

**Editor Behavior:**
- `showTextDocument()` opens file in editor
- `preview: false` - Opens in permanent tab (user can close explicitly)
- `preview: true` - Opens in preview tab (replaced by next preview)
- `preserveFocus: false` - Editor receives focus (default behavior)

### Error Handling

**File Not Found:**
- Can occur if file deleted between tree load and click
- Show user-friendly error notification
- Log detailed error to output channel
- Don't crash extension (graceful degradation)

**Permission Errors:**
- Rare but possible (file permissions changed)
- Same error handling as file not found
- User notification with suggestion to check file system

### Alternative Approaches Considered

**1. onDidChangeSelection Event:**
```typescript
treeView.onDidChangeSelection((event) => {
  // Handle selection change
});
```
- More control but more complex
- Unnecessary for simple file opening
- Command property is cleaner and more declarative

**2. Double-Click Handler:**
- VSCode doesn't provide native double-click API
- Single-click is standard for tree navigation
- Follows VSCode conventions (e.g., file explorer)

## Implementation Notes

**Preview vs Permanent Tabs:**
- Preview tabs save screen space (single preview at a time)
- Permanent tabs persist until explicitly closed
- Use `preview: false` for planning files (users likely want to keep open)
- Users can convert preview to permanent by editing file

**Focus Behavior:**
- `preserveFocus: false` - Editor receives focus (default, recommended)
- `preserveFocus: true` - TreeView retains focus (unusual, not recommended)
- Default behavior matches user expectations

**Command Naming:**
- Namespace: `cascade.*` (matches extension ID)
- Descriptive: `openFile` (clear intent)
- Full ID: `cascade.openFile`
- Follows VSCode naming conventions

**File Path Handling:**
- Use absolute paths (stored in PlanningTreeItem.filePath)
- Convert to `vscode.Uri` for API compatibility
- Handle Windows/Unix path differences automatically (Uri handles it)

## Test Strategy

**Manual Testing:**
1. Click various items in TreeView
2. Verify correct file opens in editor
3. Verify file opens in permanent tab
4. Verify editor receives focus
5. Delete a file and click its tree item (verify error handling)
6. Click same item multiple times (verify tab switching)
7. Open multiple files (verify multiple tabs)

**Unit Tests (test/commands/openFile.test.ts):**
Uses Mocha + Node.js test runner with mock VSCode API:

```typescript
import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import * as vscode from 'vscode';

describe('cascade.openFile command', () => {
  it('should open file with valid path', async () => {
    // Mock workspace.openTextDocument and window.showTextDocument
    const filePath = '/path/to/plan.md';
    await commands.executeCommand('cascade.openFile', filePath);
    // Verify showTextDocument called with correct options
  });

  it('should handle invalid path with error message', async () => {
    // Mock error case
    const invalidPath = '/nonexistent/file.md';
    // Verify error logged and notification shown
  });

  it('should use correct showTextDocument options', () => {
    // Verify preview: false, preserveFocus: false
  });
});
```

**Integration Tests:**
1. Create test workspace with sample plans/ files
2. Simulate tree item click via command execution
3. Verify file opens in editor
4. Verify error handling with missing file

**Edge Cases:**
- Click on file being edited (should switch to existing tab)
- Click on file in different workspace folder (multi-root support)
- Click on file with special characters in path
- Click on very large file (performance check)
