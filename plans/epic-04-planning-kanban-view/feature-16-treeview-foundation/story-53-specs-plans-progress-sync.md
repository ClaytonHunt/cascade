---
item: S53
title: Specs-to-Plans Progress Synchronization
type: story
parent: F16
status: Completed
priority: High
dependencies: []
estimate: M
spec: specs/S53-specs-plans-progress-sync/
created: 2025-10-14
updated: 2025-10-14
---

# S53 - Specs-to-Plans Progress Synchronization

## Description

Build a bidirectional synchronization system between the `specs/` directory (implementation specifications) and the `plans/` directory (high-level planning) to automatically track implementation progress. Currently, the `/build` command updates spec statuses but never updates corresponding story statuses in plans/, creating two divergent tracking systems.

This story implements automatic status synchronization so that when a spec progresses through its lifecycle (Not Started → In Progress → Completed), the corresponding story in plans/ mirrors these changes, providing accurate progress visibility.

### The Problem

**Current Workflow:**
1. User runs `/plan` → Creates story in `plans/` with `status: Ready`
2. User runs `/spec S52` → Creates spec in `specs/S52-*/plan.md` with `status: Not Started`
3. User runs `/build` → Spec phases complete, `specs/S52-*/plan.md` becomes `status: Completed`
4. **Story in plans/ remains `status: Ready`** (never updated!)
5. `/plan` (Mode 3) only checks plans/ → Shows 0% progress despite 100% implementation

**Impact:**
- Progress tracking shows inaccurate status
- 25+ completed specs not reflected in plans/ statuses
- 170 spec files vs 77 plan files, but only plans/ tracked
- Pipeline recommendations based on stale data
- No way to identify truly completed stories vs. in-progress

### The Solution

**Status Lifecycle Synchronization:**
```
Spec Status          →  Story Status (plans/)
─────────────────────────────────────────────
Not Started              Ready (no change)
In Progress          →  In Progress
Completed            →  Completed
```

**Integration Points:**
1. **`/build` command** - Update story status when spec status changes
   - Phase 1 starts → Update story to "In Progress"
   - Final phase completes → Update story to "Completed"

2. **`/sync` command** - Retroactive synchronization for existing specs
   - Scan all specs/ directories
   - Find corresponding stories via `spec:` field
   - Update plans/ statuses to match specs/

3. **`/plan` Mode 3** - Enhanced progress tracking
   - Read both plans/ AND specs/ for accurate status
   - Show spec phase completion (e.g., "Phase 2/3")
   - Aggregate spec progress into story completion percentage

## Acceptance Criteria

### Automatic Synchronization (`/build` Integration)
- [ ] When spec plan.md transitions to `status: In Progress`, corresponding story in plans/ updates to `status: In Progress`
- [ ] When final spec phase completes and plan.md becomes `status: Completed`, story updates to `status: Completed`
- [ ] Synchronization uses the `spec:` field in story frontmatter to locate spec directory
- [ ] Story `updated:` timestamp refreshed when status synchronized
- [ ] Synchronization logged to output for debugging
- [ ] If story file not found, log warning but continue build
- [ ] If spec field missing in story, skip synchronization (backward compatibility)

### Manual Synchronization (`/sync` Command)
- [ ] New `/sync` command scans all specs/ directories
- [ ] For each spec plan.md with `status: Completed`, finds corresponding story
- [ ] Updates story status in plans/ to match spec status
- [ ] Reports synchronization results (stories updated, skipped, errors)
- [ ] Dry-run mode available: `/sync --dry-run` shows changes without applying
- [ ] Can target specific story: `/sync S52` syncs only that story
- [ ] Handles missing stories gracefully (logs warning, continues)

### Enhanced Progress Tracking (`/plan` Mode 3)
- [ ] `/plan` reads spec statuses in addition to plan statuses
- [ ] Pipeline status shows spec phase completion (e.g., "S52: Phase 2/3 Complete")
- [ ] Ready stories annotated with spec status if available
- [ ] In Progress stories show phase progress (e.g., "3/4 phases complete")
- [ ] Completed stories verified against spec completion
- [ ] Recommendation logic considers both plans/ and specs/ statuses
- [ ] If spec more advanced than story, suggests running `/sync`

