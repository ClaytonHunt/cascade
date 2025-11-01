---
spec: S63
phase: 3
title: Integration Testing and Edge Case Validation
status: Completed
priority: High
created: 2025-10-16
updated: 2025-10-17
---

# Phase 3: Integration Testing and Edge Case Validation

## Overview

This phase performs comprehensive manual testing to verify the "Change Status" context menu action works correctly across all status transitions, item types, and edge cases. This is the final validation phase before marking S63 as completed.

**Goal**: Systematically test all acceptance criteria from story-63 and document test results.

## Prerequisites

- Phase 1 completed (command registered)
- Phase 2 completed (command implemented)
- Extension installed and activated
- Cascade TreeView populated with test data
- Output channel visible for monitoring

## Tasks

### Task 1: Prepare Test Environment

Set up a consistent test environment with known planning items across all statuses.

**Test Data Requirements**:
- At least one Story in each status:
  - Not Started
  - In Planning
  - Ready
  - In Progress
  - Blocked
  - Completed
- At least one Bug in "Ready" status (to test Bug support)
- At least one Epic, Feature, Status Group (to test filtering)

**Setup Steps**:
1. Open VSCode with Lineage project
2. Open Cascade TreeView (Activity Bar → Cascade icon)
3. Open Output Channel: Ctrl+Shift+P → "View: Toggle Output" → "Cascade"
4. Verify extension activated (check output channel logs)
5. Expand all status groups to view available items

**Create Test Items if Needed**:
If you don't have items in all statuses, manually edit frontmatter in a test story:

```bash
# Copy an existing story for testing
cp plans/epic-04-planning-kanban-view/feature-19-context-menu-actions/story-63-change-status-action.md \
   plans/epic-04-planning-kanban-view/feature-19-context-menu-actions/story-99-test-item.md
```

Edit the copied file to change status field to the desired test status.

### Task 2: Test Status Transitions - Forward Progression

Test the standard forward progression through the workflow.

