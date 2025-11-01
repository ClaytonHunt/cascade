---
item: S74
title: Git Operation Detection
type: story
parent: F20
status: Completed
priority: Low
dependencies: [S71, S72]
estimate: S
created: 2025-10-17
updated: 2025-10-23
spec: specs/S74-git-operation-detection/
---

# S74 - Git Operation Detection

## Description

Detect git operations (checkout, pull, merge, rebase) and trigger optimized TreeView refresh with full cache invalidation. Git operations typically modify many files simultaneously (10-100+), requiring different refresh behavior than individual file edits:

- **Full cache clear** (not just invalidate changed files)
- **Single refresh after operation completes** (not one per file)
- **Longer debounce delay** (500ms instead of 300ms to wait for operation completion)

Currently (after S71-S72), git operations trigger hundreds of individual file change events, each scheduling a debounced refresh. While debouncing helps, the extension doesn't know these changes are part of a single git operation, leading to suboptimal cache strategy and refresh timing.

This story detects git operations via `.git/HEAD` and `.git/index` monitoring, treating them as special "batch operation" events.

### The Problem

**Current Behavior (Git Merge with 50 File Changes):**
```
Git merge starts
  ↓
File 1 changes → scheduleRefresh() (300ms timer starts)
File 2 changes → scheduleRefresh() (300ms timer resets)
...
File 50 changes → scheduleRefresh() (300ms timer resets)
  ↓
300ms elapses after last file change
  ↓
TreeView refreshes
  ↓
Cache still holds 50+ unchanged items (memory waste)
Refresh time: ~500ms (re-parsing all changed files)
```

**Impact:**
- Cache bloat (50+ stale entries from pre-merge state)
- Suboptimal debounce delay (300ms may be too short for large merges)
- No indication to user that batch operation occurred
- Cache memory not freed until individual file access

**Desired Behavior (Git-Aware Refresh):**
```
Git merge starts
  ↓
.git/HEAD changes (branch checkout detected)
  OR
.git/index changes (staging area modified)
  ↓
Detect git operation in progress
  ↓
Suppress individual file change events (batched)
  ↓
Git operation completes (no more .git/ changes for 500ms)
  ↓
Clear entire cache (not just changed files)
  ↓
Single TreeView refresh
  ↓
Refresh time: ~300ms (cache fully rebuilt, no stale entries)
```

### The Solution

**Git Operation Detection:**
```typescript
/**
 * Detects git operations by monitoring .git/ metadata files.
 *
 * Monitored files:
 * - .git/HEAD: Branch checkouts, commits
 * - .git/index: Stage area changes (add, reset, merge)
 * - .git/MERGE_HEAD: Merge in progress
 * - .git/REBASE_HEAD: Rebase in progress
 */
class GitOperationDetector {
  private gitOperationInProgress = false;
  private gitOperationTimer?: NodeJS.Timeout;
  private readonly gitOperationDebounceDelay = 500; // ms (longer than file changes)

  constructor(
    private workspaceRoot: string,
    private outputChannel: vscode.OutputChannel
  ) {}

  /**
   * Creates FileSystemWatchers for git metadata files.
   */
  createGitWatchers(): vscode.FileSystemWatcher[] {
    const gitHeadWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, '.git/HEAD')
    );

    const gitIndexWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, '.git/index')
    );

    gitHeadWatcher.onDidChange(() => this.handleGitEvent('HEAD changed'));
    gitIndexWatcher.onDidChange(() => this.handleGitEvent('index changed'));

    return [gitHeadWatcher, gitIndexWatcher];
  }

  /**
   * Handles git metadata file changes.
   * Sets gitOperationInProgress flag and starts debounce timer.
   */
  private handleGitEvent(eventType: string): void {
    this.outputChannel.appendLine(`[Git] ${eventType}`);

    if (!this.gitOperationInProgress) {
      this.gitOperationInProgress = true;
      this.outputChannel.appendLine('[Git] Operation started');
    }

    // Reset debounce timer
    if (this.gitOperationTimer) {
      clearTimeout(this.gitOperationTimer);
    }

    // Start new timer (longer delay for git operations)
    this.gitOperationTimer = setTimeout(() => {
      this.gitOperationInProgress = false;
      this.gitOperationTimer = undefined;
      this.outputChannel.appendLine('[Git] Operation completed');
      this.onGitOperationComplete();
    }, this.gitOperationDebounceDelay);
  }

  /**
   * Callback when git operation completes.
   * Override this in extension.ts to trigger refresh.
   */
  onGitOperationComplete(): void {
    // Implemented by extension.ts
  }

  /**
   * Checks if a git operation is currently in progress.
   */
  isGitOperationInProgress(): boolean {
    return this.gitOperationInProgress;
  }

  dispose(): void {
    if (this.gitOperationTimer) {
      clearTimeout(this.gitOperationTimer);
    }
  }
}
```