### Robustness
- [ ] Handles missing `spec:` field in story frontmatter (skips sync)
- [ ] Handles non-existent spec directories (logs warning)
- [ ] Handles malformed frontmatter in specs/ (logs error, continues)
- [ ] Handles concurrent file modifications (atomic updates)
- [ ] Works with legacy stories without specs
- [ ] Preserves other frontmatter fields during status update

## Analysis Summary

### Codebase Integration Points

**Story Frontmatter (plans/):**
```yaml
---
item: S52
title: TreeView Refresh Mechanism
type: story
parent: F16
status: Ready                            # ← Will be updated
priority: High
spec: specs/S52-treeview-refresh-mechanism/  # ← Used to find spec
created: 2025-10-13
updated: 2025-10-13                      # ← Will be updated
---
```

**Spec Frontmatter (specs/):**
```yaml
---
spec: S52
title: TreeView Refresh Mechanism
type: spec
parent: F16
status: Completed                        # ← Source of truth
priority: High
phases: 3
created: 2025-10-13
updated: 2025-10-13
---
```

### Command Locations

**Files to Modify:**
- `.claude/commands/build.md` - Add synchronization after phase completion
- `.claude/commands/plan.md` - Add spec status reading in Mode 3

**Files to Create:**
- `.claude/commands/sync.md` - New command for retroactive synchronization

### Synchronization Algorithm

**Flow for `/build` Integration:**
```
1. Build completes final phase
2. Update spec plan.md → status: Completed
3. Read spec plan.md frontmatter → extract `spec: S52`
4. Search plans/ for file with `item: S52`
5. Read story frontmatter
6. Check if `spec:` field points to current spec directory
7. If match, update story status: Completed
8. Update story updated: [current date]
9. Write updated story file
10. Log synchronization result
```

**Flow for `/sync` Command:**
```
1. Find all specs/*/plan.md files
2. For each spec:
   a. Read frontmatter → extract `spec: SX` and `status:`
   b. Search plans/ for story with `item: SX`
   c. If found, read story frontmatter
   d. Verify `spec:` field matches spec directory
   e. If spec status more advanced than story status:
      - Update story status to match spec status
      - Update story updated timestamp
   f. Log result (updated/skipped/error)
3. Report summary (X stories updated, Y skipped, Z errors)
```

### Status Mapping Rules

**Spec → Story Status Mapping:**
| Spec Status      | Story Status     | Action                          |
|------------------|------------------|---------------------------------|
| Not Started      | Ready            | No change (spec not yet started)|
| In Progress      | Ready            | Update story → In Progress      |
| In Progress      | In Progress      | No change (already synced)      |
| Completed        | In Progress      | Update story → Completed        |
| Completed        | Completed        | No change (already synced)      |
| Completed        | Ready            | Update story → Completed (missed sync)|

**Edge Cases:**
- Story status more advanced than spec → Log warning, don't downgrade
- Spec blocked → Don't sync (spec statuses only support 3 states)
- Multiple specs for same story → Use newest spec based on `created` date

### Technical Implementation

**Frontmatter Update Strategy:**
Use Edit tool for atomic updates:
```typescript
// Read story file
const storyContent = Read(storyFilePath);

// Parse frontmatter
const { frontmatter, content } = parseFrontmatter(storyContent);

// Update status and timestamp
Edit(storyFilePath, {
  old_string: `status: ${frontmatter.status}`,
  new_string: `status: Completed`
});

Edit(storyFilePath, {
  old_string: `updated: ${frontmatter.updated}`,
  new_string: `updated: ${currentDate()}`
});
```

**Story Lookup Strategy:**
```typescript
// Extract story number from spec frontmatter
const storyNumber = specFrontmatter.spec; // "S52"

// Search plans/ for file with matching item number
const storyFiles = Glob("plans/**/*.md");
for (const file of storyFiles) {
  const content = Read(file);
  if (content.includes(`item: ${storyNumber}`)) {
    // Found matching story
    return file;
  }
}
```

