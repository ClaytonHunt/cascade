---
spec: S65
phase: 1
title: Package.json Configuration
status: Completed
priority: Medium
created: 2025-10-17
updated: 2025-10-17
---

# Phase 1: Package.json Configuration

## Overview

Register three new commands in package.json and configure context menu items with proper grouping and visibility rules. This phase establishes the VSCode command infrastructure that Phase 2 will implement.

## Prerequisites

- Understanding of VSCode package.json structure
- Familiarity with command registration patterns
- Knowledge of context menu configuration (when clauses, groups)

## Tasks

### Task 1: Add Command Definitions

**Location**: `vscode-extension/package.json:33-51` (after existing commands)

Add three new command definitions to the `contributes.commands` array:

```json
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
```

**Implementation Notes**:
- Commands use VSCode icon syntax (`$(icon-name)`)
- Icons match semantic meaning (go-to-file, clippy, folder-opened)
- Command IDs follow extension naming convention: `cascade.<actionName>`

**Validation**:
- JSON syntax is valid (no trailing commas)
- Commands added inside `contributes.commands` array
- All three commands present with correct IDs

**References**:
- VSCode icons: https://code.visualstudio.com/api/references/icons-in-labels
- Existing commands: package.json:33-51

---

### Task 2: Configure Context Menu Items

**Location**: `vscode-extension/package.json:61-73` (inside `menus.view/item/context`)

Add three new context menu items to the `view/item/context` menu array:

```json
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
```

**Implementation Notes**:

**When Clause Breakdown**:
- `view == cascadeView` - Only show in Cascade TreeView (not other views)
- `viewItem != status-group` - Hide for status groups (only show for planning items)
- Combined with `&&` - Both conditions must be true

**Group Numbering**:
- Group 1 (`1_modification`): Change Status, Create Child Item (already exists)
- Group 2 (`2_navigation`): Open File (new, creates separator)
- Group 3 (`3_utils`): Copy Item Number, Reveal in Explorer (new, creates separator)
- `@1` and `@2` control order within group

**Expected Context Menu Structure**:
```
Change Status               (group 1_modification@1)
Create Child Item           (group 1_modification@2)
────────────────────────    (separator)
Open File                   (group 2_navigation@1)
────────────────────────    (separator)
Copy Item Number            (group 3_utils@1)
Reveal in Explorer          (group 3_utils@2)
```

**Validation**:
- JSON syntax valid (no trailing commas)
- When clauses correct (view check AND viewItem check)
- Group numbers create correct separators
- All three menu items present

**References**:
- VSCode when clause contexts: https://code.visualstudio.com/api/references/when-clause-contexts
- Existing menu items: package.json:62-73

---

### Task 3: Verify Package.json Validity

Run npm commands to validate package.json structure:

```bash
cd vscode-extension
npm run compile
```

**Expected Outcome**:
- No JSON parse errors
- TypeScript compilation succeeds
- No warnings about invalid command IDs or menu configurations

**Troubleshooting**:
- If JSON parse error → Check for trailing commas, missing brackets
- If command registration error → Verify command IDs match between commands and menus
- If compilation fails → Check if existing code still compiles (no breaking changes)

**Validation**:
- `npm run compile` exits with code 0 (success)
- Output shows: "Compiled successfully" or similar
- No error messages in terminal

---

## Completion Criteria

- [ ] Three commands registered in `contributes.commands`
- [ ] Three menu items added to `view/item/context`
- [ ] When clauses correctly hide actions from status groups
- [ ] Group numbers create three visual sections (1_modification, 2_navigation, 3_utils)
- [ ] JSON syntax valid (no parse errors)
- [ ] npm run compile succeeds without errors
- [ ] Package.json follows existing formatting conventions (indentation, spacing)

## Testing

**Test Package.json Configuration**:
1. Save package.json
2. Run `npm run compile` in vscode-extension directory
3. Verify no errors or warnings
4. Package extension: `npm run package`
5. Install extension: `code --install-extension cascade-0.1.0.vsix --force`
6. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
7. Right-click on any Story in TreeView
8. Verify context menu shows new actions (Open File, Copy Item Number, Reveal in Explorer)
9. Verify actions NOT visible when right-clicking status group

**Expected Behavior**:
- Context menu shows all three new actions
- Actions grouped with visual separators
- Commands show icons next to labels
- Commands do nothing when clicked (Phase 2 will implement handlers)

**Edge Cases**:
- Right-click status group → New actions hidden ✅
- Right-click Story → All actions visible ✅
- Right-click Bug → All actions visible ✅
- Right-click Epic → Only some actions visible (based on existing when clauses) ✅

## Next Phase

Proceed to Phase 2: Command Implementation
- Implement three command handler functions in extension.ts
- Register command handlers in activate() function
- Add error handling and output channel logging