**Integration with FileSystemWatcher:**
```typescript
// In createFileSystemWatchers()
planWatcher.onDidChange(async uri => {
  const relativePath = path.relative(workspaceRoot, uri.fsPath);
  outputChannel.appendLine(`[FileWatcher] File changed: ${relativePath}`);

  // Check if git operation in progress
  if (gitDetector.isGitOperationInProgress()) {
    outputChannel.appendLine('[FileWatcher] Change suppressed (git operation in progress)');
    cache.invalidate(uri.fsPath); // Still invalidate individual files
    return; // Don't trigger refresh yet
  }

  // Normal change detection and refresh logic...
  const result = await detectChangeType(uri, cache, outputChannel);
  // ... (existing S73 logic)
});

// Git operation completion handler
gitDetector.onGitOperationComplete = () => {
  outputChannel.appendLine('[Git] Clearing entire cache (post-operation)');
  cache.clear(); // Full cache clear (not just invalidate)

  outputChannel.appendLine('[Git] Triggering full TreeView refresh');
  treeProvider.refresh(); // Immediate refresh (bypass debounce)
};
```

## Acceptance Criteria

### Git Operation Detection
- [ ] Branch checkout detected (git checkout)
- [ ] Branch merge detected (git merge)
- [ ] Commit detected (git commit)
- [ ] Pull detected (git pull)
- [ ] Rebase detected (git rebase)
- [ ] Stage changes detected (git add, git reset)
- [ ] Git operation completion detected (500ms no .git/ changes)

### Refresh Behavior During Git Operations
- [ ] Individual file changes suppressed during git operation
- [ ] Cache invalidation still happens per-file (for correctness)
- [ ] No TreeView refreshes until git operation completes
- [ ] Full cache clear after git operation completes
- [ ] Single TreeView refresh after git operation completes
- [ ] Immediate refresh (bypasses 300ms debounce)

### Performance
- [ ] Git operation with 50 file changes triggers only 1 refresh
- [ ] Full cache clear completes in < 50ms
- [ ] TreeView refresh after cache clear completes in < 500ms
- [ ] Memory usage drops after cache clear (stale entries freed)
- [ ] No performance regression for non-git file changes

### Logging
- [ ] Log git operation start: `[Git] Operation started`
- [ ] Log git metadata changes: `[Git] HEAD changed`, `[Git] index changed`
- [ ] Log suppressed file changes: `[FileWatcher] Change suppressed (git operation in progress)`
- [ ] Log git operation completion: `[Git] Operation completed`
- [ ] Log full cache clear: `[Git] Clearing entire cache (post-operation)`
- [ ] Log refresh trigger: `[Git] Triggering full TreeView refresh`

### Edge Cases
- [ ] Git operation interrupted (timeout after 5 seconds, trigger refresh anyway)
- [ ] Concurrent git operations (e.g., git pull during git merge) handled gracefully
- [ ] Git operation with 0 planning file changes (no refresh needed)
- [ ] Git operation with only deleted files (cache clear still happens)
- [ ] Non-git .git/ file changes (e.g., config edits) ignored (only HEAD/index matter)

### Configuration
- [ ] Git operation detection enabled by default
- [ ] Setting: `planningKanban.enableGitOperationDetection` (boolean, default true)
- [ ] Setting: `planningKanban.gitOperationDebounceDelay` (number, default 500ms)
- [ ] Disable git detection for non-git workspaces (graceful degradation)

## Analysis Summary

### Technical Implementation

#### 1. GitOperationDetector Class

**File:** `vscode-extension/src/utils/GitOperationDetector.ts` (new file)

