---
spec: S52
phase: 2
title: Manual Refresh Command
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 2: Manual Refresh Command

## Overview

Add a manual refresh command (cascade.refresh) that allows users to explicitly trigger TreeView updates. This provides explicit control for debugging, development, and situations where automatic refresh may not work as expected.

## Prerequisites

- Phase 1 completed - Automatic refresh working
- Existing command registration pattern (extension.ts:571-578, cascade.showCacheStats)
- Package.json command contribution structure understood

## Tasks

### Task 1: Register Manual Refresh Command in activate()

**File**: `vscode-extension/src/extension.ts`
**Location**: After cascade.openFile command registration (after line 568)

**Pattern to Follow** (existing code at lines 571-578):
```typescript
// Register cache statistics command
const showCacheStatsCommand = vscode.commands.registerCommand(
  'cascade.showCacheStats',
  () => {
    logCacheStats(frontmatterCache!, outputChannel);
    outputChannel.show(); // Bring output channel to front
  }
);
context.subscriptions.push(showCacheStatsCommand);
```

**Implementation**: Add after the openFileCommand registration
```typescript
// Register file opening command for TreeView clicks
const openFileCommand = vscode.commands.registerCommand(
  'cascade.openFile',
  (filePath: string) => {
    openPlanningFile(filePath, outputChannel);
  }
);
context.subscriptions.push(openFileCommand);

// Register manual refresh command for TreeView
const refreshCommand = vscode.commands.registerCommand(
  'cascade.refresh',
  () => {
    if (planningTreeProvider) {
      // Trigger TreeView refresh
      planningTreeProvider.refresh();

      // Log to output channel
      const timestamp = new Date().toLocaleTimeString();
      outputChannel.appendLine(`[${timestamp}] REFRESH: Manual refresh triggered by user`);

      // Show confirmation message to user
      vscode.window.showInformationMessage('Cascade TreeView refreshed');
    } else {
      // Provider not initialized (should not happen in normal use)
      vscode.window.showWarningMessage('TreeView provider not initialized');
      outputChannel.appendLine('[ERROR] Manual refresh failed - provider not initialized');
    }
  }
);
context.subscriptions.push(refreshCommand);

// Register cache statistics command
const showCacheStatsCommand = vscode.commands.registerCommand(
  // ... existing code ...
```

**Rationale**:
- Follows existing command registration pattern
- Provides user feedback via information message
- Logs to output channel for debugging
- Handles edge case where provider not initialized
- Registered in context.subscriptions for proper cleanup

**Expected Outcome**: cascade.refresh command available for execution, triggers TreeView refresh and shows confirmation message.

---

### Task 2: Add Command Declaration to package.json

**File**: `vscode-extension/package.json`
**Location**: "contributes.commands" array (after line 33, before closing bracket on line 38)

**Current Code**:
```json
"commands": [
  {
    "command": "cascade.showCacheStats",
    "title": "Cascade: Show Cache Statistics"
  }
]
```

**Modification**: Add refresh command entry
```json
"commands": [
  {
    "command": "cascade.refresh",
    "title": "Cascade: Refresh TreeView"
  },
  {
    "command": "cascade.showCacheStats",
    "title": "Cascade: Show Cache Statistics"
  }
]
```

**Rationale**:
- Makes command visible in Command Palette (Ctrl+Shift+P)
- Follows VSCode command contribution convention
- Title uses "Cascade:" prefix for branding consistency
- Descriptive title tells users what the command does

**VSCode API Reference**: https://code.visualstudio.com/api/references/contribution-points#contributes.commands

**Expected Outcome**: Command appears in Command Palette as "Cascade: Refresh TreeView".

---

### Task 3: Update Extension Activation Logging

**File**: `vscode-extension/src/extension.ts`
**Location**: Lines 613-615 (Available commands section)

**Current Code**:
```typescript
outputChannel.appendLine('Available commands:');
outputChannel.appendLine('  - Cascade: Open File (internal, triggered by TreeView clicks)');
outputChannel.appendLine('  - Cascade: Show Cache Statistics');
```

