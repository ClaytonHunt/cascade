---
spec: S87
phase: 1
title: Command and Package.json Setup
status: Completed
priority: High
created: 2025-10-25
updated: 2025-10-25
---

# Phase 1: Command and Package.json Setup

## Overview

This phase implements the toggle command and toolbar button by adding the necessary contributions to package.json and registering the command handler in extension.ts. This is the core implementation that makes view mode switching accessible through VSCode's UI.

## Prerequisites

- Completed S85 (view mode state management with getViewMode/setViewMode)
- Completed S86 (hierarchy view implementation)
- Understanding of VSCode command and menu contribution points

## Tasks

### Task 1: Add Command Contribution to package.json

**File**: `vscode-extension/package.json`

**What to do**: Add the toggle command to the "contributes" > "commands" array.

**Current Structure** (line 33-72):
The commands array already contains several cascade commands like `cascade.refresh`, `cascade.showCacheStats`, `cascade.changeStatus`, etc.

**Implementation**:
Add after the `cascade.toggleArchived` command (around line 72):

```json
{
  "command": "cascade.toggleViewMode",
  "title": "Toggle View Mode (Status/Hierarchy)",
  "category": "Cascade",
  "icon": "$(list-tree)"
}
```

**Field Explanations**:
- `command`: Unique identifier for the command (matches registration in extension.ts)
- `title`: Display text in Command Palette ("Cascade: Toggle View Mode (Status/Hierarchy)")
- `category`: Groups command under "Cascade" in Command Palette
- `icon`: VSCode Codicon for toolbar button (`$(list-tree)` represents hierarchy)

**Expected Outcome**:
- Command contribution added to package.json
- Command will appear in Command Palette under "Cascade" category
- Icon specified for use in toolbar button

**Reference**: `vscode-extension/package.json:33-72` (existing commands array)

---

### Task 2: Add View Toolbar Menu Item

**File**: `vscode-extension/package.json`

**What to do**: Add the toolbar button to the "contributes" > "menus" > "view/title" array.

**Current Structure** (line 110-116):
The view/title menu already contains the `cascade.toggleArchived` button.

**Implementation**:
Add after the `cascade.toggleArchived` entry (around line 115):

```json
{
  "command": "cascade.toggleViewMode",
  "when": "view == cascadeView",
  "group": "navigation"
}
```

**Field Explanations**:
- `command`: References the command defined in Task 1
- `when`: Visibility condition - only show in Cascade TreeView
- `group`: "navigation" places button in primary toolbar area (left side)

**Expected Outcome**:
- Toolbar button appears in Cascade TreeView title bar
- Button only visible when Cascade view is active
- Button displays icon from command contribution

**Reference**: `vscode-extension/package.json:110-116` (existing view/title menu)

---

### Task 3: Register Command Handler in extension.ts

**File**: `vscode-extension/src/extension.ts`

**What to do**: Add command registration in the activate() function after existing command registrations.

**Location**: Add after `toggleArchivedCmd` registration (around line 1361)

**Implementation**:

```typescript
// Register view mode toggle command (S87)
const toggleViewModeCmd = vscode.commands.registerCommand(
  'cascade.toggleViewMode',
  async () => {
    if (!planningTreeProvider) {
      outputChannel.appendLine('[ViewMode] ⚠️  Cannot toggle: TreeProvider not initialized');
      return;
    }

    const currentMode = planningTreeProvider.getViewMode();
    const newMode = currentMode === 'status' ? 'hierarchy' : 'status';

    outputChannel.appendLine(`[ViewMode] Toggle: ${currentMode} → ${newMode}`);

    await planningTreeProvider.setViewMode(newMode);

    // Optional: Show user-friendly notification
    const modeLabel = newMode === 'hierarchy' ? 'Hierarchy View' : 'Status Groups View';
    vscode.window.showInformationMessage(`Cascade: Switched to ${modeLabel}`);

    outputChannel.appendLine(`[ViewMode] ✅ View mode changed successfully`);
  }
);
context.subscriptions.push(toggleViewModeCmd);
```

**Code Explanation**:
1. **Guard Clause**: Check if planningTreeProvider exists (defensive programming)
2. **Get Current Mode**: Read current state from provider
3. **Calculate New Mode**: Flip between 'status' and 'hierarchy'
4. **Log Transition**: Output channel shows mode change for debugging
5. **Update Mode**: Call setViewMode() which updates state and refreshes TreeView
6. **User Notification**: Optional message confirming mode change
7. **Register Disposal**: Add to subscriptions for cleanup on deactivation

**Expected Outcome**:
- Command handler registered and functional
- Clicking toolbar button or running from palette switches mode
- Output channel logs mode transitions
- User sees notification confirming change
- TreeView automatically refreshes (handled by S85's setViewMode)

**Reference**: `vscode-extension/src/extension.ts:1353-1361` (existing toggleArchivedCmd)

---

### Task 4: Update Available Commands List

**File**: `vscode-extension/src/extension.ts`

**What to do**: Add new command to the output channel's available commands list.

**Location**: Around line 1392-1401 (available commands list)

**Implementation**:
Add after "Cascade: Toggle Archived Items":

```typescript
outputChannel.appendLine('  - Cascade: Toggle View Mode (toolbar + command palette)');
```

**Expected Outcome**:
- Output channel shows complete list of available commands
- New command documented for users checking logs

**Reference**: `vscode-extension/src/extension.ts:1392-1401` (available commands list)

---

### Task 5: Verify package.json Syntax

**File**: `vscode-extension/package.json`

**What to do**: Ensure JSON syntax is valid after adding contributions.

**Validation Steps**:
1. Run `npm run compile` to check for syntax errors
2. VSCode should show no errors in package.json
3. Verify commas are correct between array items
4. Verify all braces are balanced

**Expected Outcome**:
- No JSON syntax errors
- Extension compiles successfully
- VSCode validates package.json schema

---

## Completion Criteria

- ✅ Command contribution added to package.json
- ✅ View toolbar menu item added to package.json
- ✅ Command handler registered in extension.ts
- ✅ Available commands list updated
- ✅ package.json syntax valid
- ✅ No compilation errors
- ✅ Code follows existing patterns in extension.ts
- ✅ Defensive programming (null checks) included
- ✅ Logging comprehensive for debugging

## Testing Strategy

**Compilation Test**:
```bash
cd vscode-extension
npm run compile
```
Should complete without errors.

**Package Test**:
```bash
cd vscode-extension
npm run package
```
Should create `cascade-0.1.0.vsix` without warnings.

**Manual Verification** (in Phase 2):
- Install extension
- Verify command appears in Command Palette
- Verify toolbar button appears
- Verify clicking button switches mode

## Next Phase

Proceed to **Phase 2: Testing and Validation** after completing all tasks in this phase.

**File**: `tasks/02-testing-validation.md`
