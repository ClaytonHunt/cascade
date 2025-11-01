---
item: S27
title: Update /spec Command to Create Phase Frontmatter
type: story
status: Completed
priority: High
dependencies: []
estimate: S
created: 2025-10-12
updated: 2025-10-12
spec: specs/S27-update-spec-command-frontmatter/
---

# S27 - Update /spec Command to Create Phase Frontmatter

## Description

As a developer, I want the `/spec` command to automatically create YAML frontmatter in phase task files when generating specs so that all new specs have proper metadata for the VSCode extension.

## Acceptance Criteria

- [ ] `.claude/commands/spec.md` updated with frontmatter generation instructions
- [ ] Phase task files created by `/spec` include complete YAML frontmatter
- [ ] Frontmatter includes fields: `spec`, `phase`, `title`, `status`, `priority`, `created`, `updated`
- [ ] Phase numbers assigned sequentially (1, 2, 3, ...)
- [ ] Initial status set to `Not Started` for all phases
- [ ] Priority inherited from parent story or defaulted to `High`
- [ ] Timestamps set to creation date
- [ ] Spec plan.md also includes/updates frontmatter with spec-level status

## Implementation Notes

**Location:** `.claude/commands/spec.md`

**Update Section:** "### Mode 1: Specified Work Item" → Step 4 "Generate Specification Files"

**Add Instructions:**
```markdown
4. **Generate Specification Files**
   - Create SPECS_DIR/[work-item]-[title]/ directory
   - Write plan.md with:
     - **YAML frontmatter** at top:
       ```yaml
       ---
       spec: [S#]
       title: [Story Title]
       type: spec
       status: Not Started
       priority: [High/Medium/Low]
       phases: [#]
       created: [YYYY-MM-DD]
       updated: [YYYY-MM-DD]
       ---
       ```
     - Work item reference and title
     - Implementation strategy overview
     - Architecture decisions
     - Key integration points
     - Risk assessment
     - Phase overview list
   - Create tasks/ subdirectory
   - Generate phase files (01-phase-name.md, 02-phase-name.md, etc.)
   - **Each phase file MUST start with YAML frontmatter:**
     ```yaml
     ---
     spec: [S#]
     phase: [1/2/3/...]
     title: [Phase Title]
     status: Not Started
     priority: [High/Medium/Low]
     created: [YYYY-MM-DD]
     updated: [YYYY-MM-DD]
     ---
     ```
   - Follow with phase content (Overview, Prerequisites, Tasks, etc.)
```

**Example Phase File:**
```markdown
---
spec: S26
phase: 1
title: Backfill Infrastructure Setup
status: Not Started
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 1: Backfill Infrastructure Setup

## Overview
Set up the script infrastructure for adding frontmatter to existing files...

## Prerequisites
...

## Tasks
...
```

## Testing

1. Run `/spec` on a ready story to generate a new spec
2. Verify plan.md has frontmatter at top
3. Check all phase task files have frontmatter
4. Validate YAML syntax in generated files
5. Confirm all required fields present:
   - spec number matches parent
   - phase numbers are sequential
   - status is "Not Started"
   - timestamps are current

## INVEST Checklist

- **Independent**: ✓ Command file update only
- **Negotiable**: ✓ Frontmatter field order can vary
- **Valuable**: ✓ All future specs will have proper metadata
- **Estimable**: ✓ Small scope, ~1 hour
- **Small**: ✓ Single file modification
- **Testable**: ✓ Generate spec and verify frontmatter

## Analysis Summary

**Command File:** `.claude/commands/spec.md`
- Lines 80-93: Current "Generate Specification Files" instructions
- Need to add frontmatter requirements before markdown content generation
- No breaking changes to existing spec structure

**Frontmatter Fields:**
- `spec`: Parent spec number (e.g., S26)
- `phase`: Phase sequence number (1, 2, 3)
- `title`: Phase title from filename/heading
- `status`: Always "Not Started" initially
- `priority`: Inherited from story or "High"
- `created`/`updated`: Current timestamp

**Integration Points:**
- Works with updated `/build` command (S28) for status updates
- Compatible with backfilled files (S26)
- Extension (F13) can read this frontmatter immediately
