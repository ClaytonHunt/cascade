---
spec: S74
phase: 2
title: Extension Integration
status: Completed
priority: Low
created: 2025-10-23
updated: 2025-10-23
---

# Phase 2: Extension Integration

## Overview

Integrate the `GitOperationDetector` class (from Phase 1) with the existing extension activation, file watchers, and cache management. This phase modifies `extension.ts` to create the detector instance, register git watchers, and coordinate git-aware refresh behavior.

The key integration points are:
1. Create `GitOperationDetector` instance during extension activation
2. Pass detector to `createFileSystemWatchers()` function
3. Check git operation status before scheduling TreeView refreshes
4. Register git operation completion callback to trigger full cache clear + immediate refresh

## Prerequisites

- Phase 1 completed (`GitOperationDetector` class implemented)
- Understanding of existing file watcher implementation (S71)
- Familiarity with debounced refresh mechanism (S72)

## Tasks

### Task 1: Import GitOperationDetector in extension.ts

Add import statement at the top of `vscode-extension/src/extension.ts`:

```typescript
// Add this import after line 18 (after changeDetection import)
import { GitOperationDetector } from './utils/GitOperationDetector';
```

**File Reference:** `vscode-extension/src/extension.ts:19`

**Expected Outcome:** TypeScript recognizes `GitOperationDetector` class

### Task 2: Create GitOperationDetector Instance in activate()

Add git detector creation in the `activate()` function after creating the tree provider.

**Location:** `vscode-extension/src/extension.ts:~410` (in `activate()` function, after `treeProvider` creation)

Find this section:
```typescript
// Create tree provider
const treeProvider = new PlanningTreeProvider(workspaceRoot, frontmatterCache, outputChannel);
planningTreeProvider = treeProvider;
```

Add immediately after:
```typescript
// Create git operation detector (S74)
const config = vscode.workspace.getConfiguration('planningKanban');
const gitDetector = new GitOperationDetector(
  workspaceRoot,
  outputChannel,
  {
    enabled: config.get<boolean>('enableGitOperationDetection', true),
    debounceDelay: config.get<number>('gitOperationDebounceDelay', 500)
  }
);
```

**Expected Outcome:**
- `gitDetector` instance created with configuration from VSCode settings
- Initialization logged to output channel

### Task 3: Register Git Operation Completion Callback

Add the callback handler immediately after creating `gitDetector`:

```typescript
// Register git operation completion callback (S74)
gitDetector.onGitOperationComplete = () => {
  outputChannel.appendLine('[Git] Clearing entire cache (post-operation)');
  frontmatterCache.clear(); // Full cache clear

  outputChannel.appendLine('[Git] Triggering full TreeView refresh');
  treeProvider.refresh(); // Immediate refresh (bypass debounce)
};
```

**Integration Points:**
- `frontmatterCache.clear()`: Existing method at `cache.ts:231`
- `treeProvider.refresh()`: Existing method at `PlanningTreeProvider.ts:~320`

**Expected Outcome:**
- Git operation completion triggers full cache clear
- Immediate TreeView refresh (bypasses 300ms debounce)
- Logging shows cache clear and refresh trigger

### Task 4: Create and Register Git Watchers

Add git watcher creation immediately after the callback registration:

```typescript
// Create git watchers (S74)
const gitWatchers = gitDetector.createGitWatchers();
```

**Expected Outcome:**
- Two watchers created for `.git/HEAD` and `.git/index`
- Watchers logged to output channel

### Task 5: Pass GitDetector to createFileSystemWatchers()

Modify the `createFileSystemWatchers()` call to pass the git detector.

**Current code (around line 434):**
```typescript
const fileWatchers = createFileSystemWatchers(context, outputChannel, frontmatterCache);
```

**Change to:**
```typescript
const fileWatchers = createFileSystemWatchers(context, outputChannel, frontmatterCache, gitDetector);
```

**Expected Outcome:** `gitDetector` passed to file watcher creation function

### Task 6: Register GitDetector and Git Watchers for Disposal

Add disposal registration in `context.subscriptions.push()`.

**Location:** Find the existing disposal block (around line 560-570)

**Current code:**
```typescript
context.subscriptions.push(
  cascadeTreeView,
  outputChannel,
  // ... other disposables ...
);
```

**Add to subscriptions:**
```typescript
context.subscriptions.push(
  cascadeTreeView,
  outputChannel,
  gitDetector,      // Add this
  ...gitWatchers,   // Add this (spread array)
  // ... rest of disposables ...
);
```

**Expected Outcome:**
- `gitDetector.dispose()` called on extension deactivation
- Git watchers properly disposed

### Task 7: Update createFileSystemWatchers() Function Signature

Modify the `createFileSystemWatchers()` function signature to accept git detector parameter.

**Location:** `vscode-extension/src/extension.ts:348`

**Current signature:**
```typescript
function createFileSystemWatchers(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  cache: FrontmatterCache
): vscode.FileSystemWatcher[] {
```

**Change to:**
```typescript
function createFileSystemWatchers(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  cache: FrontmatterCache,
  gitDetector: GitOperationDetector  // Add this parameter
): vscode.FileSystemWatcher[] {
```

**Expected Outcome:** Function signature updated, TypeScript compilation succeeds

### Task 8: Modify handleChange() to Check Git Operation Status

