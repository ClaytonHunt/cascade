---
spec: S53
phase: 2
title: /sync Command Creation
status: Completed
priority: High
created: 2025-10-14
updated: 2025-10-14
---

# Phase 2: /sync Command Creation

## Overview

This phase creates a new `/sync` command that performs retroactive synchronization between completed specs and their corresponding stories in plans/. With 25+ specs already completed but their stories still showing "Ready" status, this command provides a one-time migration path to bring the planning system up to date.

The command supports three modes:
1. **Full Sync** (`/sync`): Updates all out-of-sync stories
2. **Dry Run** (`/sync --dry-run`): Preview changes without applying
3. **Single Story** (`/sync S52`): Update specific story only

## Prerequisites

- Phase 1 complete (synchronization logic understood)
- Understanding of slash command structure (`.claude/commands/plan.md`, `.claude/commands/spec.md`)
- Familiarity with frontmatter schema (`docs/frontmatter-schema.md`)
- Existing completed specs available for testing (specs/S*-*/plan.md with status: Completed)

## Tasks

### Task 1: Create Command File Structure

**Objective**: Set up basic `/sync` command file with frontmatter and structure

**File**: `.claude/commands/sync.md` (new file)

**Command Frontmatter**:
```yaml
---
description: Synchronize spec status to story status in plans/
argument-hint: "[story-number|--dry-run|<empty>]"
allowed-tools: Read, Edit, Glob, Grep, TodoWrite
---
```

**Command Structure**:
```markdown
# Sync

Synchronize implementation specifications (specs/) with planning items (plans/) to ensure story statuses reflect actual implementation progress. Performs retroactive status updates for specs completed before automatic synchronization was implemented.

## Purpose

This command bridges the gap between completed implementation work and planning status. When specs are marked "Completed" but their corresponding stories remain "Ready" or "In Progress", this command updates the stories to reflect reality.

**Use Cases**:
- **One-time migration**: Update 25+ existing completed specs after S53 implementation
- **Manual correction**: Fix status mismatches when automatic sync failed
- **Verification**: Dry-run mode to preview changes before applying
- **Selective update**: Sync specific story when needed

## Variables

USER_INPUT: $ARGUMENTS
SPECS_DIR: specs/
PLANS_DIR: plans/
DRY_RUN: false

## Instructions

[Detailed instructions to be added in subsequent tasks]

## Workflow

### Mode 1: Full Sync (`/sync`)
[To be implemented]

### Mode 2: Dry Run (`/sync --dry-run`)
[To be implemented]

### Mode 3: Single Story (`/sync S##`)
[To be implemented]

## Report

[Output formats to be defined]

## Examples

[Usage examples to be added]
```

**Expected Outcome**:
- Command file created with proper structure
- Frontmatter correctly formatted
- Section placeholders ready for detailed content

### Task 2: Implement Mode 1 - Full Sync Workflow

**Objective**: Define complete workflow for scanning all specs and syncing stories

**Location**: `.claude/commands/sync.md` - Mode 1 section

**Workflow**:
```markdown
### Mode 1: Full Sync (`/sync` with no arguments)

1. **Initialize Sync Session**
   - Create TodoWrite items:
     - "Scan specs directory for all plan.md files"
     - "Compare spec vs story statuses"
     - "Update out-of-sync stories"
     - "Generate sync report"
   - Set DRY_RUN = false (apply changes)
   - Initialize counters: updated=0, skipped=0, warnings=0

2. **Scan Specs Directory**
   - Use Glob to find all spec plan files: `specs/*/plan.md`
   - Expected: 40+ spec files found
   - For each spec file:
     - Read file path and extract spec directory name
     - Example: `specs/S52-treeview-refresh-mechanism/plan.md` → `S52-treeview-refresh-mechanism`
   - Mark TodoWrite task "Scan specs directory" as completed

