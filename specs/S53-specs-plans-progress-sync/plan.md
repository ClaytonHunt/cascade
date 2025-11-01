---
spec: S53
title: Specs-to-Plans Progress Synchronization
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-14
updated: 2025-10-14
---

# S53 - Specs-to-Plans Progress Synchronization

## Overview

This specification implements bidirectional synchronization between implementation specifications (specs/) and high-level planning (plans/) to automatically track implementation progress. Currently, the `/build` command updates spec statuses but never updates corresponding story statuses in plans/, creating two divergent tracking systems.

The solution adds automatic status synchronization so that when a spec progresses through its lifecycle (Not Started → In Progress → Completed), the corresponding story in plans/ mirrors these changes, providing accurate progress visibility in the planning system.

## Implementation Strategy

The implementation follows a three-phase approach that builds incrementally:

1. **Phase 1: `/build` Command Integration** - Add automatic synchronization when build completes phases
2. **Phase 2: `/sync` Command Creation** - Create retroactive sync command for existing completed specs
3. **Phase 3: `/plan` Mode 3 Enhancement** - Enhance pipeline status with spec progress visibility

This incremental approach ensures each phase delivers working functionality that can be tested independently before moving to the next phase.

### Architecture Summary

**Synchronization Flow:**
```
/build completes final phase
    → Update spec plan.md: status → Completed
    → Extract spec number from frontmatter
    → Find story in plans/ with matching item number
    → Verify story's spec field matches current spec directory
    → Update story: status → Completed, updated → current date
    → Log synchronization result
```

**Key Design Decisions:**

1. **Spec-to-Story Mapping**: Use the `spec:` field in story frontmatter to create bidirectional reference
   - Story contains: `spec: specs/S52-treeview-refresh-mechanism/`
   - Spec contains: `spec: S52` (item number only)
   - Lookup: Extract S52 from spec, search plans/ for `item: S52`

