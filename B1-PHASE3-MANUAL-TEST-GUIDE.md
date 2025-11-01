# B1 Phase 3: Manual Testing Guide

## Overview
This guide walks through comprehensive manual testing of the B1 bug fix (Ready Status Not Updating). The previousDataStore has been implemented to fix the race condition in change detection.

**Testing Time Estimate**: 30-45 minutes

## Prerequisites
- ✅ Extension compiled: `npm run compile`
- ✅ Extension packaged: `npm run package`
- ✅ Extension installed: `code --install-extension cascade-0.1.0.vsix --force`
- ⚠️ **REQUIRED**: Reload VSCode window (Ctrl+Shift+P → "Developer: Reload Window")

---

## Test 1: Verify Extension Activation

**Steps**:
1. Reload VSCode window: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Open Output Channel: `Ctrl+Shift+P` → "View: Toggle Output"
3. Select "Cascade" from dropdown

**Expected Output Channel Logs**:
```
[Init] Pre-populating previous data store...
[Init] Pre-populated N files in previous data store
Extension activated
```

**Validation Checklist**:
- [ ] Output Channel accessible
- [ ] Initialization logs present
- [ ] File count reasonable (e.g., 50-200 files)
- [ ] No error messages

**Notes**: _______________________________________________________________________

---

## Test 2: PRIMARY BUG CASE - "Not Started" → "Ready"

**🚨 CRITICAL: This is the bug that was originally reported.**

**Steps**:
1. Find a planning file with `status: Not Started` (or change one temporarily)
2. Open the file in VSCode
3. Change: `status: Not Started` → `status: Ready`
4. Save file (`Ctrl+S`)
5. Immediately check Output Channel

**Expected Output Channel Logs**:
```
[FileWatcher] File changed: plans/epic-XX/feature-YY/story-ZZ.md
[FileWatcher] Found previous data for change detection
[ChangeDetect] Using previous data from store
[ChangeDetect] Analyzed in Xms: plans/epic-XX/feature-YY/story-ZZ.md
[ChangeDetect] Changed fields: status
[ChangeDetect] Status changed: Not Started → Ready (STRUCTURE)
[FileWatcher] Updated previous data store
[TreeView] Full refresh scheduled (structure change)
```

**Expected TreeView Behavior**:
- Story REMOVED from "Not Started" status group
- Story APPEARS in "Ready" status group
- TreeView refreshes within ~500ms

**Validation Checklist**:
- [ ] Output Channel shows "Using previous data from store"
- [ ] Changed fields includes "status"
- [ ] Change type is STRUCTURE
- [ ] Status transition logged: "Not Started → Ready"
- [ ] TreeView refreshes automatically
- [ ] Story moves to "Ready" group

**🚨 IF THIS TEST FAILS, THE BUG FIX IS INCOMPLETE - DO NOT PROCEED**

**Notes**: _______________________________________________________________________

---

## Test 3: All Status Transitions

Test each transition to ensure comprehensive fix:

### Test 3.1: Ready → In Progress
- [ ] Change `status: Ready` → `status: In Progress`
- [ ] Save and verify Output Channel shows status change detected
- [ ] Verify TreeView updates

### Test 3.2: In Progress → Completed
- [ ] Change `status: In Progress` → `status: Completed`
- [ ] Save and verify detection
- [ ] Verify TreeView updates

### Test 3.3: Not Started → In Progress
- [ ] Change `status: Not Started` → `status: In Progress`
- [ ] Save and verify detection
- [ ] Verify TreeView updates

### Test 3.4: In Progress → Blocked
- [ ] Change `status: In Progress` → `status: Blocked`
- [ ] Save and verify detection
- [ ] Verify TreeView updates

### Test 3.5: Blocked → In Progress
- [ ] Change `status: Blocked` → `status: In Progress`
- [ ] Save and verify detection
- [ ] Verify TreeView updates

### Test 3.6: Completed → In Progress (Reopening)
- [ ] Change `status: Completed` → `status: In Progress`
- [ ] Save and verify detection
- [ ] Verify TreeView updates

### Test 3.7: Not Started → In Planning
- [ ] Change `status: Not Started` → `status: In Planning`
- [ ] Save and verify detection
- [ ] Verify TreeView updates

**Pattern to Look For** (all tests):
```
[ChangeDetect] Status changed: [FromStatus] → [ToStatus] (STRUCTURE)
[TreeView] Full refresh scheduled (structure change)
```

**Notes**: _______________________________________________________________________

---

## Test 4: Non-Status Frontmatter Changes

### Test 4.1: Title Change (CONTENT)
**Steps**:
1. Open a planning file
2. Change `title: "Old Title"` → `title: "New Title"`
3. Save file

