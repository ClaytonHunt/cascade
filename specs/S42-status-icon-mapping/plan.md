---
spec: S42
title: Status Icon Mapping
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-13
updated: 2025-10-13
---

# S42 - Status Icon Mapping Implementation Specification

## Overview

Create a status-to-icon mapping system for the VSCode Planning Extension that translates frontmatter `status` field values into VSCode-compatible FileDecoration badges. This provides the visual vocabulary for the file decoration system implemented in S41.

## Story Reference

**Story**: S42 - Status Icon Mapping
**Location**: `plans/epic-03-vscode-planning-extension/feature-12-plans-visualization/story-42-status-icon-mapping.md`
**Dependencies**: S41 (File Decoration Provider Foundation) - Completed ✅

## Architecture Overview

### Design Decisions

**Icon Approach: Single-Character Badges**
- Use VSCode FileDecoration `badge` property (1-2 character strings)
- Leverages existing FileDecoration API without custom icon files
- Works seamlessly with light/dark themes via ThemeColor
- Accessible and consistent with VSCode design language

**Implementation Pattern: Standalone Module**
- Create new file: `vscode-extension/src/statusIcons.ts`
- Export single mapping function: `getDecorationForStatus(status: Status)`
- Returns complete `FileDecoration` object (badge + tooltip + color)
- Module can be imported and used by `decorationProvider.ts`

### Integration Points

1. **Types (`types.ts:14`)**
   - Uses existing `Status` type enum
   - No changes needed to type definitions

2. **Decoration Provider (`decorationProvider.ts:101`)**
   - Will import `getDecorationForStatus()` in S44
   - Currently returns `undefined` (line 118) - S44 will replace with actual decoration

3. **Cache Layer (`cache.ts`)**
   - S44 will fetch status from cached frontmatter
   - This module receives status string, returns decoration

### Status to Icon Mapping

| Status | Badge | Color | Reasoning |
|--------|-------|-------|-----------|
| Not Started | `○` | default | Hollow circle = empty/waiting |
| In Planning | `✎` | info blue | Pencil = design/planning work |
| Ready | `✓` | success green | Checkmark = ready to go |
| In Progress | `↻` | warning yellow | Circular arrows = active work |
| Blocked | `⊘` | error red | Prohibition sign = blocked |
| Completed | `✔` | success green | Heavy checkmark = done |

### Risk Assessment

**Low Risk Implementation:**
- Pure mapping function (no state, no side effects)
- Uses stable VSCode API (`FileDecoration`, `ThemeColor`)
- Falls back gracefully for unknown status values (default decoration)
- No filesystem operations or async behavior

**Potential Issues:**
- Unicode rendering varies by OS font (mitigated by choosing widely-supported symbols)
- Light/dark theme contrast (mitigated by ThemeColor API)
- Future status values (mitigated by default case in mapping)

## Implementation Phases

### Phase 1: Status Icon Mapping Module
Create the core mapping module with status-to-decoration translation logic.

**File**: `tasks/01-status-icon-mapping-module.md`

**Deliverables:**
- `vscode-extension/src/statusIcons.ts` with `getDecorationForStatus()` function
- Complete mapping for all 6 status values
- Default decoration for unknown statuses
- JSDoc documentation with examples

### Phase 2: Unit Tests
Validate mapping correctness and edge case handling.

**File**: `tasks/02-unit-tests.md`

**Deliverables:**
- `vscode-extension/src/test/suite/statusIcons.test.ts`
- Test coverage for all 6 status values
- Test for unknown status (default case)
- Test decoration properties (badge, tooltip, color)

### Phase 3: Documentation and Integration Preparation
Document the module and prepare for S44 integration.

**File**: `tasks/03-documentation-integration.md`

**Deliverables:**
- Module exports verified
- Integration example documented
- README or inline comments updated
- Manual verification in both light/dark themes

## Completion Criteria

- [ ] `statusIcons.ts` created with `getDecorationForStatus()` function
- [ ] All 6 status values mapped to appropriate decorations
- [ ] Unknown status returns default decoration (no crashes)
- [ ] Unit tests pass for all status values
- [ ] Unit tests pass for unknown status edge case
- [ ] Decorations tested in light theme (Visual Studio Light)
- [ ] Decorations tested in dark theme (Visual Studio Dark)
- [ ] JSDoc documentation complete
- [ ] Module exports correctly (can be imported)
- [ ] Ready for S44 to integrate into `decorationProvider.ts`

## Next Steps

After completing this specification:
1. Run `/build specs/S42-status-icon-mapping/plan.md` to begin TDD implementation
2. Upon completion, S44 will integrate this module into the decoration provider
3. S43 (File Type Detection) can proceed in parallel if needed
