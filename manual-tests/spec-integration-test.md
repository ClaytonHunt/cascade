# Spec Integration End-to-End Test Script

## Overview

This manual test script provides step-by-step instructions for comprehensive testing and validation of the spec phase integration feature (F25). Execute all tests to verify the feature meets acceptance criteria and performs within target thresholds.

**Related Stories**: S93-S97 (Spec Phase Integration)
**Test Type**: Manual testing with automated fixtures
**Duration**: ~2-3 hours for complete execution

---

## Test Environment Setup

### Prerequisites

- **VSCode**: Version 1.80+ recommended
- **Extension**: Cascade v0.1.0 installed
- **Workspace**: D:/projects/lineage (or equivalent)
- **Test fixtures**: Created in Phase 1 (Task 3-5)

### Installation Steps

1. **Package extension** (if testing local changes):
   ```bash
   cd vscode-extension
   npm run compile
   npm run package
   ```

2. **Install extension**:
   ```bash
   code --install-extension cascade-0.1.0.vsix --force
   ```

3. **Reload VSCode window**:
   - Press `Ctrl+Shift+P`
   - Type: "Developer: Reload Window"
   - Press Enter

4. **Open Output Channel**:
   - Press `Ctrl+Shift+P`
   - Type: "View: Toggle Output"
   - Select "Cascade" from dropdown
   - Keep this visible for all tests

5. **Open Cascade TreeView**:
   - Click Cascade icon in Activity Bar (left sidebar)
   - Verify TreeView loads and populates

### Verify Installation

- ✅ Output channel shows: `[Extension] Activated successfully`
- ✅ TreeView displays planning items from plans/ directory
- ✅ No errors or warnings in output channel

---

## Test 1: End-to-End Workflow Testing (AC#1)

### Test 1.1: Story with Spec Displays Indicator

**Objective**: Verify stories with spec field display phase indicators

**Setup**:
1. Copy test fixtures to workspace:
   ```bash
   cp vscode-extension/test-fixtures/spec-integration/stories/S999-test-with-spec.md plans/
   cp -r vscode-extension/test-fixtures/spec-integration/specs/story-999-test specs/
   ```

2. Wait 2 seconds for file watcher to detect changes

**Execution Steps**:
1. Open Cascade TreeView (if not already open)
2. Expand "Ready" status group (or locate in hierarchy mode)
3. Find "S999 - Test Story With Spec"
4. Read the TreeItem description

**Expected Results**:
- ✅ Indicator displayed: `📋 ↻ Phase 1/3`
- ✅ Icon is ↻ (in progress symbol)
- ✅ Phase count shows 1 completed out of 3 total
- ✅ No errors in output channel

**Tooltip Verification**:
1. Hover mouse over S999 story
2. Read tooltip content
3. Verify contains:
   ```
   Spec Progress:
   - Directory: specs/story-999-test
   - Phases: 1/3 complete
   - Status: In Progress
   ```

**Document Results**:
- [ ] Indicator displayed correctly
- [ ] Icon matches completion state
- [ ] Tooltip shows spec details
- [ ] No errors in output channel

**Notes**: _________________________________________

---

### Test 1.2: Story Without Spec Shows No Indicator

**Objective**: Verify stories without spec field show no indicator

**Setup**:
```bash
cp vscode-extension/test-fixtures/spec-integration/stories/S998-test-no-spec.md plans/
```

**Execution Steps**:
1. Wait for TreeView auto-refresh (or manually refresh)
2. Locate "S998 - Test Story Without Spec"
3. Observe TreeItem description

**Expected Results**:
- ✅ No spec indicator shown
- ✅ Status badge displayed normally (e.g., `[Ready]`)
- ✅ Clean display (no empty placeholders)
- ✅ No errors or warnings in output channel

**Document Results**:
- [ ] No indicator displayed
- [ ] Status badge shown normally
- [ ] No errors logged

**Notes**: _________________________________________

---

### Test 1.3: Edit Phase File Updates TreeView

**Objective**: Verify cache invalidation triggers automatic updates

**Setup**:
- S999 story already in TreeView (from Test 1.1)
- Currently shows: `📋 ↻ Phase 1/3`

**Execution Steps**:
1. Open file: `specs/story-999-test/tasks/phase-2.md`
2. Change frontmatter status:
   ```diff
   - status: In Progress
   + status: Completed
   ```
3. Save file
4. Wait 2 seconds (file watcher debounce)
5. Observe S999 in TreeView

