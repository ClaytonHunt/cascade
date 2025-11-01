---
spec: S66
phase: 1
title: Package.json Keybindings
status: Completed
priority: Low
created: 2025-10-17
updated: 2025-10-17
---

# Phase 1: Package.json Keybindings

## Overview

Register keyboard shortcuts in package.json by adding a `contributes.keybindings` section. This phase is purely declarative - no TypeScript code changes required.

Keybindings reference existing command IDs and use `when` clauses to restrict activation to valid contexts (TreeView focused, correct item type selected).

## Prerequisites

- Existing commands registered (S63, S64, S65) ✅
- TreeView with contextValue set on items (S51) ✅
- Understanding of VSCode when clause syntax

## Tasks

### Task 1: Add Keybindings Section to package.json

Open `vscode-extension/package.json` and add the `contributes.keybindings` array after the `contributes.menus` section.

**File**: `vscode-extension/package.json:105` (after `contributes.menus` closing brace)

**Code to Add**:
```json
"keybindings": [
  {
    "command": "cascade.changeStatus",
    "key": "ctrl+shift+s",
    "when": "focusedView == cascadeView && (viewItem == story || viewItem == bug)"
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
```

**Implementation Steps**:
1. Locate the `contributes.menus` section closing brace (line ~104)
2. Add a comma after the closing brace
3. Add the `keybindings` array
4. Ensure proper JSON formatting (commas, brackets)
5. Save file

**When Clause Breakdown**:

| When Clause | Meaning |
|-------------|---------|
| `focusedView == cascadeView` | Cascade TreeView has keyboard focus |
| `viewItem == story` | Selected item's contextValue is "story" |
| `viewItem == bug` | Selected item's contextValue is "bug" |
| `viewItem == epic` | Selected item's contextValue is "epic" |
| `viewItem == feature` | Selected item's contextValue is "feature" |
| `viewItem != status-group` | Selected item is NOT a status group |
| `&&` | Logical AND (all conditions must be true) |
| `\|\|` | Logical OR (either condition can be true) |

**Why These When Clauses?**

1. **Change Status (Ctrl+Shift+S)**:
   - Only Stories and Bugs can change status (per S61/S63 design)
   - Must be in TreeView for shortcut to work
   - Prevents activation on Epics, Features, or Status Groups

2. **Create Child Item (Ctrl+Shift+N)**:
   - Only Epics and Features can create children (per S64 design)
   - Must be in TreeView for shortcut to work
   - Prevents activation on Stories, Bugs, or Status Groups

3. **Copy Item Number (Ctrl+C)**:
   - Works on any planning item (Epic, Feature, Story, Bug)
   - Does NOT work on Status Groups (they don't have item numbers)
   - Scoped to TreeView (doesn't interfere with editor copy)

**Expected Outcome**:
- package.json has valid keybindings section
- No JSON syntax errors
- TypeScript compilation succeeds (npm run compile)

### Task 2: Validate Keybindings Syntax

Run validation checks to ensure keybindings are correctly formatted.

**Validation Steps**:

1. **JSON Syntax Check**:
   ```bash
   npm run compile
   ```
   - Should complete without errors
   - If errors, check for missing commas or brackets

2. **VSCode Schema Validation**:
   - Open package.json in VSCode
   - Check for red squiggly lines (syntax errors)
   - Hover over `contributes.keybindings` to see schema validation
   - Should show: "Contributes keybindings" with no warnings

3. **Key Syntax Verification**:
   - Ensure keys use lowercase: `ctrl+shift+s` (not `Ctrl+Shift+S`)
   - Ensure modifiers in correct order: `ctrl+shift+s` (not `shift+ctrl+s`)
   - Common patterns:
     - Single key: `"key": "f2"`
     - Modifier + key: `"key": "ctrl+c"`
     - Multiple modifiers: `"key": "ctrl+shift+s"`
     - Platform-specific: `"key": "ctrl+c", "mac": "cmd+c"`

4. **When Clause Validation**:
   - Check for typos: `focusedView` (not `focusedview`)
   - Check for typos: `cascadeView` (matches view ID in package.json:71)
   - Check contextValue strings match TreeItem.contextValue:
     - `viewItem == story` (matches PlanningTreeItem contextValue)
     - `viewItem == epic` (matches PlanningTreeItem contextValue)
     - etc.

**Reference Documentation**:
- VSCode Keybindings: https://code.visualstudio.com/api/references/contribution-points#contributes.keybindings
- When Clause Contexts: https://code.visualstudio.com/api/references/when-clause-contexts
- Key Syntax: https://code.visualstudio.com/docs/getstarted/keybindings#_keyboard-rules

**Expected Outcome**:
- No compilation errors
- No VSCode schema warnings
- Keybindings syntax matches VSCode standards
- When clauses reference valid view ID and contextValue strings

## Completion Criteria

- [ ] `contributes.keybindings` section added to package.json
- [ ] All three shortcuts registered (Change Status, Create Child, Copy Item Number)
- [ ] When clauses correctly restrict shortcuts to valid item types
- [ ] JSON syntax valid (no errors in npm run compile)
- [ ] VSCode schema validation passes (no warnings in package.json)
- [ ] Key syntax matches VSCode standards (lowercase, correct modifier order)
- [ ] When clause strings match view ID and contextValue definitions

## Next Phase

Proceed to **Phase 2: Command Parameter Updates** to modify command handlers to support keyboard invocation.

## Notes

**Why No Enter Key Keybinding?**

The story mentions Enter key for opening files, but VSCode TreeViews already handle Enter by default:
- TreeView built-in: Enter → fires `onDidChangeSelection` event
- Our TreeView: Already handles selection (S51) → opens file
- No explicit keybinding needed

If users want explicit Enter handling:
```json
{
  "command": "cascade.openFileContext",
  "key": "enter",
  "when": "focusedView == cascadeView && viewItem != status-group"
}
```

But this is redundant with default behavior and not implemented in this phase.

**Alternative Keyboard Shortcuts**

If users report conflicts with Ctrl+Shift+S (Save All), consider alternatives:
- `F2`: Common rename/edit pattern (good for Change Status)
- `Ctrl+Alt+S`: Less likely conflict
- `Ctrl+Shift+T`: Mnemonic (T for Transition)

Alternative keybindings can be added in future iteration based on user feedback. This phase implements the shortcuts specified in the story (S66).
