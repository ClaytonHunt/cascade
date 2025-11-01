---
item: F13
title: Specs Directory Visualization
type: feature
status: Not Started
priority: High
dependencies: [F11]
created: 2025-10-12
updated: 2025-10-12
---

# F13 - Specs Directory Visualization

## Description

Implement file decorations for the `specs/` directory structure, showing status tracking for implementation specifications, phases, and tasks. Spec folders show aggregate phase completion, while individual phase files show their specific status.

## Objectives

- Display status icons for spec plan.md files based on overall spec status
- Show aggregate completion badges for spec folders (e.g., "2/3 phases")
- Display status icons for individual phase task files
- Update decorations in real-time when spec files change
- Support same status types as plans: Not Started, In Planning, Ready, In Progress, Blocked, Completed

## Scope

- FileDecorationProvider implementation for specs directory
- Spec folder aggregate calculation (completed phases / total phases)
- Phase file status decoration based on frontmatter
- plan.md status decoration
- Tooltip text for detailed spec progress
- Frontmatter schema for phase task files

## Acceptance Criteria

- Spec folders show badge with format "X/Y" where X is completed phases, Y is total phases
- Spec plan.md files show overall spec status icon
- Phase task files (e.g., `01-phase-name.md`) show individual phase status icon
- Decorations update within 1 second of file changes
- Phase files have frontmatter with status field
- Tooltips show phase names and completion status
- Consistent icon usage with F12 (same status icons)

## Specs Directory Structure

```
specs/
└── S##-name/
    ├── plan.md (overall spec status icon)
    └── tasks/
        ├── 01-phase-name.md (phase status icon)
        ├── 02-phase-name.md (phase status icon)
        └── 03-phase-name.md (phase status icon)
```

## Frontmatter Schema for Phase Files

Phase task files must include frontmatter:
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

## Technical Notes

**VSCode APIs:**
- Same FileDecorationProvider pattern as F12
- Reuse status icon mapping from F12

**Hierarchical Calculation:**
```typescript
// For Spec folder: count completed/total phases in tasks/ folder
function calculateSpecProgress(specUri: vscode.Uri): {completed: number, total: number} {
  // Find all tasks/*.md files
  // Parse frontmatter for status field
  // Count completed vs total
}
```

**Integration with /build Command:**
- When `/build` completes a phase, it should update phase file frontmatter
- Extension will detect change and update decorations
- Provides real-time visual feedback during implementation

## Child Items

To be broken down into stories.

## Dependencies

- **F11**: Extension Infrastructure (requires file watching and frontmatter parsing)

## Analysis Summary

**Current Specs Structure:**
- Spec directories: `specs/S##-name/`
- Plan files: `specs/S##-name/plan.md`
- Phase files: `specs/S##-name/tasks/##-phase-name.md`

**Frontmatter Requirements:**
- Currently, phase task files do NOT have frontmatter
- **Requirement**: Add frontmatter to all phase task files
- This can be done by F14 (command updates) or as part of this feature

**Example Spec:**
```
specs/S23-rewrite-edge-case-tests/
├── plan.md (shows "3/3" badge - all phases complete)
└── tasks/
    ├── 01-add-helper-method.md (✔️ Completed)
    ├── 02-refactor-edge-case-tests.md (✔️ Completed)
    └── 03-verification-and-cleanup.md (✔️ Completed)
```

**Integration Points:**
- Uses F11's file watching and parsing
- Requires F14 to update phase frontmatter from `/build` command
- Can work independently of F12 (different directory)
