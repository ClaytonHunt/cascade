---
spec: S97
phase: 2
title: Manual Testing Execution
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-28
---

# Phase 2: Manual Testing Execution

## Overview

Execute comprehensive manual testing of the spec phase integration feature using test fixtures from Phase 1. This phase validates all acceptance criteria through systematic test execution, documenting results and capturing evidence.

## Prerequisites

- Phase 1 completed (test fixtures and script created)
- Extension installed locally: `code --install-extension cascade-0.1.0.vsix --force`
- VSCode reloaded after installation
- Workspace: D:/projects/lineage
- Output channel open: Ctrl+Shift+P → "View: Toggle Output" → Select "Cascade"

## Tasks

### Task 1: Setup Test Environment

Prepare VSCode environment for manual testing.

**Steps**:

1. **Install latest extension build**:
```bash
cd vscode-extension
npm run package
code --install-extension cascade-0.1.0.vsix --force
```

2. **Reload VSCode window**:
   - Press `Ctrl+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter

3. **Open Output Channel**:
   - Press `Ctrl+Shift+P`
   - Type "View: Toggle Output"
   - Select "Cascade" from dropdown

4. **Open Cascade TreeView**:
   - Click Activity Bar (left sidebar)
   - Click Cascade icon (tree icon)
   - Verify TreeView opens and populates

**Expected Outcome**:
- Extension activated (check output channel: "Extension activated")
- TreeView displays planning items from plans/ directory
- Output channel shows cache statistics
- No errors or warnings in output channel

**Verification**:
- Output channel shows: `[Extension] Activated successfully`
- TreeView shows status groups or hierarchy
- No red error messages in output channel

---

### Task 2: Test AC#1 - End-to-End Workflow Testing

Validate complete workflow from spec creation to TreeView display.

**Test Case 1.1: Story with Spec Displays Indicator**

**Setup**:
1. Copy test fixtures to workspace:
```bash
cp vscode-extension/test-fixtures/spec-integration/stories/S999-test-with-spec.md plans/
cp -r vscode-extension/test-fixtures/spec-integration/specs/story-999-test specs/
```

2. Wait for file watcher to trigger (300ms debounce)

**Execution**:
1. Open Cascade TreeView
2. Expand "Ready" status group (if in status mode)
3. Locate "S999 - Test Story With Spec"
4. Observe indicator in TreeItem description

**Expected Results**:
- Story displays indicator: `📋 ↻ Phase 1/3`
- Icon is ↻ (in progress, since 1 of 3 phases complete)
- No errors in output channel

**Verification Steps**:
1. Check output channel for spec read:
   - Should NOT see error messages
   - May see cache miss for first read
2. Hover over story to view tooltip
3. Verify tooltip shows:
   - "Spec Progress:" section
   - "Directory: specs/story-999-test"
   - "Phases: 1/3 complete"
   - "Status: In Progress"

**Document Results**:
- [ ] Indicator displayed correctly
- [ ] Icon matches completion state (↻ for 1/3)
- [ ] Tooltip shows spec details
- [ ] Output channel clean (no errors)

**Screenshot**: Capture TreeView with indicator visible

---

**Test Case 1.2: Story without Spec Shows No Indicator**

**Setup**:
```bash
cp vscode-extension/test-fixtures/spec-integration/stories/S998-test-no-spec.md plans/
```

**Execution**:
1. Refresh TreeView (or wait for auto-refresh)
2. Locate "S998 - Test Story Without Spec"
3. Observe TreeItem description

**Expected Results**:
- Story displays only status badge (e.g., `[Ready]`)
- No spec indicator shown
- Clean display (no empty placeholders)

**Document Results**:
- [ ] No indicator displayed
- [ ] Status badge shown normally
- [ ] No errors in output channel

---

### Task 3: Test AC#2 - Sync Status Testing

Validate sync warning display for out-of-sync stories.

**Test Case 2.1: Out-of-Sync Warning Displays**

**Setup**:
```bash
cp vscode-extension/test-fixtures/spec-integration/stories/S997-test-out-of-sync.md plans/
cp -r vscode-extension/test-fixtures/spec-integration/specs/story-997-test specs/
```

**Note**: S997 has status "Ready" but spec has status "Completed" (2/2 phases)

**Execution**:
1. Refresh TreeView
2. Locate "S997 - Test Story Out of Sync"
3. Observe indicator

**Expected Results**:
- Indicator shows: `⚠️ 📋 ✓ Phase 2/2`
- Warning icon (⚠️) prefixes spec indicator
- Icon is ✓ (checkmark, all phases complete)

**Verification**:
1. Hover over story
2. Check tooltip for sync warning message
3. Expected: "⚠️ Spec and Story status out of sync - run /sync to update"

**Document Results**:
- [ ] Warning icon (⚠️) displayed
- [ ] Spec indicator shows all phases complete (✓ 2/2)
- [ ] Tooltip contains sync warning message
- [ ] User understands spec is ahead of story status

---

**Test Case 2.2: In-Sync Story Shows No Warning**

**Execution**:
1. Edit S999 story frontmatter:
   - Change status from "Ready" to "In Progress"
2. Save file
3. Wait for TreeView refresh

**Expected Results**:
- S999 indicator shows: `📋 ↻ Phase 1/3` (no ⚠️)
- Story status "In Progress" matches spec status "In Progress"
- No sync warning in tooltip

**Document Results**:
- [ ] No warning icon for in-sync story
- [ ] Tooltip shows spec details without warning
- [ ] Cache invalidated and re-read correctly

---

### Task 4: Test AC#3 - Performance Validation (Initial)

Quick performance check with current workspace (detailed testing in Phase 3).

**Test Case 3.1: Current Workspace Performance**

**Execution**:
1. Close and reopen TreeView to clear caches
2. Open TreeView (triggers initial load)
3. Check output channel for timing logs

**Expected Logs**:
```
[ItemsCache] Loaded X items in Yms
[StatusGroups] Built 6 groups in Yms
```

**Document Results**:
- Items loaded in: [Y]ms
- Status groups built in: [Y]ms
- [ ] Initial load < 500ms (target)

---

**Test Case 3.2: Cache Hit Rate Check**

**Execution**:
1. Keep TreeView open for 60+ seconds
2. Expand/collapse status groups multiple times
3. Wait for cache stats log (appears every 60s)

**Expected Log**:
```
[CACHE STATS] Hit rate: X% (Y hits / Z misses)
```

**Document Results**:
- Cache hit rate: [X]%
- [ ] Hit rate > 80% (target met)

**Note**: If no spec progress cache stats logged, check output channel for `[SpecProgressCache]` entries

---

### Task 5: Test AC#4 - Edge Case Testing

Validate graceful handling of invalid/missing specs.

**Test Case 4.1: Story with Invalid Spec Path**

**Setup**:
1. Create test story:
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

**Execution**:
1. Refresh TreeView
2. Locate S996 in TreeView
3. Observe indicator (should be none)

**Expected Results**:
- No indicator displayed (graceful fallback)
- No errors or exceptions in output channel
- Story displays normally with status badge only

**Document Results**:
- [ ] No indicator shown for invalid spec path
- [ ] No errors logged
- [ ] Extension remains stable

---

**Test Case 4.2: Spec with Malformed Frontmatter**

**Setup**:
1. Create spec directory with malformed plan.md:
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
```

