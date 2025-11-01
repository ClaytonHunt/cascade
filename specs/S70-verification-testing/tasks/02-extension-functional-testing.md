---
spec: S70
phase: 2
title: Extension Functional Testing (Manual Testing)
status: Completed
priority: Low
created: 2025-10-23
updated: 2025-10-23
---

# Phase 2: Extension Functional Testing (Manual Testing)

## Overview

Install the Cascade extension locally and execute comprehensive manual testing to verify all TreeView features work correctly after decoration removal. This phase confirms that S67/S68/S69 did not introduce regressions in core functionality.

**Approach:** Package extension as VSIX, install in current VSCode instance, and systematically test all TreeView features using the checklist from the S70 story description. Verify File Explorer shows no status decorations.

**Duration:** ~30 minutes

## Prerequisites

- Phase 1 completed with PASS result (no decoration code found)
- VSCode installed and accessible via `code` command
- Node.js and npm available for packaging
- Extension source code compiled at `vscode-extension/dist/extension.js`

## Tasks

### Task 1: Package and Install Extension

**Objective:** Create VSIX package and install extension locally

**Steps:**

1. Navigate to extension directory:
   ```bash
   cd vscode-extension
   ```

2. Ensure extension is compiled:
   ```bash
   npm run compile
   ```

3. Package extension as VSIX:
   ```bash
   npm run package
   ```

4. Verify VSIX file created:
   ```bash
   ls -la cascade-0.1.0.vsix
   ```

5. Install extension in current VSCode instance:
   ```bash
   code --install-extension cascade-0.1.0.vsix --force
   ```

6. Expected output: "Extension 'cascade' was successfully installed!"

7. Reload VSCode window:
   - Press Ctrl+Shift+P
   - Type "Developer: Reload Window"
   - Press Enter

**Expected Outcome:** Extension installed and VSCode reloaded

**Validation:**
- VSIX file exists at `vscode-extension/cascade-0.1.0.vsix`
- Installation command succeeds
- VSCode reloads without errors

**References:**
- CLAUDE.md:146-158 - VSCode Extension Testing workflow
- package.json:153 - Package script configuration

---

### Task 2: Verify Extension Activation

**Objective:** Confirm extension activates successfully without decoration errors

**Steps:**

1. Open Cascade output channel:
   - Press Ctrl+Shift+P
   - Type "View: Toggle Output"
   - Select "Cascade" from dropdown

2. Review activation logs:
   - Look for "Extension features initialized successfully" message
   - Verify NO "File Decoration Provider" section
   - Verify "Cascade TreeView" section present
   - Check for any error messages

3. Expected log structure:
   ```
   ======================================
   Extension features initialized successfully!
   ======================================

   [Workspace Detection]
   🔍 Analyzing workspace folders...
   ✅ D:\projects\lineage (has plans/ and specs/)

   [Cascade TreeView]
   ✅ PlanningTreeProvider registered
   ✅ TreeView created (ID: cascadeView)
   ✅ Drag-and-drop enabled

   [File System Watcher]
   ✅ Watching: **/*.md files in plans/ and specs/
   ```

4. Verify NO decoration-related logs:
   - ❌ "File Decoration Provider registered"
   - ❌ "PlansDecorationProvider"
   - ❌ "Status decorations enabled"

**Expected Outcome:** Extension activates without decoration references

**Validation:**
- Activation log shows "Extension features initialized successfully!"
- TreeView section present in log
- No decoration provider section in log
- No error messages in output channel

**References:**
- S69 Story: Updated activation logging to remove decoration references
- extension.ts:96-170 - Activation logging implementation

---

### Task 3: TreeView Rendering Test

**Objective:** Verify Cascade TreeView displays all items with correct icons

**Steps:**

1. Open Cascade TreeView:
   - Click Activity Bar (left sidebar)
   - Click Cascade icon (tree/hierarchy icon)

