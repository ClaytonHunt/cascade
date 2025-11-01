---
item: S75
title: Type System Updates for Archived Status
type: story
parent: F22
status: Completed
priority: High
dependencies: []
estimate: XS
spec: specs/S75-type-system-archived-status/
created: 2025-10-23
updated: 2025-10-23
---

# S75 - Type System Updates for Archived Status

## Description

Add 'Archived' as a new valid status value to the type system and icon mapping. This is the foundational change required for all archive functionality, as it establishes "Archived" as a first-class status alongside existing statuses like "Not Started", "In Progress", and "Completed".

This story updates the core type definitions and icon mappings to recognize and render archived items correctly in the TreeView.

## Acceptance Criteria

1. **Type Definition**:
   - [ ] `Status` type in types.ts includes 'Archived' value
   - [ ] TypeScript compilation succeeds with no type errors
   - [ ] All Status type references accept 'Archived' without errors

2. **Icon Mapping**:
   - [ ] `getTreeItemIcon()` in statusIcons.ts handles 'Archived' status
   - [ ] Archived icon uses appropriate Codicon (e.g., 'archive' or 'box')
   - [ ] Archived color is muted/gray (e.g., 'charts.gray' or undefined)
   - [ ] STATUS_BADGES and STATUS_COLORS include Archived entry

3. **Frontmatter Parsing**:
   - [ ] FrontmatterCache accepts "Archived" as valid status
   - [ ] No validation errors when parsing files with `status: Archived`
   - [ ] Type guards and validators include Archived in checks

4. **TreeView Rendering**:
   - [ ] Test file with `status: Archived` renders correctly in TreeView
   - [ ] Icon displays correctly (muted archive icon)
   - [ ] No console errors or warnings

## Technical Implementation

### Files to Modify

1. **vscode-extension/src/types.ts** (Line 14):
   ```typescript
   export type Status = 'Not Started' | 'In Planning' | 'Ready' | 'In Progress' | 'Blocked' | 'Completed' | 'Archived';
   ```

2. **vscode-extension/src/statusIcons.ts**:
   - Add to STATUS_BADGES (Line 41-47):
     ```typescript
     'Archived': '📦',  // or '□' for minimalist look
     ```
   - Add to STATUS_COLORS (Line 65-71):
     ```typescript
     'Archived': undefined,  // Use default gray color
     ```
   - Add to getTreeItemIcon() iconMap (Line 106-113):
     ```typescript
     'Archived': 'archive',  // VSCode Codicon for archive
     ```
   - Add to getTreeItemIcon() colorMap (Line 116-123):
     ```typescript
     'Archived': 'charts.gray',  // Muted gray color
     ```

### Testing Approach

1. **Type Validation**:
   - Run TypeScript compiler: `npm run compile`
   - Verify no type errors related to Status type

2. **Icon Rendering**:
   - Create test file: `plans/test-archived.md` with `status: Archived`
   - Open TreeView and verify icon displays correctly
   - Check output channel for no errors

3. **Frontmatter Parsing**:
   - Read test file using FrontmatterCache
   - Verify status field parses as 'Archived'
   - Check no validation errors

### Icon Selection

**Recommended Codicon**: `archive`
- Semantic meaning: Archived/stored items
- Visual clarity: Box/folder icon (distinct from other statuses)
- Color: Gray (muted, less prominent than active statuses)

**Alternative Codicons**:
- `box`: Generic box icon
- `folder`: Folder icon (may conflict with status groups)
- `circle-slash`: Crossed circle (indicates disabled/inactive)

## Dependencies

None - This is the foundational story for F22.

## Notes

- This story does NOT implement filtering logic (see S78)
- This story does NOT add "Archived" status group (see S78)
- This story ONLY adds type support and icon rendering
- Keep Archived icon visually distinct but muted (avoid bright colors)
- Archived should appear LAST in status group order (after Completed)
