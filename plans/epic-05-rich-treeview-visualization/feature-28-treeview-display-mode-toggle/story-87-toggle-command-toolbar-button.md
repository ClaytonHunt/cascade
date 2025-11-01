---
item: S87
title: Toggle Command and Toolbar Button
type: story
parent: F28
status: Completed
priority: High
dependencies: [S85, S86]
estimate: S
created: 2025-10-24
updated: 2025-10-25
spec: specs/S87-toggle-command-toolbar-button/
---

# S87 - Toggle Command and Toolbar Button

## Description

Add user interface controls for switching between Status and Hierarchy view modes: a Command Palette command (`cascade.toggleViewMode`) and a toolbar button in the TreeView title bar. The toolbar button displays an icon that reflects the current view mode and executes the toggle command when clicked.

This story completes F28 by making the view mode functionality accessible to users through standard VSCode UI patterns.

## Acceptance Criteria

1. **Toggle Command Registration**:
   - [ ] Register command `cascade.toggleViewMode` in extension.ts
   - [ ] Command switches between 'status' and 'hierarchy' modes
   - [ ] Command calls `planningTreeProvider.setViewMode()` with new mode
   - [ ] Command appears in Command Palette as "Cascade: Toggle View Mode"
   - [ ] Command logs mode change to output channel

2. **Toolbar Button**:
   - [ ] Add button to TreeView title bar (view/title contribution)
   - [ ] Button displays icon based on current view mode:
     - Status mode: `$(list-tree)` or `$(layers)` (status layers icon)
     - Hierarchy mode: `$(symbol-namespace)` or `$(list-tree)` (hierarchy tree icon)
   - [ ] Button tooltip shows current mode and toggle action
   - [ ] Button executes `cascade.toggleViewMode` command on click
   - [ ] Button visible in Cascade TreeView only (not other views)

3. **Package.json Contributions**:
   - [ ] Add command contribution for `cascade.toggleViewMode`
   - [ ] Add view toolbar contribution with when clause
   - [ ] Set appropriate icons for both view modes
   - [ ] Set descriptive title and tooltip

4. **User Experience**:
   - [ ] Clicking toolbar button immediately switches view mode
   - [ ] TreeView refreshes to show new mode (< 100ms)
   - [ ] Command Palette shows command with descriptive title
   - [ ] No error messages or console warnings
   - [ ] View mode persists after window reload

5. **Testing**:
   - [ ] Manual test: Click toolbar button, verify view switches
   - [ ] Manual test: Run command from palette, verify view switches
   - [ ] Manual test: Reload window, verify mode persists
   - [ ] Manual test: Verify tooltips are accurate
   - [ ] Integration test: Command execution updates workspace state

## Implementation Notes

### Code Structure

**File**: `vscode-extension/src/extension.ts`

**Command Registration** (add in activate() function around line 300):
```typescript
// F28: Register view mode toggle command
const toggleViewModeCommand = vscode.commands.registerCommand(
  'cascade.toggleViewMode',
  async () => {
    const currentMode = planningTreeProvider.getViewMode();
    const newMode = currentMode === 'status' ? 'hierarchy' : 'status';

    outputChannel.appendLine(`[ViewMode] Toggling from ${currentMode} to ${newMode}`);

    await planningTreeProvider.setViewMode(newMode);

    // Optional: Show notification to user
    vscode.window.showInformationMessage(
      `Cascade view mode: ${newMode === 'hierarchy' ? 'Hierarchy' : 'Status Groups'}`
    );
  }
);
context.subscriptions.push(toggleViewModeCommand);
```

**File**: `vscode-extension/package.json`

**Command Contribution** (add to "contributes" > "commands"):
```json
{
  "command": "cascade.toggleViewMode",
  "title": "Toggle View Mode (Status/Hierarchy)",
  "category": "Cascade",
  "icon": "$(symbol-namespace)"
}
```

