---
spec: S77
phase: 2
title: Command and Button Registration
status: Completed
priority: High
created: 2025-10-23
updated: 2025-10-23
---

# Phase 2: Command and Button Registration

## Overview

This phase registers the toggle command with VSCode and adds a toolbar button to the TreeView header. This creates two user-facing entry points for the toggle functionality:

1. **Command Palette:** "Cascade: Toggle Archived Items"
2. **TreeView Toolbar:** Archive icon button in TreeView header

The command invokes the `toggleArchivedItems()` method implemented in Phase 1, providing a clean separation between UI registration and business logic.

## Prerequisites

- Phase 1 completed (`showArchivedItems` property and `toggleArchivedItems()` method exist)
- Understanding of VSCode command registration pattern
- Familiarity with package.json contribution points

## Tasks

### Task 1: Register Command in extension.ts

**File:** `vscode-extension/src/extension.ts:1350`

**Location:** Add after utility commands (after `revealInExplorerCmd` registration, around line 1349)

**Implementation:**
```typescript
// Register toggle archived items command (S77)
const toggleArchivedCmd = vscode.commands.registerCommand(
  'cascade.toggleArchived',
  () => {
    if (planningTreeProvider) {
      planningTreeProvider.toggleArchivedItems();
    }
  }
);
context.subscriptions.push(toggleArchivedCmd);
```

**Why this location:**
- After utility commands (copyItemNumber, revealInExplorer)
- Before periodic cache statistics setup (clear logical grouping)
- With other command registrations (consistent pattern)

**Key Points:**
- **Command ID:** `cascade.toggleArchived` (matches package.json)
- **Guard check:** `if (planningTreeProvider)` prevents null access
- **Subscription:** Pushed to `context.subscriptions` for cleanup on deactivate
- **Invocation:** Calls `toggleArchivedItems()` method on provider instance

**Expected Outcome:**
- Command registered in VSCode command registry
- Command callable via Command Palette
- No TypeScript errors

**Validation:**
```bash
npm run compile
# Should complete without errors
```

**References:**
- Similar pattern: `refreshCommand` registration at line 1282 (vscode-extension/src/extension.ts:1282)
- VSCode Command API: https://code.visualstudio.com/api/references/vscode-api#commands
- Extension context: `context.subscriptions` pattern used throughout extension.ts

---

### Task 2: Add Command to package.json contributes.commands

**File:** `vscode-extension/package.json:67`

**Location:** Add after existing commands (after `revealInExplorer` command)

**Implementation:**
```json
{
  "command": "cascade.toggleArchived",
  "title": "Toggle Archived Items",
  "category": "Cascade",
  "icon": "$(archive)"
}
```

**Why this structure:**
- **command:** Matches ID used in extension.ts (`cascade.toggleArchived`)
- **title:** Shown in Command Palette ("Cascade: Toggle Archived Items")
- **category:** Groups with other Cascade commands in palette
- **icon:** `$(archive)` Codicon for toolbar button

**Context in package.json:**
```json
"commands": [
  {
    "command": "cascade.refresh",
    "title": "Cascade: Refresh TreeView"
  },
  // ... other commands ...
  {
    "command": "cascade.revealInExplorer",
    "title": "Reveal in Explorer",
    "icon": "$(folder-opened)"
  },
  {
    "command": "cascade.toggleArchived",
    "title": "Toggle Archived Items",
    "category": "Cascade",
    "icon": "$(archive)"
  }
]
```

**Expected Outcome:**
- Command appears in Command Palette when typing "Toggle Archived"
- Command shows as "Cascade: Toggle Archived Items"
- Icon available for toolbar button use

**Validation:**
After packaging and installing:
1. Open Command Palette (Ctrl+Shift+P)
2. Type "Toggle Archived"
3. Verify "Cascade: Toggle Archived Items" appears in results

**References:**
- VSCode Command Contribution: https://code.visualstudio.com/api/references/contribution-points#contributes.commands
- Codicon Reference: https://microsoft.github.io/vscode-codicons/dist/codicon.html
- Existing commands: Lines 34-66 in package.json

---

