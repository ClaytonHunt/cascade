---
item: S72
title: Debounced Refresh Mechanism
type: story
parent: F20
status: Completed
priority: High
dependencies: [S71]
estimate: S
created: 2025-10-17
updated: 2025-10-22
spec: specs/S72-debounced-refresh-mechanism/
---

# S72 - Debounced Refresh Mechanism

## Description

Implement debouncing for TreeView refreshes to prevent excessive UI updates during rapid file changes. When multiple files are modified in quick succession (e.g., git merge, batch script, search-and-replace), the TreeView should batch these changes into a single refresh instead of refreshing after every individual file change.

Currently (after S71), each file change event triggers an immediate TreeView refresh. A git merge affecting 10 files would trigger 10 separate refreshes within milliseconds, causing UI flicker, wasted CPU cycles, and poor user experience.

This story adds a debounce timer (default 300ms) to batch rapid file changes into a single refresh operation.

### The Problem

**Current Behavior (S71):**
```
Git merge affects 10 files
  ↓
File 1 changes → FileSystemWatcher event → TreeView refresh (0ms)
File 2 changes → FileSystemWatcher event → TreeView refresh (5ms)
File 3 changes → FileSystemWatcher event → TreeView refresh (10ms)
...
File 10 changes → FileSystemWatcher event → TreeView refresh (50ms)

Result: 10 refreshes in 50ms
- UI flickers 10 times
- Cache invalidated/repopulated 10 times
- TreeView rendered 10 times
- CPU usage spikes
```

**Desired Behavior (S72):**
```
Git merge affects 10 files
  ↓
File 1 changes → Schedule refresh (start 300ms timer)
File 2 changes → Cancel timer, restart 300ms timer
File 3 changes → Cancel timer, restart 300ms timer
...
File 10 changes → Cancel timer, restart 300ms timer
  ↓
300ms elapses with no new changes
  ↓
TreeView refresh (single operation)

Result: 1 refresh after 300ms delay
- No UI flicker
- Cache invalidated once
- TreeView rendered once
- Minimal CPU usage
```

### The Solution

**Debounce Pattern:**
```typescript
class PlanningTreeProvider {
  private refreshDebounceTimer?: NodeJS.Timeout;
  private readonly debounceDelay = 300; // ms

  /**
   * Schedules a debounced TreeView refresh.
   * Cancels any pending refresh and starts a new timer.
   */
  scheduleRefresh(): void {
    // Clear existing timer if present
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.outputChannel.appendLine('[TreeView] Refresh debounced (timer reset)');
    }

    // Start new timer
    this.refreshDebounceTimer = setTimeout(() => {
      this.refresh(); // Actual refresh happens here
      this.refreshDebounceTimer = undefined;
    }, this.debounceDelay);

    this.outputChannel.appendLine(`[TreeView] Refresh scheduled in ${this.debounceDelay}ms`);
  }

  /**
   * Immediately refreshes TreeView (bypasses debounce).
   * Used for user-initiated refreshes.
   */
  refresh(): void {
    this.outputChannel.appendLine('[TreeView] Refreshing TreeView...');
    this.allItemsCache = null;
    this._onDidChangeTreeData.fire(undefined);
    this.outputChannel.appendLine('[TreeView] Refresh complete');
  }
}
```

**FileSystemWatcher Integration:**
```typescript
// In createFileSystemWatchers()
planWatcher.onDidChange(uri => {
  cache.invalidate(uri.fsPath);
  treeProvider.scheduleRefresh(); // Use debounced version
});
```

## Acceptance Criteria

### Debounce Behavior
- [ ] Multiple file changes within 300ms batched into single refresh
- [ ] Each new file change resets the 300ms timer
- [ ] Refresh executes 300ms after last file change
- [ ] Debounce delay configurable via VSCode settings
- [ ] Default debounce delay is 300ms

### User-Initiated Refresh
- [ ] Manual refresh command bypasses debounce (immediate)
- [ ] Refresh button in TreeView bypasses debounce (immediate)
- [ ] Command palette "Refresh Cascade TreeView" bypasses debounce
- [ ] Keyboard shortcut (if added) bypasses debounce

### Performance
- [ ] 10 rapid file changes trigger only 1 refresh
- [ ] 100 rapid file changes trigger only 1 refresh
- [ ] Debounce timer cleanup on extension deactivation
- [ ] No memory leaks from uncancelled timers
- [ ] Refresh completes within 500ms of timer expiration