**Expected Results**:
- ✅ TreeView updates automatically (no manual refresh needed)
- ✅ Indicator now shows: `📋 ↻ Phase 2/3`
- ✅ Completed phase count incremented

**Output Channel Verification**:
Look for logs:
```
[SpecProgressCache] Invalidated cache for S999
[TreeView] Refresh triggered by file change
```

**Document Results**:
- [ ] Indicator updated automatically
- [ ] Phase count accurate (2/3)
- [ ] Cache invalidation logged
- [ ] Update time < 2s

**Notes**: _________________________________________

---

## Test 2: Sync Status Testing (AC#2)

### Test 2.1: Out-of-Sync Warning Displays

**Objective**: Verify sync warning appears when spec and story status mismatch

**Setup**:
```bash
cp vscode-extension/test-fixtures/spec-integration/stories/S997-test-out-of-sync.md plans/
cp -r vscode-extension/test-fixtures/spec-integration/specs/story-997-test specs/
```

**Note**: S997 has status "Ready" but spec has status "Completed" (2/2 phases)

**Execution Steps**:
1. Wait for TreeView refresh
2. Locate "S997 - Test Story Out of Sync"
3. Read indicator

**Expected Results**:
- ✅ Warning icon displayed: `⚠️ 📋 ✓ Phase 2/2`
- ✅ ⚠️ appears before spec indicator
- ✅ Icon is ✓ (checkmark, all phases complete)

**Tooltip Verification**:
1. Hover over S997
2. Verify tooltip contains:
   ```
   Spec Progress:
   - Directory: specs/story-997-test
   - Phases: 2/2 complete
   - Status: Completed

   ⚠️ Spec and Story status out of sync - run /sync to update
   ```

**Document Results**:
- [ ] Warning icon (⚠️) displayed
- [ ] Spec indicator shows all phases complete
- [ ] Tooltip contains sync warning message
- [ ] Warning clearly explains issue

**Notes**: _________________________________________

---

### Test 2.2: In-Sync Story Shows No Warning

**Objective**: Verify no warning appears when statuses match

**Setup**:
- Use S999 from Test 1.1 (status "Ready", spec "In Progress")

**Execution Steps**:
1. Edit S999 story frontmatter:
   ```diff
   - status: Ready
   + status: In Progress
   ```
2. Save file
3. Wait for TreeView refresh
4. Check S999 indicator

**Expected Results**:
- ✅ No warning icon: `📋 ↻ Phase 2/3` (no ⚠️)
- ✅ Story status "In Progress" matches spec status "In Progress"
- ✅ Tooltip shows spec details without warning

**Document Results**:
- [ ] No warning icon for in-sync story
- [ ] Tooltip clean (no warning message)
- [ ] Cache invalidated and re-read correctly

**Notes**: _________________________________________

---

## Test 3: Performance Validation (AC#3)

### Test 3.1: Current Workspace Performance (Quick Check)

**Objective**: Baseline performance measurement with current workspace

**Execution Steps**:
1. Close Cascade TreeView
2. Reload VSCode window (clear caches)
3. Open Output Channel (View > Output > "Cascade")
4. Open Cascade TreeView
5. Record timing from output channel

**Expected Output Channel Logs**:
```
[ItemsCache] Loaded X items in Yms
[StatusGroups] Built 6 groups in Zms
```

**Document Results**:
- Items loaded: _______ items
- Load time: _______ ms
- Status groups time: _______ ms
- [ ] Initial load < 500ms (target)

**Notes**: _________________________________________

---

### Test 3.2: Cache Hit Rate Check

**Objective**: Verify cache efficiency after initial load

**Execution Steps**:
1. Keep TreeView open (from Test 3.1)
2. Expand/collapse status groups 5-10 times
3. Switch between status and hierarchy modes (if applicable)
4. Wait 60+ seconds
5. Check output channel for cache statistics

**Expected Log**:
```
[CACHE STATS] Hit rate: X% (Y hits / Z misses)
```

**Document Results**:
- Cache hits: _______
- Cache misses: _______
- Hit rate: _______ %
- [ ] Hit rate > 80% (target)

**Notes**: _________________________________________

---

## Test 4: Edge Case Testing (AC#4)

### Test 4.1: Story with Invalid Spec Path

**Objective**: Verify graceful handling of invalid spec paths

