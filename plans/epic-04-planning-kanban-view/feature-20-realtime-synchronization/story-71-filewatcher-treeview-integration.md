---
item: S71
title: FileSystemWatcher to TreeView Integration
type: story
parent: F20
status: Completed
priority: High
dependencies: [S38, S40]
estimate: M
created: 2025-10-17
updated: 2025-10-22
spec: specs/S71-filewatcher-treeview-integration/
---

# S71 - FileSystemWatcher to TreeView Integration

## Description

Connect the existing FileSystemWatcher (S38) to the PlanningTreeProvider to trigger TreeView refreshes when markdown files in `plans/` are modified externally. This story implements the core integration point between file monitoring and UI updates, ensuring the TreeView stays synchronized with filesystem changes.

Currently, the FileSystemWatcher detects file changes and invalidates the FrontmatterCache, but doesn't automatically refresh the TreeView. Users must manually refresh to see changes made outside the extension (e.g., manual file edits, git operations, external scripts).

This story adds the missing link: FileSystemWatcher events → PlanningTreeProvider.refresh() → TreeView update.

### The Problem

**Current Behavior:**
1. User edits `story-49.md` in external editor (VS Code text editor, Notepad++, etc.)
2. Changes frontmatter status from "Ready" to "In Progress"
3. Saves file
4. FileSystemWatcher detects change ✅
5. FrontmatterCache invalidates entry ✅
6. TreeView still shows old status ❌
7. User must manually click "Refresh" button to see change ❌

**Impact:**
- TreeView state becomes stale and misleading
- Users trust incorrect status information
- Manual refresh required after every external change
- Poor user experience (expected real-time updates)

### The Solution

**FileSystemWatcher → TreeView Refresh Pipeline:**
```
File Change Event (onCreate/onChange/onDelete)
  ↓
FileSystemWatcher detects change
  ↓
Invalidate FrontmatterCache (S40) - Already exists
  ↓
Call PlanningTreeProvider.refresh() - NEW
  ↓
TreeView re-renders with fresh data
```

**Integration Points:**
1. **FileSystemWatcher Setup (S38)** - Already monitoring `**/plans/**/*.md`
2. **Cache Invalidation (S40)** - Already invalidates on file changes
3. **PlanningTreeProvider.refresh()** - NEW: Subscribe to watcher events
4. **TreeView Update** - Existing `_onDidChangeTreeData.fire()`

## Acceptance Criteria

### FileSystemWatcher Event Handling
- [ ] onCreate event triggers TreeView refresh (new file added)
- [ ] onChange event triggers TreeView refresh (existing file modified)
- [ ] onDelete event triggers TreeView refresh (file deleted)
- [ ] All three event types properly invalidate cache before refresh
- [ ] Event handlers registered during extension activation
- [ ] Event handlers disposed during extension deactivation

### TreeView Refresh Integration
- [ ] PlanningTreeProvider receives reference to FileSystemWatcher
- [ ] Refresh method called automatically on file change events
- [ ] Cache invalidation happens before TreeView refresh
- [ ] TreeView re-renders immediately after cache invalidation
- [ ] No manual refresh required for external changes

### File Change Detection
- [ ] Changes from VS Code text editor detected
- [ ] Changes from external editors (Notepad++, Sublime) detected
- [ ] File creation/deletion detected
- [ ] File rename detected (treated as delete + create)
- [ ] Directory operations (move, rename) detected
- [ ] Symlink changes detected (if supported by workspace.createFileSystemWatcher)

### Error Handling
- [ ] Missing files handled gracefully (skip refresh)
- [ ] Malformed frontmatter logged as error, refresh continues
- [ ] FileSystemWatcher disposal errors logged, extension continues
- [ ] Refresh errors logged to Output Channel, non-blocking

### Logging and Observability
- [ ] Log file change events to Cascade Output Channel
- [ ] Log format: `[FileWatcher] File changed: plans/.../story-49.md (onChange)`
- [ ] Log cache invalidation before refresh
- [ ] Log refresh trigger after cache invalidation
- [ ] Log event handler registration during activation

## Analysis Summary

### Architectural Integration

**Existing Infrastructure:**
- **S38 (FileSystemWatcher)**: Already monitoring `plans/` and `specs/` directories
- **S40 (FrontmatterCache)**: Already invalidating on file changes
- **PlanningTreeProvider**: Has `refresh()` method and `_onDidChangeTreeData` event emitter

**Integration Pattern:**
```typescript
// In extension.ts activation
const cache = new FrontmatterCache(outputChannel);
const treeProvider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel);
const watchers = createFileSystemWatchers(cache, treeProvider); // Pass treeProvider

// In createFileSystemWatchers()
function createFileSystemWatchers(
  cache: FrontmatterCache,
  treeProvider: PlanningTreeProvider // NEW parameter
): vscode.FileSystemWatcher[] {
  const planWatcher = vscode.workspace.createFileSystemWatcher('**/plans/**/*.md');

  planWatcher.onDidCreate(uri => {
    cache.invalidate(uri.fsPath);
    treeProvider.refresh(); // NEW: Trigger refresh
  });

  planWatcher.onDidChange(uri => {
    cache.invalidate(uri.fsPath);
    treeProvider.refresh(); // NEW: Trigger refresh
  });

  planWatcher.onDidDelete(uri => {
    cache.invalidate(uri.fsPath);
    treeProvider.refresh(); // NEW: Trigger refresh
  });

  return [planWatcher];
}
```

