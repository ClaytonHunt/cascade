---
spec: S97
phase: 1
title: Test Infrastructure Setup
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-28
---

# Phase 1: Test Infrastructure Setup

## Overview

Set up the testing infrastructure for comprehensive end-to-end validation of the spec phase integration feature. This phase creates manual test scripts, test fixtures, and performance testing templates without modifying any implementation code.

## Prerequisites

- S93-S96 completed (all spec integration components implemented)
- Extension packaged and installable locally
- Understanding of VSCode extension testing workflow from CLAUDE.md
- Access to `generate-test-data.js` script for performance testing

## Tasks

### Task 1: Create Manual Test Script Directory

Create directory structure for manual testing documentation.

**Implementation**:
```bash
# Create manual tests directory
mkdir -p vscode-extension/manual-tests
```

**Expected Outcome**:
- `vscode-extension/manual-tests/` directory exists
- Directory ready for test script file

**Verification**:
```bash
ls vscode-extension/manual-tests/
```

---

### Task 2: Write Manual Test Script

Create comprehensive step-by-step manual test script covering all acceptance criteria.

**File**: `vscode-extension/manual-tests/spec-integration-test.md`

**Content Structure**:
```markdown
# Spec Integration End-to-End Test Script

## Test Environment Setup
- VSCode version requirement
- Extension installation steps
- Workspace configuration

## Test 1: Basic Spec Indicator Display
### Setup
- Create test story with spec field
- Create spec directory with phases

### Execution Steps
1. Open Cascade TreeView
2. Locate test story
3. Verify indicator appears

### Expected Results
- Indicator format: "📋 {icon} Phase X/Y"
- Icon matches completion state
- No errors in output channel

## Test 2: Cache Invalidation
### Setup
- Story with spec visible in TreeView

### Execution Steps
1. Edit phase file status
2. Save file
3. Wait 2 seconds (debounce)
4. Verify TreeView updates

### Expected Results
- Indicator updates automatically
- Output channel logs cache invalidation
- New phase count displayed

## Test 3: Sync Warning Display
[Continue for all acceptance criteria...]
```

**Reference**:
- S97 story acceptance criteria (lines 24-72)
- S97 testing workflow (lines 74-169)
- CLAUDE.md performance testing section

**Implementation Guide**:
1. Open `plans/epic-05-rich-treeview-visualization/feature-25-spec-phase-integration/story-97-spec-integration-testing.md`
2. Copy acceptance criteria sections
3. Transform each criterion into test case with:
   - Setup instructions (files to create, initial state)
   - Execution steps (user actions)
   - Expected results (what should happen)
   - Verification steps (how to confirm)