### Task 3: Add TreeView Toolbar Button to package.json

**File:** `vscode-extension/package.json:76`

**Location:** Add new `view/title` menu section in `contributes.menus` (after `view/item/context`)

**Implementation:**

If `view/title` section does NOT exist yet (likely case):
```json
"menus": {
  "view/item/context": [
    // ... existing context menu items ...
  ],
  "view/title": [
    {
      "command": "cascade.toggleArchived",
      "when": "view == cascadeView",
      "group": "navigation"
    }
  ]
}
```

If `view/title` section already exists (unlikely, but handle gracefully):
Add item to existing array:
```json
"view/title": [
  {
    "command": "cascade.toggleArchived",
    "when": "view == cascadeView",
    "group": "navigation"
  }
]
```

**Key Configuration:**
- **command:** References `cascade.toggleArchived` from contributes.commands
- **when:** `view == cascadeView` ensures button only shows in Cascade TreeView
- **group:** `navigation` places button in TreeView header toolbar (right side)

**Expected Outcome:**
- Archive icon button appears in TreeView header (top-right)
- Button only visible when Cascade TreeView is active
- Button uses `$(archive)` icon from command definition

**Validation Steps:**
1. Package and install extension
2. Open Cascade TreeView (Activity Bar → Cascade icon)
3. Verify archive icon button in TreeView header
4. Hover button → verify tooltip shows "Toggle Archived Items"

**References:**
- VSCode View Title Menus: https://code.visualstudio.com/api/references/contribution-points#contributes.menus
- View Context: https://code.visualstudio.com/api/extension-guides/tree-view#view-actions
- Navigation group: Standard VSCode pattern for toolbar buttons

---

### Task 4: Update Extension Activation Logging

**File:** `vscode-extension/src/extension.ts:1388`

**Location:** Add to command list in activation output (around line 1388, after existing commands)

**Current Code:**
```typescript
outputChannel.appendLine('Available commands:');
outputChannel.appendLine('  - Cascade: Refresh TreeView (manual refresh)');
// ... other commands ...
outputChannel.appendLine('  - Cascade: Reveal in Explorer (context menu)');
```

**Add After Last Command:**
```typescript
outputChannel.appendLine('  - Cascade: Toggle Archived Items (command + toolbar button)');
```

**Expected Outcome:**
- Output channel shows new command in available commands list
- Helps users discover toggle feature
- Documents that both command and button are available

**Validation:**
After extension activation, output channel should show:
```
Available commands:
  - Cascade: Refresh TreeView (manual refresh)
  - Cascade: Open File (internal, triggered by TreeView clicks)
  - Cascade: Show Cache Statistics
  - Cascade: Change Status (context menu)
  - Cascade: Create Child Item (context menu)
  - Cascade: Open File (context menu)
  - Cascade: Copy Item Number (context menu)
  - Cascade: Reveal in Explorer (context menu)
  - Cascade: Toggle Archived Items (command + toolbar button)
```

**References:**
- Extension activation logging: Lines 1380-1397 in extension.ts

---

### Task 5: Compile and Package Extension

**Goal:** Build extension with all changes and prepare for testing

**Steps:**

1. **Compile TypeScript:**
   ```bash
   cd vscode-extension
   npm run compile
   ```

   **Expected Output:**
   ```
   [compilation complete with no errors]
   ```

   **Check for Errors:**
   - No TypeScript errors related to command registration
   - No JSON syntax errors in package.json
   - No missing references to planningTreeProvider

2. **Validate package.json Syntax:**
   ```bash
   # Use VSCode JSON validator or check for syntax highlighting errors
   code package.json
   ```

   **Common Issues:**
   - Missing commas between array items
   - Incorrect nesting of menu sections
   - Typo in view ID (`cascadeView` must match exactly)

3. **Package Extension:**
   ```bash
   npm run package
   ```

   **Expected Output:**
   ```
   DONE  Packaged: D:\projects\lineage\vscode-extension\cascade-0.1.0.vsix
   ```

   **If Errors:**
   - Check package.json for JSON syntax errors
   - Verify all command IDs match between extension.ts and package.json
   - Ensure icon references use valid Codicon IDs