### Technical Implementation

#### 1. Update FileSystemWatcher Factory Function

**File:** `vscode-extension/src/extension.ts`

**Current Code (S38):**
```typescript
function createFileSystemWatchers(cache: FrontmatterCache): vscode.FileSystemWatcher[] {
  const planWatcher = vscode.workspace.createFileSystemWatcher(
    '**/plans/**/*.md',
    false, // onCreate
    false, // onChange
    false  // onDelete
  );

  planWatcher.onDidCreate(uri => cache.invalidate(uri.fsPath));
  planWatcher.onDidChange(uri => cache.invalidate(uri.fsPath));
  planWatcher.onDidDelete(uri => cache.invalidate(uri.fsPath));

  return [planWatcher];
}
```

**New Code (S71):**
```typescript
function createFileSystemWatchers(
  cache: FrontmatterCache,
  treeProvider: PlanningTreeProvider, // NEW parameter
  outputChannel: vscode.OutputChannel  // NEW parameter for logging
): vscode.FileSystemWatcher[] {
  const planWatcher = vscode.workspace.createFileSystemWatcher(
    '**/plans/**/*.md',
    false, // onCreate
    false, // onChange
    false  // onDelete
  );

  planWatcher.onDidCreate(uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File created: ${relativePath}`);
    cache.invalidate(uri.fsPath);
    treeProvider.refresh(); // NEW: Trigger TreeView refresh
  });

  planWatcher.onDidChange(uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File changed: ${relativePath}`);
    cache.invalidate(uri.fsPath);
    treeProvider.refresh(); // NEW: Trigger TreeView refresh
  });

  planWatcher.onDidDelete(uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File deleted: ${relativePath}`);
    cache.invalidate(uri.fsPath);
    treeProvider.refresh(); // NEW: Trigger TreeView refresh
  });

  return [planWatcher];
}
```

#### 2. Update Extension Activation

**File:** `vscode-extension/src/extension.ts`

**Current Code:**
```typescript
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Cascade');
  const cache = new FrontmatterCache(outputChannel);
  const treeProvider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel);

  // Register TreeView
  const treeView = vscode.window.createTreeView('planningKanbanView', {
    treeDataProvider: treeProvider,
    canSelectMany: false,
  });

  // Create watchers (no TreeProvider reference)
  const watchers = createFileSystemWatchers(cache);

  // Register disposables
  context.subscriptions.push(treeView, outputChannel, ...watchers);
}
```

**New Code:**
```typescript
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Cascade');
  const cache = new FrontmatterCache(outputChannel);
  const treeProvider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel);

  // Register TreeView
  const treeView = vscode.window.createTreeView('planningKanbanView', {
    treeDataProvider: treeProvider,
    canSelectMany: false,
  });

  // Create watchers with TreeProvider reference
  const watchers = createFileSystemWatchers(cache, treeProvider, outputChannel); // NEW parameters

  // Register disposables
  context.subscriptions.push(treeView, outputChannel, ...watchers);
}
```

#### 3. PlanningTreeProvider.refresh() Enhancement

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**Current Code:**
```typescript
refresh(): void {
  this._onDidChangeTreeData.fire(undefined);
}
```

**Enhanced Code (with logging):**
```typescript
refresh(): void {
  this.outputChannel.appendLine('[TreeView] Refreshing TreeView...');

  // Clear cached items (forces reload on next getChildren call)
  this.allItemsCache = null;

  // Fire change event to trigger VSCode TreeView refresh
  this._onDidChangeTreeData.fire(undefined);

  this.outputChannel.appendLine('[TreeView] Refresh complete');
}
```

### Event Flow Diagram

```
External File Change
  ↓
VS Code FileSystemWatcher API detects change
  ↓
FileSystemWatcher.onDidChange() event fires
  ↓
Event Handler:
  1. Log event to Output Channel
  2. Call cache.invalidate(filePath)
     - Removes file from cache Map
     - Next access will re-parse file
  3. Call treeProvider.refresh()
     - Clears allItemsCache
     - Fires _onDidChangeTreeData event
  ↓
VS Code TreeView re-calls getChildren()
  ↓
PlanningTreeProvider.loadAllPlanningItems()
  ↓
FrontmatterCache.get(filePath) - Cache miss
  ↓
Re-parse markdown file frontmatter
  ↓
Return fresh PlanningItem data
  ↓
