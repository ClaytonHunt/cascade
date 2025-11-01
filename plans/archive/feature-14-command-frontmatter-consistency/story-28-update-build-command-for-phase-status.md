---
item: S28
title: Update /build Command to Update Phase Status
type: story
status: Completed
priority: High
dependencies: [S27]
estimate: M
created: 2025-10-12
updated: 2025-10-12
spec: specs/S28-update-build-command-for-phase-status/
---

# S28 - Update /build Command to Update Phase Status

## Description

As a developer, I want the `/build` command to update phase file frontmatter status as work progresses so that the VSCode extension shows real-time progress during implementation.

## Acceptance Criteria

- [ ] `.claude/commands/build.md` updated with frontmatter management instructions
- [ ] When starting a phase, update phase file frontmatter: `status: In Progress`
- [ ] When completing a phase, update phase file frontmatter: `status: Completed`
- [ ] Update `updated` timestamp on every status change
- [ ] Update spec plan.md frontmatter when overall spec status changes
- [ ] Phase status transitions:
  - `Not Started` → `In Progress` (when phase begins)
  - `In Progress` → `Completed` (when phase finishes)
- [ ] Spec status transitions:
  - `Not Started` → `In Progress` (when Phase 1 begins)
  - `In Progress` → `Completed` (when all phases complete)

## Implementation Notes

**Location:** `.claude/commands/build.md`

**Update Section 1:** "### Mode 1: Start New Spec Implementation" → Step 5 "Execute Phase 1"

**Add Before Phase Execution:**
```markdown
5. **Execute Phase 1**
   - **Update phase file frontmatter:**
     - Read `tasks/01-*.md`
     - Update frontmatter: `status: In Progress`
     - Update frontmatter: `updated: [current-date]`
     - Write file back
   - **Update spec plan.md frontmatter:**
     - Update: `status: In Progress` (if Not Started)
     - Update: `updated: [current-date]`
   - For each task in phase:
     - Execute full RED-GREEN-REFACTOR cycle (see Mode 3)
     - Mark task complete in TodoWrite
   - Run full test suite after phase completion
   - **Update phase file frontmatter:**
     - Update: `status: Completed`
     - Update: `updated: [current-date]`
   - Commit phase completion
   - Report Phase 1 complete
   - STOP and wait for user confirmation
```

**Update Section 2:** "### Mode 2: Resume Specific Phase" → Step 4 "Analyze and Execute Phase"

Add same frontmatter updates as Mode 1.

**Update Section 3:** Add new check at phase completion

```markdown
After completing final phase:
- **Update spec plan.md frontmatter:**
  - Update: `status: Completed`
  - Update: `updated: [current-date]`
- Report spec fully implemented
```

**Frontmatter Update Logic:**
```markdown
To update frontmatter:
1. Read entire file content
2. Parse YAML frontmatter (between `---` delimiters)
3. Update status field
4. Update updated field with current date (YYYY-MM-DD format)
5. Reconstruct file with updated frontmatter + original markdown content
6. Write back to file
```

## Testing

1. Start new spec implementation with `/build specs/S##-name/plan.md`
2. Verify phase 1 file frontmatter updates to `status: In Progress`
3. Verify spec plan.md updates to `status: In Progress`
4. Complete phase 1
5. Verify phase 1 file updates to `status: Completed`
6. Start phase 2
7. Verify phase 2 file updates to `status: In Progress`
8. Complete all phases
9. Verify spec plan.md updates to `status: Completed`
10. Check all `updated` timestamps reflect change dates

## INVEST Checklist

- **Independent**: ✓ Depends on S27 but can be tested independently
- **Negotiable**: ✓ Timing of updates can be adjusted
- **Valuable**: ✓ Enables real-time progress tracking in extension
- **Estimable**: ✓ Medium scope, ~2-3 hours
- **Small**: ✓ Focused on status updates only
- **Testable**: ✓ Clear before/after states to verify

## Analysis Summary

**Command File:** `.claude/commands/build.md`
- Lines 108-151: Mode 1 execution flow
- Lines 152-172: Mode 2 execution flow
- Need to add frontmatter updates at phase start and end

**Status Transition Rules:**
```
Phase Status:
  Not Started → In Progress (when phase execution begins)
  In Progress → Completed (when phase tasks all done and tests pass)

Spec Status:
  Not Started → In Progress (when Phase 1 begins)
  In Progress → In Progress (during middle phases)
  In Progress → Completed (when final phase completes)
```

**Integration Points:**
- Reads frontmatter format created by S27
- Updates trigger VSCode extension decorations (F13)
- Works with backfilled specs (S26) that have frontmatter
- Edit tool can be used to update frontmatter: replace old_string/new_string

**Edge Cases:**
- Handle specs without frontmatter (legacy specs not yet backfilled)
- Handle partial phase completion (interrupted builds)
- Handle manual status changes by user
