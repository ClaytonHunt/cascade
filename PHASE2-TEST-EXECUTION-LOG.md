# Phase 2: Manual Testing Execution Log

**Spec**: S97 - Spec Integration End-to-End Testing
**Phase**: 2 - Manual Testing Execution
**Date**: 2025-10-28
**Status**: Ready for Manual Testing

---

## Test Environment Setup ✅

**Extension Build**:
- Package created: `cascade-0.1.0.vsix`
- Installed successfully: ✅
- VSCode reload required: ⚠️ **USER ACTION NEEDED**

**Test Fixtures Deployed**:
- ✅ S999 - Test Story With Spec (1/3 phases complete)
- ✅ S998 - Test Story Without Spec
- ✅ S997 - Test Story Out of Sync (2/2 phases, spec completed but story "Ready")
- ✅ S996 - Test Invalid Spec Path
- ✅ S995 - Test Malformed Spec
- ✅ S994 - Test Zero Phases

**Spec Directories Created**:
- ✅ `specs/story-999-test/` (3 phases: 1 completed, 2 in progress, 3 not started)
- ✅ `specs/story-997-test/` (2 phases: both completed)
- ✅ `specs/story-995-malformed/` (malformed YAML frontmatter)
- ✅ `specs/story-994-zero-phases/` (0 phases)

---

## Manual Testing Instructions

### Prerequisites (USER ACTIONS REQUIRED)

1. **Reload VSCode Window**:
   - Press `Ctrl+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter
   - ⚠️ Extension must reload to activate latest version

2. **Open Output Channel**:
   - Press `Ctrl+Shift+P`
   - Type "View: Toggle Output"
   - Select "Cascade" from dropdown
   - Keep this open to monitor logs during testing

3. **Open Cascade TreeView**:
   - Click Activity Bar (left sidebar)
   - Click Cascade icon (tree/hierarchy icon)
   - Verify TreeView opens and populates with planning items

---

## Test Cases to Execute

### AC#1: End-to-End Workflow Testing ✅ (Setup Complete)

**Test Case 1.1: Story with Spec Displays Indicator**

**Expected Behavior**:
- Locate "S999 - Test Story With Spec" in TreeView
- Should display indicator: `📋 ↻ Phase 1/3`
- Icon: ↻ (in progress, 1 of 3 phases complete)
- No errors in output channel

**Verification Steps**:
1. Find S999 in TreeView (likely in "Ready" status group)
2. Check description shows: `📋 ↻ Phase 1/3`
3. Hover over story to view tooltip
4. Tooltip should show:
   - "Spec Progress:" section
   - "Directory: specs/story-999-test"
   - "Phases: 1/3 complete"
   - "Status: In Progress"

**Results**: ⬜ PENDING USER VERIFICATION

---

**Test Case 1.2: Story without Spec Shows No Indicator**

**Expected Behavior**:
- Locate "S998 - Test Story Without Spec" in TreeView
- Should display only status badge (e.g., `[Ready]`)
- No spec indicator shown
- Clean display (no empty placeholders)

**Results**: ⬜ PENDING USER VERIFICATION

---

### AC#2: Sync Status Testing ✅ (Setup Complete)

**Test Case 2.1: Out-of-Sync Warning Displays**

**Expected Behavior**:
- Locate "S997 - Test Story Out of Sync" in TreeView
- Should display: `⚠️ 📋 ✓ Phase 2/2`
- Warning icon (⚠️) prefixes spec indicator
- Icon is ✓ (checkmark, all phases complete)

**Tooltip Verification**:
1. Hover over S997
2. Should see sync warning: "⚠️ Spec and Story status out of sync - run /sync to update"
3. Spec status shows "Completed" but story status shows "Ready"

**Results**: ⬜ PENDING USER VERIFICATION

---

**Test Case 2.2: In-Sync Story Shows No Warning**

**Manual Action Required**:
1. Edit `plans/S999-test-with-spec.md`
2. Change frontmatter:
   ```diff
   - status: Ready
   + status: In Progress
   ```
3. Save file
4. Wait for TreeView refresh (file watcher debounce: ~300ms)

**Expected Result**:
- S999 indicator shows: `📋 ↻ Phase 1/3` (no ⚠️)
- Story status "In Progress" matches spec status "In Progress"
- No sync warning in tooltip

**Results**: ⬜ PENDING USER EXECUTION AND VERIFICATION

---

### AC#3: Performance Validation (Initial) ⏸️ (Deferred to Phase 3)

Quick check only - full performance testing in Phase 3.

**Quick Check**:
1. Check output channel for timing logs
2. Look for: `[ItemsCache] Loaded X items in Yms`
3. Verify load time < 500ms (target)

**Results**: ⬜ DEFERRED TO PHASE 3

---

### AC#4: Edge Case Testing ✅ (Setup Complete)

**Test Case 4.1: Story with Invalid Spec Path**

**Expected Behavior**:
- Locate "S996 - Test Invalid Spec Path" in TreeView
- No indicator displayed (graceful fallback)
- No errors or exceptions in output channel
- Story displays normally with status badge only

**Results**: ⬜ PENDING USER VERIFICATION

---

**Test Case 4.2: Spec with Malformed Frontmatter**

**Expected Behavior**:
- Locate "S995 - Test Malformed Spec" in TreeView
- No indicator displayed (parse error handled gracefully)
- Output channel may log warning (acceptable)
- No crash or exception

**Results**: ⬜ PENDING USER VERIFICATION

---

**Test Case 4.3: Spec with 0 Phases**

**Expected Behavior**:
- Locate "S994 - Test Zero Phases" in TreeView
- Should display: `📋 ○ Phase 0/0`
- Icon: ○ (empty circle, not started)
- No division-by-zero errors

**Results**: ⬜ PENDING USER VERIFICATION

---

### AC#5: Cache Invalidation Testing ⏸️ (Requires User Actions)

**Test Case 5.1: Edit Phase File Triggers Update**

**Manual Action Required**:
1. Open `specs/story-999-test/tasks/phase-2.md`
2. Change frontmatter:
   ```diff
   - status: In Progress
   + status: Completed
   ```
3. Save file
4. Wait 2 seconds (file watcher debounce)
5. Observe TreeView

**Expected Result**:
- TreeView updates automatically
- S999 indicator now shows: `📋 ↻ Phase 2/3`
- Completed phase count incremented

**Output Channel Verification**:
Look for logs:
- `[SpecProgressCache] Invalidated cache for S999`
- `[TreeView] Refresh triggered by file change`

**Results**: ⬜ PENDING USER EXECUTION AND VERIFICATION

---

**Test Case 5.2: Edit plan.md Triggers Update**

**Manual Action Required**:
1. Open `specs/story-999-test/plan.md`
2. Change spec status:
   ```diff
   - status: In Progress
   + status: Completed
   ```
3. Save file
4. Wait for TreeView update

**Expected Result**:
- TreeView updates
- S999 spec status changed to "Completed"
- If story status still "In Progress", sync warning should appear

**Results**: ⬜ PENDING USER EXECUTION AND VERIFICATION

---

**Test Case 5.3: Multiple File Edits (Debouncing)**

**Manual Action Required**:
1. Edit 3 phase files in rapid succession (< 300ms between saves)
2. Observe output channel

**Expected Behavior**:
- File watcher debounces changes
- Single refresh triggered after last edit
- Output channel shows debounce logic

**Results**: ⬜ PENDING USER EXECUTION AND VERIFICATION

---

### AC#6: Multi-Story Testing ✅ (Setup Complete)

**Test Case 6.1: Status Group with Mixed Spec States**

**Expected Results**:

| Story | Indicator | Notes |
|-------|-----------|-------|
| S999 | `📋 ↻ Phase 1/3` | In progress |
| S998 | (none) | No spec |
| S997 | `⚠️ 📋 ✓ Phase 2/2` | Out of sync |
| S996 | (none) | Invalid path |
| S995 | (none) | Malformed |
| S994 | `📋 ○ Phase 0/0` | Zero phases |

**Verification**:
1. Expand "Ready" status group (if in status mode)
2. Review all test stories
3. Verify indicators match expected values
4. Check visual distinction between states is clear

**Results**: ⬜ PENDING USER VERIFICATION

---

### AC#7: Tooltip Verification ⏸️ (Requires User Actions)

**Test Case 8.1: Tooltip Content Validation**

**Manual Action Required**:
1. Hover over S999 story
2. Read tooltip content
3. Compare to expected format

**Expected Tooltip**:
```
S999 - Test Story With Spec
Status: In Progress (or Ready, depending on TC 2.2)
Priority: Medium

