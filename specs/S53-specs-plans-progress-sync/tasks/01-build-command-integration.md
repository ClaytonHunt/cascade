---
spec: S53
phase: 1
title: /build Command Integration
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 1: /build Command Integration

## Overview

This phase adds automatic status synchronization to the `/build` command so that story statuses in plans/ are updated when specs progress through their lifecycle. The synchronization happens at two key points:

1. **Phase 1 Start**: When spec transitions to "In Progress", update story to "In Progress"
2. **Final Phase Complete**: When spec transitions to "Completed", update story to "Completed"

This ensures that the planning system (plans/) always reflects the current implementation progress (specs/) without manual intervention.

## Prerequisites

- Understanding of `/build` command workflow (`.claude/commands/build.md`)
- Understanding of frontmatter structure (`docs/frontmatter-schema.md`)
- Familiarity with Edit tool for atomic frontmatter updates
- Access to existing spec and story files for testing

## Tasks

### Task 1: Review Current `/build` Command Structure

**Objective**: Understand where synchronization logic should be inserted

**Steps**:
1. Read `.claude/commands/build.md` to understand:
   - Mode 1: Start New Spec Implementation (lines 136-190)
   - Mode 2: Resume Specific Phase (lines 192-238)
   - Frontmatter Status Updates section (lines 115-133)
   - Current spec plan.md update locations
2. Identify insertion points:
   - **After line 180** (Mode 1, Step 5): When Phase 1 starts and spec plan.md becomes "In Progress"
   - **After line 234** (Mode 2, after phase complete): When final phase completes and spec plan.md becomes "Completed"
3. Review existing frontmatter update patterns:
   - How Edit tool is used for status updates
   - How updated timestamp is replaced
   - Error handling patterns for missing frontmatter

**Expected Outcome**:
- Clear understanding of insertion points
- Knowledge of existing patterns to follow
- List of specific line numbers where changes needed

**File References**:
- `.claude/commands/build.md:115-238` (relevant sections)

### Task 2: Design Story Lookup Algorithm

**Objective**: Create reliable algorithm to find story file from spec number

**Algorithm Design**:
```markdown
Input: Spec number (e.g., "S52")
Output: Story file path or null

1. Search plans/ directory for file matching pattern:
   - Use Glob: `plans/**/*story-{spec_number_lowercase}-*.md`
   - Example: For S52, search `plans/**/story-52-*.md`

2. Handle multiple matches:
   - If 0 matches: Return null (story not found)
   - If 1 match: Return file path
   - If >1 match: Log warning, return first match (shouldn't happen)

3. Validate match:
   - Read file frontmatter
   - Verify `item:` field matches spec number exactly
   - Example: For S52, verify `item: S52` exists

4. Return result:
   - Success: File path string
   - Failure: null
```

**Edge Cases to Handle**:
- Story file doesn't exist (deleted or never created)
- Story file exists but frontmatter malformed
- Story file exists but item number doesn't match filename
- Multiple story files match pattern (numbering collision)

**Expected Outcome**:
- Pseudocode algorithm ready for implementation
- Edge cases identified and handling strategy defined
- Test cases for algorithm validation

### Task 3: Design Spec-to-Story Verification

**Objective**: Verify story's spec field points to current spec before syncing

**Verification Logic**:
```markdown
Input: Story file path, Current spec directory path
Output: Boolean (should sync or skip)

1. Read story frontmatter
2. Extract `spec:` field value
3. If spec field missing:
   - Return false (skip sync - backward compatibility)
   - Log: "Story {item} has no spec field, skipping sync"
4. If spec field present:
   - Normalize both paths (handle trailing slashes)
   - Compare spec field value to current spec directory
   - Example:
     - spec field: "specs/S52-treeview-refresh-mechanism/"
     - current spec: "specs/S52-treeview-refresh-mechanism"
     - Match: true (normalize and compare)
5. If match:
   - Return true (safe to sync)
6. If no match:
   - Return false (spec field points elsewhere)
   - Log: "Story {item} spec field doesn't match current spec, skipping"
```

