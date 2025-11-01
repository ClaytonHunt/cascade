---
spec: S87
title: Toggle Command and Toolbar Button
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-25
updated: 2025-10-25
---

# S87 - Toggle Command and Toolbar Button

## Work Item Reference

**Story**: S87 - Toggle Command and Toolbar Button
**File**: `plans/epic-05-rich-treeview-visualization/feature-28-treeview-display-mode-toggle/story-87-toggle-command-toolbar-button.md`

## Implementation Strategy

This specification implements user interface controls for switching between Status and Hierarchy view modes in the Cascade extension. The implementation adds a Command Palette command (`cascade.toggleViewMode`) and a toolbar button in the TreeView title bar, completing F28 by making the view mode functionality accessible to users.

The UI follows standard VSCode patterns: command registration in `extension.ts`, contributions in `package.json`, and integration with existing state management from S85.

### Key Design Decisions

1. **Simple Toggle Approach**
   - Single command that switches between modes (not separate commands for each mode)
   - Reduces cognitive load and simplifies implementation
   - No need for context variables to show/hide different buttons

2. **Icon Selection**
   - Use `$(list-tree)` for toggle button (represents tree/hierarchy concept)
   - Simple, recognizable icon that doesn't change based on mode
   - Tooltip provides context about current mode and action

3. **User Feedback**
   - Optional notification message to confirm mode switch
   - Output channel logging for debugging
   - TreeView automatically refreshes via S85's setViewMode()

4. **Integration Points**
   - Reuses S85's `getViewMode()` and `setViewMode()` methods
   - No new state management needed
   - TreeView refresh handled by existing infrastructure

## Architecture Overview

### Current State (S85/S86 Complete)

```
PlanningTreeProvider
├─ viewMode: 'status' | 'hierarchy'  (S85)
├─ getViewMode(): ViewMode           (S85)
├─ setViewMode(mode): Promise<void>  (S85)
├─ getChildren()                     (S86)
│  ├─ viewMode == 'status' → getStatusGroups()
│  └─ viewMode == 'hierarchy' → getHierarchyRoot()
└─ refresh()  (triggers TreeView update)
```

### New State (S87 - This Spec)

```
User Interaction
├─ Toolbar Button Click
│  └─ Executes: cascade.toggleViewMode
├─ Command Palette
│  └─ "Cascade: Toggle View Mode"
│     └─ Executes: cascade.toggleViewMode
└─ Command Handler (extension.ts)
    ├─ Get current mode from provider.getViewMode()
    ├─ Calculate new mode (flip status ↔ hierarchy)
    ├─ Call provider.setViewMode(newMode)
    └─ Optional: Show notification to user
```

### User Flow

1. User clicks toolbar button OR runs command from palette
2. Command handler reads current mode from PlanningTreeProvider
3. Command handler calculates opposite mode
4. Command handler calls `setViewMode()` with new mode
5. S85's `setViewMode()` updates state and triggers refresh
6. S86's `getChildren()` routes to correct view implementation
7. TreeView displays new view structure

## Key Integration Points

### Modified Files

1. **`vscode-extension/package.json`**
   - Add command contribution for `cascade.toggleViewMode`
   - Add view toolbar menu item
   - Set command icon and title

2. **`vscode-extension/src/extension.ts`**
   - Register command handler for `cascade.toggleViewMode`
   - Add command to subscriptions for cleanup
   - Update available commands list in output channel

### Existing Code Reused

- `PlanningTreeProvider.getViewMode()` - Get current mode (S85)
- `PlanningTreeProvider.setViewMode()` - Set new mode and refresh (S85)
- `vscode.commands.registerCommand()` - Standard VSCode command API
- `vscode.window.showInformationMessage()` - Optional user notification

### Dependencies

- **S85 (Completed)**: Provides `viewMode` state management
- **S86 (Completed)**: Provides hierarchy view implementation
- VSCode Extension API (commands, menus, UI)

## Risk Assessment

### Low Risk

✅ **Command registration** - Well-established pattern in extension.ts
✅ **Package.json contributions** - Standard VSCode format
✅ **State management** - Fully implemented in S85
✅ **View routing** - Fully implemented in S86

### Medium Risk

⚠️ **Icon selection** - Need to choose appropriate visual representation
⚠️ **Tooltip wording** - Must be clear about current mode and action

### Mitigation Strategies

1. **Icon Testing**: Review VSCode Codicons library for best fit
2. **User Feedback**: Add optional notification for clarity
3. **Documentation**: Clear tooltip text explaining mode and action
4. **Logging**: Comprehensive output channel logs for debugging

## Phase Overview

### Phase 1: Command and Package.json Setup (FOUNDATION)
**File**: `tasks/01-command-registration.md`

- Add command contribution to package.json
- Add view toolbar menu item
- Register command handler in extension.ts
- Update output channel command list
- Add comprehensive logging

### Phase 2: Testing and Validation (VERIFICATION)
**File**: `tasks/02-testing-validation.md`

- Manual testing with installed extension
- Command Palette verification
- Toolbar button functionality
- View mode persistence testing
- Integration test for command registration

## Codebase Analysis Summary

### Files to Modify
- `vscode-extension/package.json` - Command and menu contributions
- `vscode-extension/src/extension.ts` - Command registration

### Files Created
None (all modifications to existing files)

### External Dependencies
- VSCode Extension API (`vscode.commands`, `vscode.window`)
- VSCode Codicons (built-in icon library)

### Godot APIs Used
None (VSCode extension only)

## Completion Criteria

- ✅ Command `cascade.toggleViewMode` registered
- ✅ Command appears in Command Palette as "Cascade: Toggle View Mode"
- ✅ Toolbar button appears in Cascade TreeView title bar
- ✅ Toolbar button displays appropriate icon
- ✅ Clicking button switches view mode
- ✅ Running command from palette switches view mode
- ✅ View mode persists across window reload (via S85)
- ✅ TreeView refreshes automatically on mode change (< 100ms)
- ✅ Output channel logs mode transitions
- ✅ No errors or warnings in console

## Next Steps

After specification approval, run:

```bash
/build specs/S87-toggle-command-toolbar-button/plan.md
```

This will execute the TDD implementation using the RED-GREEN-REFACTOR cycle.