Spec Progress:
- Directory: specs/story-999-test
- Phases: 1/3 complete (or 2/3 if TC 5.1 executed)
- Status: In Progress (or Completed if TC 5.2 executed)
```

**Results**: ⬜ PENDING USER VERIFICATION

---

**Test Case 8.2: Tooltip Sync Warning**

**Manual Action Required**:
1. Hover over S997 (out-of-sync story)
2. Read tooltip

**Expected Content**:
```
S997 - Test Story Out of Sync
Status: Ready
Priority: High

Spec Progress:
- Directory: specs/story-997-test
- Phases: 2/2 complete
- Status: Completed

⚠️ Spec and Story status out of sync - run /sync to update
```

**Results**: ⬜ PENDING USER VERIFICATION

---

## Test Execution Summary

**Automated Setup Tasks**: ✅ All Complete
- Extension packaged and installed
- Test fixtures deployed
- Edge case files created
- Spec directories configured

**Manual Testing Tasks**: ⏸️ Awaiting User Execution
- Visual verification of TreeView indicators
- Tooltip content validation
- Cache invalidation behavior testing
- Output channel log monitoring

**Required User Actions**:
1. Reload VSCode window (`Ctrl+Shift+P` → "Developer: Reload Window")
2. Open Output Channel (select "Cascade")
3. Open Cascade TreeView (Activity Bar)
4. Execute verification steps for each test case
5. Execute interactive test cases (TC 2.2, 5.1, 5.2, 5.3)
6. Document results in this file (replace ⬜ with ✅ or ❌)

---

## Next Steps

After completing all manual test cases:

1. **Document Results**: Update each test case result (✅ pass, ❌ fail)
2. **Capture Screenshots**: Save TreeView screenshots to `vscode-extension/screenshots/`
3. **Save Output Logs**: Copy output channel logs to `vscode-extension/test-results-f25.log`
4. **Report Completion**: Notify Claude to proceed with Phase 2 completion commit
5. **Proceed to Phase 3**: Performance validation with large datasets

---

## Notes

- Test fixtures can remain in workspace for Phase 3 performance testing
- S999 and S997 specs will be reused for performance testing
- Edge case test stories (S994-S996) can be removed after Phase 2 if desired
- All test data is located in `vscode-extension/test-fixtures/spec-integration/`

---

## Completion Checklist

- [ ] VSCode reloaded with latest extension
- [ ] Output channel open and monitoring logs
- [ ] Cascade TreeView open and populated
- [ ] All visual verification test cases executed
- [ ] All interactive test cases executed (edits, cache invalidation)
- [ ] Screenshots captured
- [ ] Output logs saved
- [ ] Results documented in this file
- [ ] Ready to proceed to Phase 2 completion commit