3. **Process Each Spec**
   - For each spec plan.md file:

     a. **Read Spec Metadata**:
        - Read spec plan.md file
        - Parse frontmatter to extract:
          - `spec:` field (e.g., "S52")
          - `status:` field (e.g., "Completed", "In Progress", "Not Started")
        - If frontmatter invalid: Log error, skip to next spec (warning++)

     b. **Find Corresponding Story**:
        - Use Glob: `plans/**/*${spec_number.toLowerCase()}-*.md`
        - Example: For S52, search `plans/**/story-52-*.md`
        - If 0 matches: Log warning, skip to next spec (warning++)
        - If 1 match: Use that file
        - If >1 match: Log warning, use first match (warning++)

     c. **Read Story Metadata**:
        - Read story file
        - Parse frontmatter to extract:
          - `item:` field (verify matches spec number)
          - `status:` field (current story status)
          - `spec:` field (reference to spec directory)
          - `updated:` field (current timestamp)
        - If frontmatter invalid: Log error, skip to next spec (warning++)

     d. **Verify Story-Spec Association**:
        - Check if story has `spec:` field
        - If missing: Log info "No spec field, skipping", skip to next (skipped++)
        - If present:
          - Extract spec directory from field
          - Normalize paths (lowercase, trim slashes)
          - Compare to current spec directory
          - If mismatch: Log info "Points to different spec", skip to next (skipped++)

     e. **Compare Statuses**:
        - Spec Status vs Story Status:
          - If spec "Not Started": Skip (no sync needed)
          - If spec "In Progress" and story "Ready": Needs update
          - If spec "In Progress" and story "In Progress": Already synced (skipped++)
          - If spec "Completed" and story "Ready": Needs update
          - If spec "Completed" and story "In Progress": Needs update
          - If spec "Completed" and story "Completed": Already synced (skipped++)
          - If story status more advanced than spec: Log warning, skip (warning++)

     f. **Update Story Status**:
        - If needs update:
          - Use Edit tool to replace `status: {old}` with `status: {new}`
          - Use Edit tool to replace `updated: {old}` with current date (YYYY-MM-DD)
          - If Edit succeeds:
            - Log success: "✅ S## status updated: {old} → {new}"
            - Increment updated counter
          - If Edit fails:
            - Log error with details
            - Increment warning counter
            - Continue to next spec

4. **Mark TodoWrite task "Update out-of-sync stories" as completed**

5. **Generate Summary Report**
   - Count results:
     - Stories updated: {updated}
     - Stories already synced (skipped): {skipped}
     - Warnings/errors: {warnings}
   - Display detailed results (see Report Format section)
   - Mark TodoWrite task "Generate sync report" as completed

6. **Clear TodoWrite and Complete**
```

**Status Priority Rules**:
- Never downgrade status (e.g., don't change "Completed" to "In Progress")
- Trust spec status as source of truth
- Warn if story more advanced than spec (manual investigation needed)

**Expected Outcome**:
- Complete Mode 1 workflow defined
- All edge cases handled
- Clear algorithm for spec-story comparison

### Task 3: Implement Mode 2 - Dry Run Workflow

**Objective**: Add preview mode that shows changes without applying

**Location**: `.claude/commands/sync.md` - Mode 2 section

**Workflow**:
```markdown
### Mode 2: Dry Run (`/sync --dry-run`)

1. **Parse Arguments**
   - Detect `--dry-run` flag in USER_INPUT
   - Set DRY_RUN = true
   - Display: "🔍 DRY RUN MODE: No changes will be applied"

2. **Execute Mode 1 Workflow**
   - Follow all steps from Mode 1
   - **Difference**: In step 3f (Update Story Status):
     - DO NOT execute Edit tool operations
     - Instead, log what WOULD be changed:
       - "WOULD UPDATE: S52 status: Ready → Completed"
       - "WOULD UPDATE: S52 updated: 2025-10-13 → 2025-10-14"
     - Still increment counters as if update happened
   - Continue through all specs

3. **Generate Dry Run Report**
   - Show all proposed changes
   - Use distinct formatting to indicate preview:
     ```
     🔍 DRY RUN RESULTS - NO CHANGES APPLIED

     The following changes would be made:

     ✅ S52: Ready → Completed
        File: plans/epic-04-.../story-52-treeview-refresh-mechanism.md
        Spec: specs/S52-treeview-refresh-mechanism/

     ✅ S51: Ready → Completed
        File: plans/epic-04-.../story-51-file-opening-on-click.md
        Spec: specs/S51-file-opening-on-click/

     [... more changes ...]

     Summary: 25 updates, 10 skipped, 2 warnings

     To apply these changes, run: /sync
     ```

4. **Complete Without Modifications**
   - No files changed
   - User can review and decide to run full sync
```

**Expected Outcome**:
- Dry run mode fully functional
- Clear preview of changes
- No actual file modifications
- Easy transition from dry-run to full sync

### Task 4: Implement Mode 3 - Single Story Workflow

**Objective**: Add targeted sync for specific story

**Location**: `.claude/commands/sync.md` - Mode 3 section

**Workflow**:
```markdown
### Mode 3: Single Story (`/sync S##`)

