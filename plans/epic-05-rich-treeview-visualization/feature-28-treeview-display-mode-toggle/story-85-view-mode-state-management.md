---
item: S85
title: View Mode State Management
type: story
parent: F28
status: Completed
priority: High
dependencies: []
estimate: S
created: 2025-10-24
updated: 2025-10-24
spec: specs/S85-view-mode-state-management/
---

# S85 - View Mode State Management

## Description

Add infrastructure for managing TreeView display mode state ('status' | 'hierarchy') with workspace persistence. This story establishes the foundation for F28 by adding the view mode property, workspace state integration, and state management methods to PlanningTreeProvider.

The view mode state determines whether the TreeView displays items grouped by status (current behavior) or organized by hierarchy (P→E→F→S structure). State persists across VSCode sessions using the workspace state API.

## Acceptance Criteria

1. **Type Definitions**:
   - [ ] Define `ViewMode` type as `'status' | 'hierarchy'`
   - [ ] Export type from appropriate module for reuse

2. **PlanningTreeProvider State**:
   - [ ] Add `private viewMode: ViewMode` property
   - [ ] Initialize from workspace state in constructor
   - [ ] Default to 'hierarchy' if no saved state exists
   - [ ] Log view mode initialization to output channel

3. **Workspace State Integration**:
   - [ ] Read view mode from `workspaceState.get('cascadeViewMode', 'hierarchy')`
   - [ ] Store view mode with `workspaceState.update('cascadeViewMode', mode)`
   - [ ] Workspace state already passed to constructor (no API changes)

4. **State Management Methods**:
   - [ ] Add `getViewMode(): ViewMode` - Returns current view mode
   - [ ] Add `async setViewMode(mode: ViewMode): Promise<void>`:
     - Update internal state
     - Persist to workspace state
     - Trigger TreeView refresh via `this.refresh()`
     - Log mode change to output channel

5. **Validation and Logging**:
   - [ ] Validate view mode values (must be 'status' or 'hierarchy')
   - [ ] Log mode initialization: `[ViewMode] Initialized to: {mode}`
   - [ ] Log mode changes: `[ViewMode] Switched to: {mode}`
   - [ ] Handle invalid stored values (fallback to 'hierarchy')

6. **Testing**:
   - [ ] Unit test: View mode defaults to 'hierarchy' with empty workspace state
   - [ ] Unit test: View mode loads from workspace state correctly
   - [ ] Unit test: `setViewMode()` updates workspace state and triggers refresh
   - [ ] Integration test: View mode persists across TreeView recreation

## Implementation Notes

### Code Structure

**File**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Type Definition** (add near top with other types):
```typescript
/**
 * TreeView display mode.
 * - 'status': Items grouped by status (Not Started, In Progress, etc.)
 * - 'hierarchy': Items organized by parent-child relationships (P→E→F→S)
 */
export type ViewMode = 'status' | 'hierarchy';
```

**Property Addition** (add to class):
```typescript
/**
 * Current TreeView display mode.
 * - 'status': Status-grouped view (default before F28)
 * - 'hierarchy': Hierarchy view (P→E→F→S structure, default after F28)
 */
private viewMode: ViewMode;
```

**Constructor Modification** (existing constructor around line 246):
```typescript
constructor(
  private workspaceRoot: string,
  private cache: FrontmatterCache,
  private outputChannel: vscode.OutputChannel,
  private workspaceState: vscode.Memento
) {
  // ... existing initialization ...

  // Load view mode from workspace state (F28)
  // Default to 'hierarchy' to match reference design
  this.viewMode = this.workspaceState.get<ViewMode>('cascadeViewMode', 'hierarchy');
  this.outputChannel.appendLine(`[ViewMode] Initialized to: ${this.viewMode}`);

  // ... rest of constructor ...
}
```

**State Management Methods** (add after constructor):
```typescript
/**
 * Gets the current TreeView display mode.
 *
 * @returns Current view mode ('status' or 'hierarchy')
 */
public getViewMode(): ViewMode {
  return this.viewMode;
}

/**
 * Sets the TreeView display mode and persists to workspace state.
 *
 * This method:
 * 1. Updates the internal view mode state
 * 2. Persists the change to workspace state for session persistence
 * 3. Triggers a TreeView refresh to rebuild with new mode
 *
 * @param mode - View mode to set ('status' or 'hierarchy')
 */
public async setViewMode(mode: ViewMode): Promise<void> {
  // Validate mode
  if (mode !== 'status' && mode !== 'hierarchy') {
    this.outputChannel.appendLine(`[ViewMode] ⚠️  Invalid mode: ${mode}, defaulting to 'hierarchy'`);
    mode = 'hierarchy';
  }

  // Update internal state
  this.viewMode = mode;

  // Persist to workspace state
  await this.workspaceState.update('cascadeViewMode', mode);

  // Log change
  this.outputChannel.appendLine(`[ViewMode] Switched to: ${mode}`);

  // Refresh TreeView to apply new mode
  this.refresh();
}
```

### Testing Strategy

**Unit Tests** (`vscode-extension/src/test/suite/viewMode.test.ts`):
- Test default initialization to 'hierarchy'
- Test loading from workspace state
- Test setViewMode() persistence
- Test invalid mode handling

**Integration Tests**:
- Create TreeView, set mode, recreate TreeView, verify mode persists
- Verify refresh() called when mode changes

## Technical Notes

- Workspace state API is synchronous for reads, async for writes
- `this.refresh()` invalidates TreeView cache and triggers rebuild
- View mode change triggers full TreeView refresh (acceptable performance cost)
- Default to 'hierarchy' aligns with ChatGPT reference design

## Dependencies

- Existing workspace state integration (constructor already receives Memento)
- TreeView refresh mechanism (existing `refresh()` method)
- Output channel for logging

## Related Stories

- **S86**: Uses `getViewMode()` in `getChildren()` to determine display logic
- **S87**: Calls `setViewMode()` when user toggles via toolbar button