Update the `handleChange()` event handler to suppress refresh during git operations.

**Location:** `vscode-extension/src/extension.ts:368` (inside `createFileSystemWatchers()`)

**Current code:**
```typescript
const handleChange = async (uri: vscode.Uri) => {
  const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
  outputChannel.appendLine(`[FileWatcher] File changed: ${relativePath}`);

  // Detect change type (S73)
  const result = await detectChangeType(uri, cache, outputChannel);

  switch (result.type) {
    case ChangeType.STRUCTURE:
      // ... existing logic ...
```

**Add git operation check BEFORE change detection:**
```typescript
const handleChange = async (uri: vscode.Uri) => {
  const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
  outputChannel.appendLine(`[FileWatcher] File changed: ${relativePath}`);

  // Invalidate cache (always, even during git operations)
  cache.invalidate(uri.fsPath);

  // Check if git operation in progress (S74)
  if (gitDetector.isGitOperationInProgress()) {
    outputChannel.appendLine('[FileWatcher] Refresh suppressed (git operation in progress)');
    return; // Don't trigger refresh yet
  }

  // Detect change type (S73)
  const result = await detectChangeType(uri, cache, outputChannel);

  // ... rest of switch statement unchanged ...
```

**Key Changes:**
- **Move** `cache.invalidate()` to top (before git check)
- **Add** git operation check before change detection
- **Return early** if git operation in progress (suppress refresh)

**Expected Outcome:**
- Cache invalidation happens for all file changes (correctness)
- Refresh suppressed during git operations
- Logging shows suppressed events

### Task 9: Modify handleCreate() to Check Git Operation Status

Update the `handleCreate()` event handler similarly.

**Location:** `vscode-extension/src/extension.ts:357`

**Current code:**
```typescript
const handleCreate = async (uri: vscode.Uri) => {
  // No cache invalidation needed - file is new (not cached yet)
  // Next cache.get() call will parse file automatically

  // Schedule debounced TreeView refresh (batches rapid file changes)
  if (planningTreeProvider) {
    planningTreeProvider.scheduleRefresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] SCHEDULE_REFRESH: New file detected`);
  }
};
```

**Add git operation check:**
```typescript
const handleCreate = async (uri: vscode.Uri) => {
  // No cache invalidation needed - file is new (not cached yet)
  // Next cache.get() call will parse file automatically

  // Check if git operation in progress (S74)
  if (gitDetector.isGitOperationInProgress()) {
    outputChannel.appendLine('[FileWatcher] Create event suppressed (git operation in progress)');
    return;
  }

  // Schedule debounced TreeView refresh (batches rapid file changes)
  if (planningTreeProvider) {
    planningTreeProvider.scheduleRefresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] SCHEDULE_REFRESH: New file detected`);
  }
};
```

**Expected Outcome:** File create events suppressed during git operations

### Task 10: Modify handleDelete() to Check Git Operation Status

Update the `handleDelete()` event handler similarly.

**Location:** `vscode-extension/src/extension.ts:408`

**Current code:**
```typescript
const handleDelete = async (uri: vscode.Uri) => {
  // Invalidate cache entry (file no longer exists, cache entry invalid)
  cache.invalidate(uri.fsPath);

  // Schedule debounced TreeView refresh (batches rapid file changes)
  if (planningTreeProvider) {
    planningTreeProvider.scheduleRefresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] SCHEDULE_REFRESH: File deleted`);
  }
};
```

**Add git operation check:**
```typescript
const handleDelete = async (uri: vscode.Uri) => {
  // Invalidate cache entry (file no longer exists, cache entry invalid)
  cache.invalidate(uri.fsPath);

  // Check if git operation in progress (S74)
  if (gitDetector.isGitOperationInProgress()) {
    outputChannel.appendLine('[FileWatcher] Delete event suppressed (git operation in progress)');
    return;
  }

  // Schedule debounced TreeView refresh (batches rapid file changes)
  if (planningTreeProvider) {
    planningTreeProvider.scheduleRefresh();
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] SCHEDULE_REFRESH: File deleted`);
  }
};
```

**Expected Outcome:** File delete events suppressed during git operations

## Completion Criteria

- [ ] `GitOperationDetector` imported in `extension.ts`
- [ ] Detector instance created in `activate()` with configuration
- [ ] Git operation completion callback registered
- [ ] Git watchers created and registered for disposal
- [ ] `createFileSystemWatchers()` signature updated with `gitDetector` parameter
- [ ] `handleChange()` checks git operation status before refresh
- [ ] `handleCreate()` checks git operation status before refresh
- [ ] `handleDelete()` checks git operation status before refresh
- [ ] Cache invalidation still happens for all file changes
- [ ] GitDetector and git watchers registered in `context.subscriptions`
- [ ] Extension compiles without TypeScript errors

## Validation Steps

1. **Compile Extension:**
   ```bash
   cd vscode-extension
   npm run compile
   ```
   Verify no TypeScript errors.

2. **Code Review:**
   - Verify all event handlers check `gitDetector.isGitOperationInProgress()`
   - Confirm cache invalidation happens before git check
   - Check disposal registration includes git resources

3. **Manual Testing (deferred to Phase 4):**
   - Integration testing after Phase 3 completion

## Next Phase

Proceed to Phase 3: Configuration and Settings to add VSCode settings for git detection and configuration change listener.
