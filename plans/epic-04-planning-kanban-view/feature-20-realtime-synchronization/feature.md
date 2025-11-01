---
item: F20
title: Real-Time Synchronization
type: feature
parent: E4
status: Completed
priority: Medium
dependencies: [F19]
created: 2025-10-13
updated: 2025-10-17
---

# F20 - Real-Time Synchronization

## Description

Integrate FileSystemWatcher with the TreeView to provide real-time updates when planning files are modified externally (e.g., manual editing, git operations, or external scripts). Changes to markdown frontmatter automatically refresh the TreeView without user intervention.

This feature ensures the TreeView always reflects the current state of the planning repository, even when files are modified outside the extension.

### Key Components

**FileSystemWatcher Integration:**
- Leverage existing FileSystemWatcher from S38
- Subscribe to file change events for plans/ directory
- Trigger TreeView refresh on file modifications

**Cache Invalidation:**
- Use existing FrontmatterCache invalidation mechanism from S40
- Clear cached item data when files change
- Re-parse frontmatter on next TreeView refresh

**Debouncing:**
- Prevent excessive refreshes during rapid file changes
- Batch multiple file changes into single refresh
- Configurable debounce delay (default 300ms)

**Selective Refresh:**
- Full refresh: When file added/deleted (structure changed)
- Partial refresh: When file modified (content changed)
- Status group refresh: When item status changes
- No refresh: When non-frontmatter content changes (optional optimization)

**External Change Detection:**
```typescript
1. User edits Story 39 markdown file directly
2. Changes frontmatter status from "Ready" to "In Progress"
3. Saves file
4. FileSystemWatcher detects change event
5. Cache invalidates entry for Story 39
6. Debounce timer starts (300ms)
7. Timer expires, trigger TreeView refresh
8. TreeView re-reads Story 39 from cache
9. Item moves from "Ready" column to "In Progress" column
10. Parent Feature progress indicator updates
```

### Technical Details

**FileSystemWatcher Setup (S38 - Already Exists):**
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

**TreeView Refresh Integration:**
```typescript
class PlanningTreeProvider implements vscode.TreeDataProvider<PlanningTreeItem> {
  private refreshDebounceTimer?: NodeJS.Timeout;
  private readonly debounceDelay = 300; // ms

  constructor(
    private cache: FrontmatterCache,
    private fileWatchers: vscode.FileSystemWatcher[]
  ) {
    // Subscribe to file change events
    fileWatchers.forEach(watcher => {
      watcher.onDidCreate(() => this.scheduleRefresh());
      watcher.onDidChange(() => this.scheduleRefresh());
      watcher.onDidDelete(() => this.scheduleRefresh());
    });
  }

  private scheduleRefresh(): void {
    // Clear existing timer
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
    }

    // Start new timer
    this.refreshDebounceTimer = setTimeout(() => {
      this.refresh();
    }, this.debounceDelay);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
```

**Selective Refresh Optimization:**
```typescript
// Enhanced refresh with granular control
refresh(item?: PlanningTreeItem): void {
  if (item) {
    // Refresh specific item
    this._onDidChangeTreeData.fire(item);
  } else {
    // Refresh entire tree
    this._onDidChangeTreeData.fire(undefined);
  }
}

// Detect change type from file event
function handleFileChange(uri: vscode.Uri): void {
  const oldData = cache.get(uri.fsPath);
  cache.invalidate(uri.fsPath);
  const newData = cache.get(uri.fsPath);

  // Status changed → refresh status group
  if (oldData?.status !== newData?.status) {
    scheduleRefresh(); // Full refresh needed for status group reorg
  }
  // Content changed → refresh item only
  else if (oldData?.title !== newData?.title) {
    const item = findItemByPath(uri.fsPath);
    scheduleRefresh(item); // Partial refresh
  }
}
```

**Debounce Configuration:**
```typescript
// User-configurable via settings
const config = vscode.workspace.getConfiguration('planningKanban');
const debounceDelay = config.get<number>('refreshDebounceDelay', 300);
```

**Git Operation Handling:**
```typescript
// Detect git operations (checkout, pull, merge)
const gitWatcher = vscode.workspace.createFileSystemWatcher('**/.git/HEAD');
gitWatcher.onDidChange(() => {
  // Full refresh after git operations
  cache.clear(); // Clear entire cache
  scheduleRefresh();
});
```