### Logging
- [ ] Log when refresh scheduled: `[TreeView] Refresh scheduled in 300ms`
- [ ] Log when timer reset: `[TreeView] Refresh debounced (timer reset)`
- [ ] Log when refresh executes: `[TreeView] Refreshing TreeView...`
- [ ] Log debounce delay value from settings
- [ ] Log when manual refresh bypasses debounce

### Configuration
- [ ] Setting: `planningKanban.refreshDebounceDelay` (number, default 300)
- [ ] Setting description: "Delay in milliseconds before refreshing TreeView after file changes"
- [ ] Setting minimum value: 50ms
- [ ] Setting maximum value: 5000ms
- [ ] Setting changes take effect immediately (no reload required)

### Edge Cases
- [ ] Timer cancelled if extension deactivated mid-debounce
- [ ] Pending refresh executed before extension deactivates
- [ ] Multiple concurrent timers prevented (only one active at a time)
- [ ] Debounce disabled if delay set to 0 (immediate refresh)

## Analysis Summary

### Technical Implementation

#### 1. Add Debounce State to PlanningTreeProvider

**File:** `vscode-extension/src/treeview/PlanningTreeProvider.ts`

**New Fields:**
```typescript
export class PlanningTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  // ... existing fields ...

  // Debounce state
  private refreshDebounceTimer?: NodeJS.Timeout;
  private debounceDelay: number;

  constructor(
    private workspaceRoot: string,
    private cache: FrontmatterCache,
    private outputChannel: vscode.OutputChannel
  ) {
    // ... existing constructor code ...

    // Read debounce delay from settings
    const config = vscode.workspace.getConfiguration('planningKanban');
    this.debounceDelay = config.get<number>('refreshDebounceDelay', 300);

    this.outputChannel.appendLine(`[TreeView] Debounce delay: ${this.debounceDelay}ms`);
  }

  /**
   * Schedules a debounced TreeView refresh.
   * Resets timer if already pending.
   */
  scheduleRefresh(): void {
    // Clear existing timer
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.outputChannel.appendLine('[TreeView] Refresh debounced (timer reset)');
    }

    // Start new timer
    this.refreshDebounceTimer = setTimeout(() => {
      this.refresh();
      this.refreshDebounceTimer = undefined;
    }, this.debounceDelay);

    this.outputChannel.appendLine(`[TreeView] Refresh scheduled in ${this.debounceDelay}ms`);
  }

  /**
   * Immediately refreshes TreeView (bypasses debounce).
   */
  refresh(): void {
    // Cancel any pending debounced refresh
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = undefined;
      this.outputChannel.appendLine('[TreeView] Pending refresh cancelled (manual refresh)');
    }

    this.outputChannel.appendLine('[TreeView] Refreshing TreeView...');
    this.allItemsCache = null;
    this._onDidChangeTreeData.fire(undefined);
    this.outputChannel.appendLine('[TreeView] Refresh complete');
  }

  /**
   * Cleanup debounce timer on disposal.
   */
  dispose(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = undefined;
      this.outputChannel.appendLine('[TreeView] Debounce timer cleared (disposal)');
    }
  }
}
```

#### 2. Update FileSystemWatcher to Use Debounced Refresh

**File:** `vscode-extension/src/extension.ts`

**Updated Event Handlers:**
```typescript
function createFileSystemWatchers(
  cache: FrontmatterCache,
  treeProvider: PlanningTreeProvider,
  outputChannel: vscode.OutputChannel
): vscode.FileSystemWatcher[] {
  const planWatcher = vscode.workspace.createFileSystemWatcher('**/plans/**/*.md');

  planWatcher.onDidCreate(uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File created: ${relativePath}`);
    cache.invalidate(uri.fsPath);
    treeProvider.scheduleRefresh(); // Use debounced version
  });

  planWatcher.onDidChange(uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File changed: ${relativePath}`);
    cache.invalidate(uri.fsPath);
    treeProvider.scheduleRefresh(); // Use debounced version
  });

  planWatcher.onDidDelete(uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File deleted: ${relativePath}`);
    cache.invalidate(uri.fsPath);
    treeProvider.scheduleRefresh(); // Use debounced version
  });

  return [planWatcher];
}
```

#### 3. Add VSCode Setting

**File:** `vscode-extension/package.json`

**New Configuration:**
```json
{
  "contributes": {
    "configuration": {
      "title": "Planning Kanban",
      "properties": {
        "planningKanban.refreshDebounceDelay": {
          "type": "number",
          "default": 300,
          "minimum": 0,
          "maximum": 5000,
          "description": "Delay in milliseconds before refreshing TreeView after file changes. Set to 0 to disable debouncing."
        }
      }
    }
  }
}
```

#### 4. Add Manual Refresh Command (bypasses debounce)

**File:** `vscode-extension/package.json`

**New Command:**
```json
{
  "contributes": {
    "commands": [
      {
        "command": "planningKanban.refreshTreeView",
        "title": "Refresh Cascade TreeView",
        "icon": "$(refresh)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "planningKanban.refreshTreeView",
          "when": "view == planningKanbanView",
          "group": "navigation"
        }
      ]
    }
  }
}
```

**Command Handler:**
```typescript
// In extension.ts activate()
const refreshCommand = vscode.commands.registerCommand(
  'planningKanban.refreshTreeView',
  () => {
    outputChannel.appendLine('[Command] Manual refresh triggered');
    treeProvider.refresh(); // Bypasses debounce
  }
);

