---
spec: S63
phase: 1
title: Command Registration and Package.json Updates
status: Completed
priority: High
created: 2025-10-16
updated: 2025-10-16
---

# Phase 1: Command Registration and Package.json Updates

## Overview

This phase establishes the VSCode extension API contract for the "Change Status" context menu action by registering the command and menu contributions in package.json. After completion, the command will appear in the context menu when right-clicking Stories and Bugs in the TreeView.

**Goal**: Register the command in package.json so VSCode knows about it and can display it in context menus.

## Prerequisites

- Understanding of VSCode extension package.json structure
- Familiarity with VSCode command contribution points
- Knowledge of context menu "when" clauses for filtering

## Tasks

### Task 1: Add Command Contribution to package.json

**File**: `vscode-extension/package.json:33-42`

Add the new command to the `contributes.commands` array. This registers the command ID and display properties with VSCode.

**Current State** (package.json:33-42):
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

**Updated State**:
```json
"commands": [
  {
    "command": "cascade.refresh",
    "title": "Cascade: Refresh TreeView"
  },
  {
    "command": "cascade.showCacheStats",
    "title": "Cascade: Show Cache Statistics"
  },
  {
    "command": "cascade.changeStatus",
    "title": "Change Status",
    "icon": "$(edit)"
  }
]
```

**Field Explanations**:
- `command`: Unique identifier for the command (used in registerCommand and menu bindings)
- `title`: Display text shown in context menu
- `icon`: Codicon reference (optional, shown if menu has icon space)

**Reference**: VSCode Extension API - Command Contribution
https://code.visualstudio.com/api/references/contribution-points#contributes.commands

### Task 2: Add Context Menu Contribution

Add a new `menus` section to package.json (if it doesn't exist) or extend the existing one. This binds the command to the TreeView context menu with filtering.

**Location**: After `contributes.views` section (package.json:43-50)

**Add This Section**:
```json
"menus": {
  "view/item/context": [
    {
      "command": "cascade.changeStatus",
      "when": "view == cascadeView && (viewItem == story || viewItem == bug)",
      "group": "1_modification@1"
    }
  ]
}
```

**Field Explanations**:
- `view/item/context`: Contribution point for TreeView context menus
- `command`: References the command ID from contributes.commands
- `when`: Boolean expression that controls visibility
  - `view == cascadeView`: Only show in Cascade TreeView (not other views)
  - `viewItem == story || viewItem == bug`: Only show for Stories and Bugs
  - `viewItem` matches the `contextValue` field set in PlanningTreeProvider.ts:328
- `group`: Controls menu item position
  - `1_modification`: Standard group for modification actions
  - `@1`: Position within group (lower numbers appear first)

**Context Value Mapping** (set in PlanningTreeProvider.ts:328):
- Stories: `contextValue = 'story'`
- Bugs: `contextValue = 'bug'`
- Epics: `contextValue = 'epic'` (not matched by when clause)
- Features: `contextValue = 'feature'` (not matched by when clause)
- Status Groups: `contextValue = 'status-group'` (not matched by when clause)

**Reference**: VSCode Extension API - Menu Contribution
https://code.visualstudio.com/api/references/contribution-points#contributes.menus

### Task 3: Verify JSON Syntax

After editing package.json, verify JSON syntax is valid to prevent extension loading errors.

**Validation Steps**:
1. Check for missing commas between sections
2. Verify all brackets and braces are balanced
3. Ensure no trailing commas in arrays/objects
4. Use VSCode's built-in JSON validation (red squiggles)

**Common Errors to Avoid**:
- Missing comma after `contributes.views` closing brace
- Missing comma between command objects in array
- Trailing comma after last command in array

### Task 4: Compile and Package Extension

Compile TypeScript and package the extension as VSIX for installation testing.

**Commands**:
```bash
cd vscode-extension
npm run compile
npm run package
```

**Expected Output**:
```
Compiling TypeScript...
✓ Compilation successful

Packaging extension...
✓ cascade-0.1.0.vsix created
```

**Troubleshooting**:
- If compilation fails, check TypeScript errors in output
- If packaging fails, verify package.json is valid JSON
- If command not found, ensure `@vscode/vsce` is installed: `npm install -g @vscode/vsce`

### Task 5: Install Extension and Verify Command Registration

Install the packaged extension and verify the command appears in the context menu.

**Installation**:
```bash
code --install-extension cascade-0.1.0.vsix --force
```

**Verification Steps**:
1. Reload VSCode window: Ctrl+Shift+P → "Developer: Reload Window"
2. Open Cascade TreeView (Activity Bar → Cascade icon)
3. Expand a status group containing Stories or Bugs
4. Right-click on a Story
5. Verify "Change Status" appears in context menu

**Expected Output Channel Logs** (Output → Cascade):
```
[Activation logs showing extension loaded]
✅ TreeView registered with PlanningTreeProvider
   Drag-and-drop: Enabled for Stories and Bugs
```

**Manual Verification Checklist**:
- [ ] Right-click Story → "Change Status" visible
- [ ] Right-click Bug → "Change Status" visible
- [ ] Right-click Epic → "Change Status" NOT visible
- [ ] Right-click Feature → "Change Status" NOT visible
- [ ] Right-click Status Group → "Change Status" NOT visible

**Note**: Clicking "Change Status" will do nothing at this phase because the command handler is not implemented yet. This is expected behavior - we're only verifying the menu item appears.

## Completion Criteria

- ✅ package.json updated with command contribution
- ✅ package.json updated with menu contribution
- ✅ JSON syntax validated (no errors)
- ✅ Extension compiled successfully
- ✅ Extension packaged as VSIX
- ✅ Extension installed and activated
- ✅ "Change Status" appears in context menu for Stories and Bugs
- ✅ "Change Status" hidden for Epics, Features, Status Groups

## Output Artifacts

- Modified `vscode-extension/package.json`
- Compiled extension: `vscode-extension/dist/extension.js`
- Packaged VSIX: `vscode-extension/cascade-0.1.0.vsix`

## Next Phase

Proceed to **Phase 2: Command Implementation with Status Transition Logic** to implement the command handler that shows the quick pick menu and updates file status.

## Troubleshooting

### Command Not Appearing in Context Menu

**Symptom**: Right-click on Story shows no "Change Status" option

**Possible Causes**:
1. Extension not reloaded after installation → Reload window
2. `when` clause incorrect → Verify `viewItem == story || viewItem == bug`
3. `contextValue` not set → Check PlanningTreeProvider.ts:328
4. Wrong view → Verify `view == cascadeView` in when clause

**Debugging**:
- Open Output → Cascade and check for activation errors
- Check Developer Tools: Ctrl+Shift+P → "Developer: Toggle Developer Tools"
- Verify command registered: Check Extensions view → Cascade → Feature Contributions

### JSON Validation Errors

**Symptom**: Extension fails to activate with "Invalid package.json" error

**Possible Causes**:
1. Missing comma between sections
2. Trailing comma in array/object
3. Unbalanced brackets/braces

**Solution**:
- Use VSCode's built-in JSON validation (red squiggles)
- Copy JSON to online validator (jsonlint.com)
- Restore from git if corrupted: `git checkout vscode-extension/package.json`