```typescript
import * as vscode from 'vscode';

export interface GitOperationDetectorConfig {
  enabled: boolean;
  debounceDelay: number;
}

export class GitOperationDetector implements vscode.Disposable {
  private gitOperationInProgress = false;
  private gitOperationTimer?: NodeJS.Timeout;
  private debounceDelay: number;
  private enabled: boolean;
  private watchers: vscode.FileSystemWatcher[] = [];

  // Callback triggered when git operation completes
  public onGitOperationComplete: () => void = () => {};

  constructor(
    private workspaceRoot: string,
    private outputChannel: vscode.OutputChannel,
    config: GitOperationDetectorConfig
  ) {
    this.enabled = config.enabled;
    this.debounceDelay = config.debounceDelay;

    this.outputChannel.appendLine(
      `[Git] Detector initialized (enabled: ${this.enabled}, debounce: ${this.debounceDelay}ms)`
    );
  }

  /**
   * Creates and registers git metadata file watchers.
   *
   * @returns Array of FileSystemWatcher instances
   */
  createGitWatchers(): vscode.FileSystemWatcher[] {
    if (!this.enabled) {
      this.outputChannel.appendLine('[Git] Detection disabled, skipping watcher creation');
      return [];
    }

    // Watch .git/HEAD (branch changes, commits)
    const gitHeadWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, '.git/HEAD'),
      true,  // ignoreCreateEvents
      false, // ignoreChangeEvents
      true   // ignoreDeleteEvents
    );

    // Watch .git/index (staging area changes)
    const gitIndexWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, '.git/index'),
      true,  // ignoreCreateEvents
      false, // ignoreChangeEvents
      true   // ignoreDeleteEvents
    );

    gitHeadWatcher.onDidChange(() => this.handleGitEvent('HEAD changed'));
    gitIndexWatcher.onDidChange(() => this.handleGitEvent('index changed'));

    this.watchers = [gitHeadWatcher, gitIndexWatcher];

    this.outputChannel.appendLine('[Git] Watchers created for .git/HEAD and .git/index');

    return this.watchers;
  }

  /**
   * Handles git metadata file changes.
   * Sets gitOperationInProgress flag and starts/resets debounce timer.
   */
  private handleGitEvent(eventType: string): void {
    this.outputChannel.appendLine(`[Git] ${eventType}`);

    // Mark operation as in progress
    if (!this.gitOperationInProgress) {
      this.gitOperationInProgress = true;
      this.outputChannel.appendLine('[Git] Operation started');
    }

    // Clear existing timer
    if (this.gitOperationTimer) {
      clearTimeout(this.gitOperationTimer);
      this.outputChannel.appendLine('[Git] Operation timer reset');
    }

    // Start new timer
    this.gitOperationTimer = setTimeout(() => {
      this.gitOperationInProgress = false;
      this.gitOperationTimer = undefined;
      this.outputChannel.appendLine('[Git] Operation completed (timer expired)');

      // Trigger callback
      this.onGitOperationComplete();
    }, this.debounceDelay);
  }

  /**
   * Checks if a git operation is currently in progress.
   *
   * @returns True if git operation is active
   */
  isGitOperationInProgress(): boolean {
    return this.gitOperationInProgress;
  }

  /**
   * Updates debounce delay from configuration.
   */
  updateDebounceDelay(newDelay: number): void {
    this.debounceDelay = newDelay;
    this.outputChannel.appendLine(`[Git] Debounce delay updated: ${newDelay}ms`);
  }

  /**
   * Enables or disables git operation detection.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.outputChannel.appendLine(`[Git] Detection ${enabled ? 'enabled' : 'disabled'}`);

    if (!enabled && this.gitOperationInProgress) {
      // Cancel pending operation
      if (this.gitOperationTimer) {
        clearTimeout(this.gitOperationTimer);
        this.gitOperationTimer = undefined;
      }
      this.gitOperationInProgress = false;
      this.outputChannel.appendLine('[Git] Pending operation cancelled (detection disabled)');
    }
  }

  /**
   * Cleanup watchers and timers.
   */
  dispose(): void {
    this.outputChannel.appendLine('[Git] Disposing detector');

    // Clear timer
    if (this.gitOperationTimer) {
      clearTimeout(this.gitOperationTimer);
      this.gitOperationTimer = undefined;
    }

    // Dispose watchers
    this.watchers.forEach(watcher => watcher.dispose());
    this.watchers = [];
  }
}
```

#### 2. Integrate GitOperationDetector with Extension

**File:** `vscode-extension/src/extension.ts`

