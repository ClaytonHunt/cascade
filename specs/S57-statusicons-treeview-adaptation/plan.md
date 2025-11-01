---
spec: S57
title: StatusIcons TreeView Adaptation
type: spec
status: Completed
priority: Medium
phases: 3
created: 2025-10-14
updated: 2025-10-14
---

# S57 - StatusIcons TreeView Adaptation

## Work Item Reference

- **Story**: S57 - StatusIcons TreeView Adaptation
- **Type**: Refactoring
- **Estimate**: Small (S)
- **Source**: [plans/epic-04-planning-kanban-view/feature-17-status-based-kanban-layout/story-57-statusicons-treeview-adaptation.md](D:\projects\lineage\plans\epic-04-planning-kanban-view\feature-17-status-based-kanban-layout\story-57-statusicons-treeview-adaptation.md)

## Implementation Strategy

### Overview

This specification refactors the `statusIcons.ts` module to support TreeView rendering instead of FileDecoration. The current implementation provides status-based file decorations using the `FileDecorationProvider` interface. The refactored version will expose ThemeIcon generation functions for TreeView items while preserving badge/color mappings for future use.

This is a **low-risk refactoring** that decouples status visualization logic from the FileDecoration API, making it reusable across different VSCode UI contexts.

### Key Changes

1. **Remove FileDecoration Dependencies**
   - Delete `getDecorationForStatus()` function (used by decorationProvider.ts)
   - Remove `FileDecoration` return types
   - Maintain `STATUS_BADGES` and `STATUS_COLORS` as reference constants

2. **Add TreeView Icon Support**
   - Create `getTreeItemIcon(status: string): ThemeIcon` function
   - Map status values to VSCode Codicon IDs (circle-outline, sync, debug-start, etc.)
   - Map status values to ThemeColor IDs (charts.gray, charts.blue, etc.)
   - Return ThemeIcon instances compatible with TreeItem.iconPath

3. **Integration with PlanningTreeProvider**
   - Update `getTreeItem()` method to use `getTreeItemIcon()`
   - Remove type-based icon logic (currently uses type for icons)
   - Replace with status-based icon logic (new approach)

4. **Update Tests**
   - Modify existing statusIcons.test.ts to test `getTreeItemIcon()` instead of `getDecorationForStatus()`
   - Verify correct icon IDs for each status
   - Verify correct ThemeColor IDs for each status
   - Test fallback behavior for unknown status values

### Architecture Decisions

**Icon Selection Strategy:**
- Use Codicons (VSCode built-in icons) instead of Unicode symbols for TreeView
- Rationale: Codicons are theme-aware, scalable, and consistent with VSCode UI
- Codicon library: https://microsoft.github.io/vscode-codicons/dist/codicon.html

**Status-to-Icon Mapping:**
| Status | Codicon ID | Rationale |
|--------|------------|-----------|
| Not Started | circle-outline | Empty circle represents work not begun |
| In Planning | sync | Circular arrows represent iterative planning |
| Ready | debug-start | Play button represents ready to execute |
| In Progress | loading~spin | Spinning loader represents active work |
| Blocked | warning | Warning triangle requires attention |
| Completed | pass | Checkmark represents success |

**Status-to-Color Mapping:**
| Status | ThemeColor ID | Visual Meaning |
|--------|---------------|----------------|
| Not Started | charts.gray | Neutral/inactive |
| In Planning | charts.yellow | Planning/caution |
| Ready | charts.green | Success/go-ahead |
| In Progress | charts.blue | Information/active |
| Blocked | charts.red | Error/attention |
| Completed | testing.iconPassed | Success completion |

**Preserving Legacy Code:**
- Keep `STATUS_BADGES` and `STATUS_COLORS` mappings as exported constants
- Rationale: May be useful for future features (tooltips, custom themes, badges)
- Low overhead: Small memory footprint (~200 bytes)

### Integration Points