1. **Parse Story Number**
   - Extract story number from USER_INPUT (e.g., "S52")
   - Validate format: Must match pattern `^[SB]\d+$`
   - If invalid: Display error and suggest correct format

2. **Find Story File**
   - Use Glob: `plans/**/*${story_number.toLowerCase()}-*.md`
   - If not found:
     - Error: "Story {story_number} not found in plans/"
     - Suggest running `/plan` to see available stories
     - STOP
   - If found: Store story file path

3. **Read Story Metadata**
   - Read story file
   - Parse frontmatter
   - Extract `spec:` field
   - If `spec:` field missing:
     - Error: "Story {story_number} has no spec field"
     - Explain: "This story doesn't reference an implementation spec"
     - Suggest adding spec field manually
     - STOP
   - If present: Extract spec directory path

4. **Find and Read Spec**
   - Build spec plan file path from story's spec field
   - Example: `spec: specs/S52-treeview-refresh-mechanism/` → `specs/S52-treeview-refresh-mechanism/plan.md`
   - Read spec plan.md file
   - If not found:
     - Error: "Spec not found at {spec_path}"
     - Suggest checking story's spec field value
     - STOP
   - Parse spec frontmatter to extract status

5. **Compare and Update**
   - Compare spec status vs story status
   - If already synced:
     - Info: "Story {story_number} already synced"
     - Display: "Spec: {spec_status}, Story: {story_status}"
     - No action needed
     - STOP
   - If needs update:
     - Use Edit tool to update story status
     - Use Edit tool to update story timestamp
     - Log: "✅ S## status updated: {old} → {new}"

6. **Display Single Story Report**
   ```
   ✅ Story Synchronized

   **Story**: S52 - TreeView Refresh Mechanism
   **File**: plans/epic-04-.../story-52-treeview-refresh-mechanism.md
   **Spec**: specs/S52-treeview-refresh-mechanism/
   **Status Change**: Ready → Completed
   **Updated**: 2025-10-14
   ```

**Expected Outcome**:
- Single-story sync works reliably
- Clear error messages for invalid input
- Targeted updates without full scan

### Task 5: Design Report Output Formats

**Objective**: Create clear, actionable report formats for each mode

**Location**: `.claude/commands/sync.md` - Report section

**Report Formats**:

```markdown
## Report

### Mode 1/2 Output (Full Sync)

```
🔄 Synchronizing specs → plans...

✅ S52: Ready → Completed
   File: plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-52-treeview-refresh-mechanism.md
   Spec: specs/S52-treeview-refresh-mechanism/

✅ S51: Ready → Completed
   File: plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-51-file-opening-on-click.md
   Spec: specs/S51-file-opening-on-click/

✅ S50: Ready → Completed
   File: plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-50-tree-item-rendering-with-icons.md
   Spec: specs/S50-tree-item-rendering-with-icons/

⏭️  S49: Already synced (Completed)
   File: plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-49-treedataprovider-core-implementation.md

⏭️  S48: Already synced (Completed)
   File: plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-48-activity-bar-view-registration.md

⚠️  S47: Story not found in plans/
   Spec: specs/S47-example-spec/

⚠️  S46: Story has no spec field, skipping
   File: plans/epic-03-.../story-46-example.md

─────────────────────────────────────────────────
Summary: 3 updated, 2 skipped, 2 warnings
─────────────────────────────────────────────────

### Next Steps
✅ Story statuses are now synchronized
✅ Run `/plan` to see updated pipeline status
```

### Mode 2 Output (Dry Run)

```
🔍 DRY RUN MODE - NO CHANGES WILL BE APPLIED

The following changes would be made:

✅ WOULD UPDATE: S52 status: Ready → Completed
   File: plans/epic-04-.../story-52-treeview-refresh-mechanism.md
   Spec: specs/S52-treeview-refresh-mechanism/

✅ WOULD UPDATE: S51 status: Ready → Completed
   File: plans/epic-04-.../story-51-file-opening-on-click.md
   Spec: specs/S51-file-opening-on-click/

[... more proposed changes ...]

─────────────────────────────────────────────────
Dry Run Summary: 25 would update, 10 skipped, 2 warnings
─────────────────────────────────────────────────

To apply these changes, run: /sync
```

### Mode 3 Output (Single Story)

```
✅ Story Synchronized

**Story**: S52 - TreeView Refresh Mechanism
**File**: plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-52-treeview-refresh-mechanism.md
**Spec**: specs/S52-treeview-refresh-mechanism/
**Status Change**: Ready → Completed
**Updated**: 2025-10-14
```

### Error Output (No Stories Need Sync)

```
ℹ️  All Stories Already Synchronized