2. **Status Mapping Rules**:
   - Spec "In Progress" → Story "In Progress" (when Phase 1 starts)
   - Spec "Completed" → Story "Completed" (when final phase completes)
   - Spec "Not Started" → No change (spec hasn't started yet)

3. **Synchronization Timing**:
   - **Automatic**: During `/build` after phase status updates
   - **Manual**: Via new `/sync` command for retroactive updates
   - **Read-only**: During `/plan` Mode 3 for enhanced reporting

4. **Error Handling**:
   - Missing story → Log warning, continue build (don't fail)
   - Missing spec field → Skip sync (backward compatibility)
   - Malformed frontmatter → Log error, continue (resilient)

5. **Atomic Updates**: Use Edit tool for frontmatter field replacement
   - Update `status:` field
   - Update `updated:` timestamp
   - Preserve all other fields unchanged

## Integration Points

### `/build` Command Modifications

**File**: `.claude/commands/build.md`
**Locations**:
- **Mode 1, Step 5**: After updating spec plan.md to "In Progress" (Phase 1 start)
- **Mode 2, Steps After Phase Complete**: After updating spec plan.md to "Completed" (final phase)

**Changes**:
```markdown
### After Updating Spec Status (Mode 1/2):

6. **Synchronize Story Status**
   - Read spec plan.md frontmatter to extract `spec: S##`
   - Search plans/ directory for file with `item: S##`
   - If found:
     - Read story frontmatter to extract `spec:` field
     - Verify spec field points to current spec directory
     - Determine target status:
       - Spec "In Progress" → Story "In Progress"
       - Spec "Completed" → Story "Completed"
     - Update story frontmatter:
       - Use Edit tool: replace `status: [old]` with `status: [new]`
       - Use Edit tool: replace `updated: [old-date]` with current date
     - Log: `[SYNC] Story S## status updated: [old] → [new]`
   - If not found:
     - Log: `[SYNC] Warning: Story S## not found in plans/`
   - If spec field missing or doesn't match:
     - Skip sync (backward compatibility)
```

### `/sync` Command Creation

**File**: `.claude/commands/sync.md` (new file)
**Purpose**: Retroactive synchronization for existing completed specs

**Command Modes**:
1. **Full Sync** (`/sync`): Scan all specs, update all out-of-sync stories
2. **Dry Run** (`/sync --dry-run`): Preview changes without applying
3. **Single Story** (`/sync S52`): Sync specific story only

**Algorithm**:
```
1. Find all specs/*/plan.md files
2. For each spec plan.md:
   - Read frontmatter → extract `spec: S##` and `status:`
   - Search plans/ for story with `item: S##`
   - If story found:
     - Read story frontmatter
     - Check if `spec:` field matches spec directory
     - Compare spec status vs story status
     - If spec more advanced:
       - Update story status to match spec
       - Update story updated timestamp
       - Log result
   - If story not found: Log warning
3. Report summary
```

### `/plan` Mode 3 Enhancement

**File**: `.claude/commands/plan.md`
**Location**: Mode 3 (Context Request)

**Changes**:
- After scanning plans/ for status, also check specs/ for progress
- For each story in "Ready" or "In Progress" status:
  - Check if `spec:` field exists
  - If exists, read spec plan.md status
  - If spec status more advanced than story status, flag for sync
- Enhanced report format showing spec phase progress

## Phase Breakdown

### Phase 1: `/build` Command Integration
**Focus**: Automatic synchronization during build execution

- Modify `.claude/commands/build.md` instructions
- Add synchronization step after spec status updates
- Implement story lookup logic
- Implement frontmatter update logic
- Add logging for sync events
- Test with new spec implementation

**Completion Criteria**:
- ✅ Phase 1 start updates story to "In Progress"
- ✅ Final phase complete updates story to "Completed"
- ✅ Sync logged to output
- ✅ Build continues if story not found
- ✅ Timestamp updated correctly

### Phase 2: `/sync` Command Creation
**Focus**: Retroactive synchronization for existing specs

- Create `.claude/commands/sync.md`
- Implement spec directory scanning
- Implement story lookup and comparison
- Implement status update logic
- Add dry-run mode
- Add single-story mode
- Test with 25+ completed specs

**Completion Criteria**:
- ✅ Full sync scans all specs
- ✅ Dry-run shows changes without applying
- ✅ Single-story mode works
- ✅ Summary report accurate
- ✅ Handles missing stories gracefully

### Phase 3: `/plan` Mode 3 Enhancement
**Focus**: Enhanced progress tracking visibility

- Modify `.claude/commands/plan.md` Mode 3
- Add spec status reading logic
- Enhance pipeline status report
- Add spec-vs-story comparison
- Recommend `/sync` when divergence detected
- Test with mixed ready/in-progress/completed stories

**Completion Criteria**:
- ✅ Pipeline status shows spec progress
- ✅ Out-of-sync items flagged
- ✅ Recommendation includes `/sync` when needed
- ✅ Report format clear and actionable

## Risks and Considerations

### Low Risk
- **Existing Patterns**: Follows established frontmatter update patterns from `/plan`, `/spec`, `/build`
- **Isolated Changes**: No impact on existing functionality, additive only
- **Backward Compatible**: Skips sync if `spec:` field missing (older stories)
- **Error Handling**: Graceful degradation on missing files or malformed data

### Testing Considerations
- **Edge Cases**:
  - Story without `spec:` field → Skip sync gracefully
  - Spec directory not found → Log warning, continue
  - Multiple specs for same story → Use newest based on created date
  - Story status more advanced than spec → Don't downgrade (log warning)

### Performance Considerations
- **`/build` Integration**: Single story lookup and update, O(1) operations, negligible overhead
- **`/sync` Command**: O(n) where n = number of specs (~50 currently), expected < 1 second
- **`/plan` Mode 3**: Additional spec reads, ~2x file operations, still fast with grep

## Success Criteria

1. **Automatic Sync**: `/build` updates story status when spec progresses
2. **Manual Sync**: `/sync` successfully updates all out-of-sync stories
3. **Visibility**: `/plan` shows accurate progress including spec status
4. **Robustness**: Handles missing files, malformed data gracefully
5. **Logging**: All sync operations logged for debugging
6. **Backward Compatible**: Works with legacy stories without specs

## Files to Modify

### Modified Files (2)
1. `.claude/commands/build.md` - Add synchronization logic
2. `.claude/commands/plan.md` - Add spec progress visibility

### New Files (1)
3. `.claude/commands/sync.md` - New command for retroactive sync

## Validation Strategy

**Manual Testing**:
1. Run `/build` on new spec → Verify story status updates during lifecycle
2. Run `/sync --dry-run` → Verify preview shows correct changes
3. Run `/sync` → Verify all out-of-sync stories updated
4. Run `/plan` → Verify enhanced progress reporting
5. Test edge cases: missing spec field, non-existent story, etc.

**Verification Commands**:
```bash
# Find completed specs with non-completed stories
for spec in specs/*/plan.md; do
  spec_status=$(grep "^status:" "$spec" | cut -d: -f2 | xargs)
  spec_num=$(grep "^spec:" "$spec" | cut -d: -f2 | xargs)
  story=$(find plans -name "*${spec_num,,}*.md" 2>/dev/null)
  if [ -n "$story" ]; then
    story_status=$(grep "^status:" "$story" | cut -d: -f2 | xargs)
    if [ "$spec_status" = "Completed" ] && [ "$story_status" != "Completed" ]; then
      echo "OUT OF SYNC: $spec_num (Spec: $spec_status, Story: $story_status)"
    fi
  fi
done
```

## External Documentation

**Frontmatter Schema**: `docs/frontmatter-schema.md`
- Status values and transitions
- Field definitions and validation rules
- Best practices for manual editing

**Existing Commands**:
- `/plan` command: `.claude/commands/plan.md`
- `/spec` command: `.claude/commands/spec.md`
- `/build` command: `.claude/commands/build.md`

## Next Steps

After specification approval:
1. Run `/build specs/S53-specs-plans-progress-sync/plan.md`
2. Implement Phase 1: `/build` integration
3. Test with new spec implementation
4. Implement Phase 2: `/sync` command
5. Run `/sync` to update existing specs retroactively
6. Implement Phase 3: `/plan` enhancement
7. Verify all acceptance criteria met