**Setup**:
```bash
cat > plans/S996-invalid-spec.md << 'EOF'
---
item: S996
title: Test Invalid Spec Path
type: story
status: Ready
spec: specs/non-existent-directory
priority: Low
---

# S996 - Test Invalid Spec Path
EOF
```

**Execution Steps**:
1. Wait for TreeView refresh
2. Locate S996 in TreeView
3. Observe indicator

**Expected Results**:
- ✅ No indicator displayed
- ✅ Story displays normally with status badge
- ✅ No errors or exceptions in output channel
- ✅ Extension remains stable

**Document Results**:
- [ ] No indicator shown for invalid path
- [ ] No errors logged
- [ ] Extension stable

**Notes**: _________________________________________

---

### Test 4.2: Spec with Malformed Frontmatter

**Objective**: Verify graceful handling of parse errors

**Setup**:
```bash
mkdir -p specs/story-995-malformed/tasks

cat > specs/story-995-malformed/plan.md << 'EOF'
---
spec: S995
title: Missing closing delimiter
type: spec
status: In Progress

# This frontmatter is missing the closing ---

# S995 Plan

Invalid YAML structure.
EOF

cat > plans/S995-malformed.md << 'EOF'
---
item: S995
title: Test Malformed Spec
type: story
status: Ready
spec: specs/story-995-malformed
priority: Low
---

# S995 - Test Malformed Spec
EOF
```

**Execution Steps**:
1. Wait for TreeView refresh
2. Locate S995
3. Check for indicator

**Expected Results**:
- ✅ No indicator displayed
- ✅ Output channel may log warning (acceptable)
- ✅ No crash or exception
- ✅ Extension continues to function

**Document Results**:
- [ ] Malformed YAML handled gracefully
- [ ] No indicator shown
- [ ] No exceptions thrown

**Notes**: _________________________________________

---

### Test 4.3: Spec with 0 Phases

**Objective**: Verify handling of edge case (zero phases)

**Setup**:
```bash
mkdir -p specs/story-994-zero-phases

cat > specs/story-994-zero-phases/plan.md << 'EOF'
---
spec: S994
title: Zero Phases Spec
type: spec
status: Not Started
phases: 0
---

# S994 - Zero Phases

This spec has no phases.
EOF

cat > plans/S994-zero-phases.md << 'EOF'
---
item: S994
title: Test Zero Phases
type: story
status: Ready
spec: specs/story-994-zero-phases
priority: Low
---

# S994 - Test Zero Phases
EOF
```

**Execution Steps**:
1. Wait for TreeView refresh
2. Locate S994

**Expected Results**:
- ✅ Indicator shows: `📋 ○ Phase 0/0`
- ✅ Icon is ○ (empty circle, not started)
- ✅ No errors or division-by-zero issues

**Document Results**:
- [ ] Zero phase count displayed correctly
- [ ] Appropriate icon used (○)
- [ ] No errors

**Notes**: _________________________________________

---

## Test 5: Cache Invalidation Testing (AC#5)

### Test 5.1: Edit plan.md Triggers Update

**Objective**: Verify plan.md changes invalidate cache

**Setup**:
- Use S999 from previous tests

**Execution Steps**:
1. Open `specs/story-999-test/plan.md`
2. Change spec status:
   ```diff
   - status: In Progress
   + status: Completed
   ```
3. Save file
4. Wait for TreeView update

**Expected Results**:
- ✅ TreeView updates
- ✅ Spec status changed in cache
- ✅ Cache invalidation logged

**Document Results**:
- [ ] plan.md changes trigger invalidation
- [ ] Spec status updated
- [ ] Update time < 2s

**Notes**: _________________________________________

---

### Test 5.2: Multiple File Edits (Debouncing)

**Objective**: Verify file watcher debouncing works efficiently

**Execution Steps**:
1. Edit 3 phase files in rapid succession (< 300ms between saves)
2. Observe output channel

**Expected Behavior**:
- ✅ File watcher debounces changes
- ✅ Single refresh triggered (or minimal refreshes)
- ✅ No UI freezing or lag

**Document Results**:
- [ ] Multiple edits batched into single refresh
- [ ] Debouncing effective
- [ ] UI remained responsive

**Notes**: _________________________________________

---

## Test 6: Multi-Story Testing (AC#6)

### Test 6.1: Status Group with Mixed Spec States

**Objective**: Verify multiple stories with various states display correctly

