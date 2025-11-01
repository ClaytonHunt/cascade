---
item: S79
title: Persist Toggle State Across Sessions
type: story
parent: F22
status: Completed
priority: Medium
dependencies: [S77, S78]
estimate: S
spec: specs/S79-persist-toggle-state/
created: 2025-10-23
updated: 2025-10-24
---

# S79 - Persist Toggle State Across Sessions

## Description

Persist the "Show Archived Items" toggle state across VSCode sessions using workspace state storage. When the user toggles archived visibility, the preference is saved and restored when VSCode reloads or the window is reopened.

This provides a better user experience by remembering the user's preference instead of resetting to default (hidden) on every reload.

## Acceptance Criteria

1. **State Persistence**:
   - [ ] Toggle state saved to `context.workspaceState` when changed
   - [ ] Storage key: `cascade.showArchived` (boolean)
   - [ ] State persists across VSCode reloads (Ctrl+R)
   - [ ] State persists across window close/reopen

2. **State Restoration**:
   - [ ] On extension activation, restore state from `workspaceState`
   - [ ] Default to `false` if no saved state exists (first run)
   - [ ] TreeView initializes with correct filter state (no flicker)

3. **Storage Scope**:
   - [ ] State is workspace-scoped (different per workspace)
   - [ ] State NOT global (different workspaces have independent settings)
   - [ ] State isolated per workspace folder in multi-root workspaces

4. **Error Handling**:
   - [ ] Gracefully handle storage read errors (default to `false`)
   - [ ] Gracefully handle storage write errors (log warning, continue)
   - [ ] No crashes or exceptions during storage operations

## Technical Implementation

### Files to Modify

1. **vscode-extension/src/extension.ts**
2. **vscode-extension/src/treeview/PlanningTreeProvider.ts**

### Extension Activation (extension.ts)

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // ... existing setup code ...

  // Restore toggle state from workspace storage
  const savedShowArchived = context.workspaceState.get<boolean>('cascade.showArchived', false);
  outputChannel.appendLine(`[Archive] Restored toggle state: ${savedShowArchived}`);

  // Create TreeView provider with restored state
  const treeProvider = new PlanningTreeProvider(
    workspaceRoot,
    cache,
    outputChannel
  );

  // Apply restored state BEFORE TreeView registration
  treeProvider.showArchivedItems = savedShowArchived;

  // ... rest of extension activation ...
}
```

### Toggle Command Update (extension.ts)

```typescript
const toggleArchivedCmd = vscode.commands.registerCommand(
  'cascade.toggleArchived',
  () => {
    // Toggle the state
    treeProvider.toggleArchivedItems();

    // Persist the new state to workspace storage
    const newState = treeProvider.showArchivedItems;
    context.workspaceState.update('cascade.showArchived', newState);

    outputChannel.appendLine(`[Archive] Persisted toggle state: ${newState}`);
  }
);
context.subscriptions.push(toggleArchivedCmd);
```

### Alternative: Persist in PlanningTreeProvider

If you prefer encapsulation, pass `context.workspaceState` to provider:

```typescript
// In PlanningTreeProvider constructor
constructor(
  private workspaceRoot: string,
  private cache: FrontmatterCache,
  private outputChannel: vscode.OutputChannel,
  private workspaceState: vscode.Memento  // NEW parameter
) {
  // Restore state from storage
  this.showArchivedItems = workspaceState.get<boolean>('cascade.showArchived', false);
  this.outputChannel.appendLine(`[Archive] Initialized toggle state: ${this.showArchivedItems}`);
}

// In toggleArchivedItems() method
toggleArchivedItems(): void {
  this.showArchivedItems = !this.showArchivedItems;

  const state = this.showArchivedItems ? 'visible' : 'hidden';
  this.outputChannel.appendLine(`[Archive] Toggled archived items: ${state}`);

  // Persist state to workspace storage
  this.workspaceState.update('cascade.showArchived', this.showArchivedItems);
  this.outputChannel.appendLine(`[Archive] Persisted toggle state: ${this.showArchivedItems}`);

  // Trigger full refresh to rebuild tree with new filter
  this.refresh();
}
```

**Recommendation**: Use encapsulation approach (pass `workspaceState` to provider) for cleaner separation of concerns.

### Testing Approach

1. **Persistence Test**:
   - Open TreeView, toggle archived items ON
   - Reload window (Ctrl+R)
   - Verify TreeView shows archived items (state persisted)
   - Toggle OFF
   - Reload window
   - Verify TreeView hides archived items (state persisted)

2. **Default State Test**:
   - Delete workspace state (or use fresh workspace)
   - Open TreeView
   - Verify archived items hidden by default (no saved state)

3. **Multi-Workspace Test**:
   - Open workspace A, toggle ON
   - Open workspace B (different folder), verify toggle OFF (independent state)
   - Return to workspace A, verify toggle ON (state preserved)

4. **Error Handling Test**:
   - Mock storage read error (return undefined)
   - Verify extension activates with default state (false)
   - Mock storage write error
   - Verify toggle still works (just doesn't persist)

### VSCode Storage API

**Workspace State** (`context.workspaceState`):
- Scoped to current workspace
- Persists across sessions
- JSON serializable values only
- Methods:
  - `get<T>(key: string, defaultValue?: T): T`
  - `update(key: string, value: any): Thenable<void>`

**Storage Key Convention**:
- Use dotted namespace: `cascade.showArchived`
- Matches extension ID prefix (`cascade`)
- Clear, descriptive name

## Dependencies

- **S77**: Requires `showArchivedItems` flag and `toggleArchivedItems()` method
- **S78**: Requires filtering logic (ensures state affects TreeView correctly)

## Notes

- Workspace state is persistent but not global (per-workspace preference)
- Use workspace state (not global state) to allow different preferences per project
- Default to `false` (archived hidden) for new workspaces (conservative choice)
- Consider adding user setting (`cascade.defaultShowArchived`) in future for global default
