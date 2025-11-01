---
spec: S51
phase: 2
title: Command Registration
status: Completed
priority: High
created: 2025-10-13
updated: 2025-10-13
---

# Phase 2: Command Registration

## Overview

Register the `cascade.openFile` command in the extension's `activate()` function. This wires up the helper function from Phase 1 to VSCode's command system, making it callable from TreeItem clicks.

The command follows the same registration pattern as the existing `cascade.showCacheStats` command.

## Prerequisites

- Phase 1 completed (`openPlanningFile` function exists)
- `activate()` function accessible in extension.ts
- outputChannel exists in activate() scope

## Tasks

### Task 1: Locate Command Registration Section

**Location**: `vscode-extension/src/extension.ts`
**Line**: Around 570 (after TreeView setup, before cache statistics setup)

**Context** (for navigation):
```typescript
// ... (TreeView registration code) ...

outputChannel.appendLine('✅ TreeView registered with PlanningTreeProvider');
outputChannel.appendLine('   View: "Planning Items" in Activity Bar');
outputChannel.appendLine('   Provider: Scanning plans/ directory for items');
outputChannel.appendLine('');

// Register cache statistics command  <-- EXISTING COMMAND (line 562)
const showCacheStatsCommand = vscode.commands.registerCommand(
  'cascade.showCacheStats',
  () => {
    logCacheStats(frontmatterCache!, outputChannel);
    outputChannel.show();
  }
);
context.subscriptions.push(showCacheStatsCommand);
```

**Action**: Identify insertion point BEFORE cache statistics command registration
**Reason**: Logical grouping - file opening is more fundamental than statistics

**Expected Outcome**: Found line 559 (before cache statistics comment)

---

### Task 2: Add Command Registration

**Location**: `vscode-extension/src/extension.ts:559` (before cache statistics section)

Insert the following code:

```typescript
  // Register file opening command for TreeView clicks
  const openFileCommand = vscode.commands.registerCommand(
    'cascade.openFile',
    (filePath: string) => {
      openPlanningFile(filePath, outputChannel);
    }
  );
  context.subscriptions.push(openFileCommand);

```

**Code Breakdown**:

1. **Command ID**: `'cascade.openFile'`
   - Namespace: `cascade.` (matches extension ID, prevents conflicts)
   - Action: `openFile` (descriptive, clear intent)
   - Convention: Matches VSCode naming (e.g., `vscode.openFolder`)

2. **Handler Function**: `(filePath: string) => { ... }`
   - Parameter: `filePath` - Absolute path passed from TreeItem.command.arguments
   - Type: `string` - TypeScript infers from parameter usage
   - Body: Calls `openPlanningFile` with filePath and outputChannel

3. **Handler Body**: `openPlanningFile(filePath, outputChannel)`
   - Delegates to helper function from Phase 1
   - Passes `outputChannel` from activate() scope (closure)
   - Returns Promise<void> (fire-and-forget, errors handled internally)

4. **Subscription**: `context.subscriptions.push(openFileCommand)`
   - Registers disposable with context (automatic cleanup on deactivation)
   - Follows pattern from existing commands
   - Prevents memory leaks (command unregistered when extension deactivates)

**Why this pattern?**
- **Closure over outputChannel**: Handler has access to activate() scope
  - Avoids global variable (cleaner architecture)
  - outputChannel guaranteed to exist (created early in activate())
- **Arrow function**: Concise syntax, inherits `this` context (not used here)
- **Fire-and-forget**: Promise returned by openPlanningFile not awaited
  - Opening file is asynchronous but we don't need to wait
  - Errors handled internally (user notification + logging)
  - Command returns immediately (responsive UI)

