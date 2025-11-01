---
item: S30
title: Document Frontmatter Schema and Best Practices
type: story
status: Completed
priority: Medium
dependencies: [S26, S27, S28, S29]
estimate: S
spec: specs/S30-document-frontmatter-schema/
created: 2025-10-12
updated: 2025-10-14
---

# S30 - Document Frontmatter Schema and Best Practices

## Description

As a developer, I want comprehensive documentation of the frontmatter schema and best practices so that I can manually edit files when needed and understand the data model used by the VSCode extension.

## Acceptance Criteria

- [ ] Frontmatter schema documentation created at `docs/frontmatter-schema.md`
- [ ] Documentation includes:
  - Complete field reference for all item types (Project, Epic, Feature, Story, Bug, Spec, Phase)
  - Valid values for enum fields (status, priority, type)
  - Field requirements (required vs optional)
  - Data types for each field
  - Examples for each item type
  - Status transition diagram
  - Best practices for manual editing
  - Troubleshooting common issues
- [ ] README.md updated with link to frontmatter schema docs
- [ ] CLAUDE.md project instructions updated with frontmatter reference

## Implementation Notes

**File Location:** `docs/frontmatter-schema.md`

**Document Structure:**

```markdown
# Frontmatter Schema Reference

## Overview

All planning and specification files use YAML frontmatter for structured metadata. This frontmatter is parsed by:
- Claude Code slash commands (/plan, /spec, /build)
- VSCode Planning Extension (status visualization)
- Git-based grep/filtering tools

## Field Reference

### Common Fields (All Item Types)

#### `item` (required)
- **Type:** String
- **Format:** P#, E#, F#, S#, B# (where # is a number)
- **Description:** Unique identifier for the item
- **Examples:** `P1`, `E2`, `F11`, `S26`, `B1`

#### `title` (required)
- **Type:** String
- **Description:** Human-readable title
- **Examples:** `"Extension Infrastructure"`, `"Backfill Spec Phase Files"`

#### `type` (required)
- **Type:** Enum
- **Valid Values:** `project`, `epic`, `feature`, `story`, `bug`, `spec`, `phase`
- **Description:** Item type for categorization
- **Examples:** `type: story`, `type: phase`

#### `status` (required)
- **Type:** Enum
- **Valid Values:** `Not Started`, `In Planning`, `Ready`, `In Progress`, `Blocked`, `Completed`
- **Description:** Current state of the item
- **State Transitions:** See Status Flow Diagram below

#### `priority` (required)
- **Type:** Enum
- **Valid Values:** `High`, `Medium`, `Low`
- **Description:** Importance/urgency level

#### `created` (required)
- **Type:** Date
- **Format:** YYYY-MM-DD
- **Description:** Date item was created

#### `updated` (required)
- **Type:** Date
- **Format:** YYYY-MM-DD
- **Description:** Date item was last modified

#### `dependencies` (optional)
- **Type:** Array of Strings
- **Format:** `[S26, F11]` or `[]` for none
- **Description:** Item numbers this depends on

#### `estimate` (optional, Stories/Bugs only)
- **Type:** Enum
- **Valid Values:** `XS`, `S`, `M`, `L`, `XL`
- **Description:** Size/complexity estimate

### Spec-Specific Fields

#### `spec` (required for phases)
- **Type:** String
- **Format:** S# (story number)
- **Description:** Parent spec identifier
- **Example:** `spec: S26`

#### `phase` (required for phases)
- **Type:** Integer
- **Description:** Phase sequence number (1, 2, 3, ...)
- **Example:** `phase: 1`

#### `phases` (optional for spec plan.md)
- **Type:** Integer
- **Description:** Total number of phases in spec
- **Example:** `phases: 3`

## Examples by Item Type

### Project
\`\`\`yaml
---
item: P1
title: Lineage RPG Game Systems
type: project
status: In Planning
priority: High
dependencies: []
created: 2025-10-09
updated: 2025-10-12
---
\`\`\`

### Epic
\`\`\`yaml
---
item: E3
title: VSCode Planning & Spec Status Extension
type: epic
status: In Planning
priority: High
dependencies: []
created: 2025-10-12
updated: 2025-10-12
---
\`\`\`

### Feature
\`\`\`yaml
---
item: F14
title: Slash Command Frontmatter Consistency
type: feature
status: Not Started
priority: High
dependencies: []
created: 2025-10-12
updated: 2025-10-12
---
\`\`\`

### Story
\`\`\`yaml
---
item: S26
title: Backfill Spec Phase Files with Frontmatter
type: story
status: Not Started
priority: High
dependencies: []
estimate: M
created: 2025-10-12
updated: 2025-10-12
---
\`\`\`

### Spec Plan
\`\`\`yaml
---
spec: S26
title: Backfill Spec Phase Files with Frontmatter
type: spec
status: Not Started
priority: High
phases: 3
created: 2025-10-12
updated: 2025-10-12
---
\`\`\`

### Phase Task File
\`\`\`yaml
---
spec: S26
phase: 1
title: Backfill Infrastructure Setup
status: Not Started
priority: High
created: 2025-10-12
updated: 2025-10-12
---
\`\`\`

## Status Flow Diagram

\`\`\`
[Not Started] → [In Planning] → [Ready] → [In Progress] → [Completed]
                                              ↓
                                          [Blocked]
                                              ↓
                                        [In Progress]
\`\`\`

### Status Definitions

- **Not Started:** Item created but work hasn't begun
- **In Planning:** Item being refined/analyzed
- **Ready:** Story/Bug ready for spec/implementation
- **In Progress:** Active work happening
- **Blocked:** Work stopped due to dependency or issue
- **Completed:** Work finished and verified

## Best Practices

### Manual Editing

1. **Always update `updated` timestamp** when making changes
2. **Validate YAML syntax** before saving (incorrect indentation breaks parsing)
3. **Use consistent status values** (case-sensitive, exact match required)
4. **Keep dependencies up to date** when item relationships change

### Status Transitions

- Update status when work state changes
- Use "Blocked" with explanation in markdown content
- Mark dependencies complete before marking item complete

### Dependencies

- Reference item numbers exactly (S26, F11, not "S26", "f11")
- Empty array for no dependencies: `dependencies: []`
- Check dependent items are in correct status before starting work

## Troubleshooting

### VSCode Extension Not Showing Status

- Verify YAML frontmatter syntax (use YAML validator)
- Check status value matches valid enum exactly
- Ensure file is in correct directory (plans/ or specs/)
- Verify frontmatter starts at line 1 (no blank lines before `---`)

### Grep/Filtering Not Finding Items

- Ensure field names match exactly (lowercase, no typos)
- Check indentation (YAML requires consistent spaces)
- Verify status values have no leading/trailing spaces

### Command Updates Not Working

- Check `updated` timestamp is valid YYYY-MM-DD format
- Verify item number matches filename location
- Ensure type matches directory structure (story in story-##.md)

## Tools and Validation

### Validate YAML Syntax
\`\`\`bash
# Check if file has valid frontmatter
head -20 file.md | grep "^---$"

# Extract frontmatter
sed -n '/^---$/,/^---$/p' file.md
\`\`\`

### Find Items by Status
\`\`\`bash
# Find all ready stories
grep -l "^status: Ready" plans/**/*story*.md

# Find all in-progress items
grep -l "^status: In Progress" plans/**/*.md specs/**/*.md
\`\`\`

### Validate Required Fields
\`\`\`bash
# Check file has all required fields
grep -E "^(item|title|type|status|priority|created|updated):" file.md
\`\`\`

## See Also

- `.claude/commands/plan.md` - Planning command documentation
- `.claude/commands/spec.md` - Spec command documentation
- `.claude/commands/build.md` - Build command documentation
- VSCode Extension README - Extension usage guide
```

## Testing

1. Create documentation file at `docs/frontmatter-schema.md`
2. Review with sample frontmatter from actual files
3. Test all bash commands in "Tools and Validation" section
4. Validate examples parse correctly as YAML
5. Update README.md and CLAUDE.md with links
6. Verify status flow diagram matches actual workflow

## INVEST Checklist

- **Independent**: ✓ Documentation can be written independently
- **Negotiable**: ✓ Structure and examples can be adjusted
- **Valuable**: ✓ Essential reference for manual editing and troubleshooting
- **Estimable**: ✓ Small scope, ~2 hours
- **Small**: ✓ Single documentation file
- **Testable**: ✓ Review for accuracy and completeness

## Analysis Summary

**Documentation Scope:**
- Complete field reference for all 7 item types
- Examples for each type
- Status flow and best practices
- Troubleshooting guide
- Validation tools

**Target Audience:**
- Developers manually editing files
- Extension developers understanding data model
- Future contributors to planning system

**Integration Points:**
- References command files for workflow context
- Complements extension documentation (F15)
- Provides validation commands for CI/CD