**Expected Logs**:
```
[ChangeDetect] Changed fields: title
[ChangeDetect] Display fields changed: title (CONTENT)
[TreeView] Partial refresh scheduled (content change)
```

**Validation**:
- [ ] Change type is CONTENT (not STRUCTURE)
- [ ] TreeView shows updated title
- [ ] Only affected item refreshes (not full refresh)

### Test 4.2: Priority Change (CONTENT)
**Steps**:
1. Change `priority: Medium` → `priority: High`
2. Save file

**Expected Logs**:
```
[ChangeDetect] Changed fields: priority
[ChangeDetect] Display fields changed: priority (CONTENT)
[TreeView] Partial refresh scheduled (content change)
```

**Validation**:
- [ ] Change type is CONTENT
- [ ] TreeView shows updated priority

### Test 4.3: Body Content Change (BODY)
**Steps**:
1. Change description or acceptance criteria (content AFTER frontmatter `---`)
2. Save file

**Expected Logs**:
```
[ChangeDetect] Changed fields: none
[ChangeDetect] Body-only change (BODY)
[TreeView] Refresh skipped (body-only change)
```

**Validation**:
- [ ] Change type is BODY
- [ ] TreeView does NOT refresh (performance optimization)

**Notes**: _______________________________________________________________________

---

## Test 5: File Lifecycle Events

### Test 5.1: File Creation
**Steps**:
1. Create new file: `D:\projects\lineage\plans\test-story-999.md`
2. Add frontmatter:
```yaml
---
item: S999
title: Test Story for B1 Verification
type: story
status: Not Started
priority: Medium
dependencies: []
created: 2025-10-28
updated: 2025-10-28
---

Test story for B1 bug fix verification.
```
3. Save file

**Expected Logs**:
```
[FileWatcher] File created: plans/test-story-999.md
[FileWatcher] Added new file to previous data store
[TreeView] Full refresh scheduled (file created)
```

**Validation**:
- [ ] File added to previousDataStore
- [ ] TreeView shows new file in "Not Started" group
- [ ] No errors

### Test 5.2: Edit Newly Created File (Critical!)
**Steps**:
1. Open `test-story-999.md` (the file we just created)
2. Change `status: Not Started` → `status: Ready`
3. Save file

**Expected Logs**:
```
[FileWatcher] Found previous data for change detection
[ChangeDetect] Status changed: Not Started → Ready (STRUCTURE)
```

**Validation**:
- [ ] previousDataStore had the file's previous state
- [ ] Status change detected correctly
- [ ] TreeView updates

**🚨 This tests that file creation populated previousDataStore**

### Test 5.3: File Deletion
**Steps**:
1. Delete `test-story-999.md`

**Expected Logs**:
```
[FileWatcher] Removed deleted file from previous data store
[TreeView] Full refresh scheduled (file deleted)
```

**Validation**:
- [ ] File removed from previousDataStore
- [ ] TreeView removes deleted file
- [ ] No errors or crashes

**Notes**: _______________________________________________________________________

---

## Test 6: Performance Verification

### Test 6.1: Change Detection Speed
**Observation**: Monitor Output Channel for `[ChangeDetect] Analyzed in Xms` logs.

**Target**: < 10ms per file

**Validation**:
- [ ] Average detection time < 10ms
- [ ] No obvious lag when saving files

### Test 6.2: TreeView Refresh Speed
**Observation**: Change a status and observe TreeView update delay.

**Target**: < 500ms from save to TreeView update

**Validation**:
- [ ] Refresh feels instant
- [ ] No visible lag or flicker
- [ ] Status groups update smoothly

### Test 6.3: Memory Usage
**Observation**: Check Output Channel for initialization count.

**Calculation**: ~200 bytes per item × 200 files = 40 KB

**Validation**:
- [ ] Memory overhead negligible
- [ ] No performance degradation

**Notes**: _______________________________________________________________________

---

## Test 7: Regression Testing

### Test 7.1: Status Group View
**Steps**:
1. Open Cascade TreeView (Activity Bar → Cascade icon)
2. Verify all status groups present:
   - Not Started
   - In Planning
   - Ready
   - In Progress
   - Blocked
   - Completed
3. Expand each group

**Validation**:
- [ ] All status groups present
- [ ] Items grouped correctly
- [ ] No missing or duplicate items

### Test 7.2: Hierarchy View
**Steps**:
1. Toggle to Hierarchy view (if toolbar button exists)
2. Expand hierarchies

**Validation**:
- [ ] Hierarchy view works
- [ ] Parent-child relationships correct
- [ ] No regressions