**Modification**: Add refresh command to list
```typescript
outputChannel.appendLine('Available commands:');
outputChannel.appendLine('  - Cascade: Refresh TreeView (manual refresh)');
outputChannel.appendLine('  - Cascade: Open File (internal, triggered by TreeView clicks)');
outputChannel.appendLine('  - Cascade: Show Cache Statistics');
```

**Rationale**:
- Documents available commands in output channel
- Helps users discover features
- Useful for debugging/troubleshooting
- Maintains consistency with existing logging

**Expected Outcome**: Extension activation log lists manual refresh command.

---

### Task 4: Compile and Package Extension

**Commands**:
```bash
# Compile TypeScript to JavaScript
cd vscode-extension && npm run compile

# Package extension as VSIX
npm run package
```

**Expected Output**:
- `dist/extension.js` updated with new command
- `cascade-0.1.0.vsix` created (or incremented version)
- No compilation errors

**Troubleshooting**:
- If `compile` fails: Check for TypeScript errors, fix syntax issues
- If `package` fails: Ensure `@vscode/vsce` installed, check package.json validity

**VSCode Extension Packaging Guide**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#packaging-extensions

---

### Task 5: Install and Test Extension Locally

**Installation Commands**:
```bash
# Install VSIX in current VSCode instance (force reinstall)
code --install-extension cascade-0.1.0.vsix --force

# Reload VSCode window (or restart VSCode)
# Press Ctrl+Shift+P → "Developer: Reload Window"
```

**Verification Steps**:
1. Check Cascade output channel for activation log
2. Verify "Cascade: Refresh TreeView" in available commands list
3. Open Command Palette (Ctrl+Shift+P)
4. Type "Cascade: Refresh" - command should appear
5. Execute command
6. Verify information message appears: "Cascade TreeView refreshed"
7. Check output channel for refresh log entry

**Expected Outcome**: Extension installs successfully, command available and working, confirmation message shown, refresh logged.

---

## Completion Criteria

- [ ] cascade.refresh command registered in extension.ts
- [ ] Command declaration added to package.json
- [ ] Extension activation log updated with new command
- [ ] Code compiles without errors (`npm run compile`)
- [ ] Extension packages successfully (`npm run package`)
- [ ] Extension installs in VSCode (`code --install-extension`)
- [ ] Command appears in Command Palette
- [ ] Executing command refreshes TreeView
- [ ] Confirmation message appears: "Cascade TreeView refreshed"
- [ ] Refresh logged to output channel
- [ ] Edge case handled: Provider not initialized shows warning

## Testing Instructions

### Test 1: Command Palette Execution
1. Open Command Palette (Ctrl+Shift+P)
2. Type "Cascade: Refresh"
3. **Verify**: Command appears in dropdown
4. Execute command
5. **Verify**: Information message "Cascade TreeView refreshed" appears
6. **Verify**: TreeView refreshes (items reload)
7. **Verify**: Output channel shows "REFRESH: Manual refresh triggered by user"

### Test 2: Rapid Manual Refreshes
1. Execute cascade.refresh command
2. Immediately execute again (before first refresh completes)
3. Execute a third time
4. **Verify**: No errors occur
5. **Verify**: TreeView refreshes successfully each time
6. **Verify**: Output channel shows three refresh log entries

### Test 3: Refresh with File Changes Pending
1. Edit .md file in plans/ directory (don't save yet)
2. Save file (triggers automatic refresh)
3. Immediately execute manual refresh command (within 300ms)
4. **Verify**: No errors occur
5. **Verify**: TreeView shows updated data
6. **Verify**: Both automatic and manual refresh logged

### Test 4: Output Channel Verification
1. Open Cascade output channel (View → Output → Cascade)
2. Execute manual refresh command
3. **Verify**: Log entry format: `[HH:MM:SS] REFRESH: Manual refresh triggered by user`
4. **Verify**: Timestamp matches current time

## Next Phase

Proceed to Phase 3: Testing and Validation

Phase 3 performs comprehensive testing including edge cases, performance testing, and integration verification to ensure robust refresh behavior.