**Spec Directory Discovery:**
```typescript
// From story frontmatter
const specDir = storyFrontmatter.spec; // "specs/S52-treeview-refresh-mechanism/"
const specPlanFile = `${specDir}plan.md`;

// Verify exists
if (exists(specPlanFile)) {
  const specContent = Read(specPlanFile);
  const specStatus = parseStatus(specContent);
  return specStatus;
}
```

### Performance Considerations

**Efficiency:**
- `/build` sync: Single story update, O(1) file operations
- `/sync` scan: O(n) where n = number of specs (~50 currently)
- Grep-based story lookup faster than full file reads
- Cache parsed frontmatter to avoid re-parsing

**Scalability:**
- 170 specs × 2 file operations (read spec, read story) = ~340 operations
- Expected time: < 1 second for full `/sync`
- Future: Add progress bar for `/sync` if > 100 specs

## Implementation Notes

### Phase 1: `/build` Integration
1. Modify `.claude/commands/build.md` Mode 2 workflow
2. After "Update spec plan.md frontmatter" step
3. Add synchronization logic
4. Test with new spec implementation

### Phase 2: `/sync` Command
1. Create `.claude/commands/sync.md`
2. Implement spec directory scanning
3. Implement story lookup and update
4. Add dry-run mode
5. Test with existing 25+ completed specs

### Phase 3: `/plan` Mode 3 Enhancement
1. Modify `.claude/commands/plan.md` Mode 3
2. Add spec status reading alongside plan status
3. Update recommendation logic
4. Update report format

### Logging Format

**Build Integration:**
```
[SYNC] Story S52 status updated: Ready → Completed
[SYNC] Synced from spec: specs/S52-treeview-refresh-mechanism/
[SYNC] Story file: plans/epic-04-planning-kanban-view/feature-16-treeview-foundation/story-52-treeview-refresh-mechanism.md
```

**Sync Command:**
```
🔄 Synchronizing specs → plans...

✅ S52: Ready → Completed
✅ S51: Ready → Completed
✅ S50: Ready → Completed
⏭️  S49: Already synced (Completed)
⚠️  S48: Story not found in plans/
⚠️  S47: spec field missing in story

Summary: 3 updated, 1 skipped, 2 warnings
```

## Test Strategy

**Manual Testing:**
1. Create test story with `spec:` field pointing to test spec
2. Run `/build` on test spec
3. Verify story status updates during spec lifecycle
4. Check story `updated` timestamp refreshed
5. Verify logging output

**Retroactive Sync Testing:**
1. Identify 3-5 completed specs with out-of-sync stories
2. Run `/sync --dry-run` to preview changes
3. Run `/sync` to apply changes
4. Verify story statuses updated correctly
5. Check no unintended side effects

**Edge Case Testing:**
1. Story without `spec:` field → Should skip gracefully
2. Spec directory not found → Should log warning and continue
3. Malformed frontmatter → Should handle error and continue
4. Multiple specs referencing same story → Should use newest

**Integration Testing:**
1. Run `/plan` after sync → Verify accurate pipeline status
2. Complete new spec end-to-end → Verify automatic sync
3. Run `/sync` twice → Verify idempotent (no duplicate updates)

## Dependencies

**Existing Infrastructure:**
- Frontmatter parser (used by `/plan`, `/spec`, `/build`)
- Glob/Grep for file searching
- Edit tool for atomic frontmatter updates
- Existing command structure in `.claude/commands/`

**No New Dependencies Required:**
All functionality can be implemented using existing tools and patterns.

## Future Enhancements

**Not in Scope for S53:**
- Visual progress indicators in VSCode TreeView (F17 requirement)
- Automatic reopening of changed files (user workflow preference)
- Bi-directional sync (spec inheriting story changes)
- Conflict resolution UI (manual resolution via file editing sufficient)
- Phase-level granularity (story just tracks overall spec status)

**Potential Future Stories:**
- S54: Phase-level progress indicators (show "Phase 2/3" in plans/)
- S55: Sync conflict resolution UI (handle divergent statuses)
- S56: Bi-directional sync (story changes propagate to spec)
