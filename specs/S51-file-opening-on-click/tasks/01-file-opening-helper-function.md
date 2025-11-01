---
spec: S51
phase: 1
title: File Opening Helper Function
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 1: File Opening Helper Function

## Overview

Create the core file opening functionality as a reusable helper function. This function will handle file URI conversion, editor display configuration, and comprehensive error handling.

The function will be used by the command handler registered in Phase 2.

## Prerequisites

- VSCode extension project structure exists
- extension.ts file accessible
- VSCode API types available (@types/vscode)

## Tasks

### Task 1: Create openPlanningFile Function Signature

**Location**: `vscode-extension/src/extension.ts`
**Position**: After `deactivate()` function (line 695), before `getExtensionVersion()` (line 700)

Add the function with JSDoc documentation:

```typescript
/**
 * Opens a planning file in the VSCode editor.
 *
 * Converts the file path to a URI, opens the document, and displays it in the editor
 * with permanent tab mode and editor focus. Handles errors gracefully by logging to
 * output channel and showing user notifications.
 *
 * @param filePath - Absolute path to the markdown file to open
 * @param outputChannel - Output channel for error logging
 * @returns Promise that resolves when file is opened (or rejects on error)
 */
async function openPlanningFile(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  // Implementation in next task
}
```

**Expected Outcome**: Function signature exists with proper typing and documentation

---

### Task 2: Implement File URI Conversion

**Location**: Inside `openPlanningFile()` function

Add try-catch block and URI conversion:

```typescript
async function openPlanningFile(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    // Convert file path to VSCode URI (handles Windows/Unix differences)
    const uri = vscode.Uri.file(filePath);

    // Next task: Open document

  } catch (error) {
    // Next task: Error handling
  }
}
```