TreeView renders with updated status
```

### Performance Considerations

**Event Frequency:**
- Single file change: 1 event → 1 refresh (acceptable)
- Git merge with 10 files changed: 10 events → 10 refreshes (problematic)
- **Solution**: Debouncing (handled in S72)

**Cache Strategy:**
- Changed file: Cache miss, re-parse required (expected cost)
- Unchanged files: Cache hit, no re-parse (performance win)
- Full refresh clears allItemsCache but not FrontmatterCache (efficient)

**Current Story Scope:**
- S71: Simple 1:1 event-to-refresh mapping
- S72: Add debouncing for batched changes
- S73: Add selective refresh optimization

### Edge Cases

**Concurrent File Operations:**
- Multiple files changed in rapid succession
- Each triggers separate refresh
- Last refresh wins (eventual consistency)
- **Mitigation**: S72 will batch these into single refresh

**Deleted Files:**
- File deleted while TreeView is rendering
- Cache returns null for missing file
- TreeView skips null items
- **Handling**: Graceful degradation, no error

**Symlinks:**
- FileSystemWatcher follows symlinks by default
- Changes to symlink target trigger events
- **Handling**: No special logic needed, works automatically

**File Renames:**
- Detected as onDidDelete + onDidCreate
- Two refresh events triggered
- Old item removed, new item added
- **Handling**: Works correctly, S72 will optimize

## Test Strategy

### Unit Tests

**FileSystemWatcher Event Handler Tests:**
```typescript
test('onCreate event calls treeProvider.refresh()', async () => {
  const mockTreeProvider = { refresh: jest.fn() };
  const watchers = createFileSystemWatchers(cache, mockTreeProvider, outputChannel);

  // Simulate file creation
  const uri = vscode.Uri.file('/workspace/plans/epic-01/feature.md');
  watchers[0].onDidCreate.fire(uri);

  expect(mockTreeProvider.refresh).toHaveBeenCalledTimes(1);
});

test('onChange event invalidates cache before refresh', async () => {
  const mockCache = { invalidate: jest.fn() };
  const mockTreeProvider = { refresh: jest.fn() };
  const watchers = createFileSystemWatchers(mockCache, mockTreeProvider, outputChannel);

  const uri = vscode.Uri.file('/workspace/plans/epic-01/feature.md');
  watchers[0].onDidChange.fire(uri);

  expect(mockCache.invalidate).toHaveBeenCalledWith(uri.fsPath);
  expect(mockTreeProvider.refresh).toHaveBeenCalled();
});

test('onDelete event triggers refresh', async () => {
  const mockTreeProvider = { refresh: jest.fn() };
  const watchers = createFileSystemWatchers(cache, mockTreeProvider, outputChannel);

  const uri = vscode.Uri.file('/workspace/plans/epic-01/feature.md');
  watchers[0].onDidDelete.fire(uri);

  expect(mockTreeProvider.refresh).toHaveBeenCalledTimes(1);
});
```

### Integration Tests

**End-to-End File Change Detection:**
1. Install extension in test VSCode instance
2. Open workspace with existing planning files
3. Open Cascade TreeView
4. Edit `story-49.md` externally (change status to "Completed")
5. Save file
6. Wait 1 second
7. Verify TreeView shows updated status
8. Verify item moved to "Completed" status group

**File Creation/Deletion:**
1. Create new story markdown file with frontmatter
2. Verify TreeView shows new item
3. Delete story markdown file
4. Verify TreeView removes item

### Manual Testing Checklist

**External Editor Changes:**
- [ ] Edit file in VS Code text editor → TreeView updates
- [ ] Edit file in Notepad++ → TreeView updates
- [ ] Edit file in Sublime Text → TreeView updates
- [ ] Edit file via command line (echo) → TreeView updates

**File Operations:**
- [ ] Create new file → TreeView adds item
- [ ] Delete file → TreeView removes item
- [ ] Rename file → TreeView updates (delete + create)
- [ ] Move file to different directory → TreeView updates

**Status Changes:**
- [ ] Change status from "Ready" to "In Progress" → Item moves to correct status group
- [ ] Change status from "In Progress" to "Completed" → Item moves to "Completed" group
- [ ] Change priority from "Medium" to "High" → Item re-sorts within status group

**Output Channel Verification:**
- [ ] Open "Cascade" output channel
- [ ] Edit file externally
- [ ] Verify log entry: `[FileWatcher] File changed: plans/.../story-49.md`
- [ ] Verify log entry: `[TreeView] Refreshing TreeView...`
- [ ] Verify log entry: `[TreeView] Refresh complete`

## Dependencies

**Required Infrastructure:**
- **S38 (FileSystemWatcher)** - Already exists, provides file monitoring
- **S40 (FrontmatterCache)** - Already exists, provides cache invalidation
- **PlanningTreeProvider** - Already exists, has refresh() method

**Blocked By:**
- None (all dependencies already exist)

**Blocks:**
- **S72 (Debounced Refresh)** - Requires S71 event handling as foundation
- **S73 (Selective Refresh)** - Requires S71 refresh pipeline as foundation
- **S59 (Hierarchical Status Propagation)** - Works better with real-time refresh

## Future Enhancements

**Not in Scope for S71:**
- Debouncing (handled in S72)
- Selective refresh (handled in S73)
- Git operation detection (handled in S74)
- Change type detection (full vs partial refresh)
- Performance optimization for large repositories

**Potential Future Stories:**
- S67: FileSystemWatcher configuration (include/exclude patterns)
- S68: Manual refresh command (force refresh bypass cache)
- S69: Automatic refresh on extension activation