context.subscriptions.push(refreshCommand);
```

#### 5. React to Configuration Changes

**File:** `vscode-extension/src/extension.ts`

**Configuration Listener:**
```typescript
// In activate()
const configListener = vscode.workspace.onDidChangeConfiguration(event => {
  if (event.affectsConfiguration('planningKanban.refreshDebounceDelay')) {
    const config = vscode.workspace.getConfiguration('planningKanban');
    const newDelay = config.get<number>('refreshDebounceDelay', 300);

    // Update treeProvider debounce delay
    treeProvider.updateDebounceDelay(newDelay);

    outputChannel.appendLine(`[Config] Debounce delay updated: ${newDelay}ms`);
  }
});

context.subscriptions.push(configListener);
```

**PlanningTreeProvider Method:**
```typescript
/**
 * Updates debounce delay from configuration.
 */
updateDebounceDelay(newDelay: number): void {
  this.debounceDelay = newDelay;
  this.outputChannel.appendLine(`[TreeView] Debounce delay changed to ${newDelay}ms`);
}
```

### Event Flow Diagram

**Rapid File Changes (Debounced):**
```
File 1 changes (t=0ms)
  ↓
scheduleRefresh() called
  ↓
Timer started (expires at t=300ms)
  ↓
File 2 changes (t=50ms)
  ↓
scheduleRefresh() called
  ↓
Timer cancelled and restarted (expires at t=350ms)
  ↓
File 3 changes (t=100ms)
  ↓
scheduleRefresh() called
  ↓
Timer cancelled and restarted (expires at t=400ms)
  ↓
No more changes for 300ms
  ↓
Timer expires (t=400ms)
  ↓
refresh() called
  ↓
TreeView updates once
```

**Manual Refresh (Immediate):**
```
User clicks Refresh button
  ↓
Command handler calls treeProvider.refresh()
  ↓
Pending timer cancelled (if any)
  ↓
TreeView refreshes immediately
  ↓
User sees updated data (no delay)
```

### Performance Analysis

**Without Debouncing (10 file changes in 50ms):**
- Refreshes: 10
- Cache invalidations: 10
- File re-parses: 10 × (files changed) = 100+
- TreeView re-renders: 10
- Time to stable UI: ~500ms (10 × 50ms)
- CPU usage: High (spiky)

**With Debouncing (10 file changes in 50ms):**
- Refreshes: 1
- Cache invalidations: 10 (still needed per-file)
- File re-parses: 10 (once per changed file)
- TreeView re-renders: 1
- Time to stable UI: 350ms (50ms + 300ms debounce)
- CPU usage: Low (single spike)

**Performance Gain:**
- 90% fewer refreshes
- 90% fewer TreeView re-renders
- 80% reduction in CPU usage
- Smoother UI (no flicker)

### Edge Cases

**Extension Deactivation During Debounce:**
```typescript
// In PlanningTreeProvider.dispose()
dispose(): void {
  // Cancel pending refresh
  if (this.refreshDebounceTimer) {
    clearTimeout(this.refreshDebounceTimer);

    // Optionally execute pending refresh before cleanup
    this.refresh();

    this.refreshDebounceTimer = undefined;
  }
}
```

**Debounce Delay Set to 0 (Disable Debouncing):**
```typescript
scheduleRefresh(): void {
  if (this.debounceDelay === 0) {
    // Immediate refresh (no debounce)
    this.refresh();
    return;
  }

  // Normal debounce logic...
}
```

**Multiple Concurrent Timers (Prevented):**
- Only one `refreshDebounceTimer` field exists
- Each `scheduleRefresh()` call cancels existing timer
- Guaranteed single timer at any point in time

## Test Strategy

### Unit Tests

**Debounce Logic Tests:**
```typescript
test('scheduleRefresh() delays refresh by debounceDelay', async () => {
  const treeProvider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel);
  const refreshSpy = jest.spyOn(treeProvider, 'refresh');

  treeProvider.scheduleRefresh();

  // Refresh not called immediately
  expect(refreshSpy).not.toHaveBeenCalled();

  // Wait for debounce delay + buffer
  await new Promise(resolve => setTimeout(resolve, 350));

  // Refresh called after delay
  expect(refreshSpy).toHaveBeenCalledTimes(1);
});