### Test 7.3: Drag and Drop (F18)
**Steps**:
1. Drag a story from one status group to another
2. Observe Output Channel

**Validation**:
- [ ] Drag-drop controller still functional
- [ ] No conflicts with previousDataStore
- [ ] Status update will work with S61 implementation

**Notes**: _______________________________________________________________________

---

## Test 8: Edge Cases

### Test 8.1: Rapid Sequential Edits
**Steps**:
1. Open a planning file
2. Make rapid changes:
   - Change status → Save
   - Change title → Save
   - Change priority → Save
   - (All within ~1 second)

**Expected Behavior**:
- Debouncing delays refreshes (~300ms)
- Only final state triggers TreeView refresh
- No refresh storms

**Validation**:
- [ ] Debouncing works
- [ ] Final state reflected in TreeView
- [ ] No performance degradation

### Test 8.2: Invalid Frontmatter
**Steps**:
1. Open a planning file
2. Break frontmatter:
```yaml
---
item: S999
title: Test Story
status: This Is Not A Valid Status
type: story
---
```
3. Save file

**Expected Logs**:
```
[ChangeDetect] ⚠️  No data (STRUCTURE fallback)
```

**Validation**:
- [ ] Extension doesn't crash
- [ ] Error logged to Output Channel
- [ ] TreeView handles gracefully

### Test 8.3: Missing Required Field
**Steps**:
1. Remove status field entirely
2. Save file

**Validation**:
- [ ] Graceful handling
- [ ] Output Channel logs parsing error
- [ ] No crash

**Notes**: _______________________________________________________________________

---

## Test 9: Git Operation Suppression

**Steps**:
1. Make changes to several planning files
2. Run git commands:
```bash
cd D:\projects\lineage
git add plans/
git commit -m "Test commit for B1 verification"
```
3. Observe Output Channel during git operation

**Expected Logs**:
```
[FileWatcher] File changed: plans/...
[FileWatcher] Refresh suppressed (git operation in progress)
```

**Expected Behavior**:
- File changes detected
- Cache invalidated
- TreeView refresh suppressed until git completes
- Single refresh after git operation completes

**Validation**:
- [ ] Git operations detected
- [ ] Refreshes suppressed during operation
- [ ] Single refresh after completion
- [ ] No rapid refresh flickering

**Notes**: _______________________________________________________________________

---

## Final Validation Summary

**Primary Bug Fix**:
- [ ] "Not Started" → "Ready" status change detected ✅
- [ ] TreeView refreshes automatically ✅
- [ ] Story appears in "Ready" status group ✅

**Comprehensive Fix**:
- [ ] ALL status transitions detected ✅
- [ ] No special cases needed ✅
- [ ] Consistent behavior across all statuses ✅

**No Regressions**:
- [ ] Existing features work unchanged ✅
- [ ] Performance unchanged or improved ✅
- [ ] Git operation suppression preserved ✅

**Edge Cases**:
- [ ] File creation/deletion handled ✅
- [ ] Invalid frontmatter handled gracefully ✅
- [ ] Rapid edits debounced correctly ✅

---

## Issues Discovered

If any tests fail, document here:

**Issue 1**: ___________________________________________________________________

**Issue 2**: ___________________________________________________________________

**Issue 3**: ___________________________________________________________________

---

## Next Steps After Testing

If all tests pass:

1. **Mark Phase 3 as Completed**:
   - Update `specs/B1-ready-status-not-updating/tasks/03-integration-testing.md`
   - Change `status: In Progress` → `status: Completed`
   - Update `updated:` date

2. **Update Spec Plan**:
   - Update `specs/B1-ready-status-not-updating/plan.md`
   - Change `status: In Progress` → `status: Completed`
   - Update `updated:` date

3. **Commit Phase 3 Completion**:
```bash
git add specs/B1-ready-status-not-updating/
git add vscode-extension/B1-PHASE3-MANUAL-TEST-GUIDE.md
git commit -m "PHASE COMPLETE: B1 Phase 3 - Integration Testing and Verification

Comprehensive manual testing validates previousDataStore fix:
- Primary bug case (Not Started → Ready) FIXED
- All status transitions detected correctly
- No regressions in existing features
- Edge cases handled gracefully

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

4. **Update Bug Status**:
   - Find bug file in `plans/epic-04-planning-kanban-view/feature-20-realtime-synchronization/`
   - Change `status: Ready` → `status: Completed`
   - Add `spec: specs/B1-ready-status-not-updating/`

---

## Testing Completed By

**Name**: _______________________________________________________________________

**Date**: _______________________________________________________________________

**Result**: [ ] PASS  [ ] FAIL (see Issues Discovered section)

**Notes**: _______________________________________________________________________
