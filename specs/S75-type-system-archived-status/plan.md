---
spec: S75
title: Type System Updates for Archived Status
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-23
updated: 2025-10-23
---

# S75 - Type System Updates for Archived Status

## Overview

This specification implements the foundational type system changes required to support "Archived" as a first-class status value in the Cascade VSCode extension. This is the cornerstone story of Feature 22 (Archive Support), enabling all subsequent archive functionality.

The implementation adds "Archived" to the Status type enum and updates all related icon mappings, color definitions, and validation logic. Once complete, the extension will recognize archived items in frontmatter and render them with appropriate visual indicators in the TreeView.

## Implementation Strategy

The implementation follows a **layered approach**, starting with core type definitions and progressively updating dependent systems:

1. **Phase 1: Core Type System Updates**
   - Update `Status` type enum in `types.ts`
   - Add "Archived" to validation logic in `parser.ts`
   - Ensure TypeScript compilation succeeds

2. **Phase 2: Icon and Visual System Updates**
   - Add "Archived" entries to `STATUS_BADGES` and `STATUS_COLORS`
   - Update `getTreeItemIcon()` to handle "Archived" status
   - Add "Archived" to status group ordering in `PlanningTreeProvider.ts`
   - Choose appropriate Codicon and muted color scheme

3. **Phase 3: Testing and Verification**
   - Create test files with `status: Archived` frontmatter
   - Verify TreeView rendering (icon, color, grouping)
   - Add unit tests to `statusIcons.test.ts`
   - Verify no console errors or type warnings

## Architecture Decisions

### Icon Selection: `archive` Codicon

**Rationale:**
- Semantic clarity: "archive" Codicon represents stored/inactive items
- Visual distinction: Box/folder icon different from all existing status icons
- VSCode convention: Matches user expectations from file explorer icons

**Alternatives Considered:**
- `box`: Generic but lacks semantic meaning
- `folder`: Conflicts with status group icons
- `circle-slash`: Too negative (suggests disabled, not archived)

### Color Selection: `charts.gray` (Muted)

**Rationale:**
- Low visual prominence: Archived items should be de-emphasized
- Consistency: Matches "Not Started" muted color scheme
- Theme-adaptive: Works in light and dark themes

**Position in Status Groups:** LAST (after "Completed")
- Archives represent "done but stored" items
- Should not appear prominently in workflow views
- User can toggle visibility (see S79)

### Validation Strategy

Unlike other statuses, "Archived" is **intentionally excluded** from `statusTransitions.ts` in this phase:
- Archive status is NOT part of normal workflow progression
- Archive transitions will be added in S77 (Toggle Command)
- Prevents accidental drag-and-drop into Archived group

## Key Integration Points

### Files Modified

1. **vscode-extension/src/types.ts:14**
   - Add 'Archived' to Status type union
   - TypeScript compiler enforces exhaustive checks across codebase

2. **vscode-extension/src/parser.ts:71**
   - Add 'Archived' to `validStatuses` array in `isValidStatus()`
   - Enables frontmatter parsing for archived files

3. **vscode-extension/src/statusIcons.ts**
   - Lines 41-47: Add to `STATUS_BADGES` (📦 or □)
   - Lines 65-71: Add to `STATUS_COLORS` (undefined/gray)
   - Lines 106-113: Add to `getTreeItemIcon()` iconMap ('archive')
   - Lines 116-123: Add to `getTreeItemIcon()` colorMap ('charts.gray')

4. **vscode-extension/src/treeview/PlanningTreeProvider.ts:626-633**
   - Add 'Archived' to status array (LAST position)
   - Status groups will auto-generate from updated array

5. **vscode-extension/src/test/suite/statusIcons.test.ts**
   - Add test case for `getTreeItemIcon('Archived')`
   - Verify icon ID, color, and fallback behavior

### External Dependencies

- **VSCode Codicons**: https://microsoft.github.io/vscode-codicons/dist/codicon.html
  - Reference for icon IDs and visual preview
- **VSCode Theme Colors**: https://code.visualstudio.com/api/references/theme-color
  - Reference for color token IDs

## Risk Assessment

### Low Risk Factors
- **Isolated Change**: Status type is centrally defined, easy to update
- **Type Safety**: TypeScript enforces exhaustive checks on Status type
- **No Runtime Logic**: Adding enum value does not break existing workflow
- **Backward Compatible**: Existing files unaffected (no frontmatter changes)

### Potential Issues
1. **Incomplete Coverage**: If any file uses Status enum but not imported type
   - **Mitigation**: TypeScript compilation will fail (caught early)

2. **Test Coverage**: Existing tests may not cover new status value
   - **Mitigation**: Phase 3 adds explicit Archived tests

3. **Status Order Assumptions**: Code that assumes specific status array length
   - **Mitigation**: Codebase analysis shows status arrays are dynamic (no hardcoded indices)

## Testing Strategy

### Unit Tests (statusIcons.test.ts)
- Test `getTreeItemIcon('Archived')` returns correct icon and color
- Test fallback behavior for unknown statuses (should not treat Archived as unknown)

### Integration Tests
- Create test file: `plans/test-archived.md` with `status: Archived`
- Open Cascade TreeView and verify:
  - Archived status group appears LAST
  - Test item appears in Archived group
  - Icon displays as archive/box icon
  - Color is muted gray
  - No console errors

### Regression Tests
- Run existing test suite (`npm test`)
- Verify all Status-dependent tests still pass
- Verify TypeScript compilation succeeds (`npm run compile`)

## Phase Overview

### Phase 1: Core Type System Updates
**Goal:** Add "Archived" to Status type and validation logic
- Update `types.ts` Status enum
- Update `parser.ts` validation
- Verify TypeScript compilation

### Phase 2: Icon and Visual System Updates
**Goal:** Add visual representation for Archived status
- Update `statusIcons.ts` mappings
- Update `PlanningTreeProvider.ts` status ordering
- Verify icon rendering

### Phase 3: Testing and Verification
**Goal:** Ensure Archived status works end-to-end
- Add unit tests
- Create test planning files
- Verify TreeView rendering
- Run full test suite

## Next Steps

After completing this specification:
1. Run `/build specs/S75-type-system-archived-status/plan.md`
2. Follow TDD RED-GREEN-REFACTOR cycle
3. Mark S75 as "Completed" when all tests pass
4. Proceed to S76 (Archive Directory Detection)
