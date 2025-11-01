---
item: S26
title: Backfill Spec Phase Files with Frontmatter
type: story
status: Completed
priority: High
dependencies: []
estimate: M
created: 2025-10-12
updated: 2025-10-12
spec: specs/S26-backfill-spec-phase-frontmatter/
---

# S26 - Backfill Spec Phase Files with Frontmatter

## Description

As a developer, I want all existing spec phase task files to have YAML frontmatter so that the VSCode extension can display their status and the extension will work with all specs (not just new ones).

## Acceptance Criteria

- [ ] All 50 phase task files in `specs/*/tasks/*.md` have YAML frontmatter
- [ ] Frontmatter includes required fields: `spec`, `phase`, `title`, `status`, `priority`, `created`, `updated`
- [ ] Phase numbers extracted from filenames (e.g., `01-phase-name.md` → `phase: 1`)
- [ ] Spec numbers extracted from parent directory (e.g., `specs/S23-name/` → `spec: S23`)
- [ ] Phase titles extracted from filenames or file headings
- [ ] Status inferred from git history:
  - If spec has "COMPLETE" commit → `status: Completed`
  - If spec has "GREEN" or "REFACTOR" commits for that phase → `status: Completed`
  - If spec has "RED" commits for that phase → `status: In Progress`
  - Otherwise → `status: Not Started`
- [ ] Priority set to `High` by default (can be adjusted manually later)
- [ ] Timestamps set to file creation date or current date
- [ ] Script or command validates all files have frontmatter before completing

## Implementation Notes

**Backfill Strategy:**
1. Glob for all phase files: `specs/*/tasks/*.md`
2. For each file:
   - Read current content
   - Extract metadata:
     - Spec number from directory path
     - Phase number from filename
     - Title from filename or first heading
   - Check git log for status determination
   - Generate frontmatter YAML block
   - Prepend frontmatter to existing content
   - Write updated file

**Frontmatter Template:**
```yaml
---
spec: S23
phase: 1
title: Add Helper Method to TestRunner
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---
```

**Status Inference Logic:**
```bash
# Check if spec is complete
git log --all --grep="COMPLETE.*S23" --oneline

# Check if phase has GREEN/REFACTOR commits
git log --all --grep="GREEN.*Phase 1" --oneline
git log --all --grep="REFACTOR.*Phase 1" --oneline

# Check if phase has RED commits (in progress)
git log --all --grep="RED.*Phase 1" --oneline
```

## Testing

1. Run backfill script/command
2. Verify all 50 phase files have frontmatter
3. Check sample files for correct metadata:
   - `specs/S23-rewrite-edge-case-tests/tasks/01-add-helper-method.md`
   - `specs/S24-rewrite-performance-tests/tasks/01-refactor-100-files-test.md`
4. Use Grep to verify all files have frontmatter: `grep -L "^---" specs/**/tasks/*.md` (should return no files)
5. Validate frontmatter YAML syntax

## INVEST Checklist

- **Independent**: ✓ Can be completed without other stories (just needs git history)
- **Negotiable**: ✓ Status inference logic can be adjusted
- **Valuable**: ✓ Enables extension to work with existing specs immediately
- **Estimable**: ✓ Clear scope, ~2-3 hours
- **Small**: ✓ Focused on single task (adding frontmatter)
- **Testable**: ✓ Clear acceptance criteria with validation steps

## Analysis Summary

**Existing Specs:**
- 18 spec directories found
- 50 phase task files need frontmatter
- Current files have no frontmatter (pure markdown)

**Git History Analysis:**
- Completed specs (S1-S23): Have "COMPLETE" commits
- In progress spec (S24): Has some phase commits
- Can infer status from commit messages containing spec/phase numbers

**Integration Points:**
- Once backfilled, F13 (Specs Visualization) will immediately work
- No changes needed to extension code
- Future specs created by updated `/spec` command will have frontmatter automatically
