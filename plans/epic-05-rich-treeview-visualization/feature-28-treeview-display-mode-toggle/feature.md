---
item: F28
title: TreeView Display Mode Toggle
type: feature
parent: E5
status: Completed
priority: High
dependencies: []
estimate: M
created: 2025-10-24
updated: 2025-10-24
---

# F28 - TreeView Display Mode Toggle

## Description

Add ability to switch between two TreeView display modes: **Status-grouped view** (current implementation) and **Hierarchy view** (Project → Epic → Feature → Story tree structure). The hierarchy view matches the ChatGPT mockup design where planning items are organized by their natural parent-child relationships with status shown as colored badges on the right side.

This feature provides users with flexibility to view their planning items organized by workflow status (Status view) or by project structure (Hierarchy view), supporting different mental models and workflows.

## Reference Design

See `reference-design.png` in this directory for the ChatGPT-generated mockup showing the target hierarchy view with:
- Project > Epic > Feature > Story > Spec hierarchy
- Item identifiers (E, F, S) preserved in labels
- Status shown as colored pill badges on the right
- Progress indicators and phase tracking
- Collapsible tree structure

## Objectives

- **View Mode Toggle**: Switch between Status and Hierarchy display modes
- **Workspace Persistence**: Remember user's preferred view mode across sessions
- **Hierarchy View**: Display P→E→F→S→Spec tree structure (not status groups)
- **Status View**: Keep existing status-grouped view (Not Started, In Progress, etc.)
- **Default to Hierarchy**: Match reference design by default
- **Toolbar Integration**: Add view mode toggle button to TreeView toolbar

## Acceptance Criteria

1. **View Mode Infrastructure**:
   - [ ] Add `viewMode` state to PlanningTreeProvider ('status' | 'hierarchy')
   - [ ] Persist view mode in workspace state (vscode.Memento)
   - [ ] Default view mode is 'hierarchy' (matches reference design)
   - [ ] View mode changes trigger TreeView refresh

2. **Hierarchy View Implementation**:
   - [ ] Root level shows top-level Projects and orphan Epics
   - [ ] Projects expandable to show child Epics
   - [ ] Epics expandable to show child Features
   - [ ] Features expandable to show child Stories/Bugs/Specs
   - [ ] Hierarchy built using existing `buildHierarchy()` logic
   - [ ] Item identifiers (P2, E5, F23, S82) visible in labels

3. **Status View (Existing)**:
   - [ ] Status-grouped view remains unchanged
   - [ ] Root level shows status groups (Not Started, In Progress, etc.)
   - [ ] Status groups expandable to show hierarchy within that status
   - [ ] All existing functionality preserved

4. **Toggle Command**:
   - [ ] Register command `cascade.toggleViewMode`
   - [ ] Command switches between 'status' and 'hierarchy'
   - [ ] Command updates workspace state
   - [ ] Command triggers TreeView refresh
   - [ ] Command accessible via Command Palette

5. **Toolbar Button**:
   - [ ] Add view mode toggle icon to TreeView toolbar
   - [ ] Icon changes based on current view mode
   - [ ] Tooltip explains current mode and toggle action
   - [ ] Button executes `cascade.toggleViewMode` command

6. **User Experience**:
   - [ ] View mode persists across window reloads
   - [ ] View mode persists across VSCode restarts
   - [ ] Switching views feels instant (< 100ms)
   - [ ] TreeView scroll position resets on view mode change (expected behavior)
   - [ ] Status badges work in both view modes (pending F29 FileDecorationProvider)

## Technical Approach

### Architecture Changes

**Modified Files**:
1. `vscode-extension/src/treeview/PlanningTreeProvider.ts`:
   - Add `private viewMode: 'status' | 'hierarchy' = 'hierarchy'`
   - Modify `getChildren()` to check view mode
   - Add `getHierarchyRoot()` method for hierarchy view
   - Add `setViewMode()` method with state persistence
   - Load view mode from workspace state in constructor