2. Verify status groups display:
   - Not Started (circle-outline, gray)
   - In Planning (sync, yellow)
   - Ready (debug-start, green)
   - In Progress (gear, blue)
   - Blocked (warning, red)
   - Completed (pass, green checkmark)

3. Expand "Not Started" status group:
   - Click expand arrow next to "Not Started"
   - Verify items display with format: "S70 - Verification Testing and Documentation"
   - Verify icon matches status (circle-outline, gray)

4. Expand an Epic item (if present):
   - Click expand arrow next to Epic item
   - Verify child Features display
   - Verify hierarchy indentation correct

5. Expand a Feature item (if present):
   - Click expand arrow next to Feature item
   - Verify child Stories/Bugs display
   - Verify leaf nodes (Stories/Bugs) have no expand arrow

6. Check progress indicators (if Epics/Features present):
   - Verify Epic shows "(X/Y)" progress in description
   - Verify Feature shows completion percentage or count
   - Verify numbers match child item completion

**Expected Outcome:** TreeView renders correctly with all items and icons

**Validation:**
- All 6 status groups visible
- Status groups display correct icons and colors
- Items expand/collapse correctly
- Hierarchy indentation proper (Epic → Feature → Story/Bug)
- Progress indicators accurate

**References:**
- S54 Story: Status group implementation
- S55 Story: Hierarchy builder implementation
- PlanningTreeProvider.ts:94-150 - TreeDataProvider core

---

### Task 4: File Explorer Verification Test

**Objective:** Verify File Explorer shows NO status decorations on planning files

**Steps:**

1. Open File Explorer:
   - Click Activity Bar (left sidebar)
   - Click Explorer icon (files icon)

2. Navigate to plans/ directory:
   - Expand `plans/` folder in tree
   - Expand an epic folder (e.g., `epic-04-planning-kanban-view/`)
   - Expand a feature folder (e.g., `feature-21-remove-file-decoration/`)

3. Verify NO decorations on .md files:
   - ❌ No status badges on file names (e.g., "✓ story-70-verification-testing.md")
   - ❌ No status colors applied to file names
   - ✅ Files show default VSCode appearance (icon + name only)

4. Compare to TreeView:
   - Open Cascade TreeView side-by-side with File Explorer
   - Verify same file shows status icon in TreeView
   - Verify same file shows NO status badge in File Explorer

5. Test multiple file types:
   - Check Epic files (epic.md)
   - Check Feature files (feature.md)
   - Check Story files (story-*.md)
   - Check Bug files (bug-*.md)

**Expected Outcome:** File Explorer shows default appearance, no decorations

**Validation:**
- No status badges visible on planning files in File Explorer
- No status colors applied to file names
- TreeView and File Explorer show different visualizations (expected)
- Only TreeView shows status indicators

**References:**
- S67 Story: Removed PlansDecorationProvider (no longer providing decorations to File Explorer)
- VSCode API: FileDecorationProvider no longer registered

---

### Task 5: Context Menu Actions Test

**Objective:** Verify all context menu actions work correctly in TreeView

**Steps:**

1. Test "Change Status" action (Stories/Bugs only):
   - Right-click a Story item in TreeView (e.g., S70)
   - Verify "Change Status" appears in context menu
   - Click "Change Status"
   - Verify quick pick menu displays with valid status options
   - Select new status (e.g., "In Progress")
   - Verify file frontmatter updated
   - Verify TreeView refreshes and item moves to new status group

2. Test "Create Child Item" action (Epics/Features only):
   - Right-click an Epic or Feature item in TreeView
   - Verify "Create Child Item" appears in context menu
   - Click "Create Child Item"
   - Verify input prompt appears asking for item title
   - Enter test title: "Test Child Item"
   - Verify new child file created
   - Verify TreeView refreshes and shows new item

3. Test "Open File" action (all items):
   - Right-click any planning item in TreeView
   - Verify "Open File" appears in context menu
   - Click "Open File"
   - Verify markdown file opens in editor
   - Verify correct file opened (check frontmatter item number)

