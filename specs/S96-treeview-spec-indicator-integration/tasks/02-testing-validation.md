---
spec: S96
phase: 2
title: Testing and Validation
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 2: Testing and Validation

## Overview

Comprehensive testing of tooltip enhancement functionality across various story/spec combinations. Validates correct behavior for edge cases, performance characteristics, and integration with existing TreeView features.

## Prerequisites

- Phase 1 (Tooltip Enhancement) completed ✅
- buildTooltip() method enhanced with spec progress section
- Extension compiled and packaged successfully

## Tasks

### Task 1: Test Story with Completed Spec

**Scenario**: Story with all spec phases complete.

**Setup**:
1. Find or create story with completed spec (e.g., S93, S94, S95)
2. Verify spec has all phases with `status: Completed` in frontmatter
3. Verify story status matches spec status

**Steps**:
1. Reload TreeView
2. Hover over story item
3. Verify tooltip shows:
   - Spec Progress section
   - Phases: `3/3 complete` (or actual count)
   - Status: `Completed`
   - No sync warning (statuses match)

**Expected Result**:
- ✓ icon in TreeView description (all phases complete)
- Tooltip shows "3/3 complete"
- No sync warning

---

### Task 2: Test Story with In-Progress Spec

**Scenario**: Story with partial spec completion.

**Setup**:
1. Find or create story with partially complete spec
2. Verify some phases are `Completed`, others `Not Started`
3. Verify spec status is `In Progress`

**Steps**:
1. Reload TreeView
2. Hover over story item
3. Verify tooltip shows:
   - Spec Progress section
   - Phases: `1/3 complete` (or actual count)
   - Status: `In Progress`
   - Sync status depends on story status

**Expected Result**:
- ↻ icon in TreeView description (in progress)
- Tooltip shows correct phase count
- Sync warning if story status is `Ready` but spec is `In Progress`

---

### Task 3: Test Story with No Spec (Spec Field Missing)

**Scenario**: Story without `spec` field in frontmatter.

**Setup**:
1. Find story with no `spec` field (older stories)
2. Verify frontmatter has no `spec:` line

**Steps**:
1. Reload TreeView
2. Hover over story item
3. Verify tooltip shows:
   - Standard fields only (title, type, status, priority, file path)
   - No Spec Progress section
   - No sync warning

**Expected Result**:
- No spec indicator in TreeView description
- Tooltip unchanged from pre-S96 behavior

---

### Task 4: Test Story with Invalid Spec Path

**Scenario**: Story has `spec` field but directory doesn't exist.

**Setup**:
1. Create test story with `spec: specs/nonexistent-spec` in frontmatter
2. Verify directory does not exist

**Steps**:
1. Reload TreeView
2. Hover over story item
3. Verify tooltip shows:
   - Standard fields only
   - No Spec Progress section (getSpecProgressCached returns null)
4. Check Output Channel for warning:
   - `[SpecProgressCache] No valid spec found for SXXX`

**Expected Result**:
- No spec indicator in TreeView description
- Tooltip gracefully handles missing spec directory
- No extension errors

---

### Task 5: Test Sync Warning Logic (Spec Ahead)

**Scenario 1**: Story `Ready`, Spec `In Progress`

**Setup**:
1. Create test story with `status: Ready`
2. Create test spec with `status: In Progress` in plan.md
3. Reload TreeView

**Steps**:
1. Hover over story
2. Verify sync warning appears:
   ```
   ⚠️ Spec and Story status out of sync
   Run /sync to update story status
   ```

**Expected Result**: Warning displayed (spec is ahead).

---

**Scenario 2**: Story `In Progress`, Spec `Completed`

**Setup**:
1. Story: `status: In Progress`
2. Spec: `status: Completed` (all phases complete)
3. Reload TreeView

**Steps**:
1. Hover over story
2. Verify sync warning appears

**Expected Result**: Warning displayed (spec is ahead).

---

**Scenario 3**: Story `In Progress`, Spec `In Progress` (In Sync)

**Setup**:
1. Story: `status: In Progress`
2. Spec: `status: In Progress`
3. Reload TreeView

