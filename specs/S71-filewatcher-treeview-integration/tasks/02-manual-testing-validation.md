---
spec: S71
phase: 2
title: Manual Testing and Validation
status: Completed
priority: High
created: 2025-10-17
updated: 2025-10-22
---

# Phase 2: Manual Testing and Validation

## Overview

Perform comprehensive manual testing of the FileSystemWatcher → PlanningTreeProvider integration across all file change scenarios. This phase validates that the integration works correctly in real-world usage and meets all acceptance criteria from the story.

## Prerequisites

- Phase 1 completed (code review and verification)
- Extension installed and running in VSCode
- Cascade TreeView visible in Activity Bar
- Output Channel open (View → Output → "Cascade")
- Test planning files available in `plans/` directory

## Tasks

### Task 1: Setup Test Environment

**Preparation Steps:**

1. **Install Latest Extension Build**:
```bash
cd vscode-extension
npm run package
code --install-extension cascade-0.1.0.vsix --force
```

2. **Reload VSCode Window**:
   - Press `Ctrl+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter

3. **Open Cascade TreeView**:
   - Click Cascade icon in Activity Bar (left sidebar)
   - Verify TreeView populates with planning items
   - Expand status groups to see current items

4. **Open Output Channel**:
   - Press `Ctrl+Shift+P`
   - Type "View: Toggle Output"
   - Select "Cascade" from dropdown
   - Clear output: Right-click → "Clear Output"

5. **Identify Test File**:
   - Choose existing story for testing (e.g., `story-49-core.md`)
   - Note current status in TreeView (e.g., "Ready")
   - Open file in external editor (Notepad++, VS Code text editor tab, etc.)

**Expected Outcome**: Test environment ready, TreeView showing current state, Output Channel cleared and visible.

---

### Task 2: Test File Modification (Status Change)

**Test Scenario**: User edits planning file externally, changes status, TreeView should update automatically.

**Steps:**

1. **Identify Target Item**:
   - Find item in TreeView (e.g., "S49 - TreeDataProvider Core Implementation")
   - Note current status (e.g., "Ready")
   - Note current status group (e.g., "Ready (5)")

2. **Edit File Externally**:
   - Open file in external text editor (Notepad++, Sublime, etc.)
   - Or: Open in VS Code text editor (separate from TreeView)
   - Change frontmatter status:
     ```yaml
     ---
     status: Ready
     ---
     ```
     To:
     ```yaml
     ---
     status: In Progress
     ---
     ```

3. **Save File**:
   - Save changes (Ctrl+S or File → Save)
   - Observe Output Channel
   - Wait up to 1 second

4. **Verify TreeView Update**:
   - [ ] Output Channel shows `FILE_CHANGED` event (within 300ms of save)
   - [ ] Output Channel shows `REFRESH: TreeView updated (file changed)` event
   - [ ] Output Channel shows cache clearing events:
     ```
     [ItemsCache] Cache cleared
     [Hierarchy] Cache cleared
     [Progress] Cache cleared
     ```
   - [ ] TreeView automatically refreshes (no manual refresh needed)
   - [ ] Item moved from "Ready" status group to "In Progress" status group
   - [ ] Item still shows correct title and item number
   - [ ] Status group counts updated ("Ready (4)", "In Progress (2)")

5. **Verify Timing**:
   - [ ] Time from save to TreeView update is < 1 second
   - [ ] No lag or performance issues
   - [ ] TreeView remains responsive during refresh

**Expected Outcome**: TreeView automatically updates within 1 second, item moves to correct status group, no manual refresh required.

---

### Task 3: Test File Modification (Title Change)

**Test Scenario**: User edits planning file title, TreeView should update label.

**Steps:**

1. **Edit File**:
   - Open planning file in editor
   - Change frontmatter title:
     ```yaml
     title: TreeDataProvider Core Implementation
     ```
     To:
     ```yaml
     title: TreeDataProvider Core Implementation (Updated)
     ```

2. **Save and Verify**:
   - Save file (Ctrl+S)
   - Observe TreeView
   - [ ] TreeView updates label to include "(Updated)"
   - [ ] Item stays in same status group
   - [ ] Output Channel confirms FILE_CHANGED and REFRESH events

**Expected Outcome**: TreeView label updates to reflect new title automatically.

---

### Task 4: Test File Creation

**Test Scenario**: User creates new planning file, TreeView should show new item.

**Steps:**

1. **Create New File**:
   - Navigate to `plans/epic-04-planning-kanban-view/feature-20-realtime-synchronization/`
   - Create new file: `story-99-test-creation.md`
   - Add frontmatter:
     ```markdown
     ---
     item: S99
     title: Test Story Creation
     type: story
     status: Not Started
     priority: Medium
     dependencies: []
     created: 2025-10-17
     updated: 2025-10-17
     ---

     # S99 - Test Story Creation

     Test story for file creation detection.
     ```

2. **Save and Verify**:
   - Save file (Ctrl+S)
   - Observe TreeView and Output Channel
   - [ ] Output Channel shows `FILE_CREATED` event
   - [ ] Output Channel shows `REFRESH: TreeView updated (new file)` event
   - [ ] TreeView automatically refreshes
   - [ ] New item appears in "Not Started" status group
   - [ ] Label shows "S99 - Test Story Creation"
   - [ ] Item is clickable and opens file
   - [ ] "Not Started" count incremented (e.g., "Not Started (6)")

3. **Test Hierarchy**:
   - Expand "Not Started" status group (if collapsed)
   - Expand "Epic 04" (if present)
   - Expand "Feature 20" (if present)
   - [ ] S99 appears under correct parent (Feature 20)
   - [ ] Hierarchy structure is correct

**Expected Outcome**: New file appears in TreeView automatically within 1 second, correct status group and hierarchy.

---

### Task 5: Test File Deletion

**Test Scenario**: User deletes planning file, TreeView should remove item.

**Steps:**

1. **Delete Test File**:
   - Locate `story-99-test-creation.md` in file system
   - Delete file (Right-click → Delete or `rm` command)
   - Or: Use VS Code File Explorer (Right-click → Delete)

2. **Verify Removal**:
   - Observe TreeView and Output Channel
   - [ ] Output Channel shows `FILE_DELETED` event
   - [ ] Output Channel shows `REFRESH: TreeView updated (file deleted)` event
   - [ ] TreeView automatically refreshes
   - [ ] S99 item removed from TreeView
   - [ ] "Not Started" count decremented (e.g., "Not Started (5)")
   - [ ] No errors or warnings in Output Channel
   - [ ] TreeView remains functional

**Expected Outcome**: Deleted file removed from TreeView automatically within 1 second, no errors.

---

### Task 6: Test File Rename

**Test Scenario**: User renames planning file, TreeView should detect as delete + create.

**Steps:**

1. **Rename File**:
   - Locate test planning file (e.g., `story-49-core.md`)
   - Rename to `story-49-core-renamed.md`
   - File content unchanged

2. **Verify TreeView Behavior**:
   - Observe Output Channel
   - [ ] Output Channel shows `FILE_DELETED` event for old name
   - [ ] Output Channel shows `FILE_CREATED` event for new name
   - [ ] Output Channel shows two REFRESH events (or one debounced event)
   - [ ] Old item removed from TreeView
   - [ ] New item added to TreeView (if frontmatter still valid)
   - [ ] Item stays in same status group
   - [ ] No errors or warnings

3. **Rename Back**:
   - Rename file back to original name
   - [ ] TreeView updates correctly
   - [ ] No duplicate items or stale entries

**Expected Outcome**: Rename detected as delete + create, TreeView updates correctly with both events.

---

### Task 7: Test Debouncing with Rapid Edits

**Test Scenario**: User makes multiple rapid edits (auto-save enabled), TreeView should refresh only once after edits stop.

**Steps:**

1. **Enable Auto-Save**:
   - File → Auto Save (enable)
   - Or: Settings → "Files: Auto Save" → "afterDelay" (200ms)

2. **Make Rapid Edits**:
   - Open planning file in VS Code editor
   - Edit frontmatter repeatedly over 2 seconds:
     - Change status: `Ready` → `In Progress`
     - Change priority: `Medium` → `High`
     - Change title: `Test` → `Test Updated`
   - Stop editing and wait 500ms

3. **Verify Debouncing**:
   - Review Output Channel
   - [ ] Multiple FILE_CHANGED events logged (one per auto-save)
   - [ ] **Only ONE** REFRESH event logged (after 300ms silence)
   - [ ] TreeView refreshes only once (not after every auto-save)
   - [ ] Final state matches last edit (all changes reflected)
   - [ ] No performance lag or UI freezing

**Expected Output** (example with 5 auto-saves):
```
[14:23:45.123] FILE_CHANGED: plans/.../story-49.md
[14:23:45.456] FILE_CHANGED: plans/.../story-49.md
[14:23:45.789] FILE_CHANGED: plans/.../story-49.md
[14:23:46.012] FILE_CHANGED: plans/.../story-49.md
[14:23:46.234] FILE_CHANGED: plans/.../story-49.md
[14:23:46.534] REFRESH: TreeView updated (file changed)  ← Single refresh after 300ms
[ItemsCache] Cache cleared
[Hierarchy] Cache cleared
[Progress] Cache cleared
```

**Expected Outcome**: Debouncing works correctly, batching multiple rapid changes into single refresh after 300ms silence.

---

### Task 8: Test Multi-File Changes (Batch Operations)

**Test Scenario**: User modifies multiple files simultaneously (e.g., git pull), TreeView should handle batch refresh.

**Steps:**

1. **Modify Multiple Files**:
   - Use git or batch script to modify multiple planning files simultaneously
   - Example: Change status of 3 stories from "Ready" to "In Progress"
   - Or: Edit 3 files manually in quick succession (< 300ms between saves)

2. **Verify Batch Handling**:
   - Observe Output Channel
   - [ ] Multiple FILE_CHANGED events logged (one per file)
   - [ ] Events are debounced (300ms delay per file)
   - [ ] REFRESH events may be batched (if changes within debounce window)
   - [ ] All changes reflected in final TreeView state
   - [ ] No missing updates or stale items
   - [ ] Performance acceptable (< 1 second for 3 files)

**Expected Outcome**: Multiple file changes handled correctly, debouncing prevents excessive refreshes, all changes reflected.

---

### Task 9: Test Edge Cases

**Test Scenario**: Validate handling of malformed files and error conditions.

#### Test 9a: Malformed Frontmatter

1. **Create Invalid File**:
   - Create `story-98-invalid.md` with malformed frontmatter:
     ```markdown
     ---
     item: S98
     title: Invalid Story
     status: This is not a valid status
     ---
     ```

2. **Verify Error Handling**:
   - [ ] Output Channel shows parse error (from FrontmatterCache)
   - [ ] REFRESH still executes (non-blocking)
   - [ ] Invalid item skipped in TreeView
   - [ ] Other items still load correctly
   - [ ] No crash or extension error

#### Test 9b: Missing File During Refresh

1. **Delete File During Refresh**:
   - Start refresh (edit file to trigger)
   - Immediately delete another file during refresh processing
   - [ ] No crash or error
   - [ ] Refresh completes successfully
   - [ ] Final TreeView state is consistent

#### Test 9c: Very Large File

1. **Create Large Planning File**:
   - Create planning file with very long title (>1000 characters)
   - Or: Large frontmatter block (>10KB)
   - [ ] File parses successfully (or fails gracefully)
   - [ ] REFRESH completes without timeout
   - [ ] TreeView remains responsive

**Expected Outcome**: Edge cases handled gracefully, errors logged but non-blocking, extension remains stable.

---

### Task 10: Performance Validation

**Test Scenario**: Measure refresh performance with realistic project size.

**Steps:**

1. **Measure Current Project Size**:
   - Count planning items in Output Channel logs
   - Example: `[TreeView] Loaded 85 planning items`

2. **Trigger Refresh and Measure Timing**:
   - Edit planning file to trigger refresh
   - Record timestamps from Output Channel:
     - FILE_CHANGED timestamp: `[14:23:46.234]`
     - REFRESH completion timestamp: `[14:23:46.534]`
     - Calculate duration: 534ms - 234ms = **300ms**

3. **Verify Performance Targets**:
   - [ ] Refresh duration < 500ms for 100 items (per S58 specs)
   - [ ] Refresh duration < 200ms for 50 items
   - [ ] Refresh duration < 100ms for 25 items
   - [ ] No UI lag or freezing during refresh
   - [ ] TreeView remains responsive during refresh

**Expected Performance** (from S58 baseline):
- 100 items: ~200ms (cache hit on frontmatter)
- 100 items: ~500ms (cache miss, re-parse required)
- Debounce delay: 300ms (not counted in refresh time)
- Total latency: < 1 second from save to TreeView update

**Expected Outcome**: Performance meets targets, refresh completes in < 500ms for realistic project sizes.

---

## Completion Criteria

### Manual Testing Checklist

**File Modification:**
- [ ] Status change detected and TreeView updated
- [ ] Title change detected and TreeView updated
- [ ] TreeView updates automatically (no manual refresh)
- [ ] Output Channel shows FILE_CHANGED and REFRESH events
- [ ] Timing < 1 second from save to TreeView update

**File Creation:**
- [ ] New file detected and item added to TreeView
- [ ] Item appears in correct status group
- [ ] Hierarchy structure correct (under correct parent)
- [ ] Output Channel shows FILE_CREATED event

**File Deletion:**
- [ ] Deleted file detected and item removed from TreeView
- [ ] Status group count updated
- [ ] No errors or stale entries
- [ ] Output Channel shows FILE_DELETED event

**File Rename:**
- [ ] Rename detected as delete + create
- [ ] Old item removed, new item added (if valid)
- [ ] No duplicate items or orphaned entries

**Debouncing:**
- [ ] Rapid edits batched into single refresh
- [ ] Only one REFRESH event after 300ms silence
- [ ] No performance lag or UI freezing
- [ ] All changes reflected in final state

**Multi-File Changes:**
- [ ] Multiple file changes handled correctly
- [ ] Debouncing prevents excessive refreshes
- [ ] All changes reflected in TreeView
- [ ] Performance acceptable

**Edge Cases:**
- [ ] Malformed frontmatter handled gracefully
- [ ] Missing files during refresh handled correctly
- [ ] Large files parse without timeout
- [ ] Errors logged but non-blocking

**Performance:**
- [ ] Refresh duration < 500ms for 100 items
- [ ] No UI lag or freezing
- [ ] TreeView remains responsive

### Output Channel Verification

**Expected Log Sequence** (file modification):
```
[14:23:46] FILE_CHANGED: plans/.../story-49.md
[14:23:46] REFRESH: TreeView updated (file changed)
[ItemsCache] Cache cleared
[Hierarchy] Cache cleared
[Progress] Cache cleared
[ItemsCache] Cache MISS - loading from file system...
[ItemsCache] Loaded 85 items in 178ms
[StatusGroups] Built 6 status groups in 12ms
[Hierarchy] Cache miss for status: In Progress, building...
[Hierarchy] Built hierarchy for In Progress: 12 root nodes in 8ms
```

- [ ] All expected log entries present
- [ ] Timing values within acceptable ranges
- [ ] No errors or warnings
- [ ] Event sequence matches expected flow

## Next Steps

After completing all tests:

1. **Document Results**:
   - Record any issues or bugs found
   - Note performance measurements
   - Update story with test results

2. **Update Story Status**:
   - Mark S71 as "Completed" in `plans/` directory
   - Update frontmatter: `status: Completed`
   - Update `updated:` timestamp

3. **Optional Enhancements**:
   - Implement any logging improvements identified
   - Document integration pattern for future reference
   - Create follow-up stories for S72/S73/S74 if needed

## Notes

### Test Environment

- **VSCode Version**: Check with `code --version`
- **Extension Version**: Check in Output Channel activation log
- **OS**: Windows (path normalization important)
- **Workspace**: Lineage project with ~85 planning items

### Known Limitations

- **Symlinks**: File watcher follows symlinks by default (should work correctly)
- **Network drives**: File watcher may have delayed detection on network drives
- **Git operations**: Large merges may trigger many refresh events (S74 will optimize)

### Success Indicators

✅ **Story Complete** when:
- All manual tests pass
- Performance targets met
- Output Channel logs match expected sequence
- No regressions in existing functionality
- TreeView updates automatically without manual refresh

This completes S71 verification and testing. The integration between FileSystemWatcher and PlanningTreeProvider is confirmed working correctly.
