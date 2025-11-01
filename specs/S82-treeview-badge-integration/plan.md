---
spec: S82
title: TreeView Badge Integration
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-24
updated: 2025-10-24
---

# S82 - TreeView Badge Integration

## Implementation Strategy

This specification implements the final integration of the badge renderer utility (S81) into the TreeView rendering pipeline. The work involves modifying the `PlanningTreeProvider.getTreeItem()` method to replace plain-text status strings with color-coded Codicon badges.

**Key Strategy Points:**

1. **Single Integration Point**: All changes occur in one method (`getTreeItem()`) at one location (lines 631-648)
2. **Preserve Existing Logic**: Progress calculation, tooltip, icon, and command assignment remain unchanged
3. **Archived Item Support**: Leverage existing `isItemArchived()` detection to ensure archived items display archive badges
4. **Test Coverage**: Update existing TreeView tests to verify badge syntax in description field

**Incremental Approach:**

- **Phase 1**: Core Integration - Add badge rendering to getTreeItem() method
- **Phase 2**: Test Updates - Update automated tests to verify badge rendering

## Architecture Decisions

### Decision 1: Import Location
**Choice**: Import `renderStatusBadge` at module level in `PlanningTreeProvider.ts`

**Reasoning**:
- Badge renderer is a utility function used once per TreeItem render
- Module-level import is standard TypeScript convention
- No circular dependency risk (badgeRenderer has no dependencies on PlanningTreeProvider)

### Decision 2: Badge Generation Timing
**Choice**: Generate badge inline during description assignment (not pre-computed)

**Reasoning**:
- Badge generation is O(1) lookup (< 0.001ms per call)
- No performance benefit from caching
- Keeps code simple and readable
- Badges always reflect current status

### Decision 3: Archived Item Handling
**Choice**: Use existing `isItemArchived()` check to determine effective status before badge generation

**Reasoning**:
- Consistent with existing icon handling (line 622)
- Reuses S80 archived detection logic
- Ensures archived items always show "$(archive) Archived" badge regardless of frontmatter status

## Key Integration Points

1. **Badge Renderer Module** (`vscode-extension/src/treeview/badgeRenderer.ts`):
   - Provides `renderStatusBadge(status: Status): string` function
   - Returns Codicon-formatted badge strings (e.g., "$(sync) In Progress")
   - Already implemented and tested in S81

2. **Archive Detection** (`vscode-extension/src/treeview/archiveUtils.ts`):
   - Provides `isItemArchived(item: PlanningTreeItem): boolean` function
   - Detects archived items by directory path or status field
   - Implemented in S80

3. **TreeView Refresh Mechanism**:
   - Existing refresh() and refreshPartial() methods trigger TreeItem re-rendering
   - FileSystemWatcher integration (S71) automatically refreshes on file changes
   - Debouncing (300ms) batches rapid changes

4. **Automated Test Suite**:
   - `treeItemRendering.test.ts` - Tests getTreeItem() output (needs badge assertions)
   - `badgeRenderer.test.ts` - Tests badge generation (already complete in S81)

## Risk Assessment

### Risk 1: Badge Syntax Breaking TreeView Rendering
**Likelihood**: Low
**Impact**: High
**Mitigation**:
- Codicon syntax is standard VSCode convention (widely used in extensions)
- Badge renderer already tested with all status values (S81)
- Visual verification in both Dark+ and Light+ themes required

### Risk 2: Performance Degradation with Large TreeViews
**Likelihood**: Very Low
**Impact**: Medium
**Mitigation**:
- Badge generation is O(1) with < 0.001ms per call (verified in S81 tests)
- Performance target: TreeView refresh < 500ms with 100+ items
- No additional file I/O or async operations introduced

### Risk 3: Test Update Breakage
**Likelihood**: Medium
**Impact**: Low
**Mitigation**:
- Only description field assertions need updating (targeted changes)
- Badge renderer tests provide reference for expected badge format
- Run full test suite before committing

## Phase Overview

### Phase 1: Core Integration (Development)
**Duration**: Small (< 1 hour)
**Deliverables**:
- Modified `PlanningTreeProvider.ts` with badge rendering
- Badge import added to module
- Effective status handling for archived items
- Visual verification in local VSCode instance

**Tasks**: 4 implementation tasks

### Phase 2: Test Updates (Validation)
**Duration**: Small (< 1 hour)
**Deliverables**:
- Updated `treeItemRendering.test.ts` with badge assertions
- All tests passing
- Test coverage for badge + progress format
- Test coverage for badge-only format

**Tasks**: 2 test update tasks

## Codebase Analysis Summary

### Files to Modify
1. **`vscode-extension/src/treeview/PlanningTreeProvider.ts`** (Primary Integration Point):
   - Add import: `import { renderStatusBadge } from './badgeRenderer';`
   - Modify lines 631-648: Replace status strings with badge-rendered versions
   - Use existing `isItemArchived()` for effective status determination

2. **`vscode-extension/src/test/suite/treeItemRendering.test.ts`** (Test Updates):
   - Update description field assertions to expect Codicon syntax
   - Verify badge format: `$(icon-name) Status`
   - Test epic/feature with progress: `$(icon-name) Status (3/5)`

### New Files Created
None - This is a pure integration story with no new files.

### External Dependencies
- **VSCode Codicon Library**: Built-in VSCode icon system
  - Reference: https://microsoft.github.io/vscode-codicons/dist/codicon.html
  - Icons used: circle-outline, circle-filled, sync, error, pass-filled, archive

- **Existing S81 Badge Renderer**:
  - Location: `vscode-extension/src/treeview/badgeRenderer.ts`
  - Function: `renderStatusBadge(status: Status): string`
  - Status: Completed in S81

- **Existing S80 Archive Detection**:
  - Location: `vscode-extension/src/treeview/archiveUtils.ts`
  - Function: `isItemArchived(item: PlanningTreeItem): boolean`
  - Status: Completed in S80

### Godot APIs Used
None - This is a VSCode extension story with no Godot integration.

## Next Steps

1. **Execute Phase 1**: Run `/build specs/S82-treeview-badge-integration/tasks/01-core-integration.md`
2. **Visual Verification**: Package extension and test in local VSCode
3. **Execute Phase 2**: Run `/build specs/S82-treeview-badge-integration/tasks/02-test-updates.md`
4. **Performance Validation**: Verify TreeView refresh < 500ms with 100+ items
5. **Commit**: Create commit with all changes and passing tests

**Ready for Implementation**: Yes - All dependencies completed (S81, S80), no blockers identified.