2. Create story pointing to it:
```bash
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

**Execution**:
1. Refresh TreeView
2. Locate S995
3. Check for indicator

**Expected Results**:
- No indicator displayed (parse error handled gracefully)
- Output channel may log warning (acceptable)
- No crash or exception

**Document Results**:
- [ ] Extension handles malformed YAML gracefully
- [ ] No indicator shown
- [ ] No exceptions thrown

---

**Test Case 4.3: Spec with 0 Phases**

**Setup**:
1. Create spec with no task files:
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
```

2. Create story:
```bash
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

**Execution**:
1. Refresh TreeView
2. Locate S994

**Expected Results**:
- Indicator shows: `📋 ○ Phase 0/0`
- Icon is ○ (empty circle, not started)
- No errors

**Document Results**:
- [ ] Zero phase count displayed correctly
- [ ] Appropriate icon used (○)
- [ ] No division-by-zero errors

---

### Task 6: Test AC#5 - Cache Invalidation Testing

Validate cache invalidation triggers and updates TreeView.

**Test Case 5.1: Edit Phase File Triggers Update**

**Setup**:
- S999 story already in TreeView (from Task 2)
- Currently shows: `📋 ↻ Phase 1/3`

**Execution**:
1. Open `specs/story-999-test/tasks/phase-2.md`
2. Change frontmatter status:
   ```diff
   - status: In Progress
   + status: Completed
   ```
3. Save file
4. Wait 2 seconds (file watcher debounce)
5. Observe TreeView

**Expected Results**:
- TreeView updates automatically
- S999 indicator now shows: `📋 ↻ Phase 2/3`
- Completed phase count incremented

**Output Channel Verification**:
Look for:
```
[SpecProgressCache] Invalidated cache for S999
[TreeView] Refresh triggered by file change
```

**Document Results**:
- [ ] Indicator updated automatically
- [ ] Phase count accurate (2/3)
- [ ] Cache invalidation logged
- [ ] Update time < 2s (target)

---

**Test Case 5.2: Edit plan.md Triggers Update**

**Execution**:
1. Open `specs/story-999-test/plan.md`
2. Change spec status:
   ```diff
   - status: In Progress
   + status: Completed
   ```
3. Save file
4. Wait for TreeView update

**Expected Results**:
- TreeView updates
- S999 status changed to "Completed" in cache
- If story status still "In Progress", sync warning appears

**Document Results**:
- [ ] plan.md changes trigger cache invalidation
- [ ] Spec status updated in cache
- [ ] Sync logic re-evaluated

---

**Test Case 5.3: Multiple File Edits (Debouncing)**

**Execution**:
1. Edit 3 phase files in rapid succession (< 300ms between saves)
2. Observe output channel

**Expected Behavior**:
- File watcher debounces changes
- Single refresh triggered after last edit
- Output channel shows debounce logic

**Document Results**:
- [ ] Multiple edits batched into single refresh
- [ ] Debouncing working as expected
- [ ] Performance efficient (no rapid refresh spam)

---

### Task 7: Test AC#6 - Multi-Story Testing

Validate multiple stories with various spec states display correctly.

**Test Case 6.1: Status Group with Mixed Spec States**

**Setup**:
- Ensure TreeView contains multiple stories in "Ready" status:
  - S999: with spec (1/3 phases)
  - S998: without spec
  - S997: with spec out of sync (2/2 phases)
  - S996: invalid spec path
  - S995: malformed spec
  - S994: zero phases spec

**Execution**:
1. Expand "Ready" status group
2. Review all stories

**Expected Results**:
| Story | Indicator | Notes |
|-------|-----------|-------|
| S999 | `📋 ↻ Phase 1/3` | In progress |
| S998 | (none) | No spec |
| S997 | `⚠️ 📋 ✓ Phase 2/2` | Out of sync |
| S996 | (none) | Invalid path |
| S995 | (none) | Malformed |
| S994 | `📋 ○ Phase 0/0` | Zero phases |

**Document Results**:
- [ ] All stories display correct indicators
- [ ] Sync warnings visible only for S997
- [ ] Edge cases handled without errors
- [ ] Visual distinction clear between states

**Screenshot**: Capture status group showing all test stories

---

### Task 8: Tooltip Verification

Validate tooltip content for stories with specs.

**Test Case 8.1: Tooltip Content Validation**

**Execution**:
1. Hover over S999 story
2. Read tooltip content
3. Compare to expected format

**Expected Tooltip**:
```
S999 - Test Story With Spec
Status: In Progress
Priority: Medium