**Validation:**
After successful packaging:
- File exists: `vscode-extension/cascade-0.1.0.vsix`
- File size > 0 KB
- No error messages during packaging

**References:**
- Build script: `vscode-extension/esbuild.js`
- Package script: `vscode-extension/package.json:153` (`"package": "vsce package"`)

---

### Task 6: Install and Test Extension

**Goal:** Verify command and button are registered correctly

**Installation Steps:**

1. **Install VSIX:**
   ```bash
   code --install-extension vscode-extension/cascade-0.1.0.vsix --force
   ```

   **Expected Output:**
   ```
   Extension 'cascade' was successfully installed.
   ```

2. **Reload VSCode Window:**
   - Press `Ctrl+Shift+P`
   - Type "Reload Window"
   - Select "Developer: Reload Window"

3. **Open Output Channel:**
   - Press `Ctrl+Shift+P`
   - Type "Toggle Output"
   - Select "View: Toggle Output"
   - Select "Cascade" from dropdown

**Testing Checklist:**

**Test 1: Command Palette Registration**
1. Open Command Palette (Ctrl+Shift+P)
2. Type "Toggle Archived"
3. Verify command appears: "Cascade: Toggle Archived Items"
4. Press Enter to execute
5. Check output channel for log: `[Archive] Toggled archived items: visible`

**Test 2: Toolbar Button Visibility**
1. Open Cascade TreeView (Activity Bar → Cascade icon)
2. Look at TreeView header (top-right area)
3. Verify archive icon button is visible
4. Hover button
5. Verify tooltip displays: "Toggle Archived Items"

**Test 3: Button Click Functionality**
1. Click archive button in TreeView header
2. Check output channel
3. Verify log: `[Archive] Toggled archived items: [visible/hidden]`
4. Verify TreeView refresh logs appear (from `refresh()` call)

**Test 4: Toggle State Tracking**
1. Start with default state (hidden)
2. Click button → output shows "visible"
3. Click button → output shows "hidden"
4. Click button → output shows "visible"
5. Verify state alternates correctly

**Test 5: Command and Button Equivalence**
1. Click toolbar button
2. Note state in output channel (e.g., "visible")
3. Execute Command Palette command
4. Verify state changes (e.g., "hidden")
5. Both invocation methods should work identically

**Expected Results:**
- ✅ All tests pass
- ✅ No console errors or warnings
- ✅ Output channel shows state changes
- ✅ TreeView refreshes on each toggle

**Troubleshooting:**

**Issue:** Command not appearing in palette
- **Cause:** Command ID mismatch between extension.ts and package.json
- **Fix:** Verify IDs match exactly (`cascade.toggleArchived`)

**Issue:** Button not visible in toolbar
- **Cause:** `when` clause incorrect or missing `view/title` menu
- **Fix:** Check `when: "view == cascadeView"` and menu structure

**Issue:** Button click does nothing
- **Cause:** Command not registered or provider null
- **Fix:** Check command registration in extension.ts, verify guard `if (planningTreeProvider)`

**Issue:** Output channel shows no logs
- **Cause:** Output channel not opened or logging disabled
- **Fix:** Open output channel, select "Cascade" from dropdown

---

## Completion Criteria

Mark this phase complete when:

- ✅ Command registered in extension.ts (line ~1350)
- ✅ Command added to package.json `contributes.commands`
- ✅ TreeView toolbar button added to package.json `view/title` menu
- ✅ Extension activation logging updated with new command
- ✅ TypeScript compilation succeeds
- ✅ Extension packages without errors
- ✅ Extension installs successfully
- ✅ Command appears in Command Palette
- ✅ Toolbar button visible in TreeView header
- ✅ Both invocation methods (command + button) work correctly
- ✅ Output channel logs state changes
- ✅ TreeView refreshes on toggle
- ✅ No console errors or warnings

## Next Phase

**Phase 3: Visual Feedback and Integration**
- Add comprehensive manual testing workflow
- Verify integration with existing features (refresh, status changes)
- Document known limitations (no persistence, no filtering yet)
- Prepare for S78 (Archive Filtering Logic)
