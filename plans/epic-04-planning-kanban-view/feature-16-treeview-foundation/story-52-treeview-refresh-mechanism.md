---
item: S52
title: TreeView Refresh Mechanism
type: story
parent: F16
status: Completed
priority: High
dependencies: [S51]
estimate: S
created: 2025-10-13
updated: 2025-10-14
spec: specs/S52-treeview-refresh-mechanism/
---

# S52 - TreeView Refresh Mechanism

## Description

Integrate the TreeView refresh mechanism with the existing FileSystemWatcher (S38) to automatically update the tree when planning files are created, modified, or deleted. This ensures the TreeView always reflects the current state of the plans/ directory without requiring manual refreshes.

This story completes F16 by connecting the data layer to the file system monitoring infrastructure.

### Technical Approach

**Refresh Event Emitter (Already in S49):**
```typescript
private _onDidChangeTreeData = new vscode.EventEmitter<PlanningTreeItem | undefined>();
readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

refresh(): void {
  this._onDidChangeTreeData.fire(undefined);
}
```

**FileSystemWatcher Integration:**
```typescript
// In extension.ts createFileSystemWatchers()

const handleCreate = (uri: vscode.Uri) => {
  // Existing: No cache invalidation needed
  // NEW: Refresh TreeView
  if (planningTreeProvider) {
    planningTreeProvider.refresh();
  }
};

const handleChange = (uri: vscode.Uri) => {
  // Existing: Invalidate cache
  cache.invalidate(uri.fsPath);
  // NEW: Refresh TreeView
  if (planningTreeProvider) {
    planningTreeProvider.refresh();
  }
};

const handleDelete = (uri: vscode.Uri) => {
  // Existing: Invalidate cache
  cache.invalidate(uri.fsPath);
  // NEW: Refresh TreeView
  if (planningTreeProvider) {
    planningTreeProvider.refresh();
  }
};
```

**Manual Refresh Command (Optional but Recommended):**
```typescript
// Register command for manual refresh (useful for development/debugging)
const refreshCommand = vscode.commands.registerCommand(
  'cascade.refresh',
  () => {
    planningTreeProvider.refresh();
    vscode.window.showInformationMessage('Cascade view refreshed');
  }
);
context.subscriptions.push(refreshCommand);
```

**TreeView Reference Storage:**
```typescript
// In extension.ts (module-level)
let planningTreeProvider: PlanningTreeProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Create TreeView provider
  planningTreeProvider = new PlanningTreeProvider(
    workspaceRoot,
    frontmatterCache!,
    outputChannel
  );

  // Register TreeView
  const treeView = vscode.window.createTreeView('cascadeView', {
    treeDataProvider: planningTreeProvider
  });
  context.subscriptions.push(treeView);

  // ... existing code ...
}
```

### Integration Points

- **S38 (FileSystemWatcher)**: Existing watchers already monitoring plans/
- **S40 (Cache)**: Cache invalidation already implemented
- **S49 (TreeDataProvider)**: refresh() method already implemented
- **extension.ts**: Modify watcher handlers to call refresh()

## Acceptance Criteria

- [ ] Creating new .md file in plans/ directory updates TreeView automatically
- [ ] Modifying existing .md file updates TreeView automatically
- [ ] Deleting .md file removes item from TreeView automatically
- [ ] Refresh triggered after debounce delay (300ms)
- [ ] Multiple rapid changes trigger single refresh (debouncing works)
- [ ] TreeView update respects cache invalidation (shows latest data)
- [ ] Manual refresh command available: "Planning Kanban: Refresh"
- [ ] Manual refresh shows confirmation message
- [ ] TreeView maintains scroll position after refresh (when possible)
- [ ] TreeView maintains selection after refresh (when possible)
- [ ] No console errors during refresh
- [ ] Refresh logged to output channel (for debugging)

## Analysis Summary

### Existing Debouncing Infrastructure

**FileSystemWatcher (S38):**
- Already implements 300ms debounce delay
- Prevents excessive processing during rapid saves
- Debouncing happens before event handlers execute
- TreeView refresh inherits debouncing automatically

**Cache Invalidation:**
- Already implemented in watcher handlers
- Ensures refresh loads fresh data
- No changes needed to cache logic

