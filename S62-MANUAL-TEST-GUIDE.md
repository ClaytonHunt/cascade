# S62 Manual Test Guide - Visual Feedback and Notifications

**Spec**: S62 - Visual Feedback and Notifications
**Phase**: 2 - Error and Warning Notifications
**Status**: Ready for Testing
**Date**: 2025-10-16

## Prerequisites

- ✅ Extension compiled and packaged: `cascade-0.1.0.vsix`
- ✅ Extension installed in VSCode
- ⏳ VSCode window reload required: Ctrl+Shift+P → "Developer: Reload Window"

## Test Overview

This guide tests three notification types implemented in Phase 2:

1. **Warning Notifications** - Invalid status transitions
2. **Error Notifications** - File write failures with "Open File" button
3. **Success Notifications** - Valid status transitions (from Phase 1)

## Setup Instructions

### 1. Reload VSCode

```
Ctrl+Shift+P → "Developer: Reload Window"
```

### 2. Open Cascade TreeView

- Click Cascade icon in Activity Bar (left sidebar)
- TreeView should populate with planning items

### 3. Open Output Channel

```
Ctrl+Shift+P → "View: Toggle Output" → Select "Cascade"
```

Keep this open to see detailed logs during testing.

---

## Test Case 1: Warning Notification - Invalid Transition

**Objective**: Verify warning notification appears for invalid status transitions.

### Test Scenario: Skip Planning Phase

**Setup**: Find a Story with status "Not Started"

**Steps**:
1. Expand "Not Started" status group in Cascade TreeView
2. Find any Story item (e.g., S99)
3. Drag the Story item to "In Progress" status group
4. Drop the item

**Expected Results**:
- ⚠️ Warning notification appears:
  ```
  ⚠️ Cannot move S99 from "Not Started" to "In Progress". Valid transitions: In Planning
  ```
- Notification persists until dismissed (warning level)
- File status remains "Not Started" (no change)
- Output channel logs:
  ```
  [DragDrop] ❌ Invalid status transition
    Not Started → In Progress is not allowed
  ```

**Pass Criteria**:
- [ ] Warning notification displays correct item number
- [ ] Warning shows source status ("Not Started")
- [ ] Warning shows target status ("In Progress")
- [ ] Warning lists valid transitions ("In Planning")
- [ ] Warning uses emoji prefix (⚠️)
- [ ] Drop is rejected (file unchanged)
- [ ] Output channel logs validation failure

---

## Test Case 2: Warning Notification - Invalid Rollback

**Objective**: Verify rollback transitions are blocked.

### Test Scenario: Completed to Not Started

**Setup**: Find a Story with status "Completed"

**Steps**:
1. Expand "Completed" status group
2. Find any Story item
3. Drag to "Not Started" status group
4. Drop the item

**Expected Results**:
- ⚠️ Warning notification:
  ```
  ⚠️ Cannot move SXX from "Completed" to "Not Started". Valid transitions: In Progress
  ```
- File status remains "Completed"

**Pass Criteria**:
- [ ] Warning displays for backward transitions
- [ ] Valid transitions shown ("In Progress" from Completed)
- [ ] File unchanged after drop

---

## Test Case 3: Error Notification - Read-Only File

**Objective**: Verify error notification with "Open File" button.

### Test Scenario: Permission Denied

**Setup**: Make a Story file read-only

**Windows Command**:
```bash
attrib +R plans\epic-04-planning-kanban-view\feature-18-drag-drop-status-transitions\story-62-visual-feedback-and-notifications.md
```

**Steps**:
1. Make S62 file read-only (run command above)
2. Expand "Not Started" status group (if S62 is there)
3. Drag S62 to "In Progress" status group
4. Drop the item

**Expected Results**:
- ❌ Error notification appears:
  ```
  ❌ Failed to update S62: EACCES: permission denied
  ```
  or similar permission error
- "Open File" button is visible
- Notification persists until dismissed (error level)
- File status remains unchanged

**Steps to Test "Open File" Button**:
1. Click "Open File" button in notification
2. **Expected**: File opens in VSCode editor
3. **Expected**: Can see frontmatter and file contents

**Cleanup**:
```bash
# Make file writable again
attrib -R plans\epic-04-planning-kanban-view\feature-18-drag-drop-status-transitions\story-62-visual-feedback-and-notifications.md
```

**Pass Criteria**:
- [ ] Error notification shows item number
- [ ] Error includes error message (EACCES or similar)
- [ ] "Open File" button is visible and clickable
- [ ] Clicking button opens file in editor
- [ ] Error uses emoji prefix (❌)
- [ ] File unchanged after error
- [ ] Output channel logs full error details

---

## Test Case 4: Success Notification - Valid Transition

**Objective**: Verify success notification from Phase 1 still works.

### Test Scenario: Ready to In Progress

**Setup**: Find a Story with status "Ready"