## Analysis Summary

### Dependencies

**F19 (Context Menu Actions):**
- Extends existing TreeView with synchronization
- Works alongside manual actions (drag-drop, context menu)
- Ensures TreeView state consistent after any modification

**Existing Infrastructure (S38, S40):**
- **S38 (FileSystemWatcher)**: Already monitoring plans/ and specs/
- **S40 (FrontmatterCache)**: Already invalidating on file changes
- **Integration Point**: Connect existing watchers to TreeView refresh

### Performance Considerations

**Debouncing Benefits:**
- Prevents 10+ refreshes during multi-file git merge
- Reduces CPU usage during batch operations
- Improves UI responsiveness (no flicker)

**Cache Strategy:**
- Only re-parse changed files (cache hit for unchanged)
- Lazy-load child items on expand
- Batch file reads for initial load

**Optimization Opportunities:**
- Skip refresh if change is non-frontmatter (e.g., description edit)
- Use file hash comparison to detect actual content changes
- Implement virtual scrolling for 500+ items

### Edge Cases

**Concurrent Modifications:**
- Extension changes file via drag-drop
- External editor saves same file simultaneously
- **Solution**: Last write wins, FileSystemWatcher triggers refresh

**Deleted Files:**
- User deletes Story markdown file
- TreeView should remove item immediately
- **Solution**: onDidDelete handler removes from cache, refreshes tree

**Moved Files:**
- User renames directory (e.g., `feature-16-old` → `feature-16-new`)
- **Solution**: Treat as delete + create, full refresh

**Malformed Frontmatter:**
- User introduces YAML syntax error
- **Solution**: Log error, skip item from tree, show warning badge

## Acceptance Criteria

- [ ] TreeView refreshes automatically when markdown files change
- [ ] Changes from external editors (VS Code, Notepad++, etc.) detected
- [ ] Git operations (checkout, pull, merge) trigger full refresh
- [ ] Debouncing prevents excessive refreshes (300ms default)
- [ ] File additions show new items in TreeView
- [ ] File deletions remove items from TreeView
- [ ] Status changes move items between columns automatically
- [ ] Parent progress indicators update when child status changes
- [ ] Cache invalidation works correctly with FileSystemWatcher
- [ ] No UI flicker during rapid file changes
- [ ] Performance acceptable with 100+ items
- [ ] Configuration setting for debounce delay
- [ ] Error handling for malformed frontmatter
- [ ] Unit tests for debounce and refresh logic

## Child Items

**Created Stories:**

- **S59**: Hierarchical Status Propagation - Priority: High, Status: In Progress
  - File: `plans/epic-04-planning-kanban-view/feature-20-realtime-synchronization/story-59-hierarchical-status-propagation.md`
  - Automatic parent status updates (Story → Feature → Epic → Project) when children complete
  - Estimate: L

- **S71**: FileSystemWatcher to TreeView Integration - Priority: High, Status: Not Started
  - File: `plans/epic-04-planning-kanban-view/feature-20-realtime-synchronization/story-71-filewatcher-treeview-integration.md`
  - Connect FileSystemWatcher events to PlanningTreeProvider.refresh() for real-time TreeView updates
  - Dependencies: [S38, S40]
  - Estimate: M

- **S72**: Debounced Refresh Mechanism - Priority: High, Status: Not Started
  - File: `plans/epic-04-planning-kanban-view/feature-20-realtime-synchronization/story-72-debounced-refresh-mechanism.md`
  - Implement debouncing to batch rapid file changes into single refresh (300ms delay)
  - Dependencies: [S71]
  - Estimate: S

- **S73**: Selective Refresh Optimization - Priority: Medium, Status: Not Started
  - File: `plans/epic-04-planning-kanban-view/feature-20-realtime-synchronization/story-73-selective-refresh-optimization.md`
  - Detect change type (structure/content/body) and apply appropriate refresh strategy (full/partial/none)
  - Dependencies: [S71, S72]
  - Estimate: M

- **S74**: Git Operation Detection - Priority: Low, Status: Not Started
  - File: `plans/epic-04-planning-kanban-view/feature-20-realtime-synchronization/story-74-git-operation-detection.md`
  - Detect git operations via .git/HEAD monitoring and trigger optimized batch refresh
  - Dependencies: [S71, S72]
  - Estimate: S