4. Test "Copy Item Number" action (all items):
   - Right-click a Story item in TreeView (e.g., S70)
   - Verify "Copy Item Number" appears in context menu
   - Click "Copy Item Number"
   - Open a text editor and paste (Ctrl+V)
   - Verify clipboard contains "S70" (item number only)

5. Test "Reveal in Explorer" action (all items):
   - Right-click any planning item in TreeView
   - Verify "Reveal in Explorer" appears in context menu
   - Click "Reveal in Explorer"
   - Verify File Explorer opens and highlights the file
   - Verify correct file highlighted

**Expected Outcome:** All context menu actions work correctly

**Validation:**
- Change Status transitions item and updates file
- Create Child Item creates new file and refreshes TreeView
- Open File opens correct markdown file
- Copy Item Number copies item number to clipboard
- Reveal in Explorer highlights file in File Explorer
- No errors in output channel during actions

**References:**
- package.json:33-103 - Command contributions and context menu configuration
- extension.ts:200-450 - Command handler implementations

---

### Task 6: Drag-and-Drop Workflow Test

**Objective:** Verify drag-and-drop status transitions work correctly

**Steps:**

1. Prepare test environment:
   - Open Cascade TreeView
   - Expand "Ready" status group
   - Expand "In Progress" status group
   - Identify a Story item in "Ready" group (e.g., S70 if marked Ready)

2. Execute drag operation:
   - Click and hold on Story item in "Ready" group
   - Drag cursor towards "In Progress" status group header
   - Verify drag cursor shows item label while dragging
   - Verify drop indicator appears on status group

3. Execute drop operation:
   - Release mouse button over "In Progress" status group header
   - Wait for TreeView to refresh

4. Verify results:
   - Check output channel for drag-and-drop event logs:
     ```
     [DragDrop] Drag started: S70 - Verification Testing and Documentation
       Status: Ready
       Type: story

     [DragDrop] Drop received:
       Item: S70 - Verification Testing and Documentation
       Source status: Ready
       Target status: In Progress
       File: D:\projects\lineage\plans\...\story-70-verification-testing.md
     [DragDrop] ✅ Status updated successfully
     ```
   - Verify item moved from "Ready" to "In Progress" group in TreeView
   - Verify file frontmatter updated:
     - `status: In Progress`
     - `updated:` timestamp changed

5. Test invalid transition (should show error):
   - Drag Story from "In Progress" to "Completed"
   - Verify warning notification appears:
     ```
     ⚠️ Cannot move S70 from "In Progress" to "Completed". Valid transitions: Blocked
     ```

**Expected Outcome:** Drag-and-drop workflow transitions items correctly

**Validation:**
- Valid drag-and-drop updates file and moves item
- TreeView refreshes automatically after drop
- Output channel logs drag-and-drop events
- Invalid transitions show warning notification
- File frontmatter updated correctly

**References:**
- S60 Story: Drag-and-drop controller implementation
- S61 Story: Status update and file persistence
- S62 Story: Visual feedback and notifications
- PlanningDragAndDropController.ts:1-250 - Drag-and-drop implementation

---

### Task 7: Keyboard Shortcuts Test

**Objective:** Verify keyboard shortcuts execute TreeView actions correctly

**Steps:**

1. Test "Change Status" shortcut (Ctrl+Shift+S):
   - Click on Story item in TreeView to select it
   - Press Ctrl+Shift+S
   - Verify quick pick menu appears with status options
   - Press Escape to cancel (or select a status to test full workflow)

2. Test "Create Child Item" shortcut (Ctrl+Shift+N):
   - Click on Epic or Feature item in TreeView to select it
   - Press Ctrl+Shift+N
   - Verify input prompt appears asking for item title
   - Press Escape to cancel (or enter title to test full workflow)

3. Test "Copy Item Number" shortcut (Ctrl+C):
   - Click on Story item in TreeView to select it (e.g., S70)
   - Press Ctrl+C
   - Open text editor and paste (Ctrl+V)
   - Verify clipboard contains "S70"