**Handler Modification:**
- Minimal changes to existing handlers
- Add single line: `planningTreeProvider.refresh()`
- Maintains existing cache invalidation logic
- No impact on other features

### TreeView State Preservation

**VSCode Behavior:**
- TreeView attempts to preserve scroll position on refresh
- TreeView attempts to preserve selection on refresh
- Behavior depends on tree structure stability
- Items with same ID (file path) maintain state

**For Flat Tree (F16):**
- State preservation works well (items have stable IDs)
- Adding/removing items may shift scroll position
- Acceptable tradeoff for real-time updates

**For Hierarchical Tree (F17):**
- Collapsible state preserved if item IDs stable
- Expansion state maintained across refreshes
- Important for good UX in hierarchical view

### Manual Refresh Command

**Purpose:**
- Debugging during development
- User override if automatic refresh fails
- Provides explicit control to users
- Useful for testing/verification

**UI Integration:**
- Add to package.json commands section
- Shows in Command Palette (Ctrl+Shift+P)
- Could add to TreeView title bar (icon button)
- Title bar button is F20 enhancement (not this story)

## Implementation Notes

**Provider Reference Storage:**
- Store provider in module-level variable
- Allows watcher handlers to access provider
- Alternative: Pass provider to createFileSystemWatchers()
- Module-level is simpler and matches existing patterns

**Refresh Granularity:**
- `fire(undefined)` - Refreshes entire tree
- `fire(element)` - Refreshes specific element and children
- Use `fire(undefined)` for simplicity (flat tree, small dataset)
- Could optimize in future for large trees

**Logging:**
- Log refresh events to output channel
- Helps debugging refresh issues
- Include timestamp and trigger reason
- Example: `[14:23:45] REFRESH: File changed - story-48.md`

**Error Handling:**
- Refresh should never throw errors
- Catch and log any exceptions in getChildren()
- Return empty array on error (graceful degradation)
- Show error notification if refresh fails repeatedly

## Test Strategy

**Manual Testing:**
1. Open TreeView
2. Create new .md file in plans/ directory
   - Verify item appears in tree after ~300ms
3. Edit existing file (change title in frontmatter)
   - Verify item updates in tree after ~300ms
4. Delete file
   - Verify item disappears from tree after ~300ms
5. Rapid edits (save 5 times quickly)
   - Verify single refresh after debounce period
6. Run manual refresh command
   - Verify confirmation message
   - Verify tree updates
7. Check output channel for refresh logs

**Integration Tests:**
1. Create test workspace with sample files
2. Simulate file creation via fs.writeFile()
3. Wait for debounce delay
4. Verify TreeView contains new item
5. Simulate file modification
6. Verify TreeView reflects changes
7. Simulate file deletion
8. Verify item removed from TreeView

**Unit Tests (test/treeview/refresh.test.ts):**
Uses Mocha + Node.js test runner with event mocking:

```typescript
import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import { EventEmitter } from 'vscode';

describe('TreeView Refresh Mechanism', () => {
  it('should fire change event when refresh() called', () => {
    const provider = new PlanningTreeProvider(/* ... */);
    let eventFired = false;
    provider.onDidChangeTreeData(() => { eventFired = true; });

    provider.refresh();
    assert.equal(eventFired, true);
  });

  it('should handle getChildren() errors gracefully', async () => {
    // Mock cache to throw error
    const children = await provider.getChildren();
    assert.deepEqual(children, []); // Returns empty array on error
  });

  it('should execute manual refresh command', async () => {
    await commands.executeCommand('cascade.refresh');
    // Verify refresh called and notification shown
  });

  it('should integrate with FileSystemWatcher events', () => {
    // Mock watcher events and verify refresh triggered
  });
});
```

**Performance Testing:**
1. Create 100+ planning files
2. Verify refresh completes in <500ms
3. Verify UI remains responsive during refresh
4. Check memory usage (no leaks from repeated refreshes)

**Edge Cases:**
- Refresh during file rename (delete + create events)
- Refresh with invalid frontmatter (should skip file)
- Refresh with very large files (should handle gracefully)
- Refresh while tree item selected (preserve selection)
- Refresh while tree scrolled (preserve scroll position)