**Affected Files:**
1. **`vscode-extension/src/statusIcons.ts`** (Primary change)
   - Remove: `getDecorationForStatus()` function
   - Add: `getTreeItemIcon()` function
   - Preserve: `STATUS_BADGES` and `STATUS_COLORS` exports

2. **`vscode-extension/src/treeview/PlanningTreeProvider.ts`** (Integration point)
   - Update: `getTreeItem()` method at line ~131
   - Remove: `getIconForItemType()` call at line ~166
   - Add: `getTreeItemIcon()` import and usage
   - Change: Icon assignment from type-based to status-based

3. **`vscode-extension/src/extension.ts`** (No changes needed)
   - decorationProvider still uses its own logic (Phase 3 implementation returns undefined)
   - No references to statusIcons module currently

4. **`vscode-extension/src/test/suite/statusIcons.test.ts`** (Test updates)
   - Replace: All `getDecorationForStatus()` tests
   - Add: New `getTreeItemIcon()` tests

**Dependencies:**
- VSCode API: `vscode.ThemeIcon`, `vscode.ThemeColor`
- No external npm packages
- No new dependencies introduced

**Existing Infrastructure:**
- PlanningTreeProvider already calls `getTreeItem()` and assigns `iconPath`
- Current implementation uses `getIconForItemType()` (type-based)
- New implementation will use `getTreeItemIcon()` (status-based)

### Risk Assessment

**Risk Level**: Low

**Potential Issues:**
1. **Breaking Change to decorationProvider**
   - Mitigation: decorationProvider.ts doesn't currently use statusIcons (returns undefined in Phase 3)
   - Impact: None - safe to remove `getDecorationForStatus()`

2. **Icon Not Found**
   - Mitigation: All Codicon IDs verified against official library
   - Fallback: Provide default icon (circle-outline) for unknown status

3. **Color Not Theme-Aware**
   - Mitigation: All ThemeColor IDs verified against VSCode docs
   - Fallback: Provide undefined color (uses default theme color)

4. **Test Failures**
   - Mitigation: Update tests in same phase as implementation
   - Validation: Run tests before marking phase complete

**Performance Impact**: Negligible
- Icon lookup: O(1) map access (6 status values)
- Memory overhead: ~100 bytes per icon mapping
- No file I/O or async operations

### Phased Implementation Plan

**Phase 1: Refactor statusIcons.ts**
- Remove FileDecoration logic
- Add TreeView icon logic
- Preserve badge/color constants
- Update JSDoc comments
- **Duration**: 15-20 minutes

**Phase 2: Integrate with PlanningTreeProvider**
- Import `getTreeItemIcon()` function
- Update `getTreeItem()` method
- Replace type-based icons with status-based icons
- Test visual rendering in extension
- **Duration**: 10-15 minutes

**Phase 3: Update Tests and Validation**
- Modify statusIcons.test.ts
- Add tests for all 6 status types
- Add test for unknown status (fallback)
- Run test suite and verify passing
- **Duration**: 15-20 minutes

**Total Estimated Time**: 40-55 minutes

## Phase Overview

### Phase 1: Refactor statusIcons.ts
**File**: `tasks/01-refactor-statusicons.md`
**Goal**: Remove FileDecoration dependencies and add TreeView icon support
**Completion Criteria**: statusIcons.ts exports getTreeItemIcon() and compiles without errors

### Phase 2: Integrate with PlanningTreeProvider
**File**: `tasks/02-integrate-treeprovider.md`
**Goal**: Update PlanningTreeProvider to use status-based icons
**Completion Criteria**: TreeView displays status icons for all items

### Phase 3: Update Tests and Validation
**File**: `tasks/03-update-tests.md`
**Goal**: Verify all functionality through automated tests
**Completion Criteria**: All tests pass, visual inspection confirms correct rendering

## Codebase Analysis Summary

### Current Implementation