**Activation:**
```typescript
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Cascade');
  const cache = new FrontmatterCache(outputChannel);
  const treeProvider = new PlanningTreeProvider(workspaceRoot, cache, outputChannel);

  // Create git operation detector
  const config = vscode.workspace.getConfiguration('planningKanban');
  const gitDetector = new GitOperationDetector(
    workspaceRoot,
    outputChannel,
    {
      enabled: config.get<boolean>('enableGitOperationDetection', true),
      debounceDelay: config.get<number>('gitOperationDebounceDelay', 500)
    }
  );

  // Register git operation completion callback
  gitDetector.onGitOperationComplete = () => {
    outputChannel.appendLine('[Git] Clearing entire cache (post-operation)');
    cache.clear(); // Full cache clear

    outputChannel.appendLine('[Git] Triggering full TreeView refresh');
    treeProvider.refresh(); // Immediate refresh (bypass debounce)
  };

  // Create git watchers
  const gitWatchers = gitDetector.createGitWatchers();

  // Create file system watchers (pass gitDetector reference)
  const fileWatchers = createFileSystemWatchers(cache, treeProvider, gitDetector, outputChannel);

  // Register TreeView
  const treeView = vscode.window.createTreeView('planningKanbanView', {
    treeDataProvider: treeProvider,
    canSelectMany: false,
  });

  // Register disposables
  context.subscriptions.push(
    treeView,
    outputChannel,
    gitDetector,
    ...gitWatchers,
    ...fileWatchers
  );
}
```

**Updated FileSystemWatcher:**
```typescript
function createFileSystemWatchers(
  cache: FrontmatterCache,
  treeProvider: PlanningTreeProvider,
  gitDetector: GitOperationDetector, // NEW parameter
  outputChannel: vscode.OutputChannel
): vscode.FileSystemWatcher[] {
  const planWatcher = vscode.workspace.createFileSystemWatcher('**/plans/**/*.md');

  planWatcher.onDidChange(async uri => {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    outputChannel.appendLine(`[FileWatcher] File changed: ${relativePath}`);

    // Invalidate cache (always, even during git operations)
    cache.invalidate(uri.fsPath);

    // Check if git operation in progress
    if (gitDetector.isGitOperationInProgress()) {
      outputChannel.appendLine('[FileWatcher] Refresh suppressed (git operation in progress)');
      return; // Don't trigger refresh yet
    }

    // Normal change detection and refresh logic (from S73)
    const result = await detectChangeType(uri, cache, outputChannel);

    switch (result.type) {
      case ChangeType.STRUCTURE:
        treeProvider.scheduleRefresh();
        break;
      case ChangeType.CONTENT:
        const item = await treeProvider.findItemByPath(uri.fsPath);
        if (item) {
          treeProvider.schedulePartialRefresh(item);
        } else {
          treeProvider.scheduleRefresh();
        }
        break;
      case ChangeType.BODY:
        outputChannel.appendLine('[TreeView] Refresh skipped (body-only change)');
        break;
    }
  });

  // onCreate and onDelete handlers also check gitDetector.isGitOperationInProgress()
  planWatcher.onDidCreate(uri => {
    cache.invalidate(uri.fsPath);
    if (gitDetector.isGitOperationInProgress()) {
      outputChannel.appendLine('[FileWatcher] Create event suppressed (git operation in progress)');
      return;
    }
    treeProvider.scheduleRefresh();
  });

  planWatcher.onDidDelete(uri => {
    cache.invalidate(uri.fsPath);
    if (gitDetector.isGitOperationInProgress()) {
      outputChannel.appendLine('[FileWatcher] Delete event suppressed (git operation in progress)');
      return;
    }
    treeProvider.scheduleRefresh();
  });

  return [planWatcher];
}
```

#### 3. Add VSCode Settings

**File:** `vscode-extension/package.json`

```json
{
  "contributes": {
    "configuration": {
      "title": "Planning Kanban",
      "properties": {
        "planningKanban.enableGitOperationDetection": {
          "type": "boolean",
          "default": true,
          "description": "Enable git operation detection for optimized TreeView refresh during git operations (checkout, merge, pull, rebase)."
        },
        "planningKanban.gitOperationDebounceDelay": {
          "type": "number",
          "default": 500,
          "minimum": 100,
          "maximum": 5000,
          "description": "Delay in milliseconds to wait after last git metadata change before triggering TreeView refresh."
        }
      }
    }
  }
}
```

#### 4. Configuration Change Listener

**File:** `vscode-extension/src/extension.ts`