**Setup**:
- Ensure TreeView contains test stories:
  - S999: with spec (2/3 phases)
  - S998: without spec
  - S997: with spec out of sync (2/2 phases)
  - S996: invalid spec path
  - S995: malformed spec
  - S994: zero phases spec

**Execution Steps**:
1. Expand "Ready" status group
2. Review all test stories

**Expected Results Table**:

| Story | Expected Indicator | Notes |
|-------|-------------------|-------|
| S999 | `📋 ↻ Phase 2/3` | In progress |
| S998 | (none) | No spec field |
| S997 | `⚠️ 📋 ✓ Phase 2/2` | Out of sync |
| S996 | (none) | Invalid path |
| S995 | (none) | Malformed |
| S994 | `📋 ○ Phase 0/0` | Zero phases |

**Document Results**:
- [ ] All stories display correct indicators
- [ ] Sync warnings visible only for S997
- [ ] Edge cases handled without errors
- [ ] Visual distinction clear

**Screenshot Location**: ___________________________

**Notes**: _________________________________________

---

## Test 7: Tooltip Content Verification

### Test 7.1: Standard Tooltip Content

**Objective**: Verify tooltip format and content

**Execution Steps**:
1. Hover over S999 story
2. Read tooltip content

**Expected Tooltip Format**:
```
S999 - Test Story With Spec
Status: In Progress
Priority: Medium

Spec Progress:
- Directory: specs/story-999-test
- Phases: 2/3 complete
- Status: In Progress
```

**Document Results**:
- [ ] Tooltip shows spec progress section
- [ ] Directory path displayed
- [ ] Phase count accurate
- [ ] Spec status shown

**Notes**: _________________________________________

---

### Test 7.2: Tooltip Sync Warning

**Objective**: Verify sync warning appears in tooltip

**Execution Steps**:
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

**Document Results**:
- [ ] Sync warning message present
- [ ] Warning clearly explains issue
- [ ] Suggests /sync command

**Notes**: _________________________________________

---

## Test Summary

### Test Execution Checklist

**Acceptance Criteria Validation**:
- [ ] AC#1: End-to-end workflow (3 test cases)
- [ ] AC#2: Sync status testing (2 test cases)
- [ ] AC#3: Performance validation (2 test cases)
- [ ] AC#4: Edge case testing (3 test cases)
- [ ] AC#5: Cache invalidation (2 test cases)
- [ ] AC#6: Multi-story testing (1 test case)
- [ ] Tooltip verification (2 test cases)

**Total Test Cases**: 15

**Quality Checks**:
- [ ] No errors or exceptions encountered
- [ ] All acceptance criteria validated
- [ ] Edge cases handled gracefully
- [ ] User experience smooth and intuitive

---

## Test Artifacts Collection

**After completing all tests, collect**:

1. **Screenshots**:
   - TreeView showing indicators for mixed story states
   - Tooltip with spec progress section
   - Tooltip with sync warning
   - Save to: `vscode-extension/screenshots/`

2. **Output Channel Logs**:
   - Cache statistics (hit rate)
   - Cache invalidation events
   - File watcher triggers
   - Save to: `vscode-extension/test-results-f25.log`

3. **Performance Measurements**:
   - Initial load time
   - Cache hit rate percentage
   - File watcher response time
   - Record in: `vscode-extension/performance-results.md` (Phase 3)

---

## Cleanup (Optional)

After completing manual tests, optionally remove test fixtures from workspace:

```bash
# Remove test stories
rm plans/S999-*.md plans/S998-*.md plans/S997-*.md plans/S996-*.md plans/S995-*.md plans/S994-*.md

# Remove test specs (keep for Phase 3 if doing performance testing)
# rm -rf specs/story-999-test specs/story-997-test specs/story-995-malformed specs/story-994-zero-phases
```

**Recommendation**: Keep specs/story-999-test and specs/story-997-test for Phase 3 performance testing.

---

## Next Steps

After completing this manual test script:

1. **Document Results**: Fill in all checkboxes and notes sections
2. **Capture Evidence**: Take screenshots and save output channel logs
3. **Review Failures**: Investigate any failed tests or unexpected behavior
4. **Proceed to Phase 3**: Execute performance validation with large dataset (50+ stories)

---

## Notes Section

**Overall Test Execution Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Issues Encountered**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Recommendations**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Test Completed By**: ___________________________
**Test Date**: ___________________________
**Total Duration**: ___________________________
**Pass Rate**: _______ / 15 tests passed