2. `vscode-extension/src/extension.ts`:
   - Register `cascade.toggleViewMode` command
   - Add toolbar button to TreeView view container
   - Update package.json with command and view contribution

3. `vscode-extension/package.json`:
   - Add command contribution for `cascade.toggleViewMode`
   - Add view toolbar button with conditional icon

**New Hierarchy View Logic**:
```typescript
private async getHierarchyRoot(): Promise<TreeNode[]> {
  const allItems = await this.loadAllPlanningItems();
  const hierarchy = this.buildHierarchy(allItems);

  // Return root-level nodes (Projects + orphan Epics)
  return hierarchy.map(node => node.item);
}
```

**Modified getChildren() Logic**:
```typescript
async getChildren(element?: TreeNode): Promise<TreeNode[]> {
  // Root level - check view mode
  if (!element) {
    if (this.viewMode === 'status') {
      return await this.getStatusGroups(); // Existing
    } else {
      return await this.getHierarchyRoot(); // NEW
    }
  }

  // Rest of logic remains unchanged (handles both modes)
  // ...
}
```

### Workspace State Persistence

```typescript
// Constructor
constructor(
  private workspaceRoot: string,
  private cache: FrontmatterCache,
  private outputChannel: vscode.OutputChannel,
  private workspaceState: vscode.Memento
) {
  // Load saved view mode (default to 'hierarchy')
  this.viewMode = workspaceState.get('cascadeViewMode', 'hierarchy');
}

// Set view mode
async setViewMode(mode: 'status' | 'hierarchy') {
  this.viewMode = mode;
  await this.workspaceState.update('cascadeViewMode', mode);
  this.refresh(); // Trigger TreeView rebuild
}
```

## Analysis Summary

**Existing Infrastructure to Reuse**:
- ✅ `buildHierarchy()` - Already builds P→E→F→S hierarchy from file paths (lines 1231-1340)
- ✅ `parseItemPath()` - Extracts epic/feature directories from file paths (lines 1171-1200)
- ✅ `getChildrenForItem()` - Returns children for expanded items (already works for hierarchy)
- ✅ `HierarchyNode` interface - Represents parent-child relationships

**Integration Points**:
- Workspace state (`vscode.Memento`) - Constructor already receives this parameter
- Command registration - Use existing pattern from `cascade.toggleArchivedItems`
- TreeView toolbar - Add to `views/cascade/title` contribution point
- Refresh mechanism - Use existing `refresh()` method

**Performance Considerations**:
- Hierarchy view uses same caching as status view (no additional cost)
- `buildHierarchy()` is O(n) with n = number of items
- View mode toggle triggers full refresh (expected and acceptable)
- Workspace state read/write is synchronous (no latency)

## Success Metrics

- User can toggle between Status and Hierarchy views via toolbar button
- View mode persists across VSCode sessions
- Hierarchy view displays P→E→F→S structure matching reference design
- Status view remains unchanged and functional
- View mode toggle executes in < 100ms
- No performance degradation in either view mode

## Dependencies

- Existing TreeView infrastructure (PlanningTreeProvider, hierarchy building)
- Workspace state API (vscode.Memento)
- Command registration API
- TreeView toolbar contribution API

## Child Items

### Stories

- **S85**: View Mode State Management - Add workspace state persistence and view mode property
- **S86**: Hierarchy View Root Implementation - Implement getHierarchyRoot() for P→E→F→S display
- **S87**: Toggle Command and Toolbar Button - Add command and UI controls for view switching

### Implementation Order

1. **S85** - Foundation (state management, persistence)
2. **S86** - Core functionality (hierarchy view logic)
3. **S87** - User interface (command + toolbar button)

All stories are independent and can be implemented sequentially in TDD fashion.

## Notes

- This feature provides the layout foundation for the ChatGPT mockup design
- Status badges (colored pills) will be added in **F29** using FileDecorationProvider
- Progress bars will be added in **F24** (separate feature)
- Spec phase integration will be added in **F25** (separate feature)
- Default to 'hierarchy' mode to match reference design expectations
- Status view preserved for users who prefer workflow-centric organization