**Steps**:
1. Hover over story
2. Verify NO sync warning

**Expected Result**: No warning (statuses match).

---

**Scenario 4**: Story `Completed`, Spec `Completed` (In Sync)

**Setup**:
1. Story: `status: Completed`
2. Spec: `status: Completed`
3. Reload TreeView

**Steps**:
1. Hover over story
2. Verify NO sync warning

**Expected Result**: No warning (statuses match).

---

### Task 6: Test Tooltip with Long Spec Directory Path

**Scenario**: Story with deeply nested spec path.

**Setup**:
1. Create test story with long spec path:
   ```yaml
   spec: specs/epic-05/feature-25/story-99-very-long-descriptive-name-for-testing
   ```
2. Create matching spec directory with plan.md

**Steps**:
1. Reload TreeView
2. Hover over story
3. Verify tooltip displays full path without truncation
4. Verify tooltip formatting remains clean (VSCode handles wrapping)

**Expected Result**:
- Full relative path displayed
- VSCode tooltip handles wrapping gracefully
- No visual artifacts

---

### Task 7: Test Archived Story with Spec

**Scenario**: Archived story that has spec.

**Setup**:
1. Find or create story in `plans/archive/` directory
2. Story has `spec` field in frontmatter
3. Spec directory exists and valid

**Steps**:
1. Toggle archived items ON (Cascade toolbar button)
2. Expand "Archived" status group
3. Hover over archived story
4. Verify tooltip shows:
   - `[ARCHIVED]` tag in title line
   - Spec Progress section (if spec exists)
   - Correct archive icon in TreeView

**Expected Result**:
- Tooltip includes both archived tag AND spec progress
- No conflicts between archived and spec display logic

---

### Task 8: Test Cache Performance (Cache Hit Rate)

**Objective**: Verify spec progress cache reuse for tooltip generation.

**Steps**:
1. Open Output Channel ("Cascade")
2. Clear cache (reload window)
3. Expand status group with 5+ stories with specs
4. Hover over each story once
5. Observe cache logs in output channel
6. Expected pattern for EACH story:
   - First call (getTreeItem): `[SpecProgressCache] Cache MISS`
   - Second call (buildTooltip): `[SpecProgressCache] Cache HIT`
7. Calculate hit rate: Should be 50% (1 miss + 1 hit per story)

**After 60 seconds** (cache stats logged):
8. Check output for: `[SpecProgressCache] Hit rate: XX%`
9. Verify hit rate includes both getTreeItem and buildTooltip calls

**Expected Result**:
- Cache hit rate > 50% (proves tooltip reuses cache)
- No redundant file reads observed
- Performance logs confirm O(1) cache lookups

---

### Task 9: Test Tooltip Formatting Consistency

**Objective**: Verify tooltip maintains consistent formatting across all scenarios.

**Test Cases**:
1. Story without spec → 3 lines (title, metadata, file)
2. Story with spec (in sync) → 7 lines (base 3 + spec header + 3 details)
3. Story with spec (out of sync) → 9 lines (base 3 + spec 4 + warning 2)
4. Archived story with spec → Same as above + `[ARCHIVED]` tag

**Steps**:
1. Hover over each test case
2. Verify blank lines separating sections:
   - Blank line before "Spec Progress:" header
   - Blank line before sync warning (if present)
3. Verify indentation consistent:
   - Spec details use "- " prefix (bullet points)
4. Verify alignment clean (no extra spaces)

**Expected Result**:
- All tooltips follow consistent structure
- Readable and professional appearance
- No formatting artifacts

---

### Task 10: Integration Test with TreeView Features

**Objective**: Verify tooltip enhancement works with other TreeView features.

**Test Scenarios**:

**A. Status Group Expansion**:
1. Expand "In Progress" status group
2. Hover over stories → Verify tooltips show spec progress

**B. Hierarchy View Mode**:
1. Toggle hierarchy view mode (F28)
2. Expand Epic → Feature → Story
3. Hover over story → Verify tooltip shows spec progress

**C. Archive Toggle**:
1. Toggle archived items ON/OFF
2. Hover over stories in both modes
3. Verify tooltips consistent

