---
item: S29
title: Validate /plan Command Frontmatter Consistency
type: story
status: Completed
priority: Medium
dependencies: []
estimate: S
created: 2025-10-12
updated: 2025-10-12
spec: specs/S29-validate-plan-command-frontmatter/
---

# S29 - Validate /plan Command Frontmatter Consistency

## Description

As a developer, I want to verify and enhance the `/plan` command's frontmatter management to ensure all plan files always have complete and consistent YAML frontmatter.

## Acceptance Criteria

- [ ] `.claude/commands/plan.md` reviewed for frontmatter consistency
- [ ] All file creation operations include complete frontmatter with required fields
- [ ] All file update operations refresh `updated` timestamp
- [ ] Status transitions update frontmatter correctly
- [ ] Parent file frontmatter updated when child items created/modified
- [ ] Documentation clarifies frontmatter requirements
- [ ] Test plan verification shows consistent frontmatter across all operations

## Implementation Notes

**Location:** `.claude/commands/plan.md`

**Current State Analysis:**
- Lines 59-97: Frontmatter schema already well-defined ✅
- Lines 101-131: Mode 1 workflow includes frontmatter creation
- Lines 133-166: Mode 2 workflow includes frontmatter updates
- System already enforces frontmatter usage

**Validation Checklist:**

1. **Mode 1: New Planning Request**
   - ✅ Creates files with frontmatter (Step 4)
   - ✅ Sets initial status
   - ✓ Verify `updated` timestamp always set

2. **Mode 2: Item Breakdown**
   - ✅ Creates child files with frontmatter (Step 5)
   - ✅ Updates parent file (Step 5: "Update parent file with child list and update parent's frontmatter timestamp")
   - ✓ Verify all required fields present
   - ✓ Verify dependencies array format correct

3. **Status Transitions**
   - When marking story "Ready" → update frontmatter
   - When starting work on story → update to "In Progress"
   - When completing story → update to "Completed"
   - When blocking story → update to "Blocked"

**Enhancements to Add:**

Add explicit validation step to workflow:
```markdown
### Frontmatter Validation

Before completing any file write operation:
- Verify all required fields present:
  - item, title, type, status, priority, created, updated
- Verify status value is valid:
  - Not Started, In Planning, Ready, In Progress, Blocked, Completed
- Verify type matches file location:
  - Epic files have `type: epic`
  - Feature files have `type: feature`
  - Story files have `type: story`
- Verify dependencies array format correct (if present)
- Verify timestamp format is YYYY-MM-DD
```

## Testing

1. Create new planning item with `/plan "test description"`
   - Verify frontmatter complete and valid
2. Break down item with `/plan F#`
   - Verify all child files have frontmatter
   - Verify parent file updated timestamp changed
3. Create story and mark as ready
   - Verify status field updated in frontmatter
4. Check dependencies array format in files with dependencies
5. Audit existing plan files for any missing/invalid frontmatter

## INVEST Checklist

- **Independent**: ✓ Can verify command independently
- **Negotiable**: ✓ Validation rules can be adjusted
- **Valuable**: ✓ Ensures data integrity for extension
- **Estimable**: ✓ Small scope, ~1-2 hours
- **Small**: ✓ Primarily verification and minor enhancements
- **Testable**: ✓ Run command and check frontmatter

## Analysis Summary

**Current State:**
- `/plan` command already has strong frontmatter support
- Schema well-documented in command file
- Most operations already include frontmatter management

**Potential Issues:**
- Need to verify `updated` timestamp always refreshed on edits
- Need to verify status transitions update frontmatter
- Need to verify dependencies array format consistent

**Enhancements:**
- Add explicit validation instructions
- Document status transition requirements
- Add troubleshooting section for frontmatter issues

**Integration Points:**
- Works with existing plans (all have frontmatter)
- Supports extension requirements (F12 Plans Visualization)
- Maintains compatibility with existing files
