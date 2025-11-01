---
spec: S53
phase: 3
title: /plan Mode 3 Enhancement
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 3: /plan Mode 3 Enhancement

## Overview

This phase enhances the `/plan` command's Mode 3 (Context Request) to provide visibility into spec implementation progress alongside planning status. Currently, `/plan` only shows story status from plans/ directory, missing the detailed progress information available in specs/.

With this enhancement, `/plan` will:
- Show spec phase completion (e.g., "Phase 2/3 complete")
- Flag stories where spec status is more advanced than story status
- Recommend running `/sync` when divergence detected
- Provide complete picture of implementation progress

## Prerequisites

- Phase 1 complete (automatic synchronization working)
- Phase 2 complete (`/sync` command available)
- Understanding of `/plan` Mode 3 workflow (`.claude/commands/plan.md:250-270`)
- Familiarity with spec directory structure

## Tasks

### Task 1: Review Current Mode 3 Implementation

**Objective**: Understand existing Mode 3 workflow and identify enhancement points

**Current Workflow** (`.claude/commands/plan.md:250-270`):
```markdown
### Mode 3: Context Request (`/plan` with no arguments)

1. **Scan PLANS_DIR**
   - Find all markdown files in PLANS_DIR
   - Use Grep to efficiently extract frontmatter status from all files:
     - `grep "^status:" plans/**/*.md` to get all statuses
     - `grep "^item:" plans/**/*.md` to get all item numbers
     - `grep "^type:" plans/**/*.md` to get all item types

2. **Analyze Pipeline State**
   - Find "Ready" Stories/Bugs (grep for `status: Ready` in story/bug files)
   - Find Features needing breakdown
   - Check for blocked items (grep for `status: Blocked`)

3. **Generate Recommendation**
   - Ready stories exist → Suggest which to implement
   - No ready stories → Suggest which Feature to break down
   - No features → Suggest which Epic to break down
   - Explain reasoning

4. **Report Pipeline Status**
```

**Enhancement Points**:
- After step 2: Add spec status reading for stories
- In step 3: Consider spec progress in recommendations
- In step 4: Include spec progress in report

**Expected Outcome**:
- Clear understanding of existing workflow
- Identified integration points for spec data
- Plan for minimal disruption to existing logic

### Task 2: Design Spec Progress Reading Logic

**Objective**: Create algorithm to read spec status for each story