**Why vscode.Uri.file()?**
- Converts Windows paths (D:\projects\...) to URI format (file:///D:/projects/...)
- Converts Unix paths (/home/user/...) to URI format (file:///home/user/...)
- Handles special characters and encoding automatically
- Required by vscode.workspace.openTextDocument()

**Expected Outcome**: File path converted to URI inside try block

---

### Task 3: Implement Document Opening

**Location**: Inside try block, after URI conversion

Add document loading and display:

```typescript
try {
  // Convert file path to VSCode URI (handles Windows/Unix differences)
  const uri = vscode.Uri.file(filePath);

  // Open document from file system
  // This loads the file content but doesn't display it yet
  const doc = await vscode.workspace.openTextDocument(uri);

  // Display document in editor with configuration
  await vscode.window.showTextDocument(doc, {
    preview: false,        // Open in permanent tab (not replaced by next preview)
    preserveFocus: false   // Editor receives focus (TreeView loses focus)
  });

} catch (error) {
  // Next task: Error handling
}
```

**Why these options?**
- `preview: false`: User likely wants to keep planning files open for reference
  - Preview tabs get replaced by next preview (frustrating for planning workflow)
  - Permanent tabs persist until explicitly closed (better UX)
- `preserveFocus: false`: Standard behavior (matches File Explorer)
  - User clicked to open file - expects to see/edit it
  - TreeView can be clicked again if needed

**API References**:
- [openTextDocument](https://code.visualstudio.com/api/references/vscode-api#workspace.openTextDocument)
- [showTextDocument](https://code.visualstudio.com/api/references/vscode-api#window.showTextDocument)

**Expected Outcome**: File opens in editor with correct options

---

### Task 4: Implement Error Handling

**Location**: Inside catch block

Add comprehensive error handling with logging and user notification:

```typescript
  } catch (error) {
    // Build error message for user (concise, actionable)
    const errorMsg = `Failed to open file: ${filePath}`;

    // Log detailed error to output channel (for debugging)
    outputChannel.appendLine(`[ERROR] ${errorMsg}`);
    outputChannel.appendLine(`  ${error}`);

    // Show user notification (non-blocking, dismissible)
    vscode.window.showErrorMessage(errorMsg);

    // Note: Don't rethrow - error is handled, extension continues running
  }
}
```

**Error Handling Strategy**:
- **User Notification**: Brief, non-technical message
  - Shows file path (user can verify if correct)
  - Non-blocking (doesn't interrupt workflow)
  - Dismissible (user can close if they understand)
- **Output Channel Logging**: Detailed technical information
  - Full error object (stack trace, error code)
  - Timestamp (from output channel automatic formatting)
  - Useful for debugging and issue reports
- **No Rethrow**: Error is fully handled
  - Extension continues running (resilient)
  - Other tree items still clickable
  - Command system doesn't see failure (prevents error dialog spam)

**Common Error Scenarios**:
- File deleted between tree load and click
- File permissions changed (read access revoked)
- File path contains invalid characters (rare, but possible)
- Disk I/O errors (disk full, network drive disconnected)

**Expected Outcome**: Errors logged and user notified without crashing extension

---

### Task 5: Review Complete Implementation

**Location**: `vscode-extension/src/extension.ts` (after line 695)

Verify the complete function:

```typescript
/**
 * Opens a planning file in the VSCode editor.
 *
 * Converts the file path to a URI, opens the document, and displays it in the editor
 * with permanent tab mode and editor focus. Handles errors gracefully by logging to
 * output channel and showing user notifications.
 *
 * @param filePath - Absolute path to the markdown file to open
 * @param outputChannel - Output channel for error logging
 * @returns Promise that resolves when file is opened (or rejects on error)
 */
async function openPlanningFile(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    // Convert file path to VSCode URI (handles Windows/Unix differences)
    const uri = vscode.Uri.file(filePath);

    // Open document from file system
    const doc = await vscode.workspace.openTextDocument(uri);

    // Display document in editor with configuration
    await vscode.window.showTextDocument(doc, {
      preview: false,        // Open in permanent tab (not replaced by next preview)
      preserveFocus: false   // Editor receives focus (TreeView loses focus)
    });

  } catch (error) {
    // Build error message for user
    const errorMsg = `Failed to open file: ${filePath}`;

    // Log detailed error to output channel
    outputChannel.appendLine(`[ERROR] ${errorMsg}`);
    outputChannel.appendLine(`  ${error}`);

    // Show user notification
    vscode.window.showErrorMessage(errorMsg);
  }
}
```

**Code Quality Checklist**:
- ✅ Function has JSDoc documentation
- ✅ Parameters have type annotations
- ✅ Return type explicitly specified (Promise<void>)
- ✅ Async/await used consistently
- ✅ Error handling comprehensive
- ✅ Comments explain "why" not "what"
- ✅ Follows existing code style in extension.ts

**Expected Outcome**: Complete, documented, tested helper function

## Completion Criteria

- ✅ Function `openPlanningFile` exists in extension.ts after line 695
- ✅ Function signature matches specification (filePath, outputChannel, Promise<void>)
- ✅ JSDoc documentation complete and accurate
- ✅ URI conversion uses vscode.Uri.file()
- ✅ Document opened with openTextDocument()
- ✅ Document displayed with showTextDocument() and correct options
- ✅ Error handling logs to output channel
- ✅ Error handling shows user notification
- ✅ Try-catch prevents uncaught exceptions
- ✅ Code follows existing extension.ts style
- ✅ No TypeScript compilation errors
- ✅ No ESLint warnings (if configured)

## Testing

Manual testing at this phase is not possible (function not wired up yet). Testing occurs in Phase 4 after command registration.

However, verify TypeScript compilation:

```bash
# From vscode-extension/ directory
npm run compile
```

Expected: No compilation errors related to openPlanningFile function.

## Next Phase

**Phase 2: Command Registration**

Register the `cascade.openFile` command in the `activate()` function, passing the `openPlanningFile` helper function as the handler.

File: `vscode-extension/src/extension.ts` (in activate function, around line 570)