```typescript
// In activate()
const configListener = vscode.workspace.onDidChangeConfiguration(event => {
  if (event.affectsConfiguration('planningKanban.enableGitOperationDetection')) {
    const enabled = vscode.workspace.getConfiguration('planningKanban')
      .get<boolean>('enableGitOperationDetection', true);
    gitDetector.setEnabled(enabled);
  }

  if (event.affectsConfiguration('planningKanban.gitOperationDebounceDelay')) {
    const delay = vscode.workspace.getConfiguration('planningKanban')
      .get<number>('gitOperationDebounceDelay', 500);
    gitDetector.updateDebounceDelay(delay);
  }
});

context.subscriptions.push(configListener);
```

### Event Flow Diagram

**Git Merge Scenario (50 File Changes):**
```
User runs: git merge feature-branch
  ↓
.git/index changes (staging area updated)
  ↓
GitOperationDetector.handleGitEvent('index changed')
  ↓
Set gitOperationInProgress = true
Start 500ms timer
  ↓
File 1 changes → FileSystemWatcher event
  ↓
cache.invalidate(file1) ✅
gitDetector.isGitOperationInProgress() = true
  → Suppress refresh ✅
  ↓
File 2 changes → FileSystemWatcher event
  ↓
cache.invalidate(file2) ✅
  → Suppress refresh ✅
  ↓
... (48 more files)
  ↓
.git/HEAD changes (branch merged)
  ↓
GitOperationDetector.handleGitEvent('HEAD changed')
  ↓
Reset 500ms timer
  ↓
500ms elapses (no more git metadata changes)
  ↓
Timer expires → onGitOperationComplete()
  ↓
cache.clear() (full cache clear, not just 50 files)
  ↓
treeProvider.refresh() (immediate, bypass debounce)
  ↓
TreeView refreshes once
  ↓
Total time: merge duration + 500ms + 300ms = ~1 second
Total refreshes: 1 (instead of 50+)
```

### Performance Analysis

**Without S74 (50 file git merge):**
- File change events: 50
- Cache invalidations: 50 (individual files)
- Debounced refreshes scheduled: 50 (last one executes)
- Final refresh: 1
- Stale cache entries: 50+ (files from before merge)
- Memory usage: High (stale entries not freed)
- Time to stable UI: ~800ms (300ms debounce + 500ms refresh)

**With S74 (50 file git merge):**
- File change events: 50 (suppressed)
- Cache invalidations: 50 (individual files)
- Debounced refreshes scheduled: 0 (suppressed)
- Git operation detected: 1
- Full cache clear: 1
- Final refresh: 1 (immediate)
- Stale cache entries: 0 (full clear)
- Memory usage: Low (cache rebuilt fresh)
- Time to stable UI: ~800ms (500ms git debounce + 300ms refresh)

**Benefits:**
- Cleaner cache (no stale entries)
- Lower memory usage (freed unused entries)
- More predictable timing (single refresh point)
- Better logging (explicit git operation markers)

### Edge Cases

**Git Operation Timeout:**
```typescript
// After 5 seconds of continuous git metadata changes, force completion
private readonly GIT_OPERATION_MAX_DURATION = 5000; // ms

handleGitEvent(eventType: string): void {
  // ... existing logic ...

  // Check if operation running too long
  const operationDuration = Date.now() - this.gitOperationStartTime;
  if (operationDuration > this.GIT_OPERATION_MAX_DURATION) {
    this.outputChannel.appendLine('[Git] ⚠️  Operation timeout, forcing completion');
    this.forceComplete();
  }
}
```

**Non-Git Workspace:**
```typescript
createGitWatchers(): vscode.FileSystemWatcher[] {
  // Check if .git directory exists
  const gitDir = path.join(this.workspaceRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    this.outputChannel.appendLine('[Git] No .git directory found, disabling detection');
    this.enabled = false;
    return [];
  }

  // ... create watchers ...
}
```

## Test Strategy

### Unit Tests