**Algorithm**:
```markdown
readSpecProgress(storyItem: string, storyFile: string) → SpecProgress | null

Input:
- storyItem: Story item number (e.g., "S52")
- storyFile: Story file path

Output:
- SpecProgress object or null if no spec

Data Structure:
SpecProgress {
  specDir: string          // e.g., "specs/S52-treeview-refresh-mechanism/"
  specStatus: string       // "Not Started" | "In Progress" | "Completed"
  totalPhases: number      // e.g., 3
  completedPhases: number  // e.g., 2
  inSync: boolean          // true if spec status matches story status
}

Steps:
1. Read story frontmatter
2. Extract `spec:` field
3. If missing → return null (no spec exists)
4. Build spec plan.md path from spec field
5. If spec plan.md not found → return null (spec deleted)
6. Read spec plan.md frontmatter
7. Extract:
   - `status:` → specStatus
   - `phases:` → totalPhases
8. Count completed phases:
   - Use Glob: `${specDir}/tasks/*.md`
   - For each phase file, check status
   - Count how many have status: Completed
9. Compare spec status vs story status → inSync
10. Return SpecProgress object
```

**Error Handling**:
- Missing spec directory → Return null, continue
- Malformed frontmatter → Log error, return null
- Missing phases field → Use phase count from task files

**Expected Outcome**:
- Complete algorithm for reading spec progress
- Handles all edge cases gracefully
- Returns structured data for reporting

### Task 3: Integrate Spec Reading into Mode 3 Scan

**Objective**: Add spec data collection to existing scan workflow

**Location**: `.claude/commands/plan.md:250-270` (Mode 3, between steps 2 and 3)

**Enhanced Workflow**:
```markdown
### Mode 3: Context Request (`/plan` with no arguments)

1. **Scan PLANS_DIR**
   [Existing logic unchanged]

2. **Analyze Pipeline State**
   [Existing logic unchanged]

2.5. **Read Spec Progress for Stories** (NEW)
   - For each story found in step 2:
     - Extract story item number and file path
     - Call readSpecProgress(item, filePath)
     - Store result in storySpecProgress map:
       - Key: Story item number (e.g., "S52")
       - Value: SpecProgress object or null
   - Track statistics:
     - Stories with specs: count
     - Out-of-sync stories: count (where inSync = false)
     - Total phases complete: sum of completedPhases
     - Total phases remaining: sum of (totalPhases - completedPhases)

3. **Generate Recommendation**
   - Enhanced logic:
     - Consider spec progress when prioritizing stories
     - If out-of-sync stories exist:
       - Add recommendation: "Run /sync to update story statuses"
       - Show count of out-of-sync items
     - Prioritize stories by:
       - Dependency readiness (existing logic)
       - Spec progress (stories with started specs higher priority)
       - Priority level (existing logic)
   [Rest of existing logic]

4. **Report Pipeline Status**
   [Enhanced in Task 4]
```

**Data Structure**:
```typescript
storySpecProgress: Map<string, SpecProgress | null> = {
  "S52": {
    specDir: "specs/S52-treeview-refresh-mechanism/",
    specStatus: "Completed",
    totalPhases: 3,
    completedPhases: 3,
    inSync: false  // Story still shows "Ready"
  },
  "S51": {
    specDir: "specs/S51-file-opening-on-click/",
    specStatus: "Completed",
    totalPhases: 4,
    completedPhases: 4,
    inSync: false
  },
  "S50": null  // No spec yet
}
```

**Expected Outcome**:
- Spec progress data collected for all stories
- Out-of-sync stories identified
- Statistics tracked for reporting

### Task 4: Enhance Pipeline Status Report

**Objective**: Update report format to include spec progress information

**Location**: `.claude/commands/plan.md:322-344` (Mode 3 Report Format)

**Enhanced Report Format**:
```markdown
### Mode 3 Output (Enhanced)

```
📋 Planning Pipeline Status

### Ready for Implementation (3 stories)

**S54**: Test Framework Integration - Est: M
  Status: Ready
  Dependencies: None
  → No spec yet

**S55**: Error Handling Improvements - Est: S
  Status: Ready
  Dependencies: [S54]
  → Spec: In Progress (Phase 2/3 complete)
  ⚠️  Out of sync: Story shows "Ready" but spec is "In Progress"

**S56**: Performance Optimization - Est: L
  Status: Ready
  Dependencies: []
  → Spec: Not Started

### In Progress (2 stories)

**S52**: TreeView Refresh Mechanism - Est: S
  Status: Ready  ⚠️  Out of sync!
  Dependencies: [S51]
  → Spec: Completed (3/3 phases) ✅
  ⚠️  Story should be "Completed" - run /sync to update

**S51**: File Opening on Click - Est: S
  Status: Ready  ⚠️  Out of sync!
  Dependencies: [S50]
  → Spec: Completed (4/4 phases) ✅
  ⚠️  Story should be "Completed" - run /sync to update

### Completed (25 stories)

**S50**: Tree Item Rendering - Est: M
  Status: Completed ✅
  → Spec: Completed (4/4 phases) ✅
  ✓ In sync

[... more completed stories ...]

### Needs Breakdown (5 features)

**F18**: Advanced TreeView Features
  Status: Not Started
  Contains: 0 stories (needs breakdown)

[... more features ...]

### Blocked (0 items)

[No blocked items]

─────────────────────────────────────────────────
Pipeline Statistics:
- Total Stories: 30
  - Ready: 3 (0 with specs)
  - In Progress: 0
  - Completed: 25
  - With Specs: 27 (90%)

- Spec Progress:
  - Total Phases: 95
  - Completed: 95 (100%)
  - In Progress: 0

- Sync Status:
  - In Sync: 25 stories ✅
  - Out of Sync: 2 stories ⚠️
  → Run /sync to synchronize

─────────────────────────────────────────────────

### Recommendation

⚠️  **Sync Needed**: 2 stories have completed specs but outdated statuses

**Next Action**: Run /sync to update story statuses

After sync:
🎯 **Next Action**: Run /spec S54 to create implementation specification

**Reasoning**: S54 is ready for implementation (no blocking dependencies) and has highest priority.
```
```

**Key Enhancements**:
1. **Spec Progress Indicators**:
   - "→ Spec: Completed (3/3 phases) ✅"
   - "→ Spec: In Progress (Phase 2/3 complete)"
   - "→ No spec yet"

2. **Out-of-Sync Warnings**:
   - "⚠️  Out of sync: Story shows X but spec is Y"
   - "⚠️  Story should be 'Completed' - run /sync to update"

3. **Sync Status Section**:
   - Count of in-sync vs out-of-sync stories
   - Clear call-to-action: "Run /sync to synchronize"

4. **Enhanced Statistics**:
   - Spec progress metrics
   - Phase completion tracking
   - Sync health indicators

**Expected Outcome**:
- Report shows complete picture of progress
- Out-of-sync items clearly flagged
- Actionable recommendations provided

### Task 5: Add Sync Health Check Recommendation

**Objective**: Enhance recommendation logic to suggest `/sync` when needed

**Location**: `.claude/commands/plan.md:267-270` (Mode 3, step 3)

**Enhanced Recommendation Logic**:
```markdown
3. **Generate Recommendation**

   a. **Check Sync Health** (NEW):
      - Count out-of-sync stories (where inSync = false)
      - If count > 0:
        - Priority 1 recommendation: Run /sync
        - Explain: "Stories have completed specs but outdated statuses"
        - Show count: "{count} stories need synchronization"

   b. **Check Ready Stories** (EXISTING):
      - If ready stories exist:
        - Filter for stories with no dependencies or completed dependencies
        - Prioritize by:
          - Has started spec (In Progress spec status)
          - Has completed spec phases (higher completedPhases)
          - Priority level (High > Medium > Low)
          - Age (older first)
        - Recommend highest priority story for /spec
        - Explain reasoning

   c. **Check Features Needing Breakdown** (EXISTING):
      - If no ready stories:
        - Find features without stories
        - Recommend running /plan F## to break down
        - Explain reasoning

   d. **Check Epics Needing Breakdown** (EXISTING):
      - If no features:
        - Find epics without features
        - Recommend running /plan E## to break down
        - Explain reasoning

   **Priority Order**:
   1. Sync health issues (out-of-sync stories) ← NEW
   2. Ready stories for implementation
   3. Features needing breakdown
   4. Epics needing breakdown
```

**Recommendation Examples**:

**Example 1: Sync Needed**
```
⚠️  **Sync Needed**: 2 stories have completed specs but outdated statuses

**Next Action**: Run /sync to update story statuses

**Details**:
- S52: Spec completed (3/3 phases) but story shows "Ready"
- S51: Spec completed (4/4 phases) but story shows "Ready"

After sync, run /spec S54 to continue with ready stories.
```

**Example 2: Spec Progress Considered**
```
🎯 **Next Action**: Run /spec S55

**Reasoning**:
- S55 has spec in progress (Phase 2/3 complete)
- Continuing existing work more efficient than starting new story
- S55 has no blocking dependencies

Alternative: Run /spec S54 (higher priority but no spec started yet)
```

**Expected Outcome**:
- Sync issues surfaced as top priority
- Spec progress influences story recommendations
- Clear, actionable guidance provided

### Task 6: Update Mode 3 Instructions Documentation

**Objective**: Document the enhanced Mode 3 behavior

**Location**: `.claude/commands/plan.md` (Instructions section)

**Add New Section**:
```markdown
### Spec Progress Integration

Mode 3 (Context Request) integrates spec progress data to provide complete visibility:

**Spec Data Sources**:
- Story frontmatter `spec:` field → Spec directory location
- Spec plan.md `status:` field → Implementation status
- Spec plan.md `phases:` field → Total phase count
- Spec phase files `status:` field → Completed phase count

**Sync Health Checking**:
- Compares spec status vs story status
- Flags discrepancies as "out of sync"
- Recommends running /sync when divergence detected

**Enhanced Recommendations**:
- Considers spec progress when prioritizing stories
- Suggests continuing started specs over starting new work
- Surfaces sync issues as highest priority

**Error Handling**:
- Missing spec directory → Treated as "no spec"
- Malformed frontmatter → Logged, skipped
- Spec reading errors → Don't fail pipeline status report
```

**Expected Outcome**:
- Mode 3 enhancements fully documented
- Users understand new behavior
- Error handling clearly specified

### Task 7: Test Enhanced Mode 3 with Real Data

**Objective**: Validate enhanced pipeline status with actual planning data

**Test Plan**:

1. **Pre-Test State Setup**:
   ```bash
   # Ensure some specs are completed
   grep -l "^status: Completed" specs/*/plan.md | head -5

   # Ensure some stories are out of sync
   # (This should be true after Phase 2 if /sync not run yet)
   ```

2. **Test Enhanced Pipeline Status**:
   - Run `/plan` (Mode 3)
   - Verify output shows:
     - ✅ Spec progress for stories with specs
     - ✅ "No spec yet" for stories without specs
     - ✅ Out-of-sync warnings for completed specs with non-completed stories
     - ✅ Statistics section includes sync status
     - ✅ Recommendation prioritizes /sync if needed

3. **Test After Running /sync**:
   - Run `/sync` to synchronize all stories
   - Run `/plan` again
   - Verify:
     - ✅ Out-of-sync warnings gone
     - ✅ "In sync" indicators shown
     - ✅ Recommendation no longer prioritizes /sync
     - ✅ Regular story recommendations resume

4. **Test with Mixed States**:
   - Ensure test data includes:
     - Stories with no specs
     - Stories with in-progress specs
     - Stories with completed specs (in sync)
     - Stories with completed specs (out of sync)
   - Run `/plan`
   - Verify all cases handled correctly

5. **Test Error Handling**:
   - Temporarily rename a spec directory
   - Run `/plan`
   - Verify: Graceful handling, story shown as "spec not found"
   - Restore spec directory

6. **Performance Test**:
   - With 30+ stories and 40+ specs
   - Run `/plan`
   - Verify: Response time < 2 seconds
   - Verify: No timeout or performance issues

**Expected Outcome**:
- All test cases pass
- Enhanced Mode 3 provides accurate, actionable information
- Performance acceptable with current dataset size
- Error handling robust

## Completion Criteria

- ✅ Current Mode 3 implementation reviewed
- ✅ Spec progress reading algorithm designed
- ✅ Spec reading integrated into Mode 3 scan
- ✅ Pipeline status report enhanced with spec data
- ✅ Sync health check recommendation added
- ✅ Mode 3 instructions documentation updated
- ✅ Tested with real planning data
- ✅ All test cases pass
- ✅ Performance acceptable
- ✅ Error handling robust

## Validation

**Success Indicators**:
1. `/plan` shows complete picture of implementation progress
2. Out-of-sync stories clearly identified
3. Recommendations prioritize sync when needed
4. Spec phase progress visible for in-progress work
5. Performance remains fast (<2s for 30+ stories)
6. Error handling graceful for missing/malformed data

**User Experience**:
- Single command (`/plan`) provides all needed context
- Clear guidance on next actions
- Sync issues surface automatically
- No need to manually check specs vs stories

## Next Steps

**After Phase 3 Complete**:
1. All three phases of S53 implemented
2. Run full test suite:
   - Test automatic sync during `/build`
   - Test retroactive `/sync` command
   - Test enhanced `/plan` visibility
3. Mark S53 as "Completed"
4. Update S53 story status to "Completed" (if not already synced)
5. Document new workflows in project documentation

**User Workflow After S53**:
```
Normal Development Flow:
1. /plan                    # See what's ready
2. /spec S##                # Create spec (story → In Progress)
3. /build specs/S##-*/plan.md  # Implement (auto-sync on complete)
4. /plan                    # Verify progress updated

Retroactive Sync Flow:
1. /sync --dry-run          # Preview changes
2. /sync                    # Apply changes
3. /plan                    # Verify all in sync

Maintenance Flow:
1. /plan                    # Check pipeline status regularly
2. If out-of-sync: /sync    # Keep planning in sync
3. /plan                    # Continue normal workflow
```