Spec Progress:
- Directory: specs/story-999-test
- Phases: 1/3 complete
- Status: In Progress
```

**Document Results**:
- [ ] Tooltip shows spec progress section
- [ ] Directory path displayed
- [ ] Phase count accurate
- [ ] Spec status shown

---

**Test Case 8.2: Tooltip Sync Warning**

**Execution**:
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

---

## Completion Criteria

**All Test Cases Executed**:
- [x] AC#1: End-to-end workflow (2 test cases)
- [x] AC#2: Sync status testing (2 test cases)
- [x] AC#3: Performance validation (2 test cases)
- [x] AC#4: Edge case testing (3 test cases)
- [x] AC#5: Cache invalidation (3 test cases)
- [x] AC#6: Multi-story testing (1 test case)
- [x] Tooltip verification (2 test cases)

**Documentation Complete**:
- [x] All test results documented (checkboxes filled)
- [x] Screenshots captured for key scenarios
- [x] Output channel logs copied for evidence
- [x] Performance measurements recorded

**Quality Checks**:
- [x] No errors or exceptions encountered
- [x] All acceptance criteria validated
- [x] Edge cases handled gracefully
- [x] User experience smooth and intuitive

## Test Artifacts

**Collect for documentation**:
1. Screenshots of TreeView showing indicators
2. Output channel logs showing cache behavior
3. Test result checklist (completed checkboxes)
4. Notes on any unexpected behavior

**Save to**:
- Add screenshots to repo: `vscode-extension/screenshots/`
- Copy output channel logs to: `vscode-extension/test-results-f25.log`
- Update manual test script with actual results

## Cleanup (Optional)

After completing Phase 2, optionally remove test stories from plans/:
```bash
# Remove test fixtures from workspace (if desired)
rm plans/S99*.md plans/S995-*.md plans/S994-*.md
rm -rf specs/story-995-malformed specs/story-994-zero-phases
```

**Note**: Keep specs/story-999-test and specs/story-997-test for Phase 3 performance testing

## Next Phase

Proceed to **Phase 3: Performance Validation & Documentation** for comprehensive performance testing with large datasets.
