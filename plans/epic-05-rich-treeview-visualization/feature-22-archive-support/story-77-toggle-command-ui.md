---
item: S77
title: Toggle Command and UI Integration
type: story
parent: F22
status: Completed
priority: High
dependencies: [S75, S76]
estimate: M
spec: specs/S77-toggle-command-ui/
created: 2025-10-23
updated: 2025-10-23
---

# S77 - Toggle Command and UI Integration

## Description

Implement a toggle command and UI button that allows users to show/hide archived items in the TreeView. The toggle state is stored in memory (in-session only; persistence is handled by S79).

This provides the user-facing control mechanism for the archive filtering feature, making it easy to switch between viewing active work only vs. viewing all items including archived.

## Acceptance Criteria

1. **Command Registration**:
   - [ ] Command `cascade.toggleArchived` registered in extension.ts
   - [ ] Command appears in Command Palette ("Show/Hide Archived Items")
   - [ ] Command executes without errors when triggered

2. **TreeView Button**:
   - [ ] "Show Archived" button appears in TreeView toolbar (next to refresh button)
   - [ ] Button icon uses appropriate Codicon (e.g., 'archive' or 'eye')
   - [ ] Button tooltip displays current state ("Show Archived Items" or "Hide Archived Items")
   - [ ] Button triggers `cascade.toggleArchived` command on click

3. **Toggle State Management**:
   - [ ] `PlanningTreeProvider.showArchivedItems` boolean flag added
   - [ ] `toggleArchivedItems()` method flips flag and refreshes TreeView
   - [ ] Default state is `false` (archived items hidden by default)
   - [ ] State persists during VSCode session (lost on reload - see S79 for persistence)

4. **Visual Feedback**:
   - [ ] Button icon changes based on state (on/off indicator)
   - [ ] TreeView refreshes immediately after toggle (no manual refresh needed)
   - [ ] Output channel logs toggle events for debugging

5. **Package.json Configuration**:
   - [ ] Command defined in `contributes.commands`
   - [ ] Button defined in `contributes.views.cascade` menus
   - [ ] Icon and label configured correctly

## Technical Implementation

### Files to Modify

1. **vscode-extension/src/treeview/PlanningTreeProvider.ts**:
   - Add `showArchivedItems: boolean = false;` property
   - Add method:
     ```typescript
     /**
      * Toggles visibility of archived items in TreeView.
      *
      * Flips the showArchivedItems flag and triggers full refresh
      * to rebuild status groups with new filter.
      */
     toggleArchivedItems(): void {
       this.showArchivedItems = !this.showArchivedItems;

       const state = this.showArchivedItems ? 'visible' : 'hidden';
       this.outputChannel.appendLine(`[Archive] Toggled archived items: ${state}`);

       // Trigger full refresh to rebuild tree with new filter
       this.refresh();
     }
     ```

2. **vscode-extension/src/extension.ts**:
   - Register command (after line 1343):
     ```typescript
     const toggleArchivedCmd = vscode.commands.registerCommand(
       'cascade.toggleArchived',
       () => {
         treeProvider.toggleArchivedItems();
       }
     );
     context.subscriptions.push(toggleArchivedCmd);
     ```

3. **vscode-extension/package.json**:
   - Add to `contributes.commands`:
     ```json
     {
       "command": "cascade.toggleArchived",
       "title": "Toggle Archived Items",
       "category": "Cascade",
       "icon": "$(archive)"
     }
     ```
   - Add to `contributes.menus.view/title` (for TreeView toolbar button):
     ```json
     {
       "command": "cascade.toggleArchived",
       "when": "view == cascadePlanningView",
       "group": "navigation"
     }
     ```

### Button Icon Design

**Dynamic Icon** (changes based on state):
```typescript
// In toggleArchivedItems() method
const icon = this.showArchivedItems ? 'eye' : 'eye-closed';
```

**Alternative**: Use static `archive` icon and rely on tooltip to indicate state.

**Recommended**: Static `archive` icon for simplicity (matches feature theme).

### Testing Approach

1. **Command Palette Test**:
   - Open Command Palette (Ctrl+Shift+P)
   - Type "Toggle Archived"
   - Verify command appears and executes

2. **Button Test**:
   - Open TreeView
   - Verify "Show Archived" button appears in toolbar (top-right)
   - Click button
   - Verify TreeView refreshes
   - Verify output channel logs toggle event

3. **State Test**:
   - Create archived item: `plans/archive/test.md`
   - Toggle ON → item appears
   - Toggle OFF → item disappears
   - Toggle ON again → item reappears

4. **Session Test**:
   - Toggle ON
   - Reload window (Ctrl+R)
   - Verify state resets to OFF (expected behavior - no persistence yet)

## Dependencies

- **S75**: Requires 'Archived' status type
- **S76**: Requires `isItemArchived()` function (used by S78 filtering)

## Notes

- This story does NOT implement actual filtering logic (see S78)
- This story does NOT implement state persistence (see S79)
- This story ONLY sets up the UI control mechanism
- Toggle state is intentionally in-memory for this story (simple, testable)
- Button placement in TreeView toolbar follows VSCode conventions (navigation group)