**Steps**:
1. Expand "Ready" status group
2. Find any Story item
3. Drag to "In Progress" status group
4. Drop the item

**Expected Results**:
- ✅ Success notification appears:
  ```
  ✅ SXX moved to "In Progress"
  ```
- Notification auto-dismisses after ~5 seconds
- File frontmatter updated:
  - `status: In Progress`
  - `updated: 2025-10-16` (current date)
- Output channel logs:
  ```
  [DragDrop] ✅ Status update successful
  ```

**Pass Criteria**:
- [ ] Success notification shows item number and target status
- [ ] Success uses emoji prefix (✅)
- [ ] Notification auto-dismisses after 5 seconds
- [ ] File frontmatter updated correctly
- [ ] Output channel confirms success

---

## Test Case 5: Notification Hierarchy

**Objective**: Verify notification severity levels are correct.

**Test Steps**:
1. Trigger error notification (Test Case 3)
2. Trigger warning notification (Test Case 1)
3. Trigger success notification (Test Case 4)

**Expected Notification Colors/Styles**:
- **Error**: Red background (most prominent)
- **Warning**: Yellow/orange background (medium prominence)
- **Success**: Blue/info background (subtle, auto-dismiss)

**Pass Criteria**:
- [ ] Error notifications are red/prominent
- [ ] Warning notifications are yellow/medium
- [ ] Success notifications are blue/subtle
- [ ] Notifications stack correctly (if multiple triggered)
- [ ] Auto-dismiss only applies to success notifications

---

## Test Case 6: Rapid Drag Operations

**Objective**: Verify notification stacking for rapid drags.

**Setup**: Prepare multiple Stories in "Ready" status

**Steps**:
1. Quickly drag 3 Stories from "Ready" to "In Progress"
2. Perform drags in rapid succession (< 2 seconds apart)

**Expected Results**:
- Three success notifications stack vertically
- Each notification shows correct item number
- Each notification auto-dismisses independently after 5 seconds
- No notification spam (one notification per drag)

**Pass Criteria**:
- [ ] Multiple notifications stack correctly
- [ ] Each shows correct item information
- [ ] Notifications don't overlap
- [ ] Auto-dismiss works independently
- [ ] No duplicate notifications

---

## Test Case 7: Same-Status Drop (No-Op)

**Objective**: Verify no notification for same-status drops.

**Steps**:
1. Drag Story from "In Progress" to "In Progress" (same group)
2. Drop the item

**Expected Results**:
- **No notification** appears (silent no-op)
- Output channel logs:
  ```
  [DragDrop] ℹ️  Same status (no update needed)
    Item already in In Progress
  ```

**Pass Criteria**:
- [ ] No notification for same-status drops
- [ ] Output channel logs no-op
- [ ] File unchanged

---

## Test Summary

### Phase 2 Completion Criteria

**Warning Notifications** (Tasks 1, 3):
- [ ] Warning shows for invalid transitions
- [ ] Warning includes source and target status
- [ ] Warning lists valid transition options
- [ ] Warning uses emoji prefix (⚠️)
- [ ] Drop rejected for invalid transitions

**Error Notifications** (Tasks 2, 4):
- [ ] Error shows for file write failures
- [ ] Error includes item number and error message
- [ ] "Open File" button visible and functional
- [ ] Clicking button opens file in editor
- [ ] Error uses emoji prefix (❌)
- [ ] File unchanged after error

**Notification Hierarchy** (Task 5):
- [ ] Error notifications are red (most prominent)
- [ ] Warning notifications are yellow (medium)
- [ ] Success notifications are blue (subtle)
- [ ] Auto-dismiss only for success notifications
- [ ] Notifications stack correctly

### All Tests Passed?

- [ ] All test cases completed
- [ ] All pass criteria met
- [ ] No regressions in Phase 1 functionality
- [ ] Ready to proceed to Phase 3

---

## Troubleshooting

### Extension Not Loading
- Verify installation: `code --list-extensions | grep cascade`
- Check output channel for activation errors
- Reload window: Ctrl+Shift+P → "Developer: Reload Window"

### No Notifications Appearing
- Check notification settings: File → Preferences → Settings → "Notifications"
- Verify "Enable Notifications" is checked
- Check Do Not Disturb mode is disabled

### TreeView Not Populating
- Verify `plans/` directory exists
- Check output channel for loading errors
- Verify frontmatter schema is valid

---

## Next Steps

After all tests pass:
1. Proceed to **Phase 3: Visual Feedback Verification**
2. Update phase 2 frontmatter to `status: Completed`
3. Commit test results with message: `PHASE COMPLETE: Phase 2 - Error and Warning Notifications`

---

## Notes

- Keep output channel open during all tests for debugging
- Test scenarios can be run in any order
- If test fails, check output channel for detailed error logs
- All notifications should appear in bottom-right corner of VSCode window