**Path Normalization**:
```typescript
// Handle variations in path format
const normalizePath = (path: string) => {
  return path.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
};

const specsMatch = (storySpecField: string, currentSpecDir: string) => {
  return normalizePath(storySpecField) === normalizePath(currentSpecDir);
};
```

**Expected Outcome**:
- Verification logic defined
- Path normalization strategy established
- Safety checks to prevent incorrect syncs

### Task 4: Implement Status Synchronization Function

**Objective**: Create reusable function to sync story status from spec status

**Function Signature**:
```markdown
syncStoryStatus(specNumber: string, specStatus: string, specDir: string)

Parameters:
- specNumber: Story item number (e.g., "S52")
- specStatus: Current spec status ("In Progress" or "Completed")
- specDir: Spec directory path (e.g., "specs/S52-treeview-refresh-mechanism")

Returns: void (logs results)

Side Effects:
- Updates story file frontmatter (status and updated fields)
- Logs sync results to output
```

**Implementation Steps**:
1. **Find Story File**:
   ```markdown
   - Use Glob to search: `plans/**/*${specNumber.toLowerCase()}-*.md`
   - If not found: Log warning "[SYNC] Story {specNumber} not found", return
   - If found: Store file path
   ```

2. **Verify Story References This Spec**:
   ```markdown
   - Read story file
   - Extract spec field from frontmatter
   - If spec field missing: Log info "[SYNC] Story {specNumber} has no spec field, skipping", return
   - If spec field doesn't match specDir: Log info "[SYNC] Story {specNumber} points to different spec, skipping", return
   ```

3. **Extract Current Story Status**:
   ```markdown
   - Parse story frontmatter
   - Extract status field value (e.g., "Ready")
   - Store old status for logging
   ```

4. **Update Story Status**:
   ```markdown
   - Use Edit tool to replace status line:
     old_string: "status: {oldStatus}"
     new_string: "status: {specStatus}"
   - Handle Edit failures gracefully (log error, continue)
   ```

5. **Update Story Timestamp**:
   ```markdown
   - Get current date in YYYY-MM-DD format
   - Use Edit tool to replace updated line:
     old_string: "updated: {oldDate}"
     new_string: "updated: {currentDate}"
   - Handle Edit failures gracefully
   ```

6. **Log Success**:
   ```markdown
   - Log: "[SYNC] Story {specNumber} status updated: {oldStatus} → {specStatus}"
   - Log: "[SYNC] Synced from spec: {specDir}"
   - Log: "[SYNC] Story file: {storyFilePath}"
   ```