**GitOperationDetector Tests:**
```typescript
test('handleGitEvent() sets gitOperationInProgress to true', () => {
  const detector = new GitOperationDetector(workspaceRoot, outputChannel, { enabled: true, debounceDelay: 500 });

  detector['handleGitEvent']('HEAD changed');

  expect(detector.isGitOperationInProgress()).toBe(true);
});

test('timer expiration calls onGitOperationComplete callback', async () => {
  const detector = new GitOperationDetector(workspaceRoot, outputChannel, { enabled: true, debounceDelay: 100 });
  const callback = jest.fn();
  detector.onGitOperationComplete = callback;

  detector['handleGitEvent']('index changed');

  await new Promise(resolve => setTimeout(resolve, 150));

  expect(callback).toHaveBeenCalledTimes(1);
  expect(detector.isGitOperationInProgress()).toBe(false);
});

test('multiple git events reset timer', async () => {
  const detector = new GitOperationDetector(workspaceRoot, outputChannel, { enabled: true, debounceDelay: 100 });
  const callback = jest.fn();
  detector.onGitOperationComplete = callback;

  detector['handleGitEvent']('HEAD changed'); // t=0
  await new Promise(resolve => setTimeout(resolve, 50)); // t=50
  detector['handleGitEvent']('index changed'); // t=50 (reset timer)

  await new Promise(resolve => setTimeout(resolve, 120)); // t=170

  expect(callback).toHaveBeenCalledTimes(1); // Only once after final timer
});

test('disabled detector does not create watchers', () => {
  const detector = new GitOperationDetector(workspaceRoot, outputChannel, { enabled: false, debounceDelay: 500 });

  const watchers = detector.createGitWatchers();

  expect(watchers).toHaveLength(0);
});
```

**Integration with FileSystemWatcher:**
```typescript
test('file changes suppressed during git operation', async () => {
  const gitDetector = new GitOperationDetector(workspaceRoot, outputChannel, { enabled: true, debounceDelay: 500 });
  gitDetector['handleGitEvent']('HEAD changed'); // Start git operation

  const refreshSpy = jest.spyOn(treeProvider, 'scheduleRefresh');
  const watchers = createFileSystemWatchers(cache, treeProvider, gitDetector, outputChannel);

  // Trigger file change
  watchers[0].onDidChange.fire(vscode.Uri.file('/workspace/plans/story-49.md'));

  expect(refreshSpy).not.toHaveBeenCalled(); // Suppressed
});
```

### Integration Tests

**End-to-End Git Merge:**
1. Install extension in test git repository
2. Open Cascade TreeView
3. Create feature branch with 10 modified planning files
4. Switch back to main branch
5. Run `git merge feature-branch`
6. Wait 1 second
7. Verify output channel shows:
   - `[Git] Operation started`
   - `[FileWatcher] Refresh suppressed (git operation in progress)` (10 times)
   - `[Git] Operation completed`
   - `[Git] Clearing entire cache (post-operation)`
   - `[Git] Triggering full TreeView refresh`
8. Verify TreeView shows merged changes
9. Verify only 1 refresh occurred (not 10)

### Manual Testing Checklist

**Git Operations:**
- [ ] git checkout → Detected, single refresh
- [ ] git merge → Detected, single refresh after completion
- [ ] git pull → Detected, single refresh
- [ ] git commit → Detected, single refresh
- [ ] git add → Detected (index change), single refresh
- [ ] git rebase → Detected, single refresh after completion

**Logging Verification:**
- [ ] Open "Cascade" output channel
- [ ] Run git merge with 10+ file changes
- [ ] Verify `[Git] Operation started` appears
- [ ] Verify `[FileWatcher] Refresh suppressed...` appears for each file
- [ ] Verify `[Git] Operation completed` appears after delay
- [ ] Verify `[Git] Clearing entire cache` appears
- [ ] Verify single refresh log entry

**Configuration:**
- [ ] Disable git detection via settings
- [ ] Verify file changes trigger normal refresh (not suppressed)
- [ ] Re-enable git detection
- [ ] Verify git operations detected again

## Dependencies

**Required:**
- **S71 (FileSystemWatcher to TreeView Integration)** - Provides file change event handling
- **S72 (Debounced Refresh Mechanism)** - Provides debouncing infrastructure

**Blocks:**
- None

## Future Enhancements

**Not in Scope for S74:**
- Detect specific git operation type (merge vs pull vs rebase)
- Show git operation status in TreeView (progress indicator)
- Cancel refresh if git operation fails (conflict, error)
- Differentiate between local and remote git operations
- Detect git operations via git CLI monitoring (instead of .git/ file watching)

**Potential Future Stories:**
- S75: Git operation progress indicator in TreeView
- S76: Git conflict detection and resolution UI
- S77: Smart refresh after git conflict resolution