**API Reference**:
- [commands.registerCommand](https://code.visualstudio.com/api/references/vscode-api#commands.registerCommand)

**Expected Outcome**: Command registered and added to subscriptions

---

### Task 3: Verify Command Registration Location

**Location**: `vscode-extension/src/extension.ts` (after Task 2 changes)

Verify the code structure:

```typescript
// ... (TreeView registration) ...

outputChannel.appendLine('');

// Register file opening command for TreeView clicks
const openFileCommand = vscode.commands.registerCommand(
  'cascade.openFile',
  (filePath: string) => {
    openPlanningFile(filePath, outputChannel);
  }
);
context.subscriptions.push(openFileCommand);

// Register cache statistics command
const showCacheStatsCommand = vscode.commands.registerCommand(
  'cascade.showCacheStats',
  () => {
    logCacheStats(frontmatterCache!, outputChannel);
    outputChannel.show();
  }
);
context.subscriptions.push(showCacheStatsCommand);

// ... (rest of activate function) ...
```

**Verification Checklist**:
- ✅ New command registration appears BEFORE cache statistics
- ✅ Blank line separates command blocks (readability)
- ✅ Comment describes command purpose
- ✅ Indentation matches surrounding code
- ✅ Both commands follow same pattern (consistency)

**Expected Outcome**: Code properly positioned and formatted

---

### Task 4: Update Output Channel Logging

**Location**: `vscode-extension/src/extension.ts` (around line 604, in "Available commands" section)

**Current code**:
```typescript
outputChannel.appendLine('Available commands:');
outputChannel.appendLine('  - Cascade: Show Cache Statistics');
outputChannel.appendLine('');
```

**Updated code**:
```typescript
outputChannel.appendLine('Available commands:');
outputChannel.appendLine('  - Cascade: Open File (internal, triggered by TreeView clicks)');
outputChannel.appendLine('  - Cascade: Show Cache Statistics');
outputChannel.appendLine('');
```

**Why add to logging?**
- **Visibility**: Users/developers can see what commands are available
- **Debugging**: Confirms command registered successfully
- **Documentation**: Output channel serves as runtime documentation
- **Note "internal"**: Command not meant for Command Palette (no package.json entry)

**Expected Outcome**: Output channel shows both commands on activation

---

### Task 5: Compile and Verify No Errors

**Location**: Terminal in `vscode-extension/` directory

Run TypeScript compilation:

```bash
npm run compile
```

**Expected Output**:
```
> cascade@0.1.0 compile
> node esbuild.js

[esbuild] Build succeeded
```

**If compilation errors occur**, check:
1. `openPlanningFile` function exists (Phase 1)
2. Function name spelled correctly in command handler
3. `outputChannel` variable exists in activate() scope
4. `vscode` module imported at top of file

**Common errors**:
- `Cannot find name 'openPlanningFile'` → Function not defined or misspelled
- `Cannot find name 'outputChannel'` → Variable name changed or out of scope
- `Expected 2 arguments, but got 1` → Missing outputChannel parameter

**Expected Outcome**: Clean compilation with no errors

---

### Task 6: Review Complete Implementation

**Location**: `vscode-extension/src/extension.ts` (around lines 559-568)

Verify the complete command registration:

```typescript
// Register file opening command for TreeView clicks
const openFileCommand = vscode.commands.registerCommand(
  'cascade.openFile',
  (filePath: string) => {
    openPlanningFile(filePath, outputChannel);
  }
);
context.subscriptions.push(openFileCommand);
```

**Code Quality Checklist**:
- ✅ Command ID follows naming convention (cascade.openFile)
- ✅ Handler parameter type annotated (filePath: string)
- ✅ Handler delegates to helper function (separation of concerns)
- ✅ outputChannel passed from activate() scope (closure)
- ✅ Command added to context.subscriptions (proper disposal)
- ✅ Comment describes command purpose
- ✅ Code formatted consistently with existing commands
- ✅ TypeScript compiles without errors

**Expected Outcome**: Production-ready command registration

## Completion Criteria

- ✅ Command `cascade.openFile` registered in activate() function
- ✅ Command registration placed before cache statistics command
- ✅ Handler function accepts filePath parameter (string type)
- ✅ Handler calls openPlanningFile with filePath and outputChannel
- ✅ Command added to context.subscriptions
- ✅ Output channel logging updated to list new command
- ✅ Comment added describing command purpose
- ✅ TypeScript compilation succeeds (npm run compile)
- ✅ No ESLint warnings (if configured)
- ✅ Code follows existing patterns and style

## Testing

Manual testing not yet possible (command not triggered by anything yet). Testing occurs in Phase 4 after TreeItem wiring.

However, verify command registration:

```bash
# 1. Compile extension
cd vscode-extension
npm run compile

# 2. Package extension
npm run package

# 3. Install extension
code --install-extension cascade-0.1.0.vsix --force

# 4. Reload VSCode window
# Press Ctrl+Shift+P → "Developer: Reload Window"

# 5. Open output channel (Ctrl+Shift+P → "View: Toggle Output" → Select "Cascade")

# 6. Look for log entry:
#    "Available commands:"
#    "  - Cascade: Open File (internal, triggered by TreeView clicks)"
```

**Expected**: Log entry confirms command registered.

**Note**: Command won't appear in Command Palette because it's not declared in package.json (intentional - it's triggered by TreeView, not user commands).

## Next Phase

**Phase 3: TreeItem Command Assignment**

Modify `PlanningTreeProvider.getTreeItem()` to assign the command property to TreeItems, connecting clicks to the registered command.

File: `vscode-extension/src/treeview/PlanningTreeProvider.ts` (getTreeItem method, around line 82)
