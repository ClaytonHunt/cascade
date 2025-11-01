---
spec: S65
title: Utility Context Menu Actions (Open, Copy, Reveal)
type: spec
status: Completed
priority: Medium
phases: 3
created: 2025-10-17
updated: 2025-10-17
---

# S65 - Utility Context Menu Actions Implementation Specification

## Overview

This specification details the implementation of three utility context menu actions for the Cascade VSCode extension's TreeView. These actions improve user productivity by providing quick access to common operations without leaving the TreeView interface.

## Work Item Reference

**Story**: S65 - Utility Context Menu Actions (Open, Copy, Reveal)
**Location**: `plans/epic-04-planning-kanban-view/feature-19-context-menu-actions/story-65-utility-actions.md`
**Type**: Story (XS estimate)
**Dependencies**: None (F17 TreeView foundation already implemented)

## Implementation Strategy

### High-Level Approach

This story follows the established pattern from S63 (Change Status) and S64 (Create Child Item):
1. Register commands in package.json with VSCode command palette
2. Add context menu items with visibility conditions (when clauses)
3. Implement command handlers in extension.ts
4. Follow existing logging and error handling patterns

The implementation is straightforward since it leverages existing VSCode APIs and follows established extension conventions.

### Key Design Decisions

1. **Command Visibility**: Use `when` clauses to hide actions from status groups (only show for actual planning items)
2. **Menu Grouping**: Place actions in separate groups (2_navigation and 3_utils) to create visual separators
3. **Reuse Existing Functions**: "Open File" action reuses the existing `openPlanningFile` function (already implemented for TreeView clicks)
4. **Error Handling**: Follow existing error handling pattern (try-catch, output channel logging, user notifications)
5. **Output Channel Logging**: Follow existing logging conventions with emoji indicators (✅, ❌, ℹ️)

### Architecture Considerations

- **VSCode APIs Used**:
  - `vscode.env.clipboard` for clipboard operations (Copy Item Number)
  - `vscode.commands.executeCommand('revealInExplorer')` for file explorer navigation (Reveal in Explorer)
  - `vscode.window.showInformationMessage/showErrorMessage` for user notifications
  - `vscode.Uri.file()` for file path to URI conversion

- **Integration Points**:
  - Existing `openPlanningFile` function (extension.ts:1170)
  - PlanningTreeItem interface (src/treeview/PlanningTreeItem.ts)
  - Context menu infrastructure (package.json:contributes.menus)

### Risk Assessment

**Low Risk** - This is a straightforward feature with minimal complexity:
- Uses well-established VSCode APIs
- Follows existing patterns from S63/S64
- No state management or async complexity
- Clear acceptance criteria and test cases

**Potential Issues**:
- Clipboard API might fail on some systems (mitigated with error handling)
- RevealInExplorer command might not work if File Explorer view is closed (acceptable UX limitation)

## Phase Overview

### Phase 1: Package.json Configuration
**Focus**: Register commands and configure context menu structure
**Duration**: Quick (15-20 minutes)
**Deliverable**: Commands visible in context menu with correct grouping

### Phase 2: Command Implementation
**Focus**: Implement three command handlers in extension.ts
**Duration**: Medium (45-60 minutes)
**Deliverable**: All three commands functional with error handling and logging

### Phase 3: Testing and Polish
**Focus**: Manual testing, edge cases, output channel verification
**Duration**: Medium (30-45 minutes)
**Deliverable**: All acceptance criteria met, tested across scenarios

## Detailed Phase Breakdown

See individual phase files in `tasks/` directory:
- `01-package-json-configuration.md`
- `02-command-implementation.md`
- `03-testing-and-polish.md`

## Codebase Analysis Summary

### Files to Modify
1. **vscode-extension/package.json** (lines 33-74)
   - Add 3 new command definitions
   - Add 3 new context menu items with when clauses
   - Configure menu grouping (2_navigation, 3_utils)

2. **vscode-extension/src/extension.ts** (around line 1015)
   - Add 3 command handler functions
   - Register commands in activate() function
   - Follow existing error handling patterns

### Files to Read (for context)
- `vscode-extension/src/treeview/PlanningTreeItem.ts` - PlanningTreeItem interface definition
- `vscode-extension/src/extension.ts:1170-1210` - Existing openPlanningFile function

### New Files Created
None (all changes are additions to existing files)

### External Dependencies
- VSCode built-in clipboard API (`vscode.env.clipboard`)
- VSCode built-in command (`revealInExplorer`)
- No new npm packages required

### Godot APIs/Systems Used
None (VSCode extension only)

## Integration Points

1. **Existing Context Menu Infrastructure**:
   - S63: Change Status command (group: 1_modification@1)
   - S64: Create Child Item command (group: 1_modification@2)
   - New: Open File (group: 2_navigation@1)
   - New: Copy/Reveal (group: 3_utils@1-2)

2. **TreeView Click Handler**:
   - Existing: cascade.openFile command (internal, triggered by TreeView clicks)
   - New: cascade.openFileContext command (visible in context menu, same behavior)

3. **Output Channel**:
   - All commands log to "Cascade" output channel
   - Follow existing format: `[CommandName] Message`

## Completion Criteria

- [ ] All three commands registered in package.json
- [ ] Commands visible in context menu for planning items (not status groups)
- [ ] Menu items grouped correctly with visual separators
- [ ] Open File command works and opens permanent tab
- [ ] Copy Item Number copies to clipboard and shows toast notification
- [ ] Reveal in Explorer opens File Explorer and highlights file
- [ ] Error handling for all edge cases (file not found, clipboard failure, etc.)
- [ ] Output channel logs all operations with appropriate emoji indicators
- [ ] Manual testing confirms all acceptance criteria met

## Next Steps After Implementation

Once this spec is complete and marked "Ready":
1. Run `/build specs/S65-utility-context-menu-actions/plan.md` to begin TDD implementation
2. Follow RED-GREEN-REFACTOR cycle for each phase
3. Package and install extension after each phase for manual testing
4. Mark story as "Completed" when all acceptance criteria pass