**Test 2.1: Not Started → In Planning**
1. Right-click Story with status "Not Started"
2. Click "Change Status"
3. Verify quick pick shows: "In Planning", "Blocked"
4. Verify quick pick title: "S## - [Story Title]"
5. Verify placeholder: "Change status from 'Not Started' to..."
6. Select "In Planning"
7. Verify success notification: "S## status changed to 'In Planning'"
8. Wait 500ms for auto-refresh
9. Verify Story appears in "In Planning" status group
10. Open story file and verify:
    - `status: In Planning`
    - `updated: 2025-10-16` (today's date)

**Expected Output Logs**:
```
[ChangeStatus] Command invoked for S## - [Title]
  Current status: Not Started
  File: D:\projects\lineage\plans\...\story-##.md
  → Selected status: In Planning

[FileUpdate] ✅ Updated status: D:\projects\lineage\plans\...\story-##.md
  Not Started → In Planning
  Updated timestamp: 2025-10-16

[HH:MM:SS] FILE_CHANGED: epic-...\story-##.md
[HH:MM:SS] REFRESH: TreeView updated (file changed)

  ✅ Status change successful
```

**Test 2.2: In Planning → Ready**
1. Right-click Story with status "In Planning"
2. Click "Change Status"
3. Verify quick pick shows: "Ready", "Blocked"
4. Select "Ready"
5. Verify success notification and TreeView update

**Test 2.3: Ready → In Progress**
1. Right-click Story with status "Ready"
2. Click "Change Status"
3. Verify quick pick shows: "In Progress", "Blocked"
4. Select "In Progress"
5. Verify success notification and TreeView update

**Test 2.4: In Progress → Completed**
1. Right-click Story with status "In Progress"
2. Click "Change Status"
3. Verify quick pick shows: "Completed", "Blocked"
4. Select "Completed"
5. Verify success notification and TreeView update

### Task 3: Test Status Transitions - Blocked State

Test the Blocked status which allows returning to any previous state.

**Test 3.1: Any Status → Blocked**
1. Right-click Story with status "Ready"
2. Click "Change Status"
3. Verify quick pick includes "Blocked"
4. Select "Blocked"
5. Verify success notification
6. Verify Story appears in "Blocked" status group

**Test 3.2: Blocked → Previous State**
1. Right-click Story with status "Blocked"
2. Click "Change Status"
3. Verify quick pick shows: "Not Started", "In Planning", "Ready", "In Progress"
4. Verify "Completed" and "Blocked" NOT shown
5. Select "Ready" (or any other option)
6. Verify success notification and TreeView update

**Transition Rule Validation**:
- Blocked can transition to: Not Started, In Planning, Ready, In Progress
- Blocked cannot transition to: Completed (must complete work first), Blocked (already blocked)

### Task 4: Test Status Transitions - Completed State

Test the Completed status which is a terminal state with no transitions.

**Test 4.1: Completed → No Transitions**
1. Right-click Story with status "Completed"
2. Click "Change Status"
3. Verify NO quick pick shown
4. Verify notification: "S## is 'Completed' - no status changes available"
5. Verify output channel logs: "No valid transitions from 'Completed'"
6. Verify no file changes made

**Rationale**: Completed is a final state. Once work is done, it shouldn't transition back to earlier states. This prevents accidental status changes on finished work.

### Task 5: Test Context Menu Filtering

Verify the context menu only appears for Stories and Bugs, not other item types.

**Test 5.1: Stories → Command Visible**
1. Right-click on any Story
2. Verify "Change Status" appears in context menu
3. Verify command has edit icon (if icons shown)

**Test 5.2: Bugs → Command Visible**
1. Right-click on any Bug
2. Verify "Change Status" appears in context menu

**Test 5.3: Epics → Command Hidden**
1. Right-click on any Epic
2. Verify "Change Status" does NOT appear in context menu
3. Verify only default commands shown (Open, Copy Path, etc.)

**Test 5.4: Features → Command Hidden**
1. Right-click on any Feature
2. Verify "Change Status" does NOT appear in context menu

**Test 5.5: Status Groups → Command Hidden**
1. Right-click on any Status Group header (e.g., "Ready (5)")
2. Verify "Change Status" does NOT appear in context menu

**Filter Rule Validation**:
- The `when` clause in package.json: `view == cascadeView && (viewItem == story || viewItem == bug)`
- This filters by `contextValue` set in PlanningTreeProvider.ts:328

### Task 6: Test Cancellation Behavior

Verify users can cancel the operation without making changes.

**Test 6.1: Cancel via ESC Key**
1. Right-click Story with status "Ready"
2. Click "Change Status"
3. Quick pick appears
4. Press ESC key
5. Verify quick pick closes
6. Verify NO notification shown
7. Verify output channel logs: "User cancelled status change"
8. Open story file and verify status unchanged
9. Verify `updated` timestamp unchanged

**Test 6.2: Cancel via Click Outside**
1. Right-click Story with status "Ready"
2. Click "Change Status"
3. Quick pick appears
4. Click outside quick pick (on editor area)
5. Verify quick pick closes
6. Verify NO notification shown
7. Verify output channel logs: "User cancelled status change"

**Test 6.3: Cancel via Unfocus**
1. Right-click Story with status "Ready"
2. Click "Change Status"
3. Quick pick appears
4. Click another window or application
5. Verify quick pick closes
6. Verify NO notification shown

### Task 7: Test Quick Pick UI Elements

Verify the quick pick menu displays correct information.

**Test 7.1: Quick Pick Title**
1. Right-click Story "S49 - TreeDataProvider Core Implementation"
2. Click "Change Status"
3. Verify title at top of quick pick: "S49 - TreeDataProvider Core Implementation"

**Test 7.2: Quick Pick Placeholder**
1. Right-click Story with status "Ready"
2. Click "Change Status"
3. Verify placeholder text: "Change status from 'Ready' to..."

**Test 7.3: Quick Pick Items with Descriptions**
1. Right-click Story with status "Ready"
2. Click "Change Status"
3. Verify quick pick items:
   - "In Progress" - "Currently being implemented"
   - "Blocked" - "Waiting on dependency or issue"

**Test 7.4: Status Descriptions Accuracy**
Verify all status descriptions match the helper function:
- Not Started: "Initial state - not yet planned"
- In Planning: "Requirements being refined"
- Ready: "Ready for implementation"
- In Progress: "Currently being implemented"
- Blocked: "Waiting on dependency or issue"
- Completed: "Implementation finished"

### Task 8: Test TreeView Auto-Refresh

Verify the TreeView automatically refreshes after status changes.

**Test 8.1: FileSystemWatcher Integration**
1. Open Output Channel and clear existing logs
2. Right-click Story in "Ready" group
3. Click "Change Status" → Select "In Progress"
4. Monitor output channel for:
   - `[FileUpdate] ✅ Updated status: ...`
   - `[HH:MM:SS] FILE_CHANGED: ...`
   - `[HH:MM:SS] REFRESH: TreeView updated (file changed)`

**Test 8.2: Status Group Updates**
1. Note count badge on "Ready" group (e.g., "Ready (5)")
2. Change a Story from "Ready" to "In Progress"
3. Wait 500ms for auto-refresh
4. Verify "Ready" count decreased (e.g., "Ready (4)")
5. Verify "In Progress" count increased

**Test 8.3: Item Disappears from Old Group**
1. Expand "Ready" status group
2. Identify a specific Story by title
3. Change its status to "In Progress"
4. Wait 500ms for auto-refresh
5. Verify Story no longer appears in "Ready" group
6. Expand "In Progress" group
7. Verify Story now appears in "In Progress" group

**Test 8.4: Cache Invalidation**
1. Change a Story's status
2. Wait 500ms for auto-refresh
3. Check cache stats: Ctrl+Shift+P → "Cascade: Show Cache Statistics"
4. Verify cache invalidation occurred (size decreased or misses increased)

### Task 9: Test Error Handling

Verify error handling for file update failures.

**Test 9.1: Simulated File Lock (Windows)**
This test simulates a file write failure by locking the file externally.

**Setup** (Optional - only if you want to test error handling):
1. Open a story file in an external text editor (Notepad)
2. Make the file read-only (Properties → Read-only checkbox)
3. Try to change status via context menu
4. Verify error notification: "Failed to update S##: ..."
5. Verify output channel logs error
6. Restore file permissions and retry

**Expected Error Log**:
```
[ChangeStatus] Command invoked for S## - [Title]
  Current status: Ready
  File: D:\projects\lineage\plans\...\story-##.md
  → Selected status: In Progress

[FileUpdate] ❌ Error updating D:\projects\lineage\plans\...\story-##.md
  Error: Failed to write file: EACCES: permission denied

  ❌ Status change failed: Failed to write file: EACCES: permission denied
```

**Test 9.2: Malformed Frontmatter (Edge Case)**
This tests parser error handling.

**Setup** (Optional - risky test):
1. Create a test story file with invalid YAML frontmatter
2. Try to change status via context menu
3. Verify error notification shown
4. Restore valid frontmatter

**Note**: This test is risky and optional. Only run if you have a backup of the file.

### Task 10: Validate All Acceptance Criteria

Go through all acceptance criteria from story-63 and verify each one passes.

**Acceptance Criteria Checklist**:
- [ ] Right-click on Story/Bug shows "Change Status" in context menu
- [ ] Context menu item only visible for Stories and Bugs (not Epics/Features/StatusGroups)
- [ ] Clicking "Change Status" opens quick pick menu
- [ ] Quick pick shows only valid transitions for current status
- [ ] Quick pick includes status descriptions for clarity
- [ ] Quick pick shows item number and title in header
- [ ] Selecting status updates file frontmatter (status + updated fields)
- [ ] FileSystemWatcher automatically refreshes TreeView
- [ ] Success toast notification shown with item number and new status
- [ ] Error toast shown if file update fails
- [ ] Completed items show no transitions (empty quick pick or disabled)
- [ ] Blocked items can transition back to previous states
- [ ] ESC key cancels operation (no changes made)

### Task 11: Create Test Summary Document

Document test results for future reference and regression testing.

**Create File**: `vscode-extension/test-results/S63-manual-test-results.md`

**Template**:
```markdown
# S63 - Change Status Context Menu Action - Test Results

**Test Date**: 2025-10-16
**Tester**: [Your Name]
**Extension Version**: 0.1.0
**VSCode Version**: [Check Help → About]

## Test Environment
- OS: Windows 10
- Workspace: D:\projects\lineage
- Test Stories: [List story numbers used for testing]

## Test Results Summary
- Total Tests: 11 tasks
- Passed: [Count]
- Failed: [Count]
- Skipped: [Count]

## Detailed Results

### Task 2: Status Transitions - Forward Progression
- Test 2.1 (Not Started → In Planning): ✅ PASS
- Test 2.2 (In Planning → Ready): ✅ PASS
- Test 2.3 (Ready → In Progress): ✅ PASS
- Test 2.4 (In Progress → Completed): ✅ PASS

### Task 3: Status Transitions - Blocked State
- Test 3.1 (Any Status → Blocked): ✅ PASS
- Test 3.2 (Blocked → Previous State): ✅ PASS

[Continue for all tasks...]

## Issues Found
[List any bugs or unexpected behavior]

## Notes
[Any additional observations or recommendations]

## Acceptance Criteria Validation
All 13 acceptance criteria: ✅ PASS
```

**Note**: This document is optional but recommended for tracking test coverage and debugging future regressions.

## Completion Criteria

- ✅ Test environment prepared with items in all statuses
- ✅ All status transitions tested and working:
  - Forward progression (Not Started → In Planning → Ready → In Progress → Completed)
  - Blocking (Any status → Blocked)
  - Unblocking (Blocked → Previous states)
  - Terminal state (Completed → No transitions)
- ✅ Context menu filtering validated:
  - Visible for Stories and Bugs
  - Hidden for Epics, Features, Status Groups
- ✅ Cancellation behavior verified (ESC key, click outside)
- ✅ Quick pick UI elements validated (title, placeholder, descriptions)
- ✅ TreeView auto-refresh working (FileSystemWatcher integration)
- ✅ Error handling tested (file lock scenario)
- ✅ All 13 acceptance criteria passed
- ✅ Test results documented (optional)

## Output Artifacts

- Completed manual test checklist (above)
- Optional: `vscode-extension/test-results/S63-manual-test-results.md`
- Screenshots of quick pick UI (optional)
- Output channel logs showing successful operations

## Next Steps

Once all tests pass:
1. Mark S63 as "Completed" in frontmatter
2. Commit changes with message: "PHASE COMPLETE: S63 - Change Status Context Menu Action"
3. Move on to S64 (Create Child Item Action) or other stories in F19

## Troubleshooting

### TreeView Not Refreshing After Status Change

**Symptom**: Status changed in file but TreeView shows old status

**Debugging Steps**:
1. Check output channel for FILE_CHANGED event
2. Verify FileSystemWatcher active (logs at extension activation)
3. Wait longer (debounce delay is 300ms)
4. Manually refresh: Click TreeView toolbar refresh button

**Common Causes**:
- FileSystemWatcher not detecting change (rare)
- Cache not invalidated (check cache logs)
- TreeView provider not refreshing (check refresh logs)

### Quick Pick Shows Wrong Transitions

**Symptom**: Quick pick shows incorrect status options

**Debugging Steps**:
1. Check getValidTransitions() implementation
2. Verify current status value matches expected format
3. Check output channel for current status log
4. Add debug logging to getValidTransitions()

**Common Causes**:
- Status value has extra whitespace (e.g., "Ready " vs "Ready")
- Status value has different casing (e.g., "ready" vs "Ready")
- Frontmatter parser returned unexpected status value

### Context Menu Not Showing

**Symptom**: Right-click on Story but "Change Status" not visible

**Debugging Steps**:
1. Verify extension activated (check output channel)
2. Check package.json `when` clause: `view == cascadeView && (viewItem == story || viewItem == bug)`
3. Verify contextValue set in PlanningTreeProvider.ts:328
4. Check Developer Tools console for errors

**Common Causes**:
- Extension not reloaded after installation
- `when` clause incorrect
- `contextValue` not set or set to wrong value
- Wrong view (not cascadeView)