**View Toolbar Contribution** (add to "contributes" > "menus" > "view/title"):
```json
{
  "command": "cascade.toggleViewMode",
  "when": "view == cascade",
  "group": "navigation"
}
```

**Alternative: Conditional Icons** (if we want different icons per mode):
```json
// In "contributes" > "commands", add two commands:
{
  "command": "cascade.toggleViewMode.toHierarchy",
  "title": "Switch to Hierarchy View",
  "category": "Cascade",
  "icon": "$(symbol-namespace)"
},
{
  "command": "cascade.toggleViewMode.toStatus",
  "title": "Switch to Status Groups View",
  "category": "Cascade",
  "icon": "$(layers)"
}

// In extension.ts, register both with when clauses:
vscode.commands.registerCommand('cascade.toggleViewMode.toHierarchy', async () => {
  await planningTreeProvider.setViewMode('hierarchy');
});

vscode.commands.registerCommand('cascade.toggleViewMode.toStatus', async () => {
  await planningTreeProvider.setViewMode('status');
});

// In menus, show conditionally:
{
  "command": "cascade.toggleViewMode.toHierarchy",
  "when": "view == cascade && cascadeViewMode == status",
  "group": "navigation"
},
{
  "command": "cascade.toggleViewMode.toStatus",
  "when": "view == cascade && cascadeViewMode == hierarchy",
  "group": "navigation"
}
```

### Icon Options

**Status Mode Icons** (show when in status mode, click to switch to hierarchy):
- `$(layers)` - Layered/stacked representation
- `$(list-flat)` - Flat list view
- `$(group-by-ref-type)` - Grouping icon

**Hierarchy Mode Icons** (show when in hierarchy mode, click to switch to status):
- `$(symbol-namespace)` - Namespace/hierarchy symbol
- `$(list-tree)` - Tree structure
- `$(organization)` - Organizational hierarchy

Recommended:
- **Simple approach**: Use `$(list-tree)` for both modes (toggle icon)
- **Descriptive approach**: Use `$(layers)` for status mode, `$(symbol-namespace)` for hierarchy mode

### Tooltip Text

**Status Mode** (hierarchy button shown):
```
"Switch to Hierarchy View (Projects > Epics > Features > Stories)"
```

**Hierarchy Mode** (status button shown):
```
"Switch to Status Groups View (Group by workflow status)"
```

### Testing Strategy

**Manual Testing**:
1. Open Cascade TreeView
2. Verify initial mode is 'hierarchy' (shows Projects/Epics at root)
3. Click toolbar button
4. Verify mode switches to 'status' (shows status groups at root)
5. Click toolbar button again
6. Verify mode switches back to 'hierarchy'
7. Reload VSCode window
8. Verify mode persisted (still hierarchy)

**Command Palette Testing**:
1. Open Command Palette (Ctrl+Shift+P)
2. Search "Cascade: Toggle View Mode"
3. Execute command
4. Verify view mode switches

**Integration Tests**:
- Test command registration succeeds
- Test command execution updates workspace state
- Test toolbar button appears in Cascade view only
- Test button visibility with when clauses (if using conditional approach)

## Technical Notes

- Toolbar buttons use `when` clauses to control visibility
- Icons from VSCode Codicons library (built-in, no custom assets needed)
- Command Palette integration automatic with command contribution
- Notification message is optional (good for user feedback but not required)

## UI/UX Considerations

**Icon Choice**:
- Keep it simple: Single toggle icon is less cognitive load
- Or descriptive: Different icons help users understand current mode

**Tooltip Importance**:
- Tooltips are critical for discoverability
- Should explain BOTH current mode AND what clicking will do

**Notification**:
- Optional but helpful for first-time users
- Can be removed if feels intrusive

## Dependencies

- **S85**: Requires `getViewMode()` and `setViewMode()` methods
- **S86**: Requires hierarchy view implementation to be functional
- VSCode Command API
- VSCode Menus API
- Package.json contributions

## Related Stories

- **S85**: Provides state management that this story triggers
- **S86**: Provides hierarchy view that becomes accessible via this UI