**statusIcons.ts (current):**
- Implements FileDecoration-based status visualization
- Exports `getDecorationForStatus(status: Status): FileDecoration`
- Uses Unicode symbols (○, ✎, ✓, ↻, ⊘, ✔) for badges
- Uses ThemeColor for color mapping
- File: vscode-extension/src/statusIcons.ts:1-130

**PlanningTreeProvider.ts (current):**
- Implements TreeView with type-based icons
- Uses `getIconForItemType(type)` for icon assignment
- Icon mapping: project→project, epic→layers, feature→package, story→check, bug→bug
- File: vscode-extension/src/treeview/PlanningTreeProvider.ts:443-456

**decorationProvider.ts (current):**
- Phase 3 implementation (returns undefined)
- Does NOT currently use statusIcons module
- File: vscode-extension/src/decorationProvider.ts:101-119

### Files to Modify

1. **vscode-extension/src/statusIcons.ts**
   - Lines to remove: 74-100 (`getDecorationForStatus()` function)
   - Lines to add: New `getTreeItemIcon()` function (~40 lines)
   - Lines to preserve: 43-71 (STATUS_BADGES and STATUS_COLORS)

2. **vscode-extension/src/treeview/PlanningTreeProvider.ts**
   - Lines to modify: 166 (icon assignment in `getTreeItem()`)
   - Lines to remove: 443-456 (`getIconForItemType()` method)
   - Lines to add: Import statement for `getTreeItemIcon()`

3. **vscode-extension/src/test/suite/statusIcons.test.ts**
   - Lines to replace: All test cases (1-78)
   - New tests: getTreeItemIcon() test suite

### Files NOT Modified

- **vscode-extension/src/extension.ts**: No changes (doesn't reference statusIcons)
- **vscode-extension/src/decorationProvider.ts**: No changes (Phase 3 returns undefined)

### External Dependencies

**VSCode APIs Used:**
- `vscode.ThemeIcon(iconId: string, color?: ThemeColor)` - [VSCode API Docs](https://code.visualstudio.com/api/references/vscode-api#ThemeIcon)
- `vscode.ThemeColor(id: string)` - [Theme Color Reference](https://code.visualstudio.com/api/references/theme-color)
- Codicons: https://microsoft.github.io/vscode-codicons/dist/codicon.html

**Icon IDs (verified):**
- circle-outline ✓
- sync ✓
- debug-start ✓
- loading~spin ✓
- warning ✓
- pass ✓

**ThemeColor IDs (verified):**
- charts.gray ✓
- charts.yellow ✓
- charts.green ✓
- charts.blue ✓
- charts.red ✓
- testing.iconPassed ✓

## Next Steps

Once this specification is approved and implementation complete:

1. **Manual Testing Workflow**:
   - Package extension: `cd vscode-extension && npm run package`
   - Install VSIX: `code --install-extension cascade-0.1.0.vsix --force`
   - Reload window: Ctrl+Shift+P → "Developer: Reload Window"
   - Verify TreeView shows status icons (not type icons)
   - Check all 6 status types render correctly
   - Verify icons adapt to theme (test light/dark themes)

2. **Story Completion**:
   - Mark S57 as "Completed" in plans/ frontmatter
   - Update parent feature (F17) progress calculation

3. **Follow-up Stories**:
   - S58: Status-Based Kanban Columns (uses status groups)
   - S59: Drag-and-Drop Status Updates (changes item status)
   - These stories will benefit from status-based icon system

## Reference Documentation

- **VSCode TreeView API**: https://code.visualstudio.com/api/extension-guides/tree-view
- **VSCode Codicons**: https://microsoft.github.io/vscode-codicons/dist/codicon.html
- **Theme Colors**: https://code.visualstudio.com/api/references/theme-color
- **Story S57**: plans/epic-04-planning-kanban-view/feature-17-status-based-kanban-layout/story-57-statusicons-treeview-adaptation.md