test('multiple scheduleRefresh() calls reset timer', async () => {
  const treeProvider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel);
  const refreshSpy = jest.spyOn(treeProvider, 'refresh');

  treeProvider.scheduleRefresh(); // t=0
  await new Promise(resolve => setTimeout(resolve, 100)); // t=100
  treeProvider.scheduleRefresh(); // t=100 (reset timer)
  await new Promise(resolve => setTimeout(resolve, 100)); // t=200
  treeProvider.scheduleRefresh(); // t=200 (reset timer)

  // Wait for final timer to expire
  await new Promise(resolve => setTimeout(resolve, 350)); // t=550

  // Only 1 refresh after all resets
  expect(refreshSpy).toHaveBeenCalledTimes(1);
});

test('refresh() cancels pending debounced refresh', async () => {
  const treeProvider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel);
  const refreshSpy = jest.spyOn(treeProvider, 'refresh');

  treeProvider.scheduleRefresh(); // Schedule debounced refresh

  // Immediately call manual refresh
  treeProvider.refresh();

  // Wait for debounce delay
  await new Promise(resolve => setTimeout(resolve, 350));

  // Only 1 refresh (manual), debounced refresh cancelled
  expect(refreshSpy).toHaveBeenCalledTimes(1);
});

test('debounce delay of 0 triggers immediate refresh', () => {
  const config = { get: jest.fn().mockReturnValue(0) };
  vscode.workspace.getConfiguration = jest.fn().mockReturnValue(config);

  const treeProvider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel);
  const refreshSpy = jest.spyOn(treeProvider, 'refresh');

  treeProvider.scheduleRefresh();

  // Immediate refresh (no timer)
  expect(refreshSpy).toHaveBeenCalledTimes(1);
});
```

**Timer Cleanup Tests:**
```typescript
test('dispose() clears pending timer', () => {
  const treeProvider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel);
  const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

  treeProvider.scheduleRefresh();
  treeProvider.dispose();

  expect(clearTimeoutSpy).toHaveBeenCalled();
});
```

### Integration Tests

**Batch File Changes:**
1. Install extension in test workspace
2. Open Cascade TreeView
3. Use script to modify 10 markdown files rapidly (< 100ms)
4. Wait 500ms
5. Verify TreeView refreshed only once (check output channel logs)
6. Verify all 10 file changes reflected in TreeView

**Manual Refresh During Debounce:**
1. Modify file to trigger debounced refresh
2. Immediately click "Refresh" button
3. Verify immediate refresh (no 300ms delay)
4. Verify pending debounced refresh cancelled

### Manual Testing Checklist

**Debounce Verification:**
- [ ] Open Cascade output channel
- [ ] Run git merge affecting 10+ files
- [ ] Verify logs show: `[TreeView] Refresh scheduled in 300ms`
- [ ] Verify logs show: `[TreeView] Refresh debounced (timer reset)` multiple times
- [ ] Verify single `[TreeView] Refreshing TreeView...` after 300ms
- [ ] Verify TreeView shows all changes correctly

**Manual Refresh:**
- [ ] Modify file (triggers debounce)
- [ ] Click Refresh button immediately
- [ ] Verify TreeView updates without 300ms delay
- [ ] Verify output channel shows: `[TreeView] Pending refresh cancelled (manual refresh)`

**Configuration Changes:**
- [ ] Open VSCode settings (Ctrl+,)
- [ ] Search for "planningKanban.refreshDebounceDelay"
- [ ] Change value from 300 to 1000
- [ ] Modify file
- [ ] Verify refresh waits 1000ms (check output channel)
- [ ] Change value to 0
- [ ] Modify file
- [ ] Verify immediate refresh (no delay)

## Dependencies

**Required:**
- **S71 (FileSystemWatcher to TreeView Integration)** - Provides `scheduleRefresh()` call sites

**Blocks:**
- None (S73 and S74 can be implemented independently)

## Future Enhancements

**Not in Scope for S72:**
- Adaptive debounce delay (shorter delay for single file, longer for batch)
- User notification when debounce is active ("Refreshing in 300ms...")
- Configurable debounce per file type (e.g., longer delay for large files)
- Smart debounce (detect git operations and use longer delay)

**Potential Future Stories:**
- S70: Adaptive debounce based on change frequency
- S71: Progress indicator during debounce delay