**Expected Outcome**:
- Complete test script covering:
  - End-to-end workflow testing (AC #1)
  - Sync status testing (AC #2)
  - Performance validation (AC #3)
  - Edge case testing (AC #4)
  - Cache invalidation testing (AC #5)
  - Multi-story testing (AC #6)

**Verification**:
- Test script is readable and actionable
- Each test has clear setup, execution, and verification steps
- All S97 acceptance criteria mapped to test cases

---

### Task 3: Create Test Fixtures Directory Structure

Set up directory structure for test data files.

**Implementation**:
```bash
# Create test fixtures directory
mkdir -p vscode-extension/test-fixtures/spec-integration/stories
mkdir -p vscode-extension/test-fixtures/spec-integration/specs
```

**Expected Outcome**:
- `vscode-extension/test-fixtures/spec-integration/` directory exists
- Subdirectories for stories and specs created

**Verification**:
```bash
tree vscode-extension/test-fixtures/spec-integration/
```

---

### Task 4: Create Test Story Fixtures

Create sample story files representing various spec states.

**File 1**: `vscode-extension/test-fixtures/spec-integration/stories/S999-test-with-spec.md`

```markdown
---
item: S999
title: Test Story With Spec
type: story
parent: F25
status: Ready
spec: specs/story-999-test
priority: Medium
estimate: S
created: 2025-10-27
updated: 2025-10-27
---

# S999 - Test Story With Spec

## Description
Test story for validating spec phase indicator display.
This story has an associated spec directory with 3 phases.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

**File 2**: `vscode-extension/test-fixtures/spec-integration/stories/S998-test-no-spec.md`

```markdown
---
item: S998
title: Test Story Without Spec
type: story
parent: F25
status: Ready
priority: Low
estimate: S
created: 2025-10-27
updated: 2025-10-27
---

# S998 - Test Story Without Spec

## Description
Test story without spec field for validating graceful handling.
Should display no indicator.

## Acceptance Criteria
- [ ] Criterion 1
```

**File 3**: `vscode-extension/test-fixtures/spec-integration/stories/S997-test-out-of-sync.md`

```markdown
---
item: S997
title: Test Story Out of Sync
type: story
parent: F25
status: Ready
spec: specs/story-997-test
priority: High
estimate: M
created: 2025-10-27
updated: 2025-10-27
---

# S997 - Test Story Out of Sync

## Description
Test story with spec status ahead of story status.
Should display sync warning (⚠️).

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

**Expected Outcome**:
- 3 test story files created
- Various states: with spec, without spec, out of sync
- Ready for TreeView testing

**Verification**:
```bash
ls vscode-extension/test-fixtures/spec-integration/stories/
# Should show: S999-test-with-spec.md, S998-test-no-spec.md, S997-test-out-of-sync.md
```

---

### Task 5: Create Test Spec Fixtures

Create sample spec directories with phase files.

**Spec 1**: story-999-test (In Progress, 1 of 3 phases complete)

**File**: `vscode-extension/test-fixtures/spec-integration/specs/story-999-test/plan.md`

```markdown
---
spec: S999
title: Test Spec In Progress
type: spec
status: In Progress
priority: Medium
phases: 3
created: 2025-10-27
updated: 2025-10-27
---

# S999 Test Spec

## Overview
Test spec for validating phase indicator display.

## Phases
1. Phase 1 - Completed
2. Phase 2 - In Progress
3. Phase 3 - Not Started
```

**Create phase files**:

`vscode-extension/test-fixtures/spec-integration/specs/story-999-test/tasks/phase-1.md`:
```markdown
---
spec: S999
phase: 1
title: Test Phase 1
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 1: Test Phase 1

## Overview
First phase (completed).
```

`vscode-extension/test-fixtures/spec-integration/specs/story-999-test/tasks/phase-2.md`:
```markdown
---
spec: S999
phase: 2
title: Test Phase 2
status: In Progress
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 2: Test Phase 2

## Overview
Second phase (in progress).
```

`vscode-extension/test-fixtures/spec-integration/specs/story-999-test/tasks/phase-3.md`:
```markdown
---
spec: S999
phase: 3
title: Test Phase 3
status: Not Started
priority: Medium
created: 2025-10-27
updated: 2025-10-27
---

# Phase 3: Test Phase 3

## Overview
Third phase (not started).
```

**Spec 2**: story-997-test (Completed, out of sync with Ready story)

**File**: `vscode-extension/test-fixtures/spec-integration/specs/story-997-test/plan.md`

```markdown
---
spec: S997
title: Test Spec Completed
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-27
updated: 2025-10-27
---

# S997 Test Spec (Out of Sync)

## Overview
Test spec with Completed status while story is Ready.
Should trigger sync warning.
```

**Create phase files**:

`vscode-extension/test-fixtures/spec-integration/specs/story-997-test/tasks/phase-1.md`:
```markdown
---
spec: S997
phase: 1
title: Test Phase 1
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 1: Completed
```

`vscode-extension/test-fixtures/spec-integration/specs/story-997-test/tasks/phase-2.md`:
```markdown
---
spec: S997
phase: 2
title: Test Phase 2
status: Completed
priority: High
created: 2025-10-27
updated: 2025-10-27
---

# Phase 2: Completed
```

**Implementation Commands**:
```bash
# Create spec directories
mkdir -p vscode-extension/test-fixtures/spec-integration/specs/story-999-test/tasks
mkdir -p vscode-extension/test-fixtures/spec-integration/specs/story-997-test/tasks

# Create files (use Write tool or echo)
```

**Expected Outcome**:
- 2 spec directories created
- Each with plan.md and phase files
- Various states: in progress (1/3), completed (2/2) and out of sync

**Verification**:
```bash
tree vscode-extension/test-fixtures/spec-integration/specs/
# Should show full directory structure
```

---

### Task 6: Update Performance Results Template

Add F25 performance testing section to existing performance-results.md.

**File**: `vscode-extension/performance-results.md`

**Add section after existing content** (after line 380):

```markdown
---

## F25: Spec Phase Integration Performance Testing

### Test Date
Date: [To be filled during Phase 3]
Tester: [Name]
VSCode Version: [Version]

### Test Configuration
- **Workspace**: D:/projects/lineage
- **Extension Version**: 0.1.0 (Cascade)
- **Test Method**: Manual execution with output channel monitoring

### Test Scenarios

#### Scenario 1: Baseline with Real Specs (Current Workspace)
**Dataset**: Real specs from specs/ directory
**Story count**: [Count stories with spec field]
**Spec count**: [Count spec directories]

**Metrics**:
- Initial load time: [From output channel: "[ItemsCache] Loaded X items in Yms"]
- TreeView refresh time: [From output: "[StatusGroups] Built X groups in Yms"]
- Cache hit rate: [From output: "[CACHE STATS] Hit rate: X%"]

**Target Compliance**:
- [ ] TreeView refresh < 500ms
- [ ] Cache hit rate > 80%
- [ ] No UI lag observed

---

#### Scenario 2: Performance Test with 50 Stories (30 with Specs)
**Dataset**: Generated using generate-test-data.js + manual spec creation
**Story count**: 50
**Stories with specs**: 30 (60% coverage)

**Setup**:
```bash
cd vscode-extension/scripts
node generate-test-data.js 50 test-plans-f25
# Manually add spec field to 30 stories
# Create corresponding spec directories
```

**Metrics**:
- Initial load time: [TBD]
- Spec reading time: [From output: average per spec]
- Cache hit rate: [TBD]
- Refresh cycle time: [TBD]

**Target Compliance**:
- [ ] TreeView refresh < 500ms (PRIMARY TARGET)
- [ ] Cache hit rate > 80%
- [ ] File watcher response < 2s
- [ ] No UI blocking

---

#### Scenario 3: Cache Invalidation Performance
**Test**: Edit spec phase file, measure update time

**Procedure**:
1. Open TreeView with cached specs
2. Edit phase file in specs/ directory
3. Save file
4. Measure time from save to TreeView update

**Metrics**:
- File watcher detection time: [From output: timestamp diff]
- Cache invalidation time: [From output: "[SpecProgressCache] Invalidated cache for SX"]
- TreeView refresh time: [From output: refresh cycle time]
- Total update time: [Sum of above]

**Target Compliance**:
- [ ] Total update time < 2s
- [ ] Cache invalidation logged in output channel
- [ ] Correct spec cache entry invalidated (not full clear)

---

### Cache Behavior Analysis

#### Expected Cache Pattern
```
Initial Load:
  - loadAllPlanningItems() → MISS → Load items
  - getSpecProgress(S93) → MISS → Read spec dir
  - getSpecProgress(S94) → MISS → Read spec dir
  - ... (first call for each story)

Subsequent TreeView Refreshes:
  - loadAllPlanningItems() → HIT (items cache)
  - getSpecProgress(S93) → HIT (spec progress cache)
  - getSpecProgress(S94) → HIT (spec progress cache)
  - ... (all cached)

After Spec File Edit:
  - File watcher triggers
  - invalidateSpecProgress(S93) → Clear single cache entry
  - TreeView refresh → getSpecProgress(S93) → MISS → Re-read
  - Other specs remain cached → HIT
```

#### Cache Statistics
| Operation | Cache Hits | Cache Misses | Hit Rate | Target Met |
|-----------|-----------|--------------|----------|------------|
| Initial load | [TBD] | [TBD] | [TBD]% | [ ] |
| Second refresh | [TBD] | [TBD] | [TBD]% | [ ] |
| After edit (affected) | [TBD] | [TBD] | [TBD]% | [ ] |
| After edit (others) | [TBD] | [TBD] | [TBD]% | [ ] |

**Target**: > 80% hit rate after initial load

---

### Edge Case Performance

#### Test: Invalid Spec Paths
- Story with invalid spec path (directory doesn't exist)
- Expected: Return null quickly, no exceptions
- Measured time: [TBD]
- Target: < 5ms per invalid spec

#### Test: Malformed Spec Frontmatter
- Spec with invalid YAML frontmatter
- Expected: Graceful fallback, no crash
- Measured time: [TBD]
- Target: < 10ms (parse error handling)

#### Test: Large Phase Count (10+ phases)
- Spec with 10 phase files
- Expected: Read all phases, count correctly
- Measured time: [TBD]
- Target: < 50ms (proportional to phase count)

---

### Performance Summary

#### All Targets Met?
- [ ] TreeView refresh < 500ms with 30+ specs
- [ ] Cache hit rate > 80% after initial load
- [ ] File watcher response < 2s
- [ ] No UI blocking or lag
- [ ] Edge cases handled gracefully (< 50ms)

#### Performance Grade
**Grade**: [A/B/C/D]
- A: All targets met, excellent performance
- B: Most targets met, good performance
- C: Some targets missed, acceptable performance
- D: Multiple targets missed, optimization needed

**Comments**: [Overall assessment]

---

### Recommendations

#### Production Readiness
- [ ] Feature ready for production use
- [ ] No performance regressions observed
- [ ] Cache behavior as expected
- [ ] Edge cases handled safely

#### Future Optimization Opportunities
- [ ] Consider lazy-loading specs (defer read until TreeItem expanded)
- [ ] Implement spec warmup cache on extension activation
- [ ] Add pagination for status groups with > 50 specs
- [ ] Optimize phase file reading (batch reads vs sequential)

---

### Test Artifacts

**Test Data Location**:
- Test fixtures: `vscode-extension/test-fixtures/spec-integration/`
- Test scripts: `vscode-extension/manual-tests/spec-integration-test.md`
- Output channel logs: [Copy relevant sections below]

**Output Channel Samples**:
```
[Paste output channel logs showing:
 - ItemsCache load times
 - Spec progress cache hits/misses
 - Cache invalidation events
 - File watcher triggers
 - Cache statistics (60s interval logs)]
```
```

**Expected Outcome**:
- F25 performance testing section added to performance-results.md
- Template includes all metrics from S97 acceptance criteria
- Ready to fill in during Phase 3 execution

**Verification**:
- File contains new F25 section
- Section includes baseline, 50-story test, and cache invalidation scenarios
- Template matches S97 performance targets (< 500ms, > 80% hit rate, < 2s response)

---

## Completion Criteria

- [x] Manual test script created with comprehensive test cases
- [x] Test fixture directories created (stories/ and specs/)
- [x] Test story files created (3 files: with spec, without spec, out of sync)
- [x] Test spec directories created (2 specs with phase files)
- [x] Performance results template updated with F25 section
- [x] All acceptance criteria from S97 mapped to test cases
- [x] Test infrastructure ready for Phase 2 execution

## Verification Steps

1. **Check directory structure**:
```bash
tree vscode-extension/test-fixtures/spec-integration/
tree vscode-extension/manual-tests/
```

2. **Verify file count**:
```bash
# Should show 3 story files
ls vscode-extension/test-fixtures/spec-integration/stories/

# Should show 2 spec directories
ls vscode-extension/test-fixtures/spec-integration/specs/

# Should show manual test script
ls vscode-extension/manual-tests/
```

3. **Validate frontmatter**:
```bash
# Check all files have valid YAML frontmatter
grep -l "^---" vscode-extension/test-fixtures/spec-integration/stories/*.md
grep -l "^---" vscode-extension/test-fixtures/spec-integration/specs/*/plan.md
```

4. **Review test script completeness**:
- Open `vscode-extension/manual-tests/spec-integration-test.md`
- Verify covers all 6 acceptance criteria from S97
- Confirm clear setup, execution, and verification steps

5. **Check performance template**:
- Open `vscode-extension/performance-results.md`
- Scroll to F25 section (should be at end)
- Verify includes baseline, 50-story test, and cache invalidation scenarios

## Next Phase

Proceed to **Phase 2: Manual Testing Execution** to execute test cases and validate feature behavior.