Checked all specs and found no stories needing updates:
- 40 specs scanned
- 40 stories already synced
- 0 updates needed

All planning items accurately reflect implementation progress.
```
```

**Expected Outcome**:
- Report formats defined for all modes
- Clear visual distinction between modes
- Actionable next steps included

### Task 6: Add Examples and Documentation

**Objective**: Provide clear usage examples and guidance

**Location**: `.claude/commands/sync.md` - Examples section

**Examples**:
```markdown
## Examples

### Example 1: Full sync (apply changes)
```bash
/sync
```
Scans all specs in specs/ directory, updates any stories in plans/ where status is out of sync. Use this after implementing S53 to bring 25+ existing stories up to date.

### Example 2: Preview changes (dry run)
```bash
/sync --dry-run
```
Shows what changes would be made without applying them. Use this first to review proposed updates before committing to changes.

### Example 3: Sync specific story
```bash
/sync S52
```
Updates only story S52 if its status doesn't match the corresponding spec. Use this for targeted corrections when you know specific story is out of sync.

### Example 4: After completing spec outside /build workflow
```bash
# Scenario: You manually marked a spec as completed
# Now sync the story to match:
/sync S35
```

## Troubleshooting

### "Story not found in plans/"
- Verify story exists: `ls plans/**/story-##-*.md`
- Check story number matches spec: `grep "^spec:" specs/S##-*/plan.md`
- Story may have been deleted or never created

### "Story has no spec field"
- Older stories created before S27 don't have spec field
- Add manually: Edit story frontmatter, add `spec: specs/S##-title/`
- Or skip: These stories require manual status updates

### "Spec not found"
- Story's spec field points to non-existent directory
- Update story's spec field to correct path
- Or remove spec field if spec was deleted

### No updates needed
- All stories already synchronized
- Run `/plan` to verify pipeline status
- Check individual story files to confirm statuses correct
```

**Expected Outcome**:
- Comprehensive examples covering all use cases
- Troubleshooting guide for common issues
- Clear guidance on when to use each mode

### Task 7: Test with Existing Completed Specs

**Objective**: Validate sync command with real data

**Test Plan**:

1. **Pre-Test Verification**:
   ```bash
   # Count completed specs
   grep -l "^status: Completed" specs/*/plan.md | wc -l

   # Count ready/in-progress stories
   grep -l "^status: Ready" plans/**/*story*.md | wc -l
   grep -l "^status: In Progress" plans/**/*story*.md | wc -l

   # Expected: Many completed specs, many non-completed stories
   ```

2. **Test Dry Run Mode**:
   - Run `/sync --dry-run`
   - Verify preview shows expected changes
   - Verify no files actually modified
   - Check proposed update count matches expectations

3. **Test Full Sync**:
   - Run `/sync`
   - Verify success messages for each update
   - Verify summary report accurate
   - Check sample story files manually:
     ```bash
     grep "^status:" plans/**/story-52-*.md
     grep "^updated:" plans/**/story-52-*.md
     ```

4. **Test Idempotency**:
   - Run `/sync` again immediately
   - Verify "All stories already synchronized" message
   - Verify no duplicate updates

5. **Test Single Story Mode**:
   - Pick a story: `/sync S40`
   - Verify only that story checked and updated (if needed)
   - Verify other stories untouched

6. **Test Error Handling**:
   - Try non-existent story: `/sync S999`
   - Verify appropriate error message
   - Try invalid format: `/sync story-52`
   - Verify format error message

**Expected Outcome**:
- All test cases pass
- 25+ stories successfully updated from Ready → Completed
- Command behaves correctly in all modes
- Error handling works as expected

## Completion Criteria

- ✅ Command file created with complete structure
- ✅ Mode 1 (full sync) workflow implemented
- ✅ Mode 2 (dry run) workflow implemented
- ✅ Mode 3 (single story) workflow implemented
- ✅ Report formats defined for all modes
- ✅ Examples and documentation added
- ✅ Tested with existing 25+ completed specs
- ✅ All test cases pass
- ✅ Existing out-of-sync stories updated
- ✅ Command ready for regular use

## Next Phase

Proceed to Phase 3: `/plan` Mode 3 Enhancement

With automatic sync (Phase 1) and retroactive sync (Phase 2) complete, Phase 3 enhances the `/plan` command to show spec progress alongside story status, providing complete visibility into implementation progress.