**D. File Watcher Refresh**:
1. Edit spec plan.md (change status)
2. Save file (triggers refresh)
3. Hover over story → Verify tooltip reflects new status

**E. Manual Refresh**:
1. Click refresh button in TreeView toolbar
2. Hover over stories → Verify tooltips still work

**Expected Result**:
- Tooltip enhancement compatible with all TreeView features
- No regressions in existing functionality
- Cache invalidation works correctly

---

### Task 11: Error Handling and Edge Cases

**Test Cases**:

**A. Malformed Spec plan.md**:
- Spec has invalid YAML frontmatter
- Expected: getSpecProgressCached() returns null, no spec section

**B. Missing Tasks Directory**:
- Spec plan.md exists but no tasks/ subdirectory
- Expected: Phases show as 0/0 or 0/{total from frontmatter}

**C. Phases Frontmatter Mismatch**:
- plan.md says `phases: 5` but only 3 task files exist
- Expected: totalPhases = 5 (from frontmatter takes precedence)

**D. Completed Phases > Total Phases**:
- Data integrity issue: 4 completed out of 3 total
- Expected: Graceful handling, no crashes

**Steps for Each**:
1. Create test scenario
2. Reload TreeView
3. Hover over story
4. Verify no extension errors
5. Check Output Channel for warnings

**Expected Result**:
- All edge cases handled gracefully
- No extension crashes
- Appropriate warnings logged

---

### Task 12: Performance Validation

**Objective**: Confirm tooltip enhancement meets performance targets.

**Target**: < 1ms per tooltip generation (cache hit scenario).

**Steps**:
1. Open Chrome DevTools (Ctrl+Shift+P → "Developer: Toggle Developer Tools")
2. Go to "Performance" tab
3. Start recording
4. Hover over 20 story items with specs
5. Stop recording
6. Analyze flame graph:
   - Find buildTooltip() function calls
   - Measure execution time for each call
   - Expected: < 1ms per call

**Metrics to Record**:
- Average tooltip generation time: ___ms
- Max tooltip generation time: ___ms
- Cache hit rate during test: ___%

**Expected Result**:
- Average < 1ms (cache hit scenario)
- Max < 5ms (worst case)
- Cache hit rate > 99% for buildTooltip calls
- No performance regressions vs baseline

---

### Task 13: Regression Testing

**Objective**: Verify existing functionality unchanged.

**Test Cases**:

**A. Status Badge Display**:
- Status badges still show correctly in description
- No conflicts with spec indicators

**B. Progress Bar Display (Epics/Features)**:
- Parent items still show progress bars
- Spec indicator only on Stories (not Epics/Features)

**C. TreeItem Click Handling**:
- Clicking story opens file
- Tooltip doesn't interfere with click command

**D. Context Menu**:
- Right-click story → Context menu appears
- Tooltip doesn't block context menu

**E. Drag and Drop** (F18 if implemented):
- Dragging story works
- Tooltip doesn't interfere with drag operations

**Expected Result**:
- All existing features work as before
- No regressions introduced by tooltip changes

---

## Completion Criteria

- ✅ All test scenarios pass (Tasks 1-13)
- ✅ Tooltips display correctly for all story/spec combinations
- ✅ Sync warnings appear when appropriate
- ✅ Stories without specs unchanged
- ✅ Edge cases handled gracefully
- ✅ Cache hit rate > 50% (proves reuse)
- ✅ Performance < 1ms per tooltip (average)
- ✅ No TypeScript compilation errors
- ✅ No extension runtime errors
- ✅ No regressions in existing TreeView features
- ✅ Output Channel logs clean (no errors/warnings)

## Next Phase

**S96 Complete!** Mark story as "Ready" and proceed to `/build` for implementation.

## Notes

- Testing should cover both "status" and "hierarchy" view modes (F28)
- Archive toggle feature (S77-S80) should work with spec tooltips
- Performance testing critical - tooltip generation happens frequently during hover
- Cache reuse is key to maintaining performance (avoid redundant file reads)
- Consider creating test fixtures for common scenarios (reusable across tests)
