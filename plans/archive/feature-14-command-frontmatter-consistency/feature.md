---
item: F14
title: Slash Command Frontmatter Consistency
type: feature
status: Completed
priority: High
dependencies: []
created: 2025-10-12
updated: 2025-10-12
---

# F14 - Slash Command Frontmatter Consistency

## Description

Update the `/plan`, `/spec`, and `/build` Claude Code slash commands to ensure consistent YAML frontmatter management across all planning and specification files. This ensures the VSCode extension always has accurate metadata to display.

## Objectives

- Update `/plan` command to maintain frontmatter on all file operations
- Update `/spec` command to add frontmatter to phase task files
- Update `/build` command to update phase frontmatter as work progresses
- Ensure timestamp fields (`created`, `updated`) are always current
- Validate frontmatter schema consistency
- Document frontmatter requirements

## Scope

- Modify `.claude/commands/plan.md` to update frontmatter on file changes
- Modify `.claude/commands/spec.md` to create frontmatter in phase task files
- Modify `.claude/commands/build.md` to update phase status as phases complete
- Add frontmatter validation logic
- Create frontmatter schema documentation
- Backfill existing spec phase files with frontmatter

## Acceptance Criteria

### /plan Command Updates
- All newly created plan files have complete frontmatter with all required fields
- When updating existing files, frontmatter `updated` timestamp is refreshed
- Status transitions (e.g., "Not Started" → "In Progress") update frontmatter correctly
- Parent file frontmatter updated when child items are created

### /spec Command Updates
- Spec plan.md includes frontmatter with spec-level status
- Phase task files include frontmatter with phase-level metadata:
  - `spec`: Parent spec number (e.g., S23)
  - `phase`: Phase number (1, 2, 3)
  - `title`: Phase title
  - `status`: Phase status (Not Started, In Progress, Completed)
  - `priority`: Phase priority
  - `created`: Creation timestamp
  - `updated`: Last update timestamp

### /build Command Updates
- When starting a phase, update phase file frontmatter: `status: In Progress`
- When completing a phase, update phase file frontmatter: `status: Completed`
- Update `updated` timestamp on every phase status change
- Update parent spec plan.md frontmatter when overall spec status changes

### Backfill Existing Files
- Script or command to add frontmatter to existing spec phase files
- Infer status from git history or file content where possible

## Technical Notes

**Frontmatter Schema for Phase Files:**
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

**Command Modifications:**
- Commands are markdown files in `.claude/commands/`
- Update instructions to include frontmatter operations
- Add validation steps to ensure frontmatter is present and correct

**Backfill Strategy:**
- Identify all existing phase files without frontmatter: `specs/**/tasks/*.md`
- For each file, extract phase number from filename
- Determine status from git commits or default to "Completed" if work is done
- Insert frontmatter at top of file

## Child Items

- **S26**: Backfill Spec Phase Files with Frontmatter - Add frontmatter to all 50 existing phase task files
- **S27**: Update /spec Command to Create Phase Frontmatter - Ensure new specs have frontmatter automatically
- **S28**: Update /build Command to Update Phase Status - Real-time status tracking during implementation
- **S29**: Validate /plan Command Frontmatter Consistency - Verify and enhance plan command frontmatter handling
- **S30**: Document Frontmatter Schema and Best Practices - Comprehensive schema reference documentation

## Dependencies

None (command updates can be done independently of extension development)

## Analysis Summary

**Current Command Files:**
- `/plan`: `.claude/commands/plan.md` (line 64-97 define frontmatter format)
- `/spec`: `.claude/commands/spec.md` (mentions frontmatter but doesn't create it for phases)
- `/build`: `.claude/commands/build.md` (does not currently update frontmatter)

**Files Requiring Frontmatter:**
Plans (already have frontmatter):
- ✅ `plans/project.md`
- ✅ `plans/epic-##-name/epic.md`
- ✅ `plans/epic-##-name/feature-##-name/feature.md`
- ✅ `plans/epic-##-name/feature-##-name/story-##-name.md`

Specs (missing frontmatter in task files):
- ✅ `specs/S##-name/plan.md` (has frontmatter in some cases)
- ❌ `specs/S##-name/tasks/##-phase-name.md` (NO frontmatter currently)

**Backfill Scope:**
- Count of existing spec directories: ~12 specs
- Count of phase task files: ~50-60 files
- Can be automated with script or Claude Code command

**Integration Points:**
- F13 depends on phase files having frontmatter
- Extension will immediately reflect changes once frontmatter is present
- `/build` command integration enables real-time progress tracking