4. Test shortcuts only trigger when TreeView focused:
   - Click in File Explorer (defocus TreeView)
   - Press Ctrl+Shift+S
   - Verify action does NOT trigger (no quick pick menu)
   - Click back in TreeView
   - Press Ctrl+Shift+S
   - Verify action triggers correctly

**Expected Outcome:** Keyboard shortcuts work when TreeView focused

**Validation:**
- Ctrl+Shift+S opens Change Status quick pick (Stories/Bugs only)
- Ctrl+Shift+N opens Create Child Item input (Epics/Features only)
- Ctrl+C copies item number to clipboard
- Shortcuts only trigger when TreeView has focus
- No conflicts with VSCode default shortcuts

**References:**
- package.json:105-121 - Keybinding contributions with "when" clauses

---

### Task 8: Real-Time Synchronization Test

**Objective:** Verify TreeView refreshes automatically when files change externally

**Steps:**

1. Prepare test environment:
   - Open Cascade TreeView
   - Expand "Not Started" status group
   - Identify a Story item (e.g., S70)
   - Note its current position in TreeView

2. Edit file frontmatter manually:
   - Right-click Story item in TreeView
   - Click "Open File"
   - Change frontmatter status:
     ```yaml
     status: In Progress  # Changed from "Not Started"
     ```
   - Save file (Ctrl+S)

3. Wait for file watcher debounce delay (300ms default)

4. Verify automatic refresh:
   - Check output channel for file change event:
     ```
     [FileWatcher] File changed: story-70-verification-testing.md
     [ItemsCache] Cache invalidated (file change)
     [TreeView] Refreshing...
     ```
   - Verify item disappeared from "Not Started" group
   - Verify item appeared in "In Progress" group
   - Verify TreeView did not flicker (smooth transition)

5. Test multi-file changes:
   - Edit 3 different story files rapidly (within 300ms)
   - Save all files
   - Verify TreeView refreshes ONCE after debounce delay (not 3 times)
   - Verify all changes reflected in TreeView

**Expected Outcome:** TreeView synchronizes automatically with file changes

**Validation:**
- File changes detected by FileSystemWatcher
- TreeView refreshes after debounce delay (300ms)
- Items move to correct status groups
- Multi-file changes batched (single refresh)
- No UI flicker during refresh
- Output channel logs file change events

**References:**
- S38 Story: File System Watcher implementation
- extension.ts:45-50 - Debounce delay configuration
- FileSystemWatcher pattern: `**/*.md` in plans/ and specs/

---

## Completion Criteria

Phase 2 is complete when:

- All 8 tasks executed successfully
- Extension activates without errors
- TreeView renders correctly with status icons
- File Explorer shows NO status decorations
- All context menu actions work correctly
- Drag-and-drop workflow functions correctly
- Keyboard shortcuts execute when TreeView focused
- Real-time synchronization works for file changes
- No errors logged in output channel during testing
- No errors logged in DevTools console

**Success Metrics:**
- Extension activation: PASS
- TreeView rendering: PASS
- File Explorer verification: PASS (no decorations)
- Context menu actions: 5/5 PASS
- Drag-and-drop workflow: PASS
- Keyboard shortcuts: 3/3 PASS
- Real-time synchronization: PASS

**Failure Handling:**
If any test fails:
1. Document failure with screenshots/logs
2. Investigate if S67/S68/S69 introduced regression
3. Report specific failure details (which action, what error)
4. Fix regression before marking Phase 2 complete

## Next Phase

After Phase 2 completes successfully:

**Proceed to Phase 3: Documentation Verification and Updates**
- Review CLAUDE.md for stale decoration references
- Update vscode-extension/README.md feature descriptions
- Create CHANGELOG.md to document F21 removal (optional)
- Verify all documentation accurate

If Phase 2 fails:
- Fix identified regressions in extension code
- Re-run Phase 2 functional tests
- Only proceed to Phase 3 after all tests PASS