**Error Handling**:
- Story file not found → Warning log, continue
- Story spec field missing → Info log, skip (backward compat)
- Story spec field mismatched → Info log, skip (safety)
- Edit tool failure → Error log, continue (don't fail build)
- Frontmatter parse error → Error log, skip story

**Expected Outcome**:
- Complete synchronization logic ready
- Error handling for all edge cases
- Detailed logging for debugging
- No build failures from sync errors

### Task 5: Insert Synchronization into Mode 1 (Phase 1 Start)

**Objective**: Add sync call when spec transitions to "In Progress"

**Location**: `.claude/commands/build.md:175-180` (Mode 1, Step 5, after updating spec plan.md)

**Current Code** (simplified):
```markdown
5. **Execute Phase 1**
   - **Update spec plan.md frontmatter:**
     - Read `plan.md` in spec directory
     - If status is "Not Started":
       - Use Edit tool to replace `status: Not Started` with `status: In Progress`
       - Use Edit tool to replace `updated:` date with current date
     - If frontmatter missing, skip and continue
```

**New Code** (add after spec update):
```markdown
5. **Execute Phase 1**
   - **Update spec plan.md frontmatter:**
     - Read `plan.md` in spec directory
     - If status is "Not Started":
       - Use Edit tool to replace `status: Not Started` with `status: In Progress`
       - Use Edit tool to replace `updated:` date with current date
     - If frontmatter missing, skip and continue

   - **Synchronize story status to In Progress:**
     - Read spec plan.md frontmatter to extract `spec:` field (e.g., "S52")
     - Call syncStoryStatus(specNumber, "In Progress", specDir)
     - This updates the story in plans/ to reflect spec is now in progress
     - If sync fails, log warning but continue with build (non-blocking)
```

**Implementation Notes**:
- Sync happens AFTER spec status update (order matters)
- Sync errors don't block build execution
- Logging provides visibility into sync operations

**Expected Outcome**:
- Mode 1 includes sync call at correct location
- Story updates to "In Progress" when Phase 1 starts
- Build continues even if sync fails

### Task 6: Insert Synchronization into Mode 2 (Final Phase Complete)

**Objective**: Add sync call when spec transitions to "Completed"

**Location**: `.claude/commands/build.md:230-235` (Mode 2, after updating spec plan.md when final phase complete)

**Current Code** (simplified):
```markdown
   - **Update spec plan.md frontmatter (Final phase only):**
     - Determine total phases from plan.md frontmatter `phases:` field
     - If current phase equals total phases:
       - Use Edit tool to replace spec plan.md `status: In Progress` with `status: Completed`
       - Use Edit tool to replace `updated:` date with current date
     - If frontmatter missing, skip and continue
```

**New Code** (add after spec update):
```markdown
   - **Update spec plan.md frontmatter (Final phase only):**
     - Determine total phases from plan.md frontmatter `phases:` field
     - If current phase equals total phases:
       - Use Edit tool to replace spec plan.md `status: In Progress` with `status: Completed`
       - Use Edit tool to replace `updated:` date with current date
     - If frontmatter missing, skip and continue

   - **Synchronize story status to Completed (Final phase only):**
     - If current phase equals total phases (spec now complete):
       - Read spec plan.md frontmatter to extract `spec:` field (e.g., "S52")
       - Call syncStoryStatus(specNumber, "Completed", specDir)
       - This updates the story in plans/ to reflect spec is fully complete
       - If sync fails, log warning but continue with build (non-blocking)
```

**Implementation Notes**:
- Sync only happens for final phase (when spec becomes "Completed")
- Check `current phase == total phases` before calling sync
- Sync happens AFTER spec status update
- Errors logged but don't block phase completion

**Expected Outcome**:
- Mode 2 includes sync call for final phase only
- Story updates to "Completed" when final phase finishes
- Build completion workflow unaffected by sync errors

### Task 7: Add Logging Format Guidelines

**Objective**: Define consistent logging format for sync operations

**Location**: `.claude/commands/build.md` (new section after "Git Commit Standards")

**New Section**:
```markdown
### Story Status Synchronization Logging

All status synchronization operations are logged to help debug sync issues and provide visibility into planning system updates.

**Success Log Format**:
```
[SYNC] Story S52 status updated: Ready → Completed
[SYNC] Synced from spec: specs/S52-treeview-refresh-mechanism/
[SYNC] Story file: plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-52-treeview-refresh-mechanism.md
```

**Warning Log Format** (story not found):
```
[SYNC] Warning: Story S52 not found in plans/
[SYNC] Spec completed but no story file exists to update
```

**Info Log Format** (skip sync - backward compat):
```
[SYNC] Story S48 has no spec field, skipping sync (backward compatibility)
```

**Info Log Format** (skip sync - spec mismatch):
```
[SYNC] Story S50 spec field points to different spec, skipping sync (safety check)
[SYNC] Expected: specs/S50-tree-item-rendering/
[SYNC] Found: specs/S50-old-implementation/
```

**Error Log Format** (edit failure):
```
[SYNC] Error: Failed to update story S52 status
[SYNC] Edit tool error: [error message]
[SYNC] Build will continue but story status not synchronized
```
```

**Expected Outcome**:
- Consistent, parseable log format
- Clear distinction between success/warning/info/error
- Sufficient detail for debugging
- Logs don't clutter build output

### Task 8: Update Build Command Variables Section

**Objective**: Document new synchronization behavior in command header

**Location**: `.claude/commands/build.md:30-36` (Variables section)

**Add to Variables**:
```markdown
SYNC_ENABLED: true
SYNC_LOG_PREFIX: [SYNC]
```

**Add to Instructions** (after "Frontmatter Status Updates"):
```markdown
### Story Status Synchronization

The build command automatically synchronizes story status from specs/ to plans/ at key lifecycle transitions:

- **Phase 1 Start**: When spec becomes "In Progress", update story to "In Progress"
- **Final Phase Complete**: When spec becomes "Completed", update story to "Completed"

Synchronization is non-blocking: if story not found or sync fails, build continues and warnings are logged. This ensures implementation work is never blocked by planning file issues.

**Requirements for Sync**:
- Story file must exist in plans/ with matching item number
- Story must have `spec:` field pointing to current spec directory
- Story frontmatter must be valid YAML

**Backward Compatibility**:
- Stories without `spec:` field are skipped (no sync)
- Sync errors logged but don't fail build
```

**Expected Outcome**:
- Synchronization behavior documented in command header
- Users understand when sync happens
- Backward compatibility clearly stated

## Completion Criteria

- ✅ Synchronization logic designed and documented
- ✅ Story lookup algorithm implemented
- ✅ Spec-to-story verification logic implemented
- ✅ `syncStoryStatus()` function logic defined
- ✅ Mode 1 updated with Phase 1 sync
- ✅ Mode 2 updated with final phase sync
- ✅ Logging format guidelines added
- ✅ Command variables section updated
- ✅ All edge cases handled gracefully
- ✅ Build never fails due to sync errors

## Testing Strategy

**Test Case 1: New Spec Implementation (Happy Path)**
1. Create test story S99 with `spec: specs/S99-test-implementation/`
2. Run `/build specs/S99-test-implementation/plan.md`
3. Verify story S99 status updates to "In Progress" when Phase 1 starts
4. Complete all phases
5. Verify story S99 status updates to "Completed" when final phase completes
6. Check logs for successful sync messages

**Test Case 2: Missing Story File**
1. Create spec without corresponding story in plans/
2. Run `/build` on spec
3. Verify warning logged: "[SYNC] Story S## not found"
4. Verify build completes successfully despite missing story

**Test Case 3: Story Without Spec Field**
1. Create old story without `spec:` field in frontmatter
2. Create spec for that story
3. Run `/build` on spec
4. Verify info log: "Story S## has no spec field, skipping"
5. Verify build completes, story status unchanged

**Test Case 4: Spec Field Mismatch**
1. Create story with `spec: specs/S50-old-version/`
2. Create new spec `specs/S50-new-version/`
3. Run `/build` on new spec
4. Verify info log: "spec field points to different spec, skipping"
5. Verify build completes, story status unchanged

**Test Case 5: Mid-Phase Resume**
1. Start spec, complete Phase 1 (story now "In Progress")
2. Complete Phase 2
3. Verify story status remains "In Progress" (not updated mid-spec)
4. Complete final phase
5. Verify story status updates to "Completed"

**Test Case 6: Malformed Story Frontmatter**
1. Create story with invalid YAML frontmatter
2. Run `/build` on corresponding spec
3. Verify error logged gracefully
4. Verify build completes despite parse error

## Next Phase

Proceed to Phase 2: `/sync` Command Creation

After completing Phase 1, the automatic synchronization works for new builds going forward. Phase 2 creates a retroactive sync command to update the 25+ existing completed specs whose stories are out of sync.
